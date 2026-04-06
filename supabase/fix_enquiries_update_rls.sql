-- ============================================================
-- Fix: Allow authenticated admins to UPDATE enquiries
-- Run in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- The enquiries table has:
--   enquiries_public_insert  → anyone can INSERT (public enquiry form)
--   enquiries_auth_read      → authenticated users can SELECT
-- But no UPDATE policy exists, so admin edits are silently blocked.

DROP POLICY IF EXISTS "enquiries_admin_update" ON enquiries;

CREATE POLICY "enquiries_admin_update" ON enquiries
  FOR UPDATE
  USING     (is_admin())
  WITH CHECK (is_admin());
