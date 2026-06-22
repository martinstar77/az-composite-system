-- ============================================================
-- SQL Migration: Shipping Engine v2
-- Date: 2026-06-21
-- ============================================================

-- 1. Create table c_balici_profily
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

-- RLS for c_balici_profily
ALTER TABLE public.c_balici_profily ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Všichni přihlášení mohou číst profily" 
ON public.c_balici_profily FOR SELECT TO authenticated USING (true);

CREATE POLICY "Pouze Admini a Obchod mohou měnit profily" 
ON public.c_balici_profily FOR ALL TO authenticated 
USING (public.get_my_role() IN ('admin', 'obchod'));

-- Trigger updated_at for c_balici_profily
CREATE TRIGGER update_c_balici_profily_updated_at
    BEFORE UPDATE ON public.c_balici_profily
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 2. Create table c_standard_box_sizes
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

-- RLS for c_standard_box_sizes
ALTER TABLE public.c_standard_box_sizes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Všichni přihlášení mohou číst krabice" 
ON public.c_standard_box_sizes FOR SELECT TO authenticated USING (true);

CREATE POLICY "Pouze Admini a Obchod mohou měnit krabice" 
ON public.c_standard_box_sizes FOR ALL TO authenticated 
USING (public.get_my_role() IN ('admin', 'obchod'));

-- Trigger updated_at for c_standard_box_sizes
CREATE TRIGGER update_c_standard_box_sizes_updated_at
    BEFORE UPDATE ON public.c_standard_box_sizes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 3. Alter produkty to link to packaging profiles
