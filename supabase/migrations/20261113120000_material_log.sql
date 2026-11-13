-- ─── Material Log: tables, audit trail, staff-only RLS, profiles role lock ─────
-- (2026-11-13)
--
-- What this does
--   1. Creates the staff-only "Material Log" (construction material spending):
--        material_sites          where material goes (sites, the Warehouse)
--        material_entries        In / Out / Note rows; soft delete via deleted_at
--        material_entry_history  who changed what, written by a trigger
--   2. Adds is_staff(): true for profiles.role in (owner, admin, manager). The
--      existing is_admin() is left alone (it gates enquiries/profiles today).
--   3. Turns on RLS for all three tables, gated by is_staff(). Existing tables
--      use auth.role() = 'authenticated', which would let buyers and agents in;
--      this feature must not. There are no DELETE policies and no DELETE grants:
--      "delete" means setting deleted_at. The history table is select-only for
--      clients and is written only by a SECURITY DEFINER trigger.
--   4. Seeds one Warehouse site.
--
-- Why the profiles role lock is here
--   Any signed-in user could set their own profiles.role (profiles_self_update
--   has no column limit), and handle_new_user copied role from sign-up
--   metadata. Either lets a buyer or agent make themselves owner and read the
--   cost log. So this migration also:
--     - adds trigger profiles_role_guard on INSERT and UPDATE OF role. An update
--       that changes the role, or an insert with any role other than 'buyer',
--       is rejected unless auth.uid() is null or the caller is an owner.
--       auth.uid() is null in the SQL editor and for the service role (its JWT
--       has no sub), which is the only role allowed to call admin_create_staff,
--       and for GoTrue's own insert into auth.users (handle_new_user). Covering
--       INSERT matters: profiles_self_insert and admins_manage_profiles would
--       otherwise let someone delete a profile row and re-insert it as owner;
--     - replaces handle_new_user() so it ignores raw_user_meta_data->>'role'.
--       New auth users start as 'buyer' (never staff, even on self sign-up);
--       set staff roles via the SQL editor or admin_create_staff, which sets
--       the real role afterwards and is unaffected.
--   Nothing in src/ updates profiles.role or calls signUp.
--
-- Run in: Supabase dashboard → SQL Editor. Safe to run more than once.

-- ─── Role lock ─────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Fail closed: every new auth user starts as 'buyer', never staff. Never
  -- trust raw_user_meta_data->>'role' (the client controls it at sign-up).
  -- The column default ('manager') is left alone: other inserts may rely on it.
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''), 'buyer');
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.profiles_role_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  changing boolean;
BEGIN
  IF TG_OP = 'INSERT' THEN
    changing := NEW.role IS DISTINCT FROM 'buyer';
  ELSE
    changing := NEW.role IS DISTINCT FROM OLD.role;
  END IF;

  IF changing
     AND auth.uid() IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'owner'
     )
  THEN
    RAISE EXCEPTION 'Only an owner can change roles';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_role_guard ON public.profiles;
CREATE TRIGGER profiles_role_guard
  BEFORE INSERT OR UPDATE OF role ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.profiles_role_guard();

-- ─── Staff helper ──────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND role IN ('owner', 'admin', 'manager')
  );
$$;

REVOKE EXECUTE ON FUNCTION public.is_staff() FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.is_staff() TO authenticated, service_role;

-- ─── Tables ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.material_sites (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text        NOT NULL CHECK (btrim(name) <> ''),
  kind       text        NOT NULL DEFAULT 'site' CHECK (kind IN ('site', 'warehouse')),
  layout_id  uuid        UNIQUE REFERENCES public.site_layouts(id) ON DELETE SET NULL,
  created_by uuid        DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  archived   boolean     NOT NULL DEFAULT false
);

-- One live site per name (case-insensitive); archived rows free the name.
CREATE UNIQUE INDEX IF NOT EXISTS material_sites_name_lower_uniq
  ON public.material_sites (lower(name)) WHERE NOT archived;

-- created_by comes from the JWT, never from the client, and cannot be rewritten.
CREATE OR REPLACE FUNCTION public.material_sites_stamp()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF auth.uid() IS NOT NULL THEN
      NEW.created_by := auth.uid();
    END IF;
  ELSE
    NEW.created_by := OLD.created_by;
    NEW.created_at := OLD.created_at;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS material_sites_stamp ON public.material_sites;
