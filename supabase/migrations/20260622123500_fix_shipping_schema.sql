-- ============================================================
-- SQL Migration: Safe Schema Update for Shipping Engine v2
-- Date: 2026-06-22
-- ============================================================

-- 1. Create table c_balici_profily if not exists
CREATE TABLE IF NOT EXISTS public.c_balici_profily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nazev TEXT NOT NULL,
  typ_obalu TEXT NOT NULL CHECK (typ_obalu IN (
    'role',
    'krabice_standard',
    'krabice_dlouha',
    'krabice_volna',
    'paleta',
    'sacek'
  )),
  delka_cm NUMERIC(8,1),
  sirka_cm NUMERIC(8,1),
  vyska_cm NUMERIC(8,1),
  je_delka_fixni BOOLEAN NOT NULL DEFAULT true,
  je_sirka_fixni BOOLEAN NOT NULL DEFAULT false,
  je_vyska_fixni BOOLEAN NOT NULL DEFAULT false,
  max_hmotnost_kg NUMERIC(8,2),
  koeficient_objemove_hmotnosti INTEGER NOT NULL DEFAULT 5000,
  padding_delka_cm NUMERIC(5,1) DEFAULT 0,
  padding_sirka_cm NUMERIC(5,1) DEFAULT 0,
  padding_vyska_cm NUMERIC(5,1) DEFAULT 0,
  hustota_kg_dm3 NUMERIC(5,3) DEFAULT 0.45,
  poznamka TEXT,
  vytvoreno_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  aktualizovano_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  vytvoril_id UUID REFERENCES public.profily_uzivatelu(id) ON DELETE SET NULL,
  upravil_id  UUID REFERENCES public.profily_uzivatelu(id) ON DELETE SET NULL
);

-- Enable RLS for c_balici_profily if not enabled
ALTER TABLE public.c_balici_profily ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'c_balici_profily' AND policyname = 'Všichni přihlášení mohou číst profily'
  ) THEN
    CREATE POLICY "Všichni přihlášení mohou číst profily" 
    ON public.c_balici_profily FOR SELECT TO authenticated USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'c_balici_profily' AND policyname = 'Pouze Admini a Obchod mohou měnit profily'
  ) THEN
    CREATE POLICY "Pouze Admini a Obchod mohou měnit profily" 
    ON public.c_balici_profily FOR ALL TO authenticated 
    USING (public.get_my_role() IN ('admin', 'obchod'));
  END IF;
END
$$;

-- Create trigger if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_c_balici_profily_updated_at'
  ) THEN
    CREATE TRIGGER update_c_balici_profily_updated_at
      BEFORE UPDATE ON public.c_balici_profily
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END
$$;

-- 2. Create table c_standard_box_sizes if not exists
CREATE TABLE IF NOT EXISTS public.c_standard_box_sizes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nazev TEXT NOT NULL,
  delka_cm NUMERIC(8,1) NOT NULL,
  sirka_cm NUMERIC(8,1) NOT NULL,
  vyska_cm NUMERIC(8,1) NOT NULL,
  max_hmotnost_kg NUMERIC(8,2),
  je_dlouha BOOLEAN DEFAULT false,
  poradi INTEGER DEFAULT 0,
  poznamka TEXT,
  vytvoreno_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  aktualizovano_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  vytvoril_id UUID REFERENCES public.profily_uzivatelu(id) ON DELETE SET NULL,
  upravil_id  UUID REFERENCES public.profily_uzivatelu(id) ON DELETE SET NULL
);

-- Enable RLS for c_standard_box_sizes if not enabled
ALTER TABLE public.c_standard_box_sizes ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'c_standard_box_sizes' AND policyname = 'Všichni přihlášení mohou číst krabice'
  ) THEN
    CREATE POLICY "Všichni přihlášení mohou číst krabice" 
    ON public.c_standard_box_sizes FOR SELECT TO authenticated USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'c_standard_box_sizes' AND policyname = 'Pouze Admini a Obchod mohou měnit krabice'
  ) THEN
    CREATE POLICY "Pouze Admini a Obchod mohou měnit krabice" 
    ON public.c_standard_box_sizes FOR ALL TO authenticated 
    USING (public.get_my_role() IN ('admin', 'obchod'));
  END IF;
END
$$;

