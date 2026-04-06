-- ============================================================
-- Fix: Allow admins to create buyer accounts
-- Run in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- 1. Widen the role CHECK constraint to include 'buyer'
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('owner', 'manager', 'buyer'));

-- 2. Helper — returns true if the calling user is an owner/manager
--    SECURITY DEFINER bypasses RLS so it doesn't recurse.
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND role IN ('owner', 'manager')
  );
$$;

-- 3. Policy: admins can INSERT / UPDATE / DELETE any profile row
--    (the existing profiles_self_* policies still cover buyers updating their own row)
DROP POLICY IF EXISTS "admins_manage_profiles" ON profiles;

CREATE POLICY "admins_manage_profiles" ON profiles
  FOR ALL
  USING  (is_admin())
  WITH CHECK (is_admin());
