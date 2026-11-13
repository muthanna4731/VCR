-- admin_create_staff hashes the password with pgcrypto's crypt()/gen_salt(),
-- but its search_path was "auth, public". On Supabase, pgcrypto is installed
-- in the "extensions" schema, so every call failed with
--   ERROR: function gen_salt(unknown) does not exist
-- and no staff account could ever be created through it.
--
-- Add "extensions" to the function's search_path. Nothing else changes; the
-- function stays callable only by the service role (see
-- 20261113000000_lock_admin_functions.sql).

ALTER FUNCTION public.admin_create_staff(TEXT, TEXT, TEXT, TEXT)
  SET search_path = auth, public, extensions;
