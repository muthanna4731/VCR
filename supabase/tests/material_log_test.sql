-- Assertions for supabase/migrations/20261113120000_material_log.sql.
-- Run through scripts/test-migration.sh (stub + migration are loaded first).
-- Each DO block RAISEs EXCEPTION on failure; psql runs with ON_ERROR_STOP.

\set ON_ERROR_STOP 1

-- ─── helpers (superuser-owned, invoker rights) ──────────────────────────────
create schema t;
grant usage on schema t to authenticated, anon;

-- Runs a statement as the current role; returns the SQLSTATE it failed with, or
-- NULL when it succeeded. Used to assert that something is rejected.
create function t.sqlstate_of(stmt text) returns text
language plpgsql as $$
begin
  execute stmt;
  return null;
exception when others then
  return sqlstate;
end $$;
grant execute on function t.sqlstate_of(text) to authenticated, anon;

create function t.fail_unless(cond boolean, msg text) returns void
language plpgsql as $$
begin
  if cond is not true then raise exception 'TEST FAILED: %', msg; end if;
end $$;
grant execute on function t.fail_unless(boolean, text) to authenticated, anon;

-- ─── fixtures: users go through the real handle_new_user trigger ────────────
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000a1', 'owner@t',   '{"full_name":"Olive Owner"}'),
  ('00000000-0000-0000-0000-0000000000a2', 'manager@t', '{"full_name":"Mia Manager"}'),
  ('00000000-0000-0000-0000-0000000000a3', 'buyer@t',   '{"full_name":"Ben Buyer"}'),
  ('00000000-0000-0000-0000-0000000000a4', 'agent@t',   '{"full_name":"Asha Agent"}'),
  ('00000000-0000-0000-0000-0000000000a5', 'admin@t',   '{"full_name":"Adi Admin"}');

-- No JWT here (superuser = SQL editor), so the role guard lets these through.
update profiles set role = 'owner'   where id = '00000000-0000-0000-0000-0000000000a1';
update profiles set role = 'manager' where id = '00000000-0000-0000-0000-0000000000a2';
update profiles set role = 'buyer'   where id = '00000000-0000-0000-0000-0000000000a3';
update profiles set role = 'agent'   where id = '00000000-0000-0000-0000-0000000000a4';
update profiles set role = 'admin'   where id = '00000000-0000-0000-0000-0000000000a5';

-- ─── 0. structure ───────────────────────────────────────────────────────────
do $$
declare tbl text;
begin
  foreach tbl in array array['material_sites','material_entries','material_entry_history'] loop
    perform t.fail_unless(
      (select relrowsecurity from pg_class where oid = ('public.' || tbl)::regclass),
      'RLS not enabled on ' || tbl);
  end loop;

  -- no DELETE policy anywhere, and no delete grant for app roles
  perform t.fail_unless(
    not exists (select 1 from pg_policies where schemaname = 'public'
                and tablename like 'material\_%' and cmd in ('DELETE','ALL')),
    'a DELETE/ALL policy exists on a material table');
  perform t.fail_unless(
    not exists (select 1 from information_schema.role_table_grants
                where table_schema = 'public' and table_name like 'material\_%'
                and grantee in ('anon','authenticated','PUBLIC') and privilege_type = 'DELETE'),
    'DELETE is granted to an app role');
  perform t.fail_unless(
    not exists (select 1 from information_schema.role_table_grants
                where table_schema = 'public' and table_name like 'material\_%'
                and grantee = 'anon'),
    'anon has a grant on a material table');

  perform t.fail_unless(
    (select count(*) from material_sites where kind = 'warehouse' and name = 'Warehouse') = 1,
    'seed Warehouse row missing or duplicated');
end $$;

-- ─── 1. is_staff() ──────────────────────────────────────────────────────────
do $$
declare r record;
begin
  for r in select * from (values
    ('00000000-0000-0000-0000-0000000000a1', true),
    ('00000000-0000-0000-0000-0000000000a2', true),
    ('00000000-0000-0000-0000-0000000000a5', true),
    ('00000000-0000-0000-0000-0000000000a3', false),
    ('00000000-0000-0000-0000-0000000000a4', false)) v(id, expected)
  loop
    perform set_config('request.jwt.claim.sub', r.id, true);
    perform t.fail_unless(public.is_staff() = r.expected, 'is_staff wrong for ' || r.id);
  end loop;
  perform set_config('request.jwt.claim.sub', '', true);
  perform t.fail_unless(public.is_staff() is not true, 'is_staff true with no JWT');
