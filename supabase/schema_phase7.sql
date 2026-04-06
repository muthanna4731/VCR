-- ============================================================
-- Phase 7: Buyer Portal
-- Run this in Supabase SQL Editor after schema_phase6.sql
-- ============================================================

-- ─── Link buyer user accounts to payment plans ────────────
ALTER TABLE payment_plans
  ADD COLUMN IF NOT EXISTS buyer_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- ─── Link buyer user accounts to visit schedules ──────────
ALTER TABLE visit_schedules
  ADD COLUMN IF NOT EXISTS buyer_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- ─── Index for fast buyer lookups ─────────────────────────
CREATE INDEX IF NOT EXISTS idx_payment_plans_buyer_user_id ON payment_plans(buyer_user_id);
CREATE INDEX IF NOT EXISTS idx_visit_schedules_buyer_user_id ON visit_schedules(buyer_user_id);

-- ─── RLS: buyers can read their own payment plan ──────────
-- Note: The existing "auth can manage payments" policy (Phase 5) gives all
-- authenticated users full CRUD. The policy below is additive and documents
-- buyer-scoped intent. For strict isolation in production, replace the
-- Phase 5 "auth full CRUD" policies with separate owner/manager and buyer policies.

CREATE POLICY "buyers can view their payment plan"
  ON payment_plans FOR SELECT TO authenticated
  USING (buyer_user_id = auth.uid());

-- ─── RLS: buyers can read their installments ──────────────
CREATE POLICY "buyers can view their installments"
  ON payment_installments FOR SELECT TO authenticated
  USING (
    plan_id IN (
      SELECT id FROM payment_plans WHERE buyer_user_id = auth.uid()
    )
  );

-- ─── RLS: buyers can read their site visits ───────────────
CREATE POLICY "buyers can view their visits"
  ON visit_schedules FOR SELECT TO authenticated
  USING (buyer_user_id = auth.uid());

-- ─── Note on documents ────────────────────────────────────
-- Documents with is_buyer_visible = true already have anon SELECT access
-- (set in schema_phase5.sql). Buyers querying their plot's documents will
-- work without additional RLS changes. The buyer portal filters by
-- plot_id (obtained from their payment plan) and is_buyer_visible = true.
