-- Migration: Add weight lock toggle to products
-- Date: 2026-06-29
-- Purpose: Allow locking manually entered weights to prevent recalculation.

ALTER TABLE produkty ADD COLUMN IF NOT EXISTS hmotnost_zafixovana BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN produkty.hmotnost_zafixovana IS 'Označuje, zda je hmotnost balíku zafixována uživatelem a chráněna před hromadným přepočtem.';
