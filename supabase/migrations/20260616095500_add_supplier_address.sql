-- Přidání sloupce adresa typu JSONB k dodavatelům
ALTER TABLE dodavatele 
ADD COLUMN IF NOT EXISTS adresa JSONB DEFAULT '{}'::jsonb NOT NULL;
