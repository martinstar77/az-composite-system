-- Zajištění existence nových kategorií z SKU_ARCHITECTURE.md
INSERT INTO c_kategorie (id, nazev) 
VALUES 
    ('lepidla', 'Lepidla (Adhesives)'),
    ('spotrebni_chemie', 'Spotřební chemie a čističe'),
    ('cores_standard', 'Jádrové materiály (Cores)'),
    ('cores_active', 'Active Core Technology'),
    ('nastroje_rucni', 'Ruční nářadí (Tools)'),
    ('nastroje_strojni', 'Obráběcí nástroje (Machining)'),
    ('polotovary', 'Polotovary (Semi-finished)')
ON CONFLICT (id) DO NOTHING;

-- Aktualizace existujících názvů pro lepší srozumitelnost
UPDATE c_kategorie SET nazev = 'Výztužné materiály (Fabrics)' WHERE id = 'vyztuzne_materialy';
UPDATE c_kategorie SET nazev = 'Prepregy' WHERE id = 'prepregy';
UPDATE c_kategorie SET nazev = 'Pryskyřice a Gelcoaty' WHERE id = 'pryskyrice';
UPDATE c_kategorie SET nazev = 'Broušení a leštění' WHERE id = 'brouseni_a_lesteni';
