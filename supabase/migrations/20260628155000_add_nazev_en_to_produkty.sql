-- Migration: Add bilingual English name column to products
-- Date: 2026-06-28
-- Purpose: Support CS/EN bilingual product catalog export

ALTER TABLE produkty ADD COLUMN IF NOT EXISTS nazev_en TEXT;

COMMENT ON COLUMN produkty.nazev_en IS 'Anglický název produktu (auto-generovaný, editovatelný). Primární název (nazev) je vždy česky.';
