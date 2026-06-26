-- Migration: Add typ (event type) to distinguish meetings and customer/supplier appointments
-- Created At: 2026-06-26

ALTER TABLE public.udalosti_planovani
ADD COLUMN IF NOT EXISTS typ TEXT NOT NULL DEFAULT 'meeting' CHECK (typ IN ('meeting', 'schuzka'));

-- Create index for typ column
CREATE INDEX IF NOT EXISTS idx_udalosti_planovani_typ ON public.udalosti_planovani(typ);