-- Create trigger if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_c_standard_box_sizes_updated_at'
  ) THEN
    CREATE TRIGGER update_c_standard_box_sizes_updated_at
      BEFORE UPDATE ON public.c_standard_box_sizes
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END
$$;

-- 3. Alter produkty to link to packaging profiles
ALTER TABLE public.produkty
  ADD COLUMN IF NOT EXISTS balici_profil_id UUID REFERENCES public.c_balici_profily(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS balik_delka_cm_override NUMERIC(8,1),
  ADD COLUMN IF NOT EXISTS balik_sirka_cm_override NUMERIC(8,1),
  ADD COLUMN IF NOT EXISTS balik_vyska_cm_override NUMERIC(8,1);

-- 4. Alter logisticke_sablony to support Shipping Engine v2
ALTER TABLE public.logisticke_sablony
  ADD COLUMN IF NOT EXISTS typ_vypoctu_dopravy_v2 TEXT DEFAULT 'legacy' NOT NULL,
  ADD COLUMN IF NOT EXISTS koeficient_a NUMERIC(12,6),
  ADD COLUMN IF NOT EXISTS koeficient_b NUMERIC(12,6),
  ADD COLUMN IF NOT EXISTS segmenty_dopravy JSONB,
  ADD COLUMN IF NOT EXISTS fixni_cena_eur NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS pallet_cena_eur NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS pallet_pocet_produktu INT,
  ADD COLUMN IF NOT EXISTS bezpecnostni_koeficient NUMERIC(5,4) DEFAULT 1.05;

-- Ensure CHECK constraint exists on typ_vypoctu_dopravy_v2
ALTER TABLE public.logisticke_sablony 
  DROP CONSTRAINT IF EXISTS logisticke_sablony_typ_vypoctu_dopravy_v2_check;

ALTER TABLE public.logisticke_sablony
  ADD CONSTRAINT logisticke_sablony_typ_vypoctu_dopravy_v2_check 
  CHECK (typ_vypoctu_dopravy_v2 IN ('legacy', 'linear_czk', 'segmented_czk', 'fixed_eur', 'pallet_alloc'));

-- 5. SEED Packaging Profiles (with ON CONFLICT logic)
-- Since c_balici_profily doesn't have a unique constraint on nazev, we can check if it exists before inserting
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.c_balici_profily WHERE nazev = 'Role tkanina 127cm') THEN
    INSERT INTO public.c_balici_profily
      (nazev, typ_obalu, delka_cm, sirka_cm, vyska_cm, je_delka_fixni, je_sirka_fixni, je_vyska_fixni,
       padding_delka_cm, padding_sirka_cm, padding_vyska_cm, max_hmotnost_kg, hustota_kg_dm3, poznamka)
    VALUES
      ('Role tkanina 127cm', 'role', 127, NULL, NULL, true, false, false, 1.5, 0, 0, 80, 0.450, 'Šíře 127cm + 15mm balení. Průměr se vypočte z hmotnosti.');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.c_balici_profily WHERE nazev = 'Role tkanina 120cm') THEN
    INSERT INTO public.c_balici_profily
      (nazev, typ_obalu, delka_cm, sirka_cm, vyska_cm, je_delka_fixni, je_sirka_fixni, je_vyska_fixni,
       padding_delka_cm, padding_sirka_cm, padding_vyska_cm, max_hmotnost_kg, hustota_kg_dm3, poznamka)
    VALUES
      ('Role tkanina 120cm', 'role', 120, NULL, NULL, true, false, false, 0, 0, 0, 80, 0.450, 'Tenowo Nonwoven, šíře 100cm s krabicí 120cm.');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.c_balici_profily WHERE nazev = 'Krabice rovnoměrná standard') THEN
    INSERT INTO public.c_balici_profily
      (nazev, typ_obalu, delka_cm, sirka_cm, vyska_cm, je_delka_fixni, je_sirka_fixni, je_vyska_fixni,
       padding_delka_cm, padding_sirka_cm, padding_vyska_cm, max_hmotnost_kg, hustota_kg_dm3, poznamka)
    VALUES
      ('Krabice rovnoměrná standard', 'krabice_standard', NULL, NULL, NULL, false, false, false, 0, 0, 0, 40, 0.450, 'Auto-výběr z katalogu: 20×20×20 / 30×30×30 / 50×40×40 / 50×50×50 / 60×60×50.');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.c_balici_profily WHERE nazev = 'LQ Sáček/Karton') THEN
    INSERT INTO public.c_balici_profily
      (nazev, typ_obalu, delka_cm, sirka_cm, vyska_cm, je_delka_fixni, je_sirka_fixni, je_vyska_fixni,
       padding_delka_cm, padding_sirka_cm, padding_vyska_cm, max_hmotnost_kg, hustota_kg_dm3, poznamka)
    VALUES
      ('LQ Sáček/Karton', 'sacek', 40, 30, 25, true, true, true, 0, 0, 0, 25, 0.450, 'ADR LQ zásilky — spreje BAPCO. Fixní rozměry 40×30×25 cm.');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.c_balici_profily WHERE nazev = 'Paleta standard EU') THEN
    INSERT INTO public.c_balici_profily
      (nazev, typ_obalu, delka_cm, sirka_cm, vyska_cm, je_delka_fixni, je_sirka_fixni, je_vyska_fixni,
       padding_delka_cm, padding_sirka_cm, padding_vyska_cm, max_hmotnost_kg, hustota_kg_dm3, poznamka)
    VALUES
      ('Paleta standard EU', 'paleta', 170, 110, 122, true, true, true, 0, 0, 0, 600, 0.450, 'Standard EU paleta 170×110×122 cm. Pro pallet_alloc šablony.');
  END IF;
