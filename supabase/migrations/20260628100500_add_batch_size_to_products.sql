-- Migrace pro přidání simulované velikosti objednávky
ALTER TABLE produkty ADD COLUMN simulovana_velikost_objednavky INTEGER DEFAULT 1 NOT NULL CHECK (simulovana_velikost_objednavky > 0);
