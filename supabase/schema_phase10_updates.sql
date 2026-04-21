-- ============================================
-- Phase 10: Staff Updates Board + Name Login Helper
-- ============================================

-- ─── 1. Staff Updates table ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS staff_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_name TEXT NOT NULL,
  author_role TEXT NOT NULL DEFAULT 'admin',
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE staff_updates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth can manage staff updates" ON staff_updates
  FOR ALL USING (auth.role() = 'authenticated');

-- Index for ordering by newest first
CREATE INDEX idx_staff_updates_created_at ON staff_updates(created_at DESC);

-- ─── 2. Name → Email lookup function ─────────────────────────────────────────
-- Allows name+password login by looking up the email from auth.users via profiles
CREATE OR REPLACE FUNCTION get_email_by_name(staff_name TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_email TEXT;
BEGIN
  SELECT au.email INTO user_email
  FROM profiles p
  JOIN auth.users au ON au.id = p.id
  WHERE LOWER(p.full_name) = LOWER(staff_name)
  LIMIT 1;

  RETURN user_email;
END;
$$;

-- ─── 3. Auth schema permissions (required for functions below) ───────────────
-- postgres needs explicit grants on auth tables since they are owned by supabase_auth_admin
GRANT USAGE ON SCHEMA auth TO postgres, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON auth.users TO postgres, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON auth.identities TO postgres, service_role;

-- ─── 5. Admin: Create staff/owner user ────────────────────────────────────────
-- Creates a new user in auth.users with a profile row (role = owner/manager/admin)
CREATE OR REPLACE FUNCTION admin_create_staff(
  p_email TEXT,
  p_password TEXT,
  p_full_name TEXT,
  p_role TEXT DEFAULT 'admin'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = auth, public
AS $$
DECLARE
  new_user_id UUID := gen_random_uuid();
BEGIN
  -- Validate role
  IF p_role NOT IN ('owner', 'manager', 'admin') THEN
    RAISE EXCEPTION 'Invalid role. Must be owner, manager, or admin.';
  END IF;

  -- Check email doesn't already exist
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = LOWER(p_email)) THEN
    RAISE EXCEPTION 'A user with this email already exists.';
  END IF;

  -- Insert into auth.users
  INSERT INTO auth.users (
    instance_id, id, aud, role, email,
    encrypted_password, email_confirmed_at,
    created_at, updated_at,
    raw_app_meta_data, raw_user_meta_data,
    is_super_admin, confirmation_token, recovery_token, email_change_token_new
  )
  VALUES (
    '00000000-0000-0000-0000-000000000000',
    new_user_id, 'authenticated', 'authenticated', LOWER(p_email),
    crypt(p_password, gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('full_name', p_full_name),
    false, '', '', ''
  );

  -- Insert identity row (required by Supabase GoTrue)
  INSERT INTO auth.identities (
    id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
  )
  VALUES (
    gen_random_uuid(), new_user_id,
    jsonb_build_object('sub', new_user_id::text, 'email', LOWER(p_email)),
    'email', new_user_id::text, now(), now(), now()
  );

  -- The handle_new_user trigger creates the profile; update it with correct name + role
  UPDATE public.profiles SET full_name = p_full_name, role = p_role WHERE id = new_user_id;

  RETURN new_user_id;
END;
$$;

-- ─── 6. Admin: Delete staff/owner user ────────────────────────────────────────
CREATE OR REPLACE FUNCTION admin_delete_staff(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Prevent deleting yourself
  IF p_user_id = auth.uid() THEN
    RAISE EXCEPTION 'You cannot delete your own account.';
  END IF;

  -- Delete from auth.users — cascades to profiles via FK
  DELETE FROM auth.users WHERE id = p_user_id;
END;
$$;

-- ─── 7. Admin: List staff users ───────────────────────────────────────────────
CREATE OR REPLACE FUNCTION list_staff_users()
RETURNS TABLE(id UUID, full_name TEXT, role TEXT, email TEXT, created_at TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN QUERY
    SELECT p.id, p.full_name, p.role, au.email, p.created_at
    FROM public.profiles p
    JOIN auth.users au ON au.id = p.id
    WHERE p.role IN ('owner', 'manager', 'admin')
    ORDER BY p.created_at;
END;
$$;
