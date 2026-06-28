-- Add nazev_en to c_kategorie
ALTER TABLE c_kategorie ADD COLUMN IF NOT EXISTS nazev_en TEXT;

-- Update Czech and English names for categories
UPDATE c_kategorie SET nazev = 'Spojovací materiál', nazev_en = 'Fasteners' WHERE id = 'spojovaci_material';
UPDATE c_kategorie SET nazev = 'Lepidla', nazev_en = 'Adhesives' WHERE id = 'lepidla';
UPDATE c_kategorie SET nazev = 'Spotřební chemie a čističe', nazev_en = 'Consumable Chemicals & Cleaners' WHERE id = 'spotrebni_chemie';
UPDATE c_kategorie SET nazev = 'Jádrové materiály', nazev_en = 'Core Materials' WHERE id = 'cores_standard';
UPDATE c_kategorie SET nazev = 'Active Core Technology', nazev_en = 'Active Core Technology' WHERE id = 'cores_active';
UPDATE c_kategorie SET nazev = 'Prepregy', nazev_en = 'Prepregs' WHERE id = 'prepregy';
UPDATE c_kategorie SET nazev = 'Pryskyřice a Gelcoaty', nazev_en = 'Resins & Gelcoats' WHERE id = 'pryskyrice';
UPDATE c_kategorie SET nazev = 'Broušení a leštění', nazev_en = 'Sanding & Polishing' WHERE id = 'brouseni_a_lesteni';
UPDATE c_kategorie SET nazev = 'Tkaniny', nazev_en = 'Fabrics' WHERE id = 'vyztuzne_materialy';
UPDATE c_kategorie SET nazev = 'Spotřební materiál', nazev_en = 'Consumables' WHERE id = 'consumables';
UPDATE c_kategorie SET nazev = 'Nářadí', nazev_en = 'Tools' WHERE id = 'naradi';
UPDATE c_kategorie SET nazev = 'Chemie', nazev_en = 'Chemicals' WHERE id = 'chemie';
