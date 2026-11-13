-- Migration form of supabase/fix_admin_rpc_security.sql (same statements).
-- Apply with: supabase link --project-ref lsuytvrfyutcwptrhkvs && supabase db push

-- ─── Lock down the staff-admin functions (2026-11-13) ──────────────────────────
--
-- admin_create_staff, admin_delete_staff and list_staff_users are
-- SECURITY DEFINER (they run with the owner's rights) and do not check who is
-- calling. Postgres grants EXECUTE on new functions to PUBLIC by default, and
-- Supabase exposes public-schema functions over the REST API
-- (/rest/v1/rpc/<name>) to the anon and authenticated roles. Unless EXECUTE
-- was revoked by hand, anyone holding the site's public anon key could:
--   - create an owner/admin account     (admin_create_staff)
--   - delete any user, including admins (admin_delete_staff)
--   - list every staff email            (list_staff_users)
--
-- None of them are called by the app (src/), so they are restricted to the
-- service role and to the SQL editor (which runs as postgres).
--
-- get_email_by_name is left callable: the /login page needs it before the user
-- is signed in. It still reveals a user's email to anyone who knows their full
-- name; replacing name-based login is a separate change.
--
-- Run in: Supabase dashboard → SQL Editor. Safe to run more than once.

REVOKE EXECUTE ON FUNCTION public.admin_create_staff(TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_delete_staff(UUID)                  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.list_staff_users()                        FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.admin_create_staff(TEXT, TEXT, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_delete_staff(UUID)                  TO service_role;
GRANT EXECUTE ON FUNCTION public.list_staff_users()                        TO service_role;
