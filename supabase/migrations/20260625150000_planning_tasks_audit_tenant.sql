-- ============================================================
-- PLÁNOVACÍ MODUL — Doplnění tenant_id a Audit Logu pro úkoly
-- ============================================================

-- 1. Přidání sloupce tenant_id pro budoucí multi-tenancy izolaci
ALTER TABLE public.ukoly_planovani 
ADD COLUMN tenant_id UUID;

-- 2. Vytvoření tabulky pro audit log změn úkolů
CREATE TABLE IF NOT EXISTS public.ukoly_planovani_audit_log (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ukol_id     UUID NOT NULL REFERENCES public.ukoly_planovani(id) ON DELETE CASCADE,
    akce        TEXT NOT NULL, -- 'vytvoreno', 'upraveno', 'stav_zmeneno', 'smazano'
    stary_stav  JSONB,
    novy_stav   JSONB,
    poznamka    TEXT,
    uzivatel_id UUID REFERENCES public.profily_uzivatelu(id) ON DELETE SET NULL,
    vytvoreno_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL
);

-- 3. Povolení Row Level Security (RLS) pro audit log
ALTER TABLE public.ukoly_planovani_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Přihlášení mohou číst audit log úkolů" ON public.ukoly_planovani_audit_log;
CREATE POLICY "Přihlášení mohou číst audit log úkolů" 
    ON public.ukoly_planovani_audit_log FOR SELECT 
    TO authenticated 
    USING (true);

-- 4. Oprávnění pro přístup k tabulce
GRANT ALL ON public.ukoly_planovani_audit_log TO postgres, anon, authenticated, service_role;
