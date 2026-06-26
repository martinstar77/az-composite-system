-- Migration: Add columns for meeting workspace to ukoly_planovani
-- Created At: 2026-06-26

ALTER TABLE public.ukoly_planovani
ADD COLUMN IF NOT EXISTS agenda JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS zapis TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES public.ukoly_planovani(id) ON DELETE SET NULL;

-- Index pro vyhledávání podúkolů/akčních kroků schůzky
CREATE INDEX IF NOT EXISTS idx_ukoly_planovani_parent_id ON public.ukoly_planovani(parent_id);
