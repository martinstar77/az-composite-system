-- 1. Create Role Permissions Table
CREATE TABLE c_opravneni (
    id TEXT PRIMARY KEY, -- e.g., 'produkty_zobrazeni'
    nazev TEXT NOT NULL,
    modul TEXT NOT NULL -- 'katalog', 'sklad', 'sourcing', 'finance', 'admin'
);

CREATE TABLE role_opravneni (
    role_id TEXT REFERENCES c_role_uzivatelu(id) ON DELETE CASCADE NOT NULL,
    opravneni_id TEXT REFERENCES c_opravneni(id) ON DELETE CASCADE NOT NULL,
    povoleno BOOLEAN DEFAULT false NOT NULL,
    PRIMARY KEY (role_id, opravneni_id)
);

-- 2. Enable RLS
ALTER TABLE c_opravneni ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_opravneni ENABLE ROW LEVEL SECURITY;

-- 3. Basic RLS Policies (Admins can do everything)
CREATE POLICY "Admini mohou vse v opravnenich" ON c_opravneni FOR ALL TO authenticated USING (public.get_my_role() = 'admin');
CREATE POLICY "Admini mohou vse v role_opravneni" ON role_opravneni FOR ALL TO authenticated USING (public.get_my_role() = 'admin');

-- Users can read their own permissions
CREATE POLICY "Uzivatele mohou cist sva opravneni" ON role_opravneni FOR SELECT TO authenticated USING (role_id = public.get_my_role());
CREATE POLICY "Kazdy muze cist seznam opravneni" ON c_opravneni FOR SELECT TO authenticated USING (true);

-- 4. Seed Permissions List
INSERT INTO c_opravneni (id, nazev, modul) VALUES
('katalog_zobrazeni', 'Zobrazení katalogu produktů', 'katalog'),
('katalog_editace', 'Přidávání a editace produktů', 'katalog'),
('katalog_ceny_nakup', 'Zobrazení nákupních cen a dodavatelů', 'katalog'),
('sklad_zobrazeni', 'Zobrazení stavu skladu', 'sklad'),
('sklad_prijem_vydej', 'Provádění příjmu a výdeje', 'sklad'),
('dodavatele_sprava', 'Správa databáze dodavatelů', 'sourcing'),
('finance_nastaveni', 'Nastavení kurzů a poplatků', 'finance'),
('admin_uzivatele', 'Správa uživatelů a týmu', 'admin');

-- 5. Seed Initial Permissions for Roles
-- ADMIN: Everything
INSERT INTO role_opravneni (role_id, opravneni_id, povoleno)
SELECT 'admin', id, true FROM c_opravneni;

-- MANAGER: Almost everything, except user management
INSERT INTO role_opravneni (role_id, opravneni_id, povoleno)
SELECT 'manager', id, true FROM c_opravneni WHERE modul != 'admin';

-- WAREHOUSE: Only viewing catalog and managing stock
INSERT INTO role_opravneni (role_id, opravneni_id, povoleno)
SELECT 'warehouse', id, true FROM c_opravneni WHERE id IN ('katalog_zobrazeni', 'sklad_zobrazeni', 'sklad_prijem_vydej');

-- SALES: Viewing catalog, pricing, and suppliers
INSERT INTO role_opravneni (role_id, opravneni_id, povoleno)
SELECT 'sales', id, true FROM c_opravneni WHERE id IN ('katalog_zobrazeni', 'katalog_ceny_nakup', 'sklad_zobrazeni');
