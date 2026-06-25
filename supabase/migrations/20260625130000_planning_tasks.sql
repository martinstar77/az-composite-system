-- ============================================================
-- PLÁNOVACÍ MODUL v2.0 — Úkoly (Action Items)
-- Migrace: ukoly_planovani
-- Anti-byrokracie: 1 tabulka místo 3, oddělení jako CHECK constraint
-- ============================================================

CREATE TABLE public.ukoly_planovani (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Vazba na milník (cascade delete — úkoly zaniknou s milníkem)
    milnik_id           UUID NOT NULL REFERENCES public.milniky(id) ON DELETE CASCADE,

    -- Základní data
    nazev               TEXT NOT NULL,
    popis               TEXT,

    -- Stav úkolu
    stav                TEXT NOT NULL DEFAULT 'todo' CHECK (stav IN (
                            'todo',         -- K dispozici
                            'in_progress',  -- Probíhá
                            'done',         -- Hotovo
                            'blocked'       -- Blokováno
                        )),

    -- Priorita
    priorita            TEXT NOT NULL DEFAULT 'medium' CHECK (priorita IN (
                            'low',
                            'medium',
                            'high',
                            'critical'
                        )),

    -- Oddělení (TEXT enum — bez extra tabulky, bez FK, bez JOIN)
    oddeleni            TEXT NOT NULL DEFAULT 'management' CHECK (oddeleni IN (
                            'management',
                            'sales',
                            'purchasing',
                            'logistics',
                            'backbone',
                            'finance',
                            'rd',
                            'marketing',
                            'backoffice',
                            'legal'
                        )),

    -- Typ události (pro filtraci v kalendáři)
    typ_udalosti        TEXT NOT NULL DEFAULT 'task' CHECK (typ_udalosti IN (
                            'task',         -- Standardní úkol
                            'meeting',      -- Schůzka / porada
                            'order',        -- Objednávka (plánované zadání)
                            'deadline'      -- Pevný termín / deadline
                        )),

    -- Odpovědná osoba
    vlastnik_id         UUID REFERENCES public.profily_uzivatelu(id) ON DELETE SET NULL,

    -- Časové osy (klíčové pro kalendářový pohled)
    datum_zahajeni      DATE,               -- Volitelné — pro vícedenní úkoly
    datum_splatnosti    DATE,               -- Zobrazení v kalendáři

    -- Checklist (podúkoly jako JSONB — bez extra tabulky)
    -- Formát: [{"text": "Zavolat Novákovi", "done": false}, ...]
    checklist           JSONB NOT NULL DEFAULT '[]'::jsonb,

    -- Soft delete + audit
    deleted_at          TIMESTAMP WITH TIME ZONE,
    vytvoreno_at        TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL,
    aktualizovano_at    TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL,
    vytvoril_id         UUID REFERENCES public.profily_uzivatelu(id) ON DELETE SET NULL,
    upravil_id          UUID REFERENCES public.profily_uzivatelu(id) ON DELETE SET NULL
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE public.ukoly_planovani ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Přihlášení mohou číst úkoly"
    ON public.ukoly_planovani FOR SELECT
    TO authenticated
    USING (deleted_at IS NULL);

CREATE POLICY "Přihlášení mohou vytvářet úkoly"
    ON public.ukoly_planovani FOR INSERT
    TO authenticated
    WITH CHECK (vytvoril_id = auth.uid());

CREATE POLICY "Přihlášení mohou editovat úkoly"
    ON public.ukoly_planovani FOR UPDATE
    TO authenticated
    USING (deleted_at IS NULL)
    WITH CHECK (deleted_at IS NULL);

CREATE POLICY "Admini mohou mazat úkoly"
    ON public.ukoly_planovani FOR DELETE
    TO authenticated
    USING (public.get_my_role() = 'admin');

-- ============================================================
-- INDEXY
-- ============================================================

-- Hlavní dotaz: úkoly daného milníku (nejčastější dotaz)
CREATE INDEX ukoly_milnik_idx           ON public.ukoly_planovani (milnik_id)
    WHERE deleted_at IS NULL;

-- Kalendářový dotaz: úkoly v datu
CREATE INDEX ukoly_datum_splatnosti_idx ON public.ukoly_planovani (datum_splatnosti)
    WHERE deleted_at IS NULL;

CREATE INDEX ukoly_datum_zahajeni_idx   ON public.ukoly_planovani (datum_zahajeni)
    WHERE deleted_at IS NULL;

-- Filtrování dle oddělení
CREATE INDEX ukoly_oddeleni_idx         ON public.ukoly_planovani (oddeleni)
    WHERE deleted_at IS NULL;

-- "Moje úkoly" filtr
CREATE INDEX ukoly_vlastnik_idx         ON public.ukoly_planovani (vlastnik_id)
    WHERE deleted_at IS NULL;

-- Soft delete base filter
CREATE INDEX ukoly_deleted_idx          ON public.ukoly_planovani (deleted_at);

-- ============================================================
-- AUTO-UPDATE TRIGGER pro aktualizovano_at
-- Funkce update_aktualizovano_at() existuje z předchozí migrace
-- ============================================================
CREATE TRIGGER ukoly_planovani_aktualizovano_at
    BEFORE UPDATE ON public.ukoly_planovani
    FOR EACH ROW EXECUTE FUNCTION public.update_aktualizovano_at();