end $$;

-- ─── 2. buyer / agent cannot read or write any material table ──────────────
-- Owner inserts one entry first.
do $$
begin
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a1', true);
  set local role authenticated;
  insert into material_entries (kind, site_id, material, amount, quantity, unit, vendor)
  select 'in', id, 'Cement', 5000, 10, 'bags', 'ACC Dealer'
  from material_sites where kind = 'warehouse';
  perform t.fail_unless(
    (select count(*) from material_entries where material = 'Cement') = 1,
    'owner cannot see own entry');
end $$;

do $$
declare uid text;
begin
  foreach uid in array array['00000000-0000-0000-0000-0000000000a3','00000000-0000-0000-0000-0000000000a4'] loop
    perform set_config('request.jwt.claim.sub', uid, true);
    set local role authenticated;
    perform t.fail_unless((select count(*) from material_entries) = 0, 'non-staff sees entries (' || uid || ')');
    perform t.fail_unless((select count(*) from material_sites) = 0, 'non-staff sees sites (' || uid || ')');
    perform t.fail_unless((select count(*) from material_entry_history) = 0, 'non-staff sees history (' || uid || ')');
    perform t.fail_unless(
      t.sqlstate_of($q$insert into material_entries (kind, note) values ('note', 'sneaky')$q$) is not null,
      'non-staff inserted an entry');
    perform t.fail_unless(
      t.sqlstate_of($q$insert into material_sites (name) values ('Sneaky site')$q$) is not null,
      'non-staff inserted a site');
    reset role;
  end loop;
  perform t.fail_unless((select count(*) from material_entries where note = 'sneaky') = 0, 'sneaky row exists');
  -- non-staff UPDATE touches nothing
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a3', true);
  set local role authenticated;
  update material_entries set amount = 1;
  reset role;
  perform t.fail_unless((select amount from material_entries where material = 'Cement') = 5000, 'non-staff updated an entry');
end $$;

-- ─── 3. manager inserts an IN entry: history 'create', created_by_name ──────
do $$
declare eid uuid; h record;
begin
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a2', true);
  set local role authenticated;
  -- also tries to spoof created_by / created_by_name: both must be overwritten
  insert into material_entries (kind, site_id, material, amount, created_by, created_by_name)
  select 'in', id, 'Steel / TMT bars', 12000, '00000000-0000-0000-0000-0000000000a1', 'Olive Owner'
  from material_sites where kind = 'warehouse'
  returning id into eid;
  reset role;

  perform t.fail_unless((select created_by_name from material_entries where id = eid) = 'Mia Manager',
    'created_by_name not filled from profile');
  perform t.fail_unless((select created_by from material_entries where id = eid) = '00000000-0000-0000-0000-0000000000a2',
    'created_by spoofable');
  perform t.fail_unless((select entry_date from material_entries where id = eid)
    = (now() at time zone 'Asia/Kolkata')::date, 'entry_date default is not IST today');

  select * into h from material_entry_history where entry_id = eid;
  perform t.fail_unless(h.action = 'create', 'no create history row');
  perform t.fail_unless(h.changed_by = '00000000-0000-0000-0000-0000000000a2' and h.changed_by_name = 'Mia Manager',
    'history changed_by wrong');
  perform t.fail_unless(h.before is null and h.after->>'material' = 'Steel / TMT bars', 'create before/after wrong');
  perform t.fail_unless((select count(*) from material_entry_history where entry_id = eid) = 1, 'expected exactly 1 history row');
end $$;

