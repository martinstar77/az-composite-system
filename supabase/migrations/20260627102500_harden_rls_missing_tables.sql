-- Migration: Harden RLS for missing tables
-- Active date: 2026-06-27

-- 1. Table: vydane_doklady_polozky
ALTER TABLE public.vydane_doklady_polozky ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Přihlášení mohou číst položky vydaných dokladů" ON public.vydane_doklady_polozky;
CREATE POLICY "Přihlášení mohou číst položky vydaných dokladů" 
ON public.vydane_doklady_polozky FOR SELECT 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.vydane_doklady d 
    WHERE d.id = doklad_id AND d.deleted_at IS NULL
  )
);

DROP POLICY IF EXISTS "Pouze oprávnění mohou měnit položky vydaných dokladů" ON public.vydane_doklady_polozky;
CREATE POLICY "Pouze oprávnění mohou měnit položky vydaných dokladů" 
ON public.vydane_doklady_polozky FOR ALL 
TO authenticated 
USING (public.get_my_role() IN ('admin', 'manager', 'sales'))
WITH CHECK (public.get_my_role() IN ('admin', 'manager', 'sales'));


-- 2. Table: prijate_doklady_polozky
ALTER TABLE public.prijate_doklady_polozky ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Přihlášení mohou číst položky přijatých dokladů" ON public.prijate_doklady_polozky;
CREATE POLICY "Přihlášení mohou číst položky přijatých dokladů" 
ON public.prijate_doklady_polozky FOR SELECT 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.prijate_doklady d 
    WHERE d.id = doklad_id AND d.deleted_at IS NULL
  )
);

DROP POLICY IF EXISTS "Pouze oprávnění mohou měnit položky přijatých dokladů" ON public.prijate_doklady_polozky;
CREATE POLICY "Pouze oprávnění mohou měnit položky přijatých dokladů" 
ON public.prijate_doklady_polozky FOR ALL 
TO authenticated 
USING (public.get_my_role() IN ('admin', 'manager'))
WITH CHECK (public.get_my_role() IN ('admin', 'manager'));


-- 3. Table: produkt_soubory
ALTER TABLE public.produkt_soubory ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Přihlášení mohou číst produktové soubory" ON public.produkt_soubory;
CREATE POLICY "Přihlášení mohou číst produktové soubory" 
ON public.produkt_soubory FOR SELECT 
TO authenticated 
USING (true);

DROP POLICY IF EXISTS "Pouze oprávnění mohou měnit produktové soubory" ON public.produkt_soubory;
CREATE POLICY "Pouze oprávnění mohou měnit produktové soubory" 
ON public.produkt_soubory FOR ALL 
TO authenticated 
USING (public.get_my_role() IN ('admin', 'manager'))
WITH CHECK (public.get_my_role() IN ('admin', 'manager'));


-- 4. Table: c_kody_vlakna
ALTER TABLE public.c_kody_vlakna ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Přihlášení mohou číst kódy vlákna" ON public.c_kody_vlakna;
CREATE POLICY "Přihlášení mohou číst kódy vlákna" 
ON public.c_kody_vlakna FOR SELECT 
TO authenticated 
USING (true);

DROP POLICY IF EXISTS "Pouze oprávnění mohou měnit kódy vlákna" ON public.c_kody_vlakna;
CREATE POLICY "Pouze oprávnění mohou měnit kódy vlákna" 
ON public.c_kody_vlakna FOR ALL 
TO authenticated 
USING (public.get_my_role() IN ('admin', 'manager'))
WITH CHECK (public.get_my_role() IN ('admin', 'manager'));


-- 5. Table: c_typy_dokumentu
ALTER TABLE public.c_typy_dokumentu ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Přihlášení mohou číst typy dokumentů" ON public.c_typy_dokumentu;
CREATE POLICY "Přihlášení mohou číst typy dokumentů" 
ON public.c_typy_dokumentu FOR SELECT 
TO authenticated 
USING (true);

DROP POLICY IF EXISTS "Pouze oprávnění mohou měnit typy dokumentů" ON public.c_typy_dokumentu;
CREATE POLICY "Pouze oprávnění mohou měnit typy dokumentů" 
ON public.c_typy_dokumentu FOR ALL 
TO authenticated 
USING (public.get_my_role() IN ('admin', 'manager'))
WITH CHECK (public.get_my_role() IN ('admin', 'manager'));
