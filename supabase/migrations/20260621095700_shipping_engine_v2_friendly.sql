-- ============================================================
-- SQL Migration: Shipping Engine v2 - Friendly Groupings
-- Date: 2026-06-21
-- ============================================================

-- 1. Add columns to logisticke_sablony
ALTER TABLE public.logisticke_sablony
  ADD COLUMN IF NOT EXISTS zeme_puvodu TEXT,
  ADD COLUMN IF NOT EXISTS typ_dopravy TEXT;

-- 2. Populate columns for existing standard templates
UPDATE public.logisticke_sablony SET zeme_puvodu = 'CN', typ_dopravy = 'balik_standard' WHERE nazev = 'Čína - UPS Express Saver';
UPDATE public.logisticke_sablony SET zeme_puvodu = 'IT', typ_dopravy = 'balik_standard' WHERE nazev = 'Itálie - FedEx Rovnoměrné';
UPDATE public.logisticke_sablony SET zeme_puvodu = 'IT', typ_dopravy = 'balik_dlouhy'   WHERE nazev = 'Itálie - UPS/FedEx Dlouhé';
UPDATE public.logisticke_sablony SET zeme_puvodu = 'CZ', typ_dopravy = 'balik_dlouhy'   WHERE nazev = 'Česko - GLS/TOPTRANS Dlouhé';
UPDATE public.logisticke_sablony SET zeme_puvodu = 'DE', typ_dopravy = 'balik_dlouhy'   WHERE nazev = 'Německo - GLS/UPS Dlouhé';
UPDATE public.logisticke_sablony SET zeme_puvodu = 'DE', typ_dopravy = 'balik_standard' WHERE nazev = 'Německo - GLS Rovnoměrné';
UPDATE public.logisticke_sablony SET zeme_puvodu = 'DE', typ_dopravy = 'paleta'         WHERE nazev = 'Německo - Paleta';
UPDATE public.logisticke_sablony SET zeme_puvodu = 'ES', typ_dopravy = 'paleta'         WHERE nazev = 'Španělsko - Paleta';
UPDATE public.logisticke_sablony SET zeme_puvodu = 'FR', typ_dopravy = 'paleta'         WHERE nazev = 'Francie - Paleta';
UPDATE public.logisticke_sablony SET zeme_puvodu = 'FR', typ_dopravy = 'balik_standard' WHERE nazev = 'Francie - GLS Rovnoměrné';
UPDATE public.logisticke_sablony SET zeme_puvodu = 'PL', typ_dopravy = 'balik_standard' WHERE nazev = 'Polsko - GLS/UPS Rovnoměrné';
UPDATE public.logisticke_sablony SET zeme_puvodu = 'PL', typ_dopravy = 'sacek_lq'       WHERE nazev = 'Polsko LQ - BAPCO Fixní';
UPDATE public.logisticke_sablony SET zeme_puvodu = 'NL', typ_dopravy = 'balik_standard' WHERE nazev = 'Nizozemsko - GLS/UPS Rovnoměrné';

-- 3. Add CHECK constraints to enforce values
ALTER TABLE public.logisticke_sablony
  DROP CONSTRAINT IF EXISTS chk_zeme_puvodu,
  DROP CONSTRAINT IF EXISTS chk_typ_dopravy;

ALTER TABLE public.logisticke_sablony
  ADD CONSTRAINT chk_zeme_puvodu CHECK (zeme_puvodu IN ('CZ', 'CN', 'IT', 'DE', 'PL', 'NL', 'ES', 'FR', 'other')),
  ADD CONSTRAINT chk_typ_dopravy CHECK (typ_dopravy IN ('balik_standard', 'balik_dlouhy', 'sacek_lq', 'paleta', 'custom'));
