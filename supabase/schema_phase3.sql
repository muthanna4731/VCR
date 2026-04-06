-- ============================================================
-- VCR RealEstateOS — Phase 3 Schema Additions
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- Run AFTER schema.sql
-- ============================================================

-- ──────────────────────────────────────────────────────────────
-- PROFILES (extends Supabase auth.users)
-- ──────────────────────────────────────────────────────────────

create table if not exists profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  full_name  text,
  phone      text,
  role       text not null default 'manager' check (role in ('owner', 'manager')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ──────────────────────────────────────────────────────────────
-- PLOT OVERLAYS (polygon coordinates for site map)
-- ──────────────────────────────────────────────────────────────

create table if not exists plot_overlays (
  id             uuid    primary key default uuid_generate_v4(),
  plot_id        uuid    not null unique references plots(id) on delete cascade,
  layout_id      uuid    not null references site_layouts(id) on delete cascade,
  overlay_type   text    not null default 'polygon',
  coordinates    jsonb   not null,      -- [{x: %, y: %}, ...] percentage-based
  label_position jsonb,                 -- {x: %, y: %} center label anchor
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists idx_plot_overlays_layout_id on plot_overlays(layout_id);
create index if not exists idx_plot_overlays_plot_id   on plot_overlays(plot_id);

-- ──────────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY — PROFILES
-- ──────────────────────────────────────────────────────────────

alter table profiles      enable row level security;
alter table plot_overlays enable row level security;

-- Authenticated users can read all profiles
create policy "profiles_auth_read" on profiles
  for select using (auth.role() = 'authenticated');

-- Users can insert and update their own profile
create policy "profiles_self_insert" on profiles
  for insert with check (auth.uid() = id);

create policy "profiles_self_update" on profiles
  for update using (auth.uid() = id);

-- ──────────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY — AUTH ADMIN FULL ACCESS
-- Authenticated users (owner/manager) can do full CRUD
-- These are added alongside existing public-read policies (OR'd)
-- ──────────────────────────────────────────────────────────────

-- Cities: auth full CRUD
create policy "cities_auth_all" on cities
  for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- Layouts: auth can read ALL (including unpublished) + write
create policy "layouts_auth_all" on site_layouts
  for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- Plots: auth full CRUD
create policy "plots_auth_all" on plots
  for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- Enquiries: auth can read all
create policy "enquiries_auth_read" on enquiries
  for select using (auth.role() = 'authenticated');

-- Plot overlays: public can read (so SiteMap can display them), auth can write
create policy "overlays_public_read" on plot_overlays
  for select using (true);

create policy "overlays_auth_write" on plot_overlays
  for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- ──────────────────────────────────────────────────────────────
-- TRIGGER: auto-create profile on user signup
-- ──────────────────────────────────────────────────────────────

create or replace function handle_new_user()
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

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();
