-- ============================================================
-- Phase 1.8: General Product Notes
-- Adds general notes field (poznamka) to products table.
-- ============================================================

ALTER TABLE produkty
  ADD COLUMN IF NOT EXISTS poznamka TEXT;

COMMENT ON COLUMN produkty.poznamka IS 'General product notes – general commentary or notes for internal/administrative use.';
