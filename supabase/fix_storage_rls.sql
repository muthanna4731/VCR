-- ============================================================
-- Fix: Storage RLS for image uploads
-- Run this in Supabase SQL Editor
-- Fixes "new row violates row level security policy" on image upload
-- ============================================================

-- Allow authenticated users to upload to layout-images bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('layout-images', 'layout-images', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('payment-receipts', 'payment-receipts', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', true)
ON CONFLICT (id) DO NOTHING;

-- ─── layout-images policies ───────────────────────────────
CREATE POLICY "auth can upload layout images"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'layout-images');

CREATE POLICY "auth can update layout images"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'layout-images');

CREATE POLICY "auth can delete layout images"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'layout-images');

CREATE POLICY "public can view layout images"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'layout-images');

-- ─── payment-receipts policies ───────────────────────────
CREATE POLICY "auth can upload payment receipts"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'payment-receipts');

CREATE POLICY "auth can update payment receipts"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'payment-receipts');

CREATE POLICY "public can view payment receipts"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'payment-receipts');

-- ─── documents policies ──────────────────────────────────
CREATE POLICY "auth can upload documents"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'documents');

CREATE POLICY "auth can update documents"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'documents');

CREATE POLICY "auth can delete documents"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'documents');

CREATE POLICY "public can view documents"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'documents');
