-- ============================================================
-- Phase 5: Payments + Documents
-- Run this in Supabase SQL Editor after schema_phase4.sql
-- ============================================================

-- ─── payment_plans: one per booked/sold plot ─────────────
CREATE TABLE payment_plans (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  plot_id      UUID REFERENCES plots(id) ON DELETE CASCADE NOT NULL UNIQUE,
  buyer_name   TEXT NOT NULL,
  buyer_phone  TEXT,
  total_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  notes        TEXT,
  created_at   TIMESTAMPTZ DEFAULT now(),
  updated_at   TIMESTAMPTZ DEFAULT now()
);

-- ─── payment_installments: N per plan ────────────────────
CREATE TABLE payment_installments (
  id                 UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_id            UUID REFERENCES payment_plans(id) ON DELETE CASCADE NOT NULL,
  installment_number INT NOT NULL,
  label              TEXT NOT NULL,        -- e.g. "Token", "1st Installment", "Registration"
  amount             NUMERIC(12,2) NOT NULL DEFAULT 0,
  due_date           DATE,
  paid_at            TIMESTAMPTZ,
  status             TEXT DEFAULT 'pending'
    CHECK (status IN ('pending', 'paid')),
  receipt_url        TEXT,
  notes              TEXT,
  created_at         TIMESTAMPTZ DEFAULT now()
);

-- ─── documents: general property document vault ──────────
CREATE TABLE documents (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  layout_id        UUID REFERENCES site_layouts(id) ON DELETE SET NULL,
  plot_id          UUID REFERENCES plots(id) ON DELETE SET NULL,
  name             TEXT NOT NULL,
  category         TEXT DEFAULT 'other'
    CHECK (category IN ('legal', 'agreement', 'tax', 'receipt', 'other')),
  file_url         TEXT NOT NULL,
  is_buyer_visible BOOLEAN DEFAULT false,
  created_at       TIMESTAMPTZ DEFAULT now()
);

-- ─── Auto-update updated_at on payment_plans ─────────────
CREATE OR REPLACE FUNCTION update_payment_plan_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_payment_plans_updated_at
  BEFORE UPDATE ON payment_plans
  FOR EACH ROW EXECUTE FUNCTION update_payment_plan_updated_at();

-- ─── RLS ──────────────────────────────────────────────────
ALTER TABLE payment_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_installments ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- payment_plans: auth full CRUD only
CREATE POLICY "auth can manage payment plans"
  ON payment_plans FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- payment_installments: auth full CRUD only
CREATE POLICY "auth can manage payment installments"
  ON payment_installments FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- documents: auth full CRUD; anon can read buyer-visible docs
CREATE POLICY "auth can manage documents"
  ON documents FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "public can read buyer visible documents"
  ON documents FOR SELECT TO anon
  USING (is_buyer_visible = true);

-- ─── Supabase Storage buckets needed ─────────────────────
-- Create these in Supabase Dashboard → Storage → New Bucket:
--   1. "payment-receipts"  — NOT public (receipts are private)
--   2. "documents"         — NOT public (documents are private; use signed URLs)
-- Or make them public if signed URL complexity is not desired.
