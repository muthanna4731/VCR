-- ============================================================
-- Fix: Allow authenticated admins to DELETE enquiries
-- Run in: Supabase Dashboard -> SQL Editor -> New Query
-- ============================================================

-- The enquiries table had no DELETE policy, causing the UI to 
-- fail to delete leads permanently (failing silently).

DROP POLICY IF EXISTS "enquiries_admin_delete" ON enquiries;

CREATE POLICY "enquiries_admin_delete" ON enquiries
  FOR DELETE
  USING (is_admin());
