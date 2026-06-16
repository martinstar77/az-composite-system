-- Přidání sloupce pro rozlišení automaticky generovaného názvu produktu
ALTER TABLE produkty 
ADD COLUMN IF NOT EXISTS is_name_generated BOOLEAN DEFAULT true NOT NULL;
