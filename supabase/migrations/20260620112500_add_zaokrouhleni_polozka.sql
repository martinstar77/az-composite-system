-- Migration: Add 'zaokrouhleni' to public.doklady_polozky.typ CHECK constraint
-- Path: supabase/migrations/20260620112500_add_zaokrouhleni_polozka.sql

DO $$
DECLARE
    r RECORD;
BEGIN
    -- Vyhledáme a odstraníme stávající CHECK constrainty na sloupci 'typ' v tabulce 'doklady_polozky'
    FOR r IN
        SELECT constraint_name
        FROM information_schema.constraint_column_usage
        WHERE table_name = 'doklady_polozky' AND column_name = 'typ'
          AND constraint_name LIKE '%_check%'
    LOOP
        EXECUTE 'ALTER TABLE public.doklady_polozky DROP CONSTRAINT ' || quote_ident(r.constraint_name);
    END LOOP;
END $$;

-- Přidáme nový constraint s povoleným typem 'zaokrouhleni'
ALTER TABLE public.doklady_polozky 
ADD CONSTRAINT doklady_polozky_typ_check 
CHECK (typ IN ('produkt', 'volna_polozka', 'sleva', 'zalohovy_odpocet', 'text_radek', 'zaokrouhleni'));
