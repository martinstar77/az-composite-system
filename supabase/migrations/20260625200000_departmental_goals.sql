-- Migration: Add departmental goals for milestones
-- Vytvoří tabulku cile_oddeleni_milniku a propojí ji s ukoly_planovani

CREATE TABLE public.cile_oddeleni_milniku (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    milnik_id           UUID NOT NULL REFERENCES public.milniky(id) ON DELETE CASCADE,
    oddeleni_id         TEXT NOT NULL REFERENCES public.oddeleni(id) ON DELETE CASCADE,
    nazev               TEXT NOT NULL,
    popis               TEXT,
    stav                TEXT NOT NULL DEFAULT 'planned' CHECK (stav IN ('planned', 'in_progress', 'completed', 'cancelled')),
    vytvoreno_at        TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL,
    aktualizovano_at    TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL,
    vytvoril_id         UUID REFERENCES public.profily_uzivatelu(id) ON DELETE SET NULL,
    upravil_id          UUID REFERENCES public.profily_uzivatelu(id) ON DELETE SET NULL
);

-- Přidání sloupce do ukoly_planovani
ALTER TABLE public.ukoly_planovani
ADD COLUMN cil_id UUID REFERENCES public.cile_oddeleni_milniku(id) ON DELETE SET NULL;

-- Indexy pro cile_oddeleni_milniku
CREATE INDEX cile_milnik_idx ON public.cile_oddeleni_milniku (milnik_id);
CREATE INDEX cile_oddeleni_idx ON public.cile_oddeleni_milniku (oddeleni_id);

-- Index pro ukoly_planovani
CREATE INDEX ukoly_cil_idx ON public.ukoly_planovani (cil_id);

-- Zapnutí RLS
ALTER TABLE public.cile_oddeleni_milniku ENABLE ROW LEVEL SECURITY;

-- Politiky
CREATE POLICY "Uživatelé mohou číst všechny cíle"
ON public.cile_oddeleni_milniku
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Uživatelé mohou vkládat cíle"
ON public.cile_oddeleni_milniku
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Uživatelé mohou upravovat cíle"
ON public.cile_oddeleni_milniku
FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Uživatelé mohou mazat cíle"
ON public.cile_oddeleni_milniku
FOR DELETE
TO authenticated
USING (true);

-- Triggery pro aktualizovano_at
CREATE TRIGGER set_aktualizovano_at
BEFORE UPDATE ON public.cile_oddeleni_milniku
FOR EACH ROW
EXECUTE FUNCTION public.update_aktualizovano_at();
