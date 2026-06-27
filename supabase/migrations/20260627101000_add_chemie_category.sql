-- Přidání nové kategorie: Chemie
INSERT INTO c_kategorie (id, nazev, popis) VALUES
('chemie', 'Chemie', 'Lepidla ve spreji, Blinder, Plnič pórů - Sealer, Separátory/Release agent')
ON CONFLICT (id) DO UPDATE SET nazev = EXCLUDED.nazev, popis = EXCLUDED.popis;
