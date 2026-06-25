-- ============================================================
-- PLÁNOVACÍ MODUL — Přidání lokality a barvy pro úkoly / schůzky
-- ============================================================

-- 1. Přidání sloupce lokalita (pro schůzky/místa) a barva (pro custom vizualizaci v kalendáři)
ALTER TABLE public.ukoly_planovani 
ADD COLUMN IF NOT EXISTS lokalita TEXT,
ADD COLUMN IF NOT EXISTS barva TEXT;
