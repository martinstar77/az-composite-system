-- Migration: Enable RLS and add policies for all tables in public schema

-- 1. Table: c_kategorie
ALTER TABLE c_kategorie ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Všichni přihlášení mohou číst c_kategorie" ON c_kategorie;
CREATE POLICY "Všichni přihlášení mohou číst c_kategorie" 
ON c_kategorie FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Pouze admini a manažeři mohou měnit c_kategorie" ON c_kategorie;
CREATE POLICY "Pouze admini a manažeři mohou měnit c_kategorie" 
ON c_kategorie FOR ALL TO authenticated USING (public.get_my_role() IN ('admin', 'manager'));

-- 2. Table: c_merne_jednotky
ALTER TABLE c_merne_jednotky ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Všichni přihlášení mohou číst c_merne_jednotky" ON c_merne_jednotky;
CREATE POLICY "Všichni přihlášení mohou číst c_merne_jednotky" 
ON c_merne_jednotky FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Pouze admini a manažeři mohou měnit c_merne_jednotky" ON c_merne_jednotky;
CREATE POLICY "Pouze admini a manažeři mohou měnit c_merne_jednotky" 
ON c_merne_jednotky FOR ALL TO authenticated USING (public.get_my_role() IN ('admin', 'manager'));

-- 3. Table: c_stavy_produktu
ALTER TABLE c_stavy_produktu ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Všichni přihlášení mohou číst c_stavy_produktu" ON c_stavy_produktu;
CREATE POLICY "Všichni přihlášení mohou číst c_stavy_produktu" 
ON c_stavy_produktu FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Pouze admini a manažeři mohou měnit c_stavy_produktu" ON c_stavy_produktu;
CREATE POLICY "Pouze admini a manažeři mohou měnit c_stavy_produktu" 
ON c_stavy_produktu FOR ALL TO authenticated USING (public.get_my_role() IN ('admin', 'manager'));

-- 4. Table: c_typy_labelu
ALTER TABLE c_typy_labelu ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Všichni přihlášení mohou číst c_typy_labelu" ON c_typy_labelu;
CREATE POLICY "Všichni přihlášení mohou číst c_typy_labelu" 
ON c_typy_labelu FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Pouze admini a manažeři mohou měnit c_typy_labelu" ON c_typy_labelu;
CREATE POLICY "Pouze admini a manažeři mohou měnit c_typy_labelu" 
ON c_typy_labelu FOR ALL TO authenticated USING (public.get_my_role() IN ('admin', 'manager'));

-- 5. Table: c_procesy_odeslani
ALTER TABLE c_procesy_odeslani ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Všichni přihlášení mohou číst c_procesy_odeslani" ON c_procesy_odeslani;
CREATE POLICY "Všichni přihlášení mohou číst c_procesy_odeslani" 
ON c_procesy_odeslani FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Pouze admini a manažeři mohou měnit c_procesy_odeslani" ON c_procesy_odeslani;
CREATE POLICY "Pouze admini a manažeři mohou měnit c_procesy_odeslani" 
ON c_procesy_odeslani FOR ALL TO authenticated USING (public.get_my_role() IN ('admin', 'manager'));

-- 6. Table: produkty
ALTER TABLE produkty ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Všichni přihlášení mohou číst produkty" ON produkty;
CREATE POLICY "Všichni přihlášení mohou číst produkty" 
ON produkty FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Pouze admini a manažeři mohou měnit produkty" ON produkty;
CREATE POLICY "Pouze admini a manažeři mohou měnit produkty" 
ON produkty FOR ALL TO authenticated USING (public.get_my_role() IN ('admin', 'manager'));

-- 7. Table: dodavatele
ALTER TABLE dodavatele ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Všichni přihlášení mohou číst dodavatele" ON dodavatele;
CREATE POLICY "Všichni přihlášení mohou číst dodavatele" 
ON dodavatele FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Pouze admini a manažeři mohou měnit dodavatele" ON dodavatele;
CREATE POLICY "Pouze admini a manažeři mohou měnit dodavatele" 
ON dodavatele FOR ALL TO authenticated USING (public.get_my_role() IN ('admin', 'manager'));

-- 8. Table: produkt_dodavatel
ALTER TABLE produkt_dodavatel ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Všichni přihlášení mohou číst produkt_dodavatel" ON produkt_dodavatel;
CREATE POLICY "Všichni přihlášení mohou číst produkt_dodavatel" 
ON produkt_dodavatel FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Pouze admini a manažeři mohou měnit produkt_dodavatel" ON produkt_dodavatel;
CREATE POLICY "Pouze admini a manažeři mohou měnit produkt_dodavatel" 
ON produkt_dodavatel FOR ALL TO authenticated USING (public.get_my_role() IN ('admin', 'manager'));
