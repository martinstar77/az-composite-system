-- ============================================================
-- PLÁNOVACÍ MODUL — AZ Composites ERP
-- Migrace: Projekty a Milníky (Milestone Tracker)
-- ============================================================

-- ============================================================
-- 1. PROJEKTY PLÁNOVÁNÍ (Kontejner pro sady milníků)
-- ============================================================
CREATE TABLE public.projekty_planovani (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nazev               TEXT NOT NULL,
    popis               TEXT,
    stav                TEXT NOT NULL DEFAULT 'planned' CHECK (stav IN (
                            'planned',       -- Naplánovaný, ještě nezahájený
                            'active',        -- Probíhá
                            'completed',     -- Dokončeno
                            'on_hold',       -- Pozastaven
                            'archived'       -- Archivován
                        )),
    barva               TEXT NOT NULL DEFAULT '#8A0485', -- Hex kód pro vizuální odlišení v UI
    datum_zahajeni      DATE,
    datum_ukonceni      DATE,

    -- Multi-tenancy (budoucí izolace)
    tenant_id           UUID,

    -- Soft delete + audit
    deleted_at          TIMESTAMP WITH TIME ZONE,
    vytvoreno_at        TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL,
    aktualizovano_at    TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL,
    vytvoril_id         UUID REFERENCES public.profily_uzivatelu(id) ON DELETE SET NULL,
    upravil_id          UUID REFERENCES public.profily_uzivatelu(id) ON DELETE SET NULL
);

-- RLS
ALTER TABLE public.projekty_planovani ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Přihlášení mohou číst projekty"
    ON public.projekty_planovani FOR SELECT
    TO authenticated
    USING (deleted_at IS NULL);

CREATE POLICY "Přihlášení mohou vytvářet projekty"
    ON public.projekty_planovani FOR INSERT
    TO authenticated
    WITH CHECK (vytvoril_id = auth.uid());

CREATE POLICY "Admini a manažeři mohou editovat projekty"
    ON public.projekty_planovani FOR UPDATE
    TO authenticated
    USING (deleted_at IS NULL AND public.get_my_role() IN ('admin', 'manager'))
    WITH CHECK (deleted_at IS NULL AND public.get_my_role() IN ('admin', 'manager'));

CREATE POLICY "Admini mohou mazat projekty"
    ON public.projekty_planovani FOR DELETE
    TO authenticated
    USING (public.get_my_role() = 'admin');

-- Indexy
CREATE INDEX projekty_stav_idx         ON public.projekty_planovani (stav);
CREATE INDEX projekty_deleted_idx      ON public.projekty_planovani (deleted_at);
CREATE INDEX projekty_vytvoril_idx     ON public.projekty_planovani (vytvoril_id);
CREATE INDEX projekty_datum_idx        ON public.projekty_planovani (datum_zahajeni);


-- ============================================================
-- 2. MILNÍKY (Fáze uvnitř projektů)
-- ============================================================
CREATE TABLE public.milniky (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    projekt_id          UUID NOT NULL REFERENCES public.projekty_planovani(id) ON DELETE CASCADE,

    nazev               TEXT NOT NULL,
    popis               TEXT,

    stav                TEXT NOT NULL DEFAULT 'planned' CHECK (stav IN (
                            'planned',       -- Naplánován
                            'in_progress',   -- Probíhá
                            'completed',     -- Dokončen
                            'blocked',       -- Blokován (čeká na jiný milník/rozhodnutí)
                            'cancelled'      -- Zrušen
                        )),

    priorita            TEXT NOT NULL DEFAULT 'medium' CHECK (priorita IN (
                            'low',
                            'medium',
                            'high',
                            'critical'
                        )),

    -- Časové osy
    datum_zahajeni      DATE,
    datum_splatnosti    DATE,                -- Plánovaný deadline
    datum_dokonceni     DATE,                -- Skutečné datum dokončení

    -- Vizuální progress (0–100, manuální nebo budoucí odvozené od tasks)
    progres_procenta    INTEGER NOT NULL DEFAULT 0 CHECK (progres_procenta BETWEEN 0 AND 100),

    -- Pořadí fází v rámci projektu (pro drag-and-drop řazení)
    poradi              INTEGER NOT NULL DEFAULT 0,

    -- Odpovědná osoba
    vlastnik_id         UUID REFERENCES public.profily_uzivatelu(id) ON DELETE SET NULL,

    -- Vizuální identifikace (barva překrývá barvu projektu pro individuální odlišení)
    barva               TEXT,               -- Hex kód, null = dědí barvu projektu

    -- Multi-tenancy (budoucí izolace)
    tenant_id           UUID,

    -- Soft delete + audit
    deleted_at          TIMESTAMP WITH TIME ZONE,
    vytvoreno_at        TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL,
    aktualizovano_at    TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL,
    vytvoril_id         UUID REFERENCES public.profily_uzivatelu(id) ON DELETE SET NULL,
    upravil_id          UUID REFERENCES public.profily_uzivatelu(id) ON DELETE SET NULL
);

-- RLS
ALTER TABLE public.milniky ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Přihlášení mohou číst milníky"
    ON public.milniky FOR SELECT
    TO authenticated
    USING (deleted_at IS NULL);

CREATE POLICY "Přihlášení mohou vytvářet milníky"
    ON public.milniky FOR INSERT
    TO authenticated
    WITH CHECK (vytvoril_id = auth.uid());

CREATE POLICY "Přihlášení mohou editovat milníky"
    ON public.milniky FOR UPDATE
    TO authenticated
    USING (deleted_at IS NULL)
    WITH CHECK (deleted_at IS NULL);

CREATE POLICY "Admini mohou mazat milníky"
    ON public.milniky FOR DELETE
    TO authenticated
    USING (public.get_my_role() = 'admin');

-- Indexy
CREATE INDEX milniky_projekt_idx        ON public.milniky (projekt_id, poradi);
CREATE INDEX milniky_stav_idx           ON public.milniky (stav);
CREATE INDEX milniky_priorita_idx       ON public.milniky (priorita);
CREATE INDEX milniky_vlastnik_idx       ON public.milniky (vlastnik_id);
CREATE INDEX milniky_datum_splatnosti   ON public.milniky (datum_splatnosti);
CREATE INDEX milniky_deleted_idx        ON public.milniky (deleted_at);


-- ============================================================
-- 3. AUTO-UPDATE TRIGGER pro aktualizovano_at
-- Funkce update_aktualizovano_at() již existuje z předchozí migrace
-- ============================================================
CREATE TRIGGER projekty_planovani_aktualizovano_at
    BEFORE UPDATE ON public.projekty_planovani
    FOR EACH ROW EXECUTE FUNCTION public.update_aktualizovano_at();

CREATE TRIGGER milniky_aktualizovano_at
    BEFORE UPDATE ON public.milniky
    FOR EACH ROW EXECUTE FUNCTION public.update_aktualizovano_at();
