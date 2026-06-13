-- Rozšíření nákupního ceníku o nákupní měrné jednotky a převodní poměry
ALTER TABLE produkt_dodavatel 
ADD COLUMN nakupni_mj_id TEXT REFERENCES c_merne_jednotky(id),
ADD COLUMN prevodni_pomer_na_zakladni NUMERIC(10, 4) DEFAULT 1.0000;
