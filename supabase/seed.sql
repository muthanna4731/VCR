-- ============================================================
-- VCR RealEstateOS — Seed Data (Mock / Placeholder)
-- Run AFTER schema.sql in: Supabase Dashboard → SQL Editor
-- Replace with real VCR data before going live.
-- ============================================================

-- ──────────────────────────────────────────────────────────────
-- CITIES
-- ──────────────────────────────────────────────────────────────

insert into cities (name, state, sort_order) values
  ('Mysore',    'Karnataka', 0),
  ('Hunsur',    'Karnataka', 1),
  ('Bangalore', 'Karnataka', 2);

-- ──────────────────────────────────────────────────────────────
-- SITE LAYOUTS
-- ──────────────────────────────────────────────────────────────

insert into site_layouts (city_id, name, slug, description, address, is_published) values
  (
    (select id from cities where name = 'Mysore'),
    'Hunsur Icon City',
    'hunsur-icon-city',
    'Premium gated community with 100% Vastu-compliant plots in a prime Mysore location.',
    'Mysore Ring Road, Mysore',
    true
  ),
  (
    (select id from cities where name = 'Mysore'),
    'Kapila Weekend Villa',
    'kapila-weekend-villa',
    'Weekend getaway plots surrounded by nature, just 20 minutes from Mysore city.',
    'Nanjangud Road, Mysore',
    true
  ),
  (
    (select id from cities where name = 'Hunsur'),
    'VCR Green Valley',
    'vcr-green-valley',
    'Spacious plots in a serene setting with wide roads and modern amenities.',
    'Hunsur Main Road, Hunsur',
    true
  ),
  (
    (select id from cities where name = 'Bangalore'),
    'Hosa City',
    'hosa-city',
    'Urban plots with excellent connectivity to Bangalore IT corridor.',
    'Hosur Road, Bangalore',
    true
  );

-- ──────────────────────────────────────────────────────────────
-- PLOTS — Hunsur Icon City
-- ──────────────────────────────────────────────────────────────

insert into plots (layout_id, plot_number, dimensions, dimension_sqft, facing, status, price_per_sqft, total_price, corner_plot, road_width, amenities) values
  ((select id from site_layouts where slug = 'hunsur-icon-city'), 'A-1', '40x60', 2400, 'North', 'available',   2500, 6000000,  true,  '30ft', ARRAY['park_facing','main_road']),
  ((select id from site_layouts where slug = 'hunsur-icon-city'), 'A-2', '30x40', 1200, 'North', 'available',   2200, 2640000,  false, '30ft', ARRAY[]::text[]),
  ((select id from site_layouts where slug = 'hunsur-icon-city'), 'A-3', '30x40', 1200, 'North', 'negotiation', 2200, 2640000,  false, '30ft', ARRAY[]::text[]),
  ((select id from site_layouts where slug = 'hunsur-icon-city'), 'A-4', '40x60', 2400, 'North', 'sold',        2500, 6000000,  false, '30ft', ARRAY['park_facing']),
  ((select id from site_layouts where slug = 'hunsur-icon-city'), 'A-5', '50x80', 4000, 'North', 'available',   2800, 11200000, true,  '40ft', ARRAY['main_road']),
  ((select id from site_layouts where slug = 'hunsur-icon-city'), 'B-1', '40x60', 2400, 'East',  'available',   2400, 5760000,  false, '30ft', ARRAY[]::text[]),
  ((select id from site_layouts where slug = 'hunsur-icon-city'), 'B-2', '30x40', 1200, 'East',  'sold',        2100, 2520000,  false, '30ft', ARRAY[]::text[]),
  ((select id from site_layouts where slug = 'hunsur-icon-city'), 'B-3', '30x40', 1200, 'East',  'available',   2100, 2520000,  false, '30ft', ARRAY[]::text[]),
  ((select id from site_layouts where slug = 'hunsur-icon-city'), 'B-4', '40x60', 2400, 'East',  'negotiation', 2400, 5760000,  true,  '40ft', ARRAY['main_road']),
  ((select id from site_layouts where slug = 'hunsur-icon-city'), 'C-1', '40x60', 2400, 'South', 'available',   2300, 5520000,  false, '30ft', ARRAY[]::text[]),
  ((select id from site_layouts where slug = 'hunsur-icon-city'), 'C-2', '30x40', 1200, 'South', 'available',   2000, 2400000,  false, '30ft', ARRAY[]::text[]),
  ((select id from site_layouts where slug = 'hunsur-icon-city'), 'C-3', '50x80', 4000, 'South', 'blocked',     2600, 10400000, false, '40ft', ARRAY['park_facing']),
  ((select id from site_layouts where slug = 'hunsur-icon-city'), 'D-1', '40x60', 2400, 'West',  'available',   2200, 5280000,  true,  '30ft', ARRAY['main_road']),
  ((select id from site_layouts where slug = 'hunsur-icon-city'), 'D-2', '30x40', 1200, 'West',  'sold',        1900, 2280000,  false, '30ft', ARRAY[]::text[]);

