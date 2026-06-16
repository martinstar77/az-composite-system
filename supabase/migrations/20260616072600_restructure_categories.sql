-- Odstranění starých produktů navázaných na mazané kategorie (pokud existují)
DELETE FROM produkty WHERE kategorie_id IN ('nastroje_strojni', 'polotovary', 'nastroje_rucni');

-- Odstranění starých kategorií z číselníku c_kategorie
DELETE FROM c_kategorie WHERE id IN ('nastroje_strojni', 'polotovary', 'nastroje_rucni');

-- Přidání nových kategorií: Spotřební materiál (Consumables) a Nářadí (Tools)
INSERT INTO c_kategorie (id, nazev, popis) VALUES
('consumables', 'Spotřební materiál (Consumables)', 'BF, RF, PP, BC, ST, FT, FM, FCH, T, C'),
('naradi', 'Nářadí (Tools)', 'BU, QR, SQ')
ON CONFLICT (id) DO UPDATE SET nazev = EXCLUDED.nazev, popis = EXCLUDED.popis;