ALTER TABLE public.produkty
  ADD COLUMN IF NOT EXISTS balici_profil_id UUID REFERENCES public.c_balici_profily(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS balik_delka_cm_override NUMERIC(8,1),
  ADD COLUMN IF NOT EXISTS balik_sirka_cm_override NUMERIC(8,1),
  ADD COLUMN IF NOT EXISTS balik_vyska_cm_override NUMERIC(8,1);

-- 4. Alter logisticke_sablony to support Shipping Engine v2
ALTER TABLE public.logisticke_sablony
  ADD COLUMN IF NOT EXISTS typ_vypoctu_dopravy_v2 TEXT DEFAULT 'legacy' NOT NULL
    CHECK (typ_vypoctu_dopravy_v2 IN (
      'legacy',
      'linear_czk',
      'segmented_czk',
      'fixed_eur',
      'pallet_alloc'
    )),
  ADD COLUMN IF NOT EXISTS koeficient_a NUMERIC(12,6),
  ADD COLUMN IF NOT EXISTS koeficient_b NUMERIC(12,6),
  ADD COLUMN IF NOT EXISTS segmenty_dopravy JSONB,
  ADD COLUMN IF NOT EXISTS fixni_cena_eur NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS pallet_cena_eur NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS pallet_pocet_produktu INT,
  ADD COLUMN IF NOT EXISTS bezpecnostni_koeficient NUMERIC(5,4) DEFAULT 1.05;

-- 5. SEED Packaging Profiles
INSERT INTO public.c_balici_profily
  (nazev, typ_obalu, delka_cm, sirka_cm, vyska_cm, je_delka_fixni, je_sirka_fixni, je_vyska_fixni,
   padding_delka_cm, padding_sirka_cm, padding_vyska_cm, max_hmotnost_kg, hustota_kg_dm3, poznamka)
VALUES
  ('Role tkanina 127cm', 'role', 127, NULL, NULL, true, false, false, 1.5, 0, 0, 80, 0.450, 'Šíře 127cm + 15mm balení. Průměr se vypočte z hmotnosti.'),
  ('Role tkanina 120cm', 'role', 120, NULL, NULL, true, false, false, 0, 0, 0, 80, 0.450, 'Tenowo Nonwoven, šíře 100cm s krabicí 120cm.'),
  ('Krabice rovnoměrná standard', 'krabice_standard', NULL, NULL, NULL, false, false, false, 0, 0, 0, 40, 0.450, 'Auto-výběr z katalogu: 20×20×20 / 30×30×30 / 50×40×40 / 50×50×50 / 60×60×50.'),
  ('LQ Sáček/Karton', 'sacek', 40, 30, 25, true, true, true, 0, 0, 0, 25, 0.450, 'ADR LQ zásilky — spreje BAPCO. Fixní rozměry 40×30×25 cm.'),
  ('Paleta standard EU', 'paleta', 170, 110, 122, true, true, true, 0, 0, 0, 600, 0.450, 'Standard EU paleta 170×110×122 cm. Pro pallet_alloc šablony.')
ON CONFLICT DO NOTHING;

-- 6. SEED Standard Box Sizes
INSERT INTO public.c_standard_box_sizes (nazev, delka_cm, sirka_cm, vyska_cm, max_hmotnost_kg, je_dlouha, poradi) VALUES
  ('Mini 20×20×20',         20,  20, 20,  8,    false, 10),
  ('Malá 30×30×30',         30,  30, 30, 18,    false, 20),
  ('Střední 50×40×40',      50,  40, 40, 24,    false, 30),
  ('Velká 50×50×50',        50,  50, 50, 30,    false, 40),
  ('XL 60×60×50',           60,  60, 50, 40,    false, 50),
  ('Dlouhá GLS 120×45×45', 120,  45, 45, 30,    true,  60),
  ('Dlouhá 142×45×45',     142,  45, 45, 60,    true,  70),
  ('Dlouhá 142×50×50',     142,  50, 50, 80,    true,  80)
ON CONFLICT DO NOTHING;

-- 7. SEED Logistics Templates (v2 format)
-- Clear legacy default templates to avoid clutter if user prefers (user said: "ty sablony jsem realne nepouzival, tak je mozne to normalne zmenit rovnou")
DELETE FROM public.logisticke_sablony;

INSERT INTO public.logisticke_sablony (
  nazev,
  typ_vypoctu_dopravy,
  sazba_dopravy,
  typ_vypoctu_dopravy_v2,
  koeficient_a,
  koeficient_b,
  segmenty_dopravy,
  fixni_cena_eur,
  pallet_cena_eur,
  pallet_pocet_produktu,
  bezpecnostni_koeficient
)
VALUES
  (
    'Čína - UPS Express Saver',
    'vaha_kg', 0, 'linear_czk',
    94.788, 1830.2,
    NULL, NULL, NULL, NULL, 1.05
  ),
  (
    'Itálie - FedEx Rovnoměrné',
    'vaha_kg', 0, 'linear_czk',
    18.804, 349.38,
    NULL, NULL, NULL, NULL, 1.05
  ),
  (
    'Itálie - UPS/FedEx Dlouhé',
    'vaha_kg', 0, 'segmented_czk',
    NULL, NULL,
    '[
      {"od_kg": 0, "do_kg": 46.9, "a": 14.26, "b": 718.45, "dopravce": "UPS Economy"},
      {"od_kg": 47, "do_kg": 60.9, "a": 29.985, "b": 1066.8, "dopravce": "UPS Economy (Extra)"},
      {"od_kg": 61, "do_kg": 9999, "a": 12.464, "b": 1124.6, "dopravce": "FedEx Economy Freight"}
    ]'::jsonb,
    NULL, NULL, NULL, 1.05
  ),
  (
    'Česko - GLS/TOPTRANS Dlouhé',
    'vaha_kg', 0, 'segmented_czk',
    NULL, NULL,
    '[
      {"od_kg": 0, "do_kg": 30.9, "a": 2.5374, "b": 138.79, "dopravce": "GLS/DPD"},
      {"od_kg": 31, "do_kg": 50, "a": 0, "b": 876, "dopravce": "TOPTRANS"},
      {"od_kg": 50.1, "do_kg": 9999, "a": 0, "b": 1113, "dopravce": "TOPTRANS"}
    ]'::jsonb,
    NULL, NULL, NULL, 1.05
  ),
  (
    'Německo - GLS/UPS Dlouhé',
    'vaha_kg', 0, 'segmented_czk',
    NULL, NULL,
    '[
      {"od_kg": 0, "do_kg": 30.9, "a": 15.16, "b": 229.56, "dopravce": "GLS"},
      {"od_kg": 31, "do_kg": 60.9, "a": 29.985, "b": 1066.8, "dopravce": "UPS Economy"},
      {"od_kg": 61, "do_kg": 9999, "a": 27.777, "b": 144.67, "dopravce": "FedEx Economy Freight"}
    ]'::jsonb,
    NULL, NULL, NULL, 1.05
  ),
  (
    'Německo - GLS Rovnoměrné',
    'vaha_kg', 0, 'linear_czk',
    15.771, 216.52,
    NULL, NULL, NULL, NULL, 1.05
  ),
  (
    'Německo - Paleta',
    'vaha_kg', 0, 'pallet_alloc',
    NULL, NULL, NULL, NULL, 225.02, 30, 1.05
  ),
  (
    'Španělsko - Paleta',
    'vaha_kg', 0, 'pallet_alloc',
    NULL, NULL, NULL, NULL, 225.02, 30, 1.05
  ),
  (
    'Francie - Paleta',
    'vaha_kg', 0, 'pallet_alloc',
    NULL, NULL, NULL, NULL, 225.02, 30, 1.05
  ),
  (
    'Francie - GLS Rovnoměrné',
    'vaha_kg', 0, 'linear_czk',
    18.804, 349.38,
    NULL, NULL, NULL, NULL, 1.05
  ),
  (
    'Polsko - GLS/UPS Rovnoměrné',
    'vaha_kg', 0, 'segmented_czk',
    NULL, NULL,
    '[
      {"od_kg": 0, "do_kg": 30.9, "a": 14.039, "b": 153.3, "dopravce": "GLS"},
      {"od_kg": 31, "do_kg": 9999, "a": 29.985, "b": 1066.8, "dopravce": "UPS"}
    ]'::jsonb,
    NULL, NULL, NULL, 1.05
  ),
  (
    'Polsko LQ - BAPCO Fixní',
    'vaha_kg', 0, 'fixed_eur',
    NULL, NULL, NULL, 50.00, NULL, NULL, 1.05
  ),
  (
    'Nizozemsko - GLS/UPS Rovnoměrné',
    'vaha_kg', 0, 'linear_czk',
    18.929, 245.81,
    NULL, NULL, NULL, NULL, 1.05
  );