-- ─── 4. manager edits amount: 'edit' row with old value; updated_at set ─────
do $$
declare eid uuid; h record; created timestamptz;
begin
  select id into eid from material_entries where material = 'Steel / TMT bars';
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a2', true);
  set local role authenticated;
  update material_entries set amount = 13500, created_by = '00000000-0000-0000-0000-0000000000a1' where id = eid;
  reset role;

  select * into h from material_entry_history where entry_id = eid and action = 'edit';
  perform t.fail_unless(h.id is not null, 'no edit history row');
  perform t.fail_unless(h.before->>'amount' = '12000' and h.after->>'amount' = '13500', 'edit before/after wrong: ' || h.before::text);
  perform t.fail_unless(h.changed_by_name = 'Mia Manager', 'edit changed_by_name wrong');
  perform t.fail_unless((select updated_at from material_entries where id = eid) is not null, 'updated_at not set');
  perform t.fail_unless((select created_by from material_entries where id = eid) = '00000000-0000-0000-0000-0000000000a2',
    'created_by changed by an edit');
end $$;

-- ─── 5. soft delete: 'delete' history row; row kept ─────────────────────────
do $$
declare eid uuid;
begin
  select id into eid from material_entries where material = 'Steel / TMT bars';
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a2', true);
  set local role authenticated;
  update material_entries set deleted_at = now() where id = eid;
  reset role;
  perform t.fail_unless(
    (select count(*) from material_entry_history where entry_id = eid and action = 'delete') = 1,
    'no delete history row');
  perform t.fail_unless(
    (select (before->>'deleted_at') is null and (after->>'deleted_at') is not null
     from material_entry_history where entry_id = eid and action = 'delete'),
    'delete before/after wrong');
  perform t.fail_unless((select count(*) from material_entries where id = eid) = 1, 'soft-deleted row vanished');
  -- a later edit of the deleted row is an edit, not another delete
  set local role authenticated;
  update material_entries set vendor = 'x' where id = eid;
  reset role;
  perform t.fail_unless(
    (select count(*) from material_entry_history where entry_id = eid and action = 'delete') = 1,
    'second delete row written');
end $$;

-- ─── 6. check constraints per kind ──────────────────────────────────────────
do $$
declare wh uuid; s2 uuid; st text; mgr text := '00000000-0000-0000-0000-0000000000a2';
begin
  select id into wh from material_sites where kind = 'warehouse';
  insert into material_sites (name) values ('Site Two') returning id into s2;

  -- IN: amount null / 0 / negative, material missing, site missing
  perform t.fail_unless(t.sqlstate_of(format($q$insert into material_entries (kind, site_id, material, amount) values ('in', %L, 'Cement', null)$q$, wh)) = '23514', 'in: null amount accepted');
  perform t.fail_unless(t.sqlstate_of(format($q$insert into material_entries (kind, site_id, material, amount) values ('in', %L, 'Cement', 0)$q$, wh)) = '23514', 'in: zero amount accepted');
  perform t.fail_unless(t.sqlstate_of(format($q$insert into material_entries (kind, site_id, material, amount) values ('in', %L, 'Cement', -5)$q$, wh)) = '23514', 'in: negative amount accepted');
  perform t.fail_unless(t.sqlstate_of(format($q$insert into material_entries (kind, site_id, amount) values ('in', %L, 100)$q$, wh)) = '23514', 'in: missing material accepted');
  perform t.fail_unless(t.sqlstate_of($q$insert into material_entries (kind, material, amount) values ('in', 'Cement', 100)$q$) = '23514', 'in: missing site accepted');

  -- NOTE: empty / whitespace / null note
  perform t.fail_unless(t.sqlstate_of($q$insert into material_entries (kind, note) values ('note', '')$q$) = '23514', 'note: empty note accepted');
  perform t.fail_unless(t.sqlstate_of($q$insert into material_entries (kind, note) values ('note', '   ')$q$) = '23514', 'note: blank note accepted');
  perform t.fail_unless(t.sqlstate_of($q$insert into material_entries (kind) values ('note')$q$) = '23514', 'note: null note accepted');

  -- Miscellaneous needs a description
  perform t.fail_unless(t.sqlstate_of(format($q$insert into material_entries (kind, site_id, material, amount) values ('in', %L, 'Miscellaneous', 100)$q$, wh)) = '23514', 'misc without note accepted');

  -- OUT: material, destination; from must differ from destination
  perform t.fail_unless(t.sqlstate_of(format($q$insert into material_entries (kind, site_id) values ('out', %L)$q$, s2)) = '23514', 'out: missing material accepted');
  perform t.fail_unless(t.sqlstate_of($q$insert into material_entries (kind, material) values ('out', 'Cement')$q$) = '23514', 'out: missing destination accepted');
  perform t.fail_unless(t.sqlstate_of(format($q$insert into material_entries (kind, site_id, from_site_id, material) values ('out', %L, %L, 'Cement')$q$, s2, s2)) = '23514', 'out: from = destination accepted');

  -- bad kind, bad numbers
  perform t.fail_unless(t.sqlstate_of(format($q$insert into material_entries (kind, site_id, material, amount) values ('refund', %L, 'Cement', 100)$q$, wh)) = '23514', 'bad kind accepted');
  perform t.fail_unless(t.sqlstate_of(format($q$insert into material_entries (kind, site_id, material, amount, quantity) values ('in', %L, 'Cement', 100, -1)$q$, wh)) = '23514', 'negative quantity accepted');

  -- valid ones go through; OUT defaults from_site_id to the Warehouse
  insert into material_entries (kind, site_id, material, quantity, unit) values ('out', s2, 'Cement', 4, 'bags');
  perform t.fail_unless((select from_site_id from material_entries where kind = 'out' and material = 'Cement') = wh,
    'out: from_site_id did not default to Warehouse');
  insert into material_entries (kind, note) values ('note', 'Slab poured, Block A');
  insert into material_entries (kind, site_id, material, amount, note) values ('in', wh, 'Miscellaneous', 250, 'Nails and gloves');

  -- the constraint also guards UPDATEs
  perform set_config('request.jwt.claim.sub', mgr, true);
  set local role authenticated;
  st := t.sqlstate_of($q$update material_entries set amount = 0 where material = 'Miscellaneous'$q$);
  reset role;
  perform t.fail_unless(st = '23514', 'update to zero amount accepted');