-- ──────────────────────────────────────────────────────────────
-- PLOTS — Kapila Weekend Villa
-- ──────────────────────────────────────────────────────────────

insert into plots (layout_id, plot_number, dimensions, dimension_sqft, facing, status, price_per_sqft, total_price, corner_plot, road_width, amenities) values
  ((select id from site_layouts where slug = 'kapila-weekend-villa'), 'A-1', '40x60', 2400, 'North', 'available',   1800, 4320000, true,  '30ft', ARRAY['park_facing']),
  ((select id from site_layouts where slug = 'kapila-weekend-villa'), 'A-2', '40x60', 2400, 'North', 'sold',        1800, 4320000, false, '30ft', ARRAY[]::text[]),
  ((select id from site_layouts where slug = 'kapila-weekend-villa'), 'A-3', '30x40', 1200, 'North', 'available',   1600, 1920000, false, '30ft', ARRAY[]::text[]),
  ((select id from site_layouts where slug = 'kapila-weekend-villa'), 'B-1', '40x60', 2400, 'East',  'negotiation', 1700, 4080000, false, '30ft', ARRAY[]::text[]),
  ((select id from site_layouts where slug = 'kapila-weekend-villa'), 'B-2', '50x80', 4000, 'East',  'available',   2000, 8000000, true,  '40ft', ARRAY['main_road']),
  ((select id from site_layouts where slug = 'kapila-weekend-villa'), 'C-1', '30x40', 1200, 'South', 'available',   1500, 1800000, false, '30ft', ARRAY[]::text[]),
  ((select id from site_layouts where slug = 'kapila-weekend-villa'), 'C-2', '40x60', 2400, 'South', 'sold',        1700, 4080000, false, '30ft', ARRAY[]::text[]),
  ((select id from site_layouts where slug = 'kapila-weekend-villa'), 'D-1', '40x60', 2400, 'West',  'available',   1600, 3840000, false, '30ft', ARRAY[]::text[]);

-- ──────────────────────────────────────────────────────────────
-- PLOTS — VCR Green Valley
-- ──────────────────────────────────────────────────────────────