CREATE TRIGGER material_sites_stamp
  BEFORE INSERT OR UPDATE ON public.material_sites
  FOR EACH ROW EXECUTE FUNCTION public.material_sites_stamp();

CREATE TABLE IF NOT EXISTS public.material_entries (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  kind            text        NOT NULL CHECK (kind IN ('in', 'out', 'note')),
  entry_date      date        NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Kolkata')::date,
  site_id         uuid        REFERENCES public.material_sites(id),
  from_site_id    uuid        REFERENCES public.material_sites(id),
  material        text,
  quantity        numeric,
  unit            text,
  rate            numeric,
  amount          numeric,
  vendor          text,
  note            text,
  created_by      uuid        DEFAULT auth.uid(),
  created_by_name text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz,
  deleted_at      timestamptz,

  -- per-kind rules
  CONSTRAINT material_entries_in_rules CHECK (
    kind <> 'in' OR (
      site_id IS NOT NULL
      AND material IS NOT NULL AND btrim(material) <> ''
      AND amount IS NOT NULL AND amount > 0
    )
  ),
  CONSTRAINT material_entries_out_rules CHECK (
    kind <> 'out' OR (
      site_id IS NOT NULL
      AND from_site_id IS NOT NULL
      AND from_site_id <> site_id
      AND material IS NOT NULL AND btrim(material) <> ''
    )
  ),
  CONSTRAINT material_entries_note_rules CHECK (
    kind <> 'note' OR (note IS NOT NULL AND btrim(note) <> '' AND material IS NULL)
  ),
  -- from_site_id is for Out entries only
  CONSTRAINT material_entries_from_site_out_only CHECK (
    kind = 'out' OR from_site_id IS NULL
  ),
  -- "Miscellaneous" needs a short description, whatever the kind
  CONSTRAINT material_entries_misc_needs_note CHECK (
    material IS NULL OR lower(btrim(material)) <> 'miscellaneous'
    OR (note IS NOT NULL AND btrim(note) <> '')
  ),
  CONSTRAINT material_entries_numbers_sane CHECK (
    (quantity IS NULL OR quantity > 0) AND (rate IS NULL OR rate >= 0)
  )
);

CREATE INDEX IF NOT EXISTS material_entries_entry_date_idx ON public.material_entries (entry_date DESC);
CREATE INDEX IF NOT EXISTS material_entries_site_id_idx    ON public.material_entries (site_id);

-- No foreign key on entry_id: the audit trail must outlive anything.
CREATE TABLE IF NOT EXISTS public.material_entry_history (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id        uuid        NOT NULL,
  action          text        NOT NULL CHECK (action IN ('create', 'edit', 'delete')),
  changed_by      uuid,
  changed_by_name text,
  changed_at      timestamptz NOT NULL DEFAULT now(),
  before          jsonb,
  after           jsonb
);

CREATE INDEX IF NOT EXISTS material_entry_history_entry_idx
  ON public.material_entry_history (entry_id, changed_at);

-- Seed: one Warehouse. Re-running (even after it was archived) adds no second one.
INSERT INTO public.material_sites (name, kind)
SELECT 'Warehouse', 'warehouse'
WHERE NOT EXISTS (SELECT 1 FROM public.material_sites WHERE kind = 'warehouse')
ON CONFLICT DO NOTHING;

-- ─── Triggers on material_entries ──────────────────────────────────────────────

-- BEFORE INSERT: stamp who created it (from the JWT, never from the client) and
-- default an Out entry's source to the Warehouse.
CREATE OR REPLACE FUNCTION public.material_entries_before_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL THEN
    NEW.created_by := auth.uid();
  END IF;
  NEW.created_by_name := (SELECT p.full_name FROM public.profiles p WHERE p.id = NEW.created_by);

  IF NEW.kind = 'out' AND NEW.from_site_id IS NULL THEN
    NEW.from_site_id := (
      SELECT s.id FROM public.material_sites s
      WHERE s.kind = 'warehouse' ORDER BY s.archived, s.created_at LIMIT 1
    );
  END IF;
  RETURN NEW;
END;
$$;

