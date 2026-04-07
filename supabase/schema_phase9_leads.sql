-- ============================================================
-- Phase 9: Lead channel of enquiry + lead↔visit link + document links
-- Run in: Supabase Dashboard → SQL Editor
-- ============================================================

-- Add Google Docs / Drive link to documents (privacy: share link instead of raw file)
ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS google_doc_url TEXT;

-- Add channel column to enquiries
ALTER TABLE enquiries
  ADD COLUMN IF NOT EXISTS channel TEXT DEFAULT 'other'
    CHECK (channel IN ('website', 'site_visit', 'referral', 'phone', 'agent', 'social', 'other'));

-- Fix lead_status constraint to include 'visit_completed'
-- (code already uses this value but the original DB constraint doesn't include it)
ALTER TABLE enquiries
  DROP CONSTRAINT IF EXISTS enquiries_lead_status_check;

ALTER TABLE enquiries
  ADD CONSTRAINT enquiries_lead_status_check
    CHECK (lead_status IN ('new', 'contacted', 'visit_scheduled', 'visit_completed', 'converted', 'dropped'));
