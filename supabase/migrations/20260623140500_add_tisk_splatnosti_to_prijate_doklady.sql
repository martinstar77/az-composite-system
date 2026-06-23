-- SQL Migration: Add tisk_splatnosti to prijate_doklady
ALTER TABLE public.prijate_doklady ADD COLUMN IF NOT EXISTS tisk_splatnosti BOOLEAN NOT NULL DEFAULT true;
