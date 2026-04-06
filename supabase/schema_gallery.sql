-- ============================================================
-- Gallery: layout_media table
-- Run this in Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS layout_media (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  layout_id     UUID        NOT NULL REFERENCES site_layouts(id) ON DELETE CASCADE,
  type          TEXT        NOT NULL CHECK (type IN ('photo', 'video')),
  url           TEXT        NOT NULL,          -- full-res photo or video URL
  thumbnail_url TEXT,                          -- low-res photo thumb or video poster frame
  caption       TEXT,
  sort_order    INT         NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_layout_media_layout_id ON layout_media(layout_id);

ALTER TABLE layout_media ENABLE ROW LEVEL SECURITY;

-- Public can view media for published layouts
CREATE POLICY "public can view layout media"
  ON layout_media FOR SELECT TO anon
  USING (
    layout_id IN (
      SELECT id FROM site_layouts WHERE is_published = true
    )
  );

-- Authenticated users (admins) can do full CRUD
CREATE POLICY "auth can manage layout media"
  ON layout_media FOR ALL TO authenticated
  USING (true) WITH CHECK (true);
