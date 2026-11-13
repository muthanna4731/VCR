-- Material log: only admins and managers write. Owners keep read access.
--
--   1. Adds can_log_materials(): true for profiles.role in (admin, manager).
--   2. Re-creates the INSERT and UPDATE policies on material_entries and
--      material_sites with it. Soft delete is an UPDATE (deleted_at), so it is
--      covered too. SELECT policies stay on is_staff() (owner, admin, manager).
--
-- Safe to run more than once.

CREATE OR REPLACE FUNCTION public.can_log_materials()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND role IN ('admin', 'manager')
  );
$$;

REVOKE EXECUTE ON FUNCTION public.can_log_materials() FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.can_log_materials() TO authenticated, service_role;

DROP POLICY IF EXISTS material_sites_insert ON public.material_sites;
DROP POLICY IF EXISTS material_sites_update ON public.material_sites;
CREATE POLICY material_sites_insert ON public.material_sites
  FOR INSERT TO authenticated WITH CHECK ((SELECT public.can_log_materials()));
CREATE POLICY material_sites_update ON public.material_sites
  FOR UPDATE TO authenticated
  USING ((SELECT public.can_log_materials()))
  WITH CHECK ((SELECT public.can_log_materials()));

DROP POLICY IF EXISTS material_entries_insert ON public.material_entries;
DROP POLICY IF EXISTS material_entries_update ON public.material_entries;
CREATE POLICY material_entries_insert ON public.material_entries
  FOR INSERT TO authenticated WITH CHECK ((SELECT public.can_log_materials()));
CREATE POLICY material_entries_update ON public.material_entries
  FOR UPDATE TO authenticated
  USING ((SELECT public.can_log_materials()))
  WITH CHECK ((SELECT public.can_log_materials()));
