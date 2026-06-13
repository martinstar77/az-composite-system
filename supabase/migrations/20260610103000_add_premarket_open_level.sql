-- Migration to add 'Premarket Open' pricing level to produkty and c_kategorie

-- 1. Add column to produkty table
ALTER TABLE produkty
ADD COLUMN cilova_marze_premarket_open_procenta NUMERIC(5, 2) DEFAULT 10.00;

-- 2. Add column to c_kategorie table
ALTER TABLE c_kategorie
ADD COLUMN def_marze_premarket_open_procenta NUMERIC(5, 2) DEFAULT 10.00;