-- BEFORE UPDATE: stamp updated_at; the creator fields cannot be rewritten.
CREATE OR REPLACE FUNCTION public.material_entries_before_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at      := now();
  NEW.created_by      := OLD.created_by;
  NEW.created_by_name := OLD.created_by_name;
  NEW.created_at      := OLD.created_at;
  RETURN NEW;
END;
$$;

-- AFTER INSERT OR UPDATE: the audit trail. SECURITY DEFINER because clients have
-- no INSERT right on the history table.
CREATE OR REPLACE FUNCTION public.material_entries_audit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  act text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    act := 'create';
  ELSIF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
    act := 'delete';
  ELSE
    act := 'edit';
  END IF;

  INSERT INTO public.material_entry_history
    (entry_id, action, changed_by, changed_by_name, before, after)
  VALUES (
    NEW.id,
    act,
    auth.uid(),
    (SELECT p.full_name FROM public.profiles p WHERE p.id = auth.uid()),
    CASE WHEN TG_OP = 'UPDATE' THEN to_jsonb(OLD) END,
    to_jsonb(NEW)
  );
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS material_entries_before_insert ON public.material_entries;
CREATE TRIGGER material_entries_before_insert
  BEFORE INSERT ON public.material_entries
  FOR EACH ROW EXECUTE FUNCTION public.material_entries_before_insert();

DROP TRIGGER IF EXISTS material_entries_before_update ON public.material_entries;
CREATE TRIGGER material_entries_before_update
  BEFORE UPDATE ON public.material_entries
  FOR EACH ROW EXECUTE FUNCTION public.material_entries_before_update();

DROP TRIGGER IF EXISTS material_entries_audit ON public.material_entries;
CREATE TRIGGER material_entries_audit
  AFTER INSERT OR UPDATE ON public.material_entries
  FOR EACH ROW EXECUTE FUNCTION public.material_entries_audit();

-- ─── Privileges ────────────────────────────────────────────────────────────────
-- Supabase grants new tables to anon/authenticated by default; narrow that.
-- RLS below is the real gate; this is defence in depth (no hard deletes ever).

REVOKE ALL ON public.material_sites, public.material_entries, public.material_entry_history
  FROM PUBLIC, anon, authenticated;

GRANT SELECT, INSERT, UPDATE ON public.material_sites   TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.material_entries TO authenticated;
GRANT SELECT                 ON public.material_entry_history TO authenticated;

-- ─── Row level security ────────────────────────────────────────────────────────

ALTER TABLE public.material_sites         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.material_entries       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.material_entry_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS material_sites_select ON public.material_sites;
DROP POLICY IF EXISTS material_sites_insert ON public.material_sites;
DROP POLICY IF EXISTS material_sites_update ON public.material_sites;
CREATE POLICY material_sites_select ON public.material_sites
  FOR SELECT TO authenticated USING ((SELECT public.is_staff()));
CREATE POLICY material_sites_insert ON public.material_sites
  FOR INSERT TO authenticated WITH CHECK ((SELECT public.is_staff()));
CREATE POLICY material_sites_update ON public.material_sites
  FOR UPDATE TO authenticated USING ((SELECT public.is_staff())) WITH CHECK ((SELECT public.is_staff()));

DROP POLICY IF EXISTS material_entries_select ON public.material_entries;
DROP POLICY IF EXISTS material_entries_insert ON public.material_entries;
DROP POLICY IF EXISTS material_entries_update ON public.material_entries;
CREATE POLICY material_entries_select ON public.material_entries
  FOR SELECT TO authenticated USING ((SELECT public.is_staff()));
CREATE POLICY material_entries_insert ON public.material_entries
  FOR INSERT TO authenticated WITH CHECK ((SELECT public.is_staff()));
CREATE POLICY material_entries_update ON public.material_entries
  FOR UPDATE TO authenticated USING ((SELECT public.is_staff())) WITH CHECK ((SELECT public.is_staff()));

-- History: select only. Written by material_entries_audit() (SECURITY DEFINER).
DROP POLICY IF EXISTS material_entry_history_select ON public.material_entry_history;
CREATE POLICY material_entry_history_select ON public.material_entry_history
  FOR SELECT TO authenticated USING ((SELECT public.is_staff()));
