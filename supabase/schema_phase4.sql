-- ============================================================
-- Phase 4: Agent System + Leads
-- Run this in Supabase SQL Editor after schema_phase3.sql
-- ============================================================

-- ─── agents ───────────────────────────────────────────────
CREATE TABLE agents (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name       TEXT NOT NULL,
  phone      TEXT,
  email      TEXT,
  photo_url  TEXT,
  is_active  BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ─── agent ↔ layout assignments (many-to-many) ───────────
CREATE TABLE agent_layout_assignments (
  agent_id    UUID REFERENCES agents(id) ON DELETE CASCADE,
  layout_id   UUID REFERENCES site_layouts(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (agent_id, layout_id)
);

-- ─── alter enquiries: add lead pipeline fields ────────────
ALTER TABLE enquiries
  ADD COLUMN IF NOT EXISTS lead_status TEXT DEFAULT 'new'
    CHECK (lead_status IN ('new', 'contacted', 'visit_scheduled', 'converted', 'dropped')),
  ADD COLUMN IF NOT EXISTS agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- ─── visit_schedules ──────────────────────────────────────
CREATE TABLE visit_schedules (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  enquiry_id    UUID REFERENCES enquiries(id) ON DELETE SET NULL,
  layout_id     UUID REFERENCES site_layouts(id) ON DELETE CASCADE NOT NULL,
  agent_id      UUID REFERENCES agents(id) ON DELETE SET NULL,
  visitor_name  TEXT NOT NULL,
  visitor_phone TEXT NOT NULL,
  scheduled_at  TIMESTAMPTZ NOT NULL,
  status        TEXT DEFAULT 'pending'
    CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- ─── RLS ──────────────────────────────────────────────────
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_layout_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE visit_schedules ENABLE ROW LEVEL SECURITY;

-- agents: auth full CRUD, anon read active only
CREATE POLICY "auth can manage agents"
  ON agents FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "public can read active agents"
  ON agents FOR SELECT TO anon
  USING (is_active = true);

-- agent_layout_assignments: auth only
CREATE POLICY "auth can manage agent assignments"
  ON agent_layout_assignments FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- visit_schedules: auth full CRUD, anon can insert (public booking)
CREATE POLICY "auth can manage visits"
  ON visit_schedules FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "public can book visits"
  ON visit_schedules FOR INSERT TO anon
  WITH CHECK (true);

-- enquiries: update existing auth policies to include new columns
-- (existing "auth users read all enquiries" policy covers SELECT;
--  the new columns are covered automatically since RLS is row-level)
