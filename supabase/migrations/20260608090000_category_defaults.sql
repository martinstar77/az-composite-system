-- Fáze 3.7: Rozšíření kategorií o výchozí hodnoty pro marže a logistiku
ALTER TABLE c_kategorie
ADD COLUMN def_marze_retail_procenta NUMERIC(5, 2) DEFAULT 30.00,
ADD COLUMN def_marze_partner_procenta NUMERIC(5, 2) DEFAULT 20.00,
ADD COLUMN def_marze_vip_procenta NUMERIC(5, 2) DEFAULT 15.00,
ADD COLUMN def_logisticka_sablona_id UUID REFERENCES logisticke_sablony(id);
