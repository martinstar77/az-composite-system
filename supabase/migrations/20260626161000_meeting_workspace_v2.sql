-- Migration: Meeting Workspace v2 - CRM fields, Portfolio Prunik, Cil Schuzky
-- Created At: 2026-06-26

-- 1. Rozšíření tabulky zakaznici o CRM pole
ALTER TABLE public.zakaznici 
ADD COLUMN IF NOT EXISTS pocet_zamestnancu INTEGER DEFAULT NULL,
ADD COLUMN IF NOT EXISTS odhadovany_obrat TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS je_dluznik BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS mesicni_fakturace NUMERIC(12,2) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS pouzivane_technologie TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS pozadovane_technologie TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS portfolio_prunik JSONB DEFAULT '{}'::jsonb;

-- 2. Přidání sloupce cil_schuzky do tabulky udalosti_planovani
ALTER TABLE public.udalosti_planovani
ADD COLUMN IF NOT EXISTS cil_schuzky TEXT DEFAULT NULL;

-- 3. Vytvoření GIN indexu pro rychlejší vyhledávání v portfolio_prunik
CREATE INDEX IF NOT EXISTS idx_zakaznici_portfolio_prunik ON public.zakaznici USING gin (portfolio_prunik);