end $$;

-- ─── 7. no hard deletes; history is insert-only and not client-writable ────
do $$
declare n_before int; n_hist int; n_sites int; st text; mgr text := '00000000-0000-0000-0000-0000000000a2';
begin
  select count(*) into n_before from material_entries;
  select count(*) into n_hist from material_entry_history;
  select count(*) into n_sites from material_sites;
  perform set_config('request.jwt.claim.sub', mgr, true);
  set local role authenticated;

  -- permission error (42501) or 0 rows affected are both acceptable
  st := t.sqlstate_of('delete from material_entries');
  perform t.fail_unless(st is null or st = '42501', 'entries delete: unexpected error ' || coalesce(st, ''));
  st := t.sqlstate_of('delete from material_sites');
  perform t.fail_unless(st is null or st = '42501', 'sites delete: unexpected error ' || coalesce(st, ''));

  -- manager cannot write or alter the audit trail directly
  perform t.fail_unless(
    t.sqlstate_of($q$insert into material_entry_history (entry_id, action, changed_by_name) values (gen_random_uuid(), 'edit', 'forged')$q$) = '42501',
    'manager inserted into history directly');
  st := t.sqlstate_of($q$update material_entry_history set changed_by_name = 'tampered'$q$);
  perform t.fail_unless(st is null or st = '42501', 'history update: unexpected error');
  st := t.sqlstate_of('delete from material_entry_history');
  perform t.fail_unless(st is null or st = '42501', 'history delete: unexpected error');
  reset role;

  perform t.fail_unless((select count(*) from material_entries) = n_before, 'entries were hard-deleted');
  perform t.fail_unless((select count(*) from material_sites) = n_sites, 'sites were hard-deleted');
  perform t.fail_unless((select count(*) from material_entry_history) = n_hist, 'history row count changed');
  perform t.fail_unless((select count(*) from material_entry_history where changed_by_name in ('tampered','forged')) = 0,
    'history was tampered with');
end $$;

