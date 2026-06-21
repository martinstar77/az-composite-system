-- Migration: Add 'jazyk' to public.doklady
-- Path: supabase/migrations/20260620163500_add_jazyk_to_doklady.sql

ALTER TABLE public.doklady 
ADD COLUMN IF NOT EXISTS jazyk TEXT NOT NULL DEFAULT 'cs' CHECK (jazyk IN ('cs', 'en'));
