-- ============================================================
-- Povolení dodavatelů jako příjemců dokladů a rozšíření dodavatelů o IČO/DIČ
-- ============================================================

-- 1. Změna nullability zakaznik_id a přidání dodavatel_id
ALTER TABLE public.doklady ALTER COLUMN zakaznik_id DROP NOT NULL;
ALTER TABLE public.doklady ADD COLUMN IF NOT EXISTS dodavatel_id UUID REFERENCES public.dodavatele(id) ON DELETE SET NULL;

-- 2. Přidání IČO a DIČ k dodavatelům
ALTER TABLE public.dodavatele ADD COLUMN IF NOT EXISTS ico TEXT;
ALTER TABLE public.dodavatele ADD COLUMN IF NOT EXISTS dic TEXT;

-- 3. Kontrolní omezení zajišťující, že je vybrán právě jeden subjekt (odběratel nebo dodavatel)
ALTER TABLE public.doklady DROP CONSTRAINT IF EXISTS check_doklad_recipient;
ALTER TABLE public.doklady ADD CONSTRAINT check_doklad_recipient CHECK (
    (zakaznik_id IS NOT NULL AND dodavatel_id IS NULL) OR
    (zakaznik_id IS NULL AND dodavatel_id IS NOT NULL)
);
