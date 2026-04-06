-- ============================================================
-- VCR RealEstateOS — Supabase Schema
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ──────────────────────────────────────────────────────────────
-- TABLES
-- ──────────────────────────────────────────────────────────────

create table if not exists cities (
  id         uuid primary key default uuid_generate_v4(),
  name       text not null,
  state      text not null default 'Karnataka',
  sort_order int  not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists site_layouts (
  id               uuid primary key default uuid_generate_v4(),
  city_id          uuid not null references cities(id) on delete cascade,
  name             text not null,
  slug             text not null unique,
  description      text,
  layout_image_url text,
  address          text,
  is_published     boolean not null default false,
  legal_doc_url    text,
  created_at       timestamptz not null default now()
);

create table if not exists plots (
  id             uuid    primary key default uuid_generate_v4(),
  layout_id      uuid    not null references site_layouts(id) on delete cascade,
  plot_number    text    not null,
  dimensions     text    not null,
  dimension_sqft int     not null,
  facing         text    not null check (facing in ('North', 'East', 'South', 'West')),
  status         text    not null default 'available'
                         check (status in ('available', 'negotiation', 'booked', 'sold', 'blocked')),
  price_per_sqft int     not null default 0,
  total_price    bigint  not null default 0,
  corner_plot    boolean not null default false,
  road_width     text,
  amenities      text[]  not null default '{}',
  created_at     timestamptz not null default now()
);

create table if not exists enquiries (
  id         uuid primary key default uuid_generate_v4(),
  plot_id    uuid references plots(id) on delete set null,
  layout_id  uuid references site_layouts(id) on delete set null,
  name       text not null,
  phone      text not null,
  created_at timestamptz not null default now()
);

-- ──────────────────────────────────────────────────────────────
-- INDEXES
-- ──────────────────────────────────────────────────────────────

create index if not exists idx_site_layouts_city_id  on site_layouts(city_id);
create index if not exists idx_site_layouts_slug     on site_layouts(slug);
create index if not exists idx_plots_layout_id       on plots(layout_id);
create index if not exists idx_plots_status          on plots(status);
create index if not exists idx_plots_facing          on plots(facing);
create index if not exists idx_enquiries_layout_id   on enquiries(layout_id);
create index if not exists idx_enquiries_plot_id     on enquiries(plot_id);

-- ──────────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ──────────────────────────────────────────────────────────────

alter table cities       enable row level security;
alter table site_layouts enable row level security;
alter table plots        enable row level security;
alter table enquiries    enable row level security;

-- Public: read all cities
create policy "cities_public_read" on cities
  for select using (true);

-- Public: read published layouts only
create policy "layouts_public_read" on site_layouts
  for select using (is_published = true);

-- Public: read plots of published layouts only
create policy "plots_public_read" on plots
  for select using (
    exists (
      select 1 from site_layouts sl
      where sl.id = plots.layout_id
        and sl.is_published = true
    )
  );

-- Public: anyone can submit an enquiry
create policy "enquiries_public_insert" on enquiries
  for insert with check (true);