-- ─── 8. sites: staff manage them, names unique among live rows ─────────────
do $$
declare mgr text := '00000000-0000-0000-0000-0000000000a2'; lid uuid; cid uuid;
begin
  perform set_config('request.jwt.claim.sub', mgr, true);
  set local role authenticated;
  insert into material_sites (name) values ('Hosur Phase 1');
  perform t.fail_unless((select created_by from material_sites where name = 'Hosur Phase 1') = mgr::uuid, 'site created_by not defaulted');
  perform t.fail_unless((select kind from material_sites where name = 'Hosur Phase 1') = 'site', 'site kind default wrong');
  perform t.fail_unless(t.sqlstate_of($q$insert into material_sites (name) values ('hosur PHASE 1')$q$) = '23505', 'duplicate site name (case-insensitive) accepted');
  perform t.fail_unless(t.sqlstate_of($q$insert into material_sites (name, kind) values ('Bad', 'moon')$q$) = '23514', 'bad site kind accepted');
  -- archive then reuse the name
  update material_sites set archived = true where name = 'Hosur Phase 1';
  insert into material_sites (name) values ('Hosur Phase 1');
  reset role;
  perform t.fail_unless((select count(*) from material_sites where lower(name) = 'hosur phase 1') = 2, 'archived name not reusable');

  -- layout_id is unique
  insert into cities (name) values ('Hosur') returning id into cid;
  insert into site_layouts (city_id, name, slug) values (cid, 'Green Meadows', 'green-meadows') returning id into lid;
  insert into material_sites (name, layout_id) values ('Green Meadows', lid);
  perform t.fail_unless(t.sqlstate_of(format($q$insert into material_sites (name, layout_id) values ('Green Meadows 2', %L)$q$, lid)) = '23505',
    'layout_id not unique');
  -- deleting the layout detaches (set null), does not delete the site
  delete from site_layouts where id = lid;
  perform t.fail_unless((select layout_id from material_sites where name = 'Green Meadows') is null, 'layout delete did not null layout_id');
end $$;

-- ─── 9. role lock on profiles ──────────────────────────────────────────────
-- buyer promoting themselves to owner
do $$
declare msg text;
begin
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a3', true);
  set local role authenticated;
  begin
    update profiles set role = 'owner' where id = '00000000-0000-0000-0000-0000000000a3';
    msg := 'NO ERROR';
  exception when others then
    msg := sqlerrm;
  end;
  reset role;
  perform t.fail_unless(msg = 'Only an owner can change roles', 'buyer self-promotion not blocked, got: ' || msg);
  perform t.fail_unless((select role from profiles where id = '00000000-0000-0000-0000-0000000000a3') = 'buyer', 'buyer role changed');
  -- ... and ordinary self-edits still work (full_name; role set to its own value)
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a3', true);
  set local role authenticated;
  update profiles set full_name = 'Ben B', role = 'buyer' where id = '00000000-0000-0000-0000-0000000000a3';
  reset role;
  perform t.fail_unless((select full_name from profiles where id = '00000000-0000-0000-0000-0000000000a3') = 'Ben B', 'self-edit of name blocked');
  update profiles set full_name = 'Ben Buyer' where id = '00000000-0000-0000-0000-0000000000a3';
end $$;

-- a manager cannot change roles either (own or others, via self-update policy)
do $$
declare msg text;
begin
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a2', true);
  set local role authenticated;
  begin
    update profiles set role = 'owner' where id = '00000000-0000-0000-0000-0000000000a2';
    msg := 'NO ERROR';
  exception when others then msg := sqlerrm; end;
  reset role;
  perform t.fail_unless(msg = 'Only an owner can change roles', 'manager self-promotion not blocked, got: ' || msg);
end $$;

-- owner changes another user's role (run as superuser with the owner's JWT so
-- RLS is bypassed and only the guard trigger is under test)
do $$
begin
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a1', true);
  update profiles set role = 'manager' where id = '00000000-0000-0000-0000-0000000000a4';
  perform t.fail_unless((select role from profiles where id = '00000000-0000-0000-0000-0000000000a4') = 'manager', 'owner role change blocked');
  update profiles set role = 'agent' where id = '00000000-0000-0000-0000-0000000000a4';
  perform t.fail_unless((select role from profiles where id = '00000000-0000-0000-0000-0000000000a4') = 'agent', 'owner role change blocked (2)');
end $$;