END
$$;

-- 6. SEED Standard Box Sizes (with exist checks)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.c_standard_box_sizes WHERE nazev = 'Mini 20×20×20') THEN
    INSERT INTO public.c_standard_box_sizes (nazev, delka_cm, sirka_cm, vyska_cm, max_hmotnost_kg, je_dlouha, poradi) VALUES
      ('Mini 20×20×20', 20, 20, 20, 8, false, 10);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.c_standard_box_sizes WHERE nazev = 'Malá 30×30×30') THEN
    INSERT INTO public.c_standard_box_sizes (nazev, delka_cm, sirka_cm, vyska_cm, max_hmotnost_kg, je_dlouha, poradi) VALUES
      ('Malá 30×30×30', 30, 30, 30, 18, false, 20);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.c_standard_box_sizes WHERE nazev = 'Střední 50×40×40') THEN
    INSERT INTO public.c_standard_box_sizes (nazev, delka_cm, sirka_cm, vyska_cm, max_hmotnost_kg, je_dlouha, poradi) VALUES
      ('Střední 50×40×40', 50, 40, 40, 24, false, 30);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.c_standard_box_sizes WHERE nazev = 'Velká 50×50×50') THEN
    INSERT INTO public.c_standard_box_sizes (nazev, delka_cm, sirka_cm, vyska_cm, max_hmotnost_kg, je_dlouha, poradi) VALUES
      ('Velká 50×50×50', 50, 50, 50, 30, false, 40);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.c_standard_box_sizes WHERE nazev = 'XL 60×60×50') THEN
    INSERT INTO public.c_standard_box_sizes (nazev, delka_cm, sirka_cm, vyska_cm, max_hmotnost_kg, je_dlouha, poradi) VALUES
      ('XL 60×60×50', 60, 60, 50, 40, false, 50);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.c_standard_box_sizes WHERE nazev = 'Dlouhá GLS 120×45×45') THEN
    INSERT INTO public.c_standard_box_sizes (nazev, delka_cm, sirka_cm, vyska_cm, max_hmotnost_kg, je_dlouha, poradi) VALUES
      ('Dlouhá GLS 120×45×45', 120, 45, 45, 30, true, 60);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.c_standard_box_sizes WHERE nazev = 'Dlouhá 142×45×45') THEN
    INSERT INTO public.c_standard_box_sizes (nazev, delka_cm, sirka_cm, vyska_cm, max_hmotnost_kg, je_dlouha, poradi) VALUES
      ('Dlouhá 142×45×45', 142, 45, 45, 60, true, 70);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.c_standard_box_sizes WHERE nazev = 'Dlouhá 142×50×50') THEN
    INSERT INTO public.c_standard_box_sizes (nazev, delka_cm, sirka_cm, vyska_cm, max_hmotnost_kg, je_dlouha, poradi) VALUES
      ('Dlouhá 142×50×50', 142, 50, 50, 80, true, 80);
  END IF;
END
$$;
