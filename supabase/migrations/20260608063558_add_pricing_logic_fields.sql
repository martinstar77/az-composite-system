-- 1. Přidání maržových hladin a celních parametrů k produktům
ALTER TABLE produkty 
ADD COLUMN cilova_marze_retail_procenta NUMERIC(5, 2) DEFAULT 30.00,
ADD COLUMN cilova_marze_partner_procenta NUMERIC(5, 2) DEFAULT 20.00,
ADD COLUMN cilova_marze_vip_procenta NUMERIC(5, 2) DEFAULT 15.00,
ADD COLUMN clo_procenta NUMERIC(5, 2) DEFAULT 0.00;

-- 2. Rozšíření globálního nastavení o logistické koeficienty
ALTER TABLE globalni_nastaveni_financi
ADD COLUMN doprava_eur_za_kg NUMERIC(10, 2) DEFAULT 2.50, -- Odhadovaná cena dopravy
ADD COLUMN clo_default_procenta NUMERIC(5, 2) DEFAULT 0.00;

-- 3. Zajištění, že se změny projeví v RLS (jsou už povoleny z minula)
