-- Minimal stand-ins for the parts of Supabase the material-log migration needs,
-- so the migration can be tested on a plain local Postgres. TEST ONLY: never
-- run this against a real Supabase project.
--
-- Mirrors (see supabase/schema.sql and supabase/schema_phase3.sql):
--   auth.users, auth.uid(), auth.role(), roles anon/authenticated/service_role,
--   public.cities, public.site_layouts, public.profiles (+ its RLS policies),
--   handle_new_user() and the on_auth_user_created trigger.

create schema auth;

create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;

create table auth.users (
  id                 uuid primary key default gen_random_uuid(),
  email              text,
  raw_user_meta_data jsonb
);

-- Real Supabase: auth.uid() reads the JWT 'sub' claim set by PostgREST.
create function auth.uid() returns uuid
language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;

create function auth.role() returns text
language sql stable as $$
  -- Real Supabase reads the JWT 'role' claim; PostgREST also switches the
  -- database role to match it. The tests only switch the database role, so
  -- derive from that (falling back to the claim for superuser sessions).
  select case when current_user in ('anon', 'authenticated', 'service_role')
              then current_user
              else coalesce(nullif(current_setting('request.jwt.claim.role', true), ''), 'anon')
         end
$$;

grant usage on schema auth to anon, authenticated, service_role;
grant execute on all functions in schema auth to anon, authenticated, service_role;

-- Supabase's default privileges: every new table in public is fully granted to
-- anon/authenticated/service_role, so RLS (not grants) is what gets tested
-- unless the migration revokes something on purpose.
grant usage on schema public to anon, authenticated, service_role;
alter default privileges in schema public
  grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public
  grant execute on functions to anon, authenticated, service_role;

create table public.cities (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  state      text not null default 'Karnataka',
  sort_order int  not null default 0,
  created_at timestamptz not null default now()
);

create table public.site_layouts (
  id               uuid primary key default gen_random_uuid(),
  city_id          uuid not null references public.cities(id) on delete cascade,
  name             text not null,
  slug             text not null unique,
  description      text,
  layout_image_url text,
  address          text,
  is_published     boolean not null default false,
  legal_doc_url    text,
  created_at       timestamptz not null default now()
);

-- schema_phase3.sql default is 'manager'; fix_buyer_rls.sql + admin_create_staff
-- add buyer/admin; the task brief also lists agent.
create table public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  full_name  text,
  phone      text,
  role       text not null default 'manager'
             check (role in ('owner','manager','admin','buyer','agent')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
create policy "profiles_auth_read"   on public.profiles for select using (auth.role() = 'authenticated');
create policy "profiles_self_insert" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles_self_update" on public.profiles for update using (auth.uid() = id);

-- schema_phase3.sql version (the migration replaces it)
create function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'role', 'manager')
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
