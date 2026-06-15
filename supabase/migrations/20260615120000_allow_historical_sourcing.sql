-- Migration: Allow historical sourcing pricing records by replacing strict UNIQUE constraint with a partial index.
-- Path: supabase/migrations/20260615120000_allow_historical_sourcing.sql

-- 1. Drop the old unique constraint on (produkt_id, dodavatel_id)
ALTER TABLE produkt_dodavatel DROP CONSTRAINT IF EXISTS produkt_dodavatel_produkt_id_dodavatel_id_key;

-- 2. Create a partial unique index allowing only ONE active record per product-supplier pair.
-- This allows historical (soft-deleted) entries to coexist.
CREATE UNIQUE INDEX IF NOT EXISTS unique_active_produkt_dodavatel 
ON produkt_dodavatel (produkt_id, dodavatel_id) 
WHERE (deleted_at IS NULL);