insert into plots (layout_id, plot_number, dimensions, dimension_sqft, facing, status, price_per_sqft, total_price, corner_plot, road_width, amenities) values
  ((select id from site_layouts where slug = 'vcr-green-valley'), 'A-1', '40x60', 2400, 'North', 'available',   1500, 3600000, true,  '30ft', ARRAY['park_facing','main_road']),
  ((select id from site_layouts where slug = 'vcr-green-valley'), 'A-2', '40x60', 2400, 'North', 'available',   1500, 3600000, false, '30ft', ARRAY[]::text[]),
  ((select id from site_layouts where slug = 'vcr-green-valley'), 'A-3', '30x40', 1200, 'North', 'negotiation', 1300, 1560000, false, '30ft', ARRAY[]::text[]),
  ((select id from site_layouts where slug = 'vcr-green-valley'), 'B-1', '50x80', 4000, 'East',  'available',   1700, 6800000, true,  '40ft', ARRAY['main_road']),
  ((select id from site_layouts where slug = 'vcr-green-valley'), 'B-2', '40x60', 2400, 'East',  'sold',        1400, 3360000, false, '30ft', ARRAY[]::text[]),
  ((select id from site_layouts where slug = 'vcr-green-valley'), 'B-3', '30x40', 1200, 'East',  'available',   1200, 1440000, false, '30ft', ARRAY[]::text[]),
  ((select id from site_layouts where slug = 'vcr-green-valley'), 'C-1', '40x60', 2400, 'South', 'available',   1400, 3360000, false, '30ft', ARRAY['park_facing']),
  ((select id from site_layouts where slug = 'vcr-green-valley'), 'C-2', '30x40', 1200, 'South', 'available',   1200, 1440000, false, '30ft', ARRAY[]::text[]),
  ((select id from site_layouts where slug = 'vcr-green-valley'), 'D-1', '40x60', 2400, 'West',  'sold',        1300, 3120000, false, '30ft', ARRAY[]::text[]),
  ((select id from site_layouts where slug = 'vcr-green-valley'), 'D-2', '30x40', 1200, 'West',  'available',   1100, 1320000, false, '30ft', ARRAY[]::text[]);

-- ──────────────────────────────────────────────────────────────
-- PLOTS — Hosa City
-- ──────────────────────────────────────────────────────────────

insert into plots (layout_id, plot_number, dimensions, dimension_sqft, facing, status, price_per_sqft, total_price, corner_plot, road_width, amenities) values
  ((select id from site_layouts where slug = 'hosa-city'), 'A-1', '30x40', 1200, 'North', 'sold',        3500, 4200000,  true,  '30ft', ARRAY['main_road']),
  ((select id from site_layouts where slug = 'hosa-city'), 'A-2', '30x40', 1200, 'North', 'sold',        3200, 3840000,  false, '30ft', ARRAY[]::text[]),
  ((select id from site_layouts where slug = 'hosa-city'), 'A-3', '40x60', 2400, 'North', 'available',   3800, 9120000,  false, '30ft', ARRAY[]::text[]),
  ((select id from site_layouts where slug = 'hosa-city'), 'A-4', '40x60', 2400, 'North', 'negotiation', 3800, 9120000,  true,  '40ft', ARRAY['park_facing']),
  ((select id from site_layouts where slug = 'hosa-city'), 'B-1', '30x40', 1200, 'East',  'available',   3000, 3600000,  false, '30ft', ARRAY[]::text[]),
  ((select id from site_layouts where slug = 'hosa-city'), 'B-2', '50x80', 4000, 'East',  'available',   4000, 16000000, true,  '40ft', ARRAY['main_road','park_facing']),
  ((select id from site_layouts where slug = 'hosa-city'), 'B-3', '30x40', 1200, 'East',  'sold',        3000, 3600000,  false, '30ft', ARRAY[]::text[]),
  ((select id from site_layouts where slug = 'hosa-city'), 'C-1', '40x60', 2400, 'South', 'available',   3500, 8400000,  false, '30ft', ARRAY[]::text[]),
  ((select id from site_layouts where slug = 'hosa-city'), 'C-2', '30x40', 1200, 'South', 'negotiation', 2800, 3360000,  false, '30ft', ARRAY[]::text[]),
  ((select id from site_layouts where slug = 'hosa-city'), 'D-1', '40x60', 2400, 'West',  'available',   3200, 7680000,  true,  '40ft', ARRAY['main_road']),
  ((select id from site_layouts where slug = 'hosa-city'), 'D-2', '30x40', 1200, 'West',  'sold',        2800, 3360000,  false, '30ft', ARRAY[]::text[]);
