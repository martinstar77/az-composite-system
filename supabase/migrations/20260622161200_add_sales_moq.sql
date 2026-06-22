-- ============================================================
-- Phase 1.7: Sales MOQ Fields
-- Adds customer-facing minimum order quantity to products.
--
-- Context:
--   produkt_dodavatel.moq = PROCUREMENT MOQ (min. we must buy from supplier)
--   produkty.moq_prodejni  = SALES MOQ (min. customer must buy from us)
-- ============================================================

ALTER TABLE produkty
  ADD COLUMN IF NOT EXISTS moq_prodejni  NUMERIC(10,0) DEFAULT 1,
  ADD COLUMN IF NOT EXISTS moq_poznamka  TEXT;

COMMENT ON COLUMN produkty.moq_prodejni IS 'Sales-side Minimum Order Quantity – minimum units a customer must order. Different from procurement MOQ in produkt_dodavatel.moq.';
COMMENT ON COLUMN produkty.moq_poznamka IS 'Optional note explaining the MOQ constraint, e.g. "Prodáváme výhradně po celých kartonech (20 ks)".';
