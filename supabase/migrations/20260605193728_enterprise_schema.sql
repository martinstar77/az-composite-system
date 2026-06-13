-- 1. DROP EXISTING BASIC TABLE (Since we are building the real one now)
DROP TABLE IF EXISTS produkty;

-- 2. CREATE LOOKUP TABLES (Číselníky)
CREATE TABLE c_kategorie (
    id TEXT PRIMARY KEY, -- e.g., 'vyztuzne_materialy'
    nazev TEXT NOT NULL, -- e.g., 'Výztužné materiály'
    popis TEXT
);

CREATE TABLE c_merne_jednotky (
    id TEXT PRIMARY KEY, -- e.g., 'm2', 'kg', 'bm', 'l', 'ks'
    nazev TEXT NOT NULL, -- e.g., 'Metr čtvereční'
    zkratka TEXT NOT NULL -- e.g., 'm²'
);

CREATE TABLE c_typy_labelu (
    id TEXT PRIMARY KEY,
    nazev TEXT NOT NULL
);

CREATE TABLE c_procesy_odeslani (
    id TEXT PRIMARY KEY,
    nazev TEXT NOT NULL
);

CREATE TABLE c_stavy_produktu (
    id TEXT PRIMARY KEY,
    nazev TEXT NOT NULL
);

-- 3. CREATE CORE PRODUCT TABLE (PIM)
CREATE TABLE produkty (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sku TEXT UNIQUE NOT NULL,
    nazev TEXT NOT NULL,
    
    -- Classification (Foreign Keys to Lookup Tables)
    kategorie_id TEXT REFERENCES c_kategorie(id) NOT NULL,
    zakladni_mj_id TEXT REFERENCES c_merne_jednotky(id) NOT NULL,
    
    -- Logistics (Numeric values only)
    mnozstvi_v_baleni NUMERIC(10,2),
    jednotka_baleni_id TEXT REFERENCES c_merne_jednotky(id),
    hmotnost_baliku_kg NUMERIC(10,2),
    shelf_life_mesice INTEGER,
    
    -- Workflow Defaults
    def_typ_skladovani TEXT DEFAULT 'sklad',
    def_proces_odeslani_id TEXT REFERENCES c_procesy_odeslani(id),
    def_typ_labelu_id TEXT REFERENCES c_typy_labelu(id),
    stav_katalogu_id TEXT REFERENCES c_stavy_produktu(id),
    
    -- Flexible Attributes
    specifikace JSONB DEFAULT '{}'::jsonb,
    
    vytvoreno_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    aktualizovano_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. CREATE GIN INDEX FOR FAST JSONB SEARCHING
CREATE INDEX idx_produkty_specifikace ON produkty USING GIN (specifikace);

-- 5. INITIALIZE LOOKUP DATA (Základní data do číselníků)
INSERT INTO c_kategorie (id, nazev) VALUES 
('vyztuzne_materialy', 'Výztužné materiály'),
('prepregy', 'Prepregy'),
('pryskyrice', 'Pryskyřice'),
('brouseni_a_lesteni', 'Broušení a leštění'),
('spojovaci_material', 'Spojovací materiál');

INSERT INTO c_merne_jednotky (id, nazev, zkratka) VALUES
('m2', 'Metr čtvereční', 'm²'),
('kg', 'Kilogram', 'kg'),
('bm', 'Běžný metr', 'bm'),
('l', 'Litr', 'l'),
('ks', 'Kus', 'ks'),
('role', 'Role', 'role'),
('sada', 'Sada', 'sada');

INSERT INTO c_typy_labelu (id, nazev) VALUES
('vlastni', 'Vlastní'),
('white_label', 'White label'),
('cizi', 'Jejich (Cizí)');

INSERT INTO c_procesy_odeslani (id, nazev) VALUES
('jen_odeslat', 'Jen odeslat'),
('prebalit', 'Potřeba přebalit'),
('nadelit', 'Nadelit');

INSERT INTO c_stavy_produktu (id, nazev) VALUES
('draft', 'Draft (Příprava)'),
('testovani', 'Testování'),
('potreba_stitky', 'Potřeba štítky'),
('ready_to_order', 'Ready to order (Aktivní)'),
('vyrazeno', 'Vyřazeno');
