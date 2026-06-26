-- Migration: Separate meetings/events from tasks
-- Created At: 2026-06-26

-- 1. Vytvoření tabulky pro události a schůzky
CREATE TABLE IF NOT EXISTS public.udalosti_planovani (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    milnik_id           UUID REFERENCES public.milniky(id) ON DELETE SET NULL,
    nazev               TEXT NOT NULL,
    popis               TEXT,
    datum_zahajeni      TIMESTAMP WITH TIME ZONE NOT NULL,
    datum_ukonceni      TIMESTAMP WITH TIME ZONE,
    lokalita            TEXT,
    organizator_id      UUID REFERENCES public.profily_uzivatelu(id) ON DELETE SET NULL,
    ucastnici_ids       UUID[] DEFAULT '{}'::uuid[],
    agenda              JSONB DEFAULT '[]'::jsonb,
    zapis               TEXT DEFAULT NULL,
    stav                TEXT NOT NULL DEFAULT 'scheduled' CHECK (stav IN ('scheduled', 'active', 'completed', 'cancelled')),
    tenant_id           UUID,
    
    -- Soft delete + audit
    deleted_at          TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    vytvoreno_at        TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL,
    aktualizovano_at    TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL,
    vytvoril_id         UUID REFERENCES public.profily_uzivatelu(id) ON DELETE SET NULL,
    upravil_id          UUID REFERENCES public.profily_uzivatelu(id) ON DELETE SET NULL
);

-- 2. Povolení RLS pro novou tabulku
ALTER TABLE public.udalosti_planovani ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Přihlášení mohou číst události"
    ON public.udalosti_planovani FOR SELECT
    TO authenticated
    USING (deleted_at IS NULL);

CREATE POLICY "Přihlášení mohou vytvářet události"
    ON public.udalosti_planovani FOR INSERT
    TO authenticated
    WITH CHECK (vytvoril_id = auth.uid());

CREATE POLICY "Přihlášení mohou editovat události"
    ON public.udalosti_planovani FOR UPDATE
    TO authenticated
    USING (deleted_at IS NULL)
    WITH CHECK (deleted_at IS NULL);

CREATE POLICY "Admini mohou mazat události"
    ON public.udalosti_planovani FOR DELETE
    TO authenticated
    USING (public.get_my_role() = 'admin');

-- 3. Přidání sloupce parent_meeting_id do tabulky ukoly_planovani
ALTER TABLE public.ukoly_planovani 
ADD COLUMN IF NOT EXISTS parent_meeting_id UUID REFERENCES public.udalosti_planovani(id) ON DELETE SET NULL;

-- 4. Migrace stávajících dat z ukoly_planovani (typ_udalosti = 'meeting') do udalosti_planovani
-- Ponecháváme stejná UUID, aby se nezpřetrhaly vazby na audit log nebo budoucí vazby
INSERT INTO public.udalosti_planovani (
    id,
    milnik_id,
    nazev,
    popis,
    datum_zahajeni,
    datum_ukonceni,
    lokalita,
    organizator_id,
    agenda,
    zapis,
    stav,
    tenant_id,
    vytvoreno_at,
    aktualizovano_at,
    vytvoril_id,
    upravil_id
)
SELECT 
    id,
    milnik_id,
    nazev,
    popis,
    COALESCE(
        datum_zahajeni::timestamp with time zone, 
        (datum_splatnosti::timestamp with time zone) - interval '2 hours',
        vytvoreno_at
    ),
    COALESCE(
        (datum_splatnosti::timestamp with time zone) + interval '1 hour',
        vytvoreno_at + interval '1 hour'
    ),
    lokalita,
    vlastnik_id,
    agenda,
    zapis,
    CASE 
        WHEN stav = 'done' THEN 'completed'::text
        ELSE 'scheduled'::text
    END,
    tenant_id,
    vytvoreno_at,
    aktualizovano_at,
    vytvoril_id,
    upravil_id
FROM public.ukoly_planovani
WHERE typ_udalosti = 'meeting' AND deleted_at IS NULL;

-- 5. Aktualizace parent_meeting_id v ukoly_planovani, aby odkazovala na novou tabulku
UPDATE public.ukoly_planovani
SET parent_meeting_id = parent_id
WHERE parent_id IS NOT NULL;

-- 6. Odstranění starých sloupců a smazání meetingů z ukoly_planovani
-- Nejdříve odstraníme starý sloupec parent_id a jeho vazbu
ALTER TABLE public.ukoly_planovani DROP COLUMN IF EXISTS parent_id;
ALTER TABLE public.ukoly_planovani DROP COLUMN IF EXISTS agenda;
ALTER TABLE public.ukoly_planovani DROP COLUMN IF EXISTS zapis;

-- Smazání meetingů, které jsme zmigrovali (fyzicky, nebo nastavením deleted_at)
DELETE FROM public.ukoly_planovani WHERE typ_udalosti = 'meeting';

-- 7. Vytvoření indexů pro optimalizaci dotazů na události
CREATE INDEX IF NOT EXISTS idx_udalosti_planovani_milnik_id ON public.udalosti_planovani(milnik_id);
CREATE INDEX IF NOT EXISTS idx_udalosti_planovani_datum ON public.udalosti_planovani(datum_zahajeni);
CREATE INDEX IF NOT EXISTS idx_ukoly_planovani_parent_meeting_id ON public.ukoly_planovani(parent_meeting_id);

-- Oprávnění pro přístup k tabulce událostí
GRANT ALL ON public.udalosti_planovani TO postgres, anon, authenticated, service_role;
