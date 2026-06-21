-- Migration: Add 'tisk_podpisu' to public.doklady
-- Path: supabase/migrations/20260620170000_add_tisk_podpisu_to_doklady.sql

ALTER TABLE public.doklady 
ADD COLUMN IF NOT EXISTS tisk_podpisu BOOLEAN NOT NULL DEFAULT true;
