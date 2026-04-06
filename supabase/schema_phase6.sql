-- ============================================================
-- Phase 6: Agent Mobile + GPS Presence
-- Run this in Supabase SQL Editor after schema_phase5.sql
-- ============================================================

-- ─── Add GPS + geofence fields to site_layouts ───────────
ALTER TABLE site_layouts
  ADD COLUMN IF NOT EXISTS latitude         NUMERIC(10,7),
  ADD COLUMN IF NOT EXISTS longitude        NUMERIC(10,7),
  ADD COLUMN IF NOT EXISTS geofence_radius_m INT DEFAULT 200;

-- ─── agent_presence_logs ─────────────────────────────────
CREATE TABLE agent_presence_logs (
  id                 UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id           UUID REFERENCES agents(id) ON DELETE SET NULL,
  layout_id          UUID REFERENCES site_layouts(id) ON DELETE SET NULL,
  client_name        TEXT,
  client_phone       TEXT,
  latitude           NUMERIC(10,7),
  longitude          NUMERIC(10,7),
  is_within_geofence BOOLEAN,
  distance_m         NUMERIC(8,1),
  notes              TEXT,
  logged_at          TIMESTAMPTZ DEFAULT now()
);

-- ─── RLS ──────────────────────────────────────────────────
ALTER TABLE agent_presence_logs ENABLE ROW LEVEL SECURITY;

-- Authenticated admins/managers: full CRUD
CREATE POLICY "auth can manage presence logs"
  ON agent_presence_logs FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Agents (anon) can INSERT (public /agent page, no login required)
CREATE POLICY "public can insert presence logs"
  ON agent_presence_logs FOR INSERT TO anon
  WITH CHECK (true);