-- no JWT at all: SQL editor / admin_create_staff (security definer, service role)
do $$
begin
  perform set_config('request.jwt.claim.sub', '', true);
  update profiles set role = 'admin' where id = '00000000-0000-0000-0000-0000000000a4';
  perform t.fail_unless((select role from profiles where id = '00000000-0000-0000-0000-0000000000a4') = 'admin', 'SQL-editor role change blocked');
  update profiles set role = 'agent' where id = '00000000-0000-0000-0000-0000000000a4';
end $$;

-- admin_create_staff pattern: a SECURITY DEFINER function that inserts a user
-- and then sets the role, called with a service-role JWT (no sub).
create function public.test_create_staff(p_name text, p_role text) returns uuid
language plpgsql security definer set search_path = public as $$
declare uid uuid := gen_random_uuid();
begin
  insert into auth.users (id, email, raw_user_meta_data) values (uid, p_name || '@t', jsonb_build_object('full_name', p_name));
  update public.profiles set full_name = p_name, role = p_role where id = uid;
  return uid;
end $$;
do $$
declare uid uuid;
begin
  perform set_config('request.jwt.claim.sub', '', true);
  uid := public.test_create_staff('Created Staff', 'manager');
  perform t.fail_unless((select role from profiles where id = uid) = 'manager', 'admin_create_staff pattern broken');
  uid := public.test_create_staff('Created Owner', 'owner');
  perform t.fail_unless((select role from profiles where id = uid) = 'owner', 'admin_create_staff pattern broken (owner)');
end $$;
drop function public.test_create_staff(text, text);

-- ─── 10. handle_new_user ignores the role in sign-up metadata ──────────────
do $$
declare uid uuid := gen_random_uuid();
begin
  insert into auth.users (id, email, raw_user_meta_data)
  values (uid, 'selfsignup@t', '{"full_name":"Sneaky Signup","role":"owner"}');
  perform t.fail_unless((select role from profiles where id = uid) is distinct from 'owner', 'sign-up metadata granted owner');
  perform t.fail_unless((select role from profiles where id = uid) = 'buyer', 'sign-up with metadata role=owner did not start as buyer');
  perform set_config('request.jwt.claim.sub', uid::text, true);
  perform t.fail_unless(public.is_staff() is false, 'self sign-up passes is_staff()');
  perform set_config('request.jwt.claim.sub', '', true);
  perform t.fail_unless((select full_name from profiles where id = uid) = 'Sneaky Signup', 'full_name not copied');
  perform t.fail_unless(
    (select prosecdef from pg_proc where oid = 'public.handle_new_user()'::regprocedure), 'handle_new_user not security definer');
  perform t.fail_unless(
    (select proconfig::text from pg_proc where oid = 'public.handle_new_user()'::regprocedure) like '%search_path=public%', 'handle_new_user search_path not pinned');
end $$;

-- ─── 11. migration is idempotent ───────────────────────────────────────────
\i supabase/migrations/20261113120000_material_log.sql

do $$
declare n_pol int;
begin
  perform t.fail_unless((select count(*) from material_sites where kind = 'warehouse' and name = 'Warehouse') = 1, 'rerun duplicated Warehouse');
  select count(*) into n_pol from pg_policies where schemaname = 'public' and tablename like 'material\_%';
  perform t.fail_unless(n_pol = 7, 'expected 7 policies after rerun, got ' || n_pol);
  perform t.fail_unless((select count(*) from pg_trigger where tgrelid = 'public.material_entries'::regclass and not tgisinternal) = 3,
    'expected 3 triggers on material_entries after rerun');
  perform t.fail_unless((select count(*) from pg_trigger where tgrelid = 'public.profiles'::regclass and tgname = 'profiles_role_guard') = 1,
    'role guard missing or duplicated after rerun');
end $$;

-- behaviour still right after the rerun
do $$
begin
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a3', true);
  set local role authenticated;
  perform t.fail_unless((select count(*) from material_entries) = 0, 'buyer sees entries after rerun');
  reset role;
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a2', true);
  set local role authenticated;
  perform t.fail_unless((select count(*) from material_entries) > 0, 'manager sees nothing after rerun');
  reset role;
end $$;

\echo ALL MATERIAL LOG SQL TESTS PASSED
