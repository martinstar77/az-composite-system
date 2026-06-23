-- ============================================================
-- SQL Migration: Split Invoicing Tables (Sales vs Procurement)
-- ============================================================

-- 1. Create table public.vydane_doklady
CREATE TABLE IF NOT EXISTS public.vydane_doklady (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cislo                   TEXT UNIQUE NOT NULL,
    typ                     TEXT NOT NULL CHECK (typ IN ('nabidka', 'objednavka', 'zalohova_faktura', 'faktura')),
    stav                    TEXT NOT NULL DEFAULT 'koncept' CHECK (stav IN ('koncept', 'odeslano', 'uhrazeno', 'castecne_uhrazeno', 'stornovano', 'po_splatnosti')),
    zakaznik_id             UUID REFERENCES public.zakaznici(id) ON DELETE SET NULL,
    rodic_id                UUID REFERENCES public.vydane_doklady(id) ON DELETE SET NULL,
    datum_vystaveni         DATE NOT NULL DEFAULT CURRENT_DATE,
    datum_splatnosti        DATE,
    duzp                    DATE,
    datum_platnosti         DATE,
    mena                    TEXT NOT NULL DEFAULT 'CZK',
    kurz_k_czk              NUMERIC(10, 4) NOT NULL DEFAULT 1.0000,
    platce_dph              BOOLEAN NOT NULL DEFAULT true,
    reverse_charge          BOOLEAN NOT NULL DEFAULT false,
    zpusob_uhrady           TEXT NOT NULL DEFAULT 'prevod' CHECK (zpusob_uhrady IN ('prevod', 'hotovost', 'karta')),
    jazyk                   TEXT NOT NULL DEFAULT 'cs' CHECK (jazyk IN ('cs', 'en')),
    tisk_podpisu            BOOLEAN NOT NULL DEFAULT true,
    zalohova_castka         NUMERIC(15, 2),
    zalohova_procento       NUMERIC(5, 2),
    poznamky                TEXT,
    interni_poznamky        TEXT,
    firemni_udaje_snapshot  JSONB,
    zakaznik_udaje_snapshot JSONB,
    deleted_at              TIMESTAMP WITH TIME ZONE,
    vytvoreno_at            TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL,
    aktualizovano_at        TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL,
    vytvoril_id             UUID REFERENCES public.profily_uzivatelu(id) ON DELETE SET NULL,
    upravil_id              UUID REFERENCES public.profily_uzivatelu(id) ON DELETE SET NULL
);

-- RLS for public.vydane_doklady
ALTER TABLE public.vydane_doklady ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Přihlášení mohou číst vydané doklady" ON public.vydane_doklady;
CREATE POLICY "Přihlášení mohou číst vydané doklady" ON public.vydane_doklady FOR SELECT TO authenticated USING (deleted_at IS NULL);
DROP POLICY IF EXISTS "Admini, manažeři a obchodníci mohou spravovat vydané doklady" ON public.vydane_doklady;
CREATE POLICY "Admini, manažeři a obchodníci mohou spravovat vydané doklady" ON public.vydane_doklady FOR ALL TO authenticated USING (public.get_my_role() IN ('admin', 'manager', 'sales')) WITH CHECK (public.get_my_role() IN ('admin', 'manager', 'sales'));

-- Indexes for public.vydane_doklady
CREATE INDEX IF NOT EXISTS vydane_doklady_typ_idx ON public.vydane_doklady(typ);
CREATE INDEX IF NOT EXISTS vydane_doklady_stav_idx ON public.vydane_doklady(stav);
CREATE INDEX IF NOT EXISTS vydane_doklady_zakaznik_idx ON public.vydane_doklady(zakaznik_id);
CREATE INDEX IF NOT EXISTS vydane_doklady_rodic_idx ON public.vydane_doklady(rodic_id);
CREATE INDEX IF NOT EXISTS vydane_doklady_datum_idx ON public.vydane_doklady(datum_vystaveni DESC);

-- 2. Create table public.vydane_doklady_polozky
CREATE TABLE IF NOT EXISTS public.vydane_doklady_polozky (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doklad_id           UUID NOT NULL REFERENCES public.vydane_doklady(id) ON DELETE CASCADE,
    poradi              INTEGER NOT NULL DEFAULT 0,
    typ                 TEXT NOT NULL DEFAULT 'produkt' CHECK (typ IN ('produkt', 'volna_polozka', 'sleva', 'zalohovy_odpocet', 'text_radek', 'zaokrouhleni')),
    produkt_id          UUID REFERENCES public.produkty(id) ON DELETE SET NULL,
    nazev               TEXT NOT NULL,
    popis               TEXT,
    jednotka            TEXT NOT NULL DEFAULT 'ks',
    mnozstvi            NUMERIC(12, 4) NOT NULL DEFAULT 1,
    cena_bez_dph        NUMERIC(15, 4) NOT NULL DEFAULT 0,
    sazba_dph           NUMERIC(5, 2)  NOT NULL DEFAULT 21.00,
    sleva_procent       NUMERIC(5, 2)  NOT NULL DEFAULT 0,
    radek_bez_dph       NUMERIC(15, 4) NOT NULL DEFAULT 0,
    radek_dph           NUMERIC(15, 4) NOT NULL DEFAULT 0,
    radek_celkem        NUMERIC(15, 4) NOT NULL DEFAULT 0,
    vytvoreno_at        TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL
);

-- 3. Create table public.prijate_doklady (Procurement side)
CREATE TABLE IF NOT EXISTS public.prijate_doklady (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cislo                   TEXT UNIQUE NOT NULL, -- Internal PO or Bill sequence number
    externi_cislo_faktury   TEXT, -- Supplier's bill/invoice number
    typ                     TEXT NOT NULL CHECK (typ IN ('objednavka_dodavateli', 'prijata_faktura')),
    stav                    TEXT NOT NULL DEFAULT 'koncept' CHECK (stav IN ('koncept', 'odeslano', 'doruceno', 'schvaleno', 'uhrazeno', 'stornovano')),
    dodavatel_id            UUID REFERENCES public.dodavatele(id) ON DELETE SET NULL,
    rodic_id                UUID REFERENCES public.prijate_doklady(id) ON DELETE SET NULL,
    datum_vystaveni         DATE NOT NULL DEFAULT CURRENT_DATE, -- Date when issued or supplier invoice date
    datum_prijeti           DATE, -- For bills: date received by our accounting
    datum_splatnosti        DATE,
    duzp                    DATE,
    mena                    TEXT NOT NULL DEFAULT 'CZK',
    kurz_k_czk              NUMERIC(10, 4) NOT NULL DEFAULT 1.0000,
    platce_dph              BOOLEAN NOT NULL DEFAULT true,
    zpusob_uhrady           TEXT NOT NULL DEFAULT 'prevod' CHECK (zpusob_uhrady IN ('prevod', 'hotovost', 'karta')),
    jazyk                   TEXT NOT NULL DEFAULT 'cs' CHECK (jazyk IN ('cs', 'en')),
    poznamky                TEXT,
    interni_poznamky        TEXT,
    dodavatel_udaje_snapshot JSONB,
    deleted_at              TIMESTAMP WITH TIME ZONE,
    vytvoreno_at            TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL,
    aktualizovano_at        TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL,
    vytvoril_id             UUID REFERENCES public.profily_uzivatelu(id) ON DELETE SET NULL,
    upravil_id              UUID REFERENCES public.profily_uzivatelu(id) ON DELETE SET NULL
);

-- RLS for public.prijate_doklady
ALTER TABLE public.prijate_doklady ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Přihlášení mohou číst přijaté doklady" ON public.prijate_doklady;
CREATE POLICY "Přihlášení mohou číst přijaté doklady" ON public.prijate_doklady FOR SELECT TO authenticated USING (deleted_at IS NULL);
DROP POLICY IF EXISTS "Admini a manažeři mohou spravovat přijaté doklady" ON public.prijate_doklady;
CREATE POLICY "Admini a manažeři mohou spravovat přijaté doklady" ON public.prijate_doklady FOR ALL TO authenticated USING (public.get_my_role() IN ('admin', 'manager')) WITH CHECK (public.get_my_role() IN ('admin', 'manager'));

-- Indexes for public.prijate_doklady
CREATE INDEX IF NOT EXISTS prijate_doklady_typ_idx ON public.prijate_doklady(typ);
CREATE INDEX IF NOT EXISTS prijate_doklady_stav_idx ON public.prijate_doklady(stav);
CREATE INDEX IF NOT EXISTS prijate_doklady_dodavatel_idx ON public.prijate_doklady(dodavatel_id);
CREATE INDEX IF NOT EXISTS prijate_doklady_datum_idx ON public.prijate_doklady(datum_vystaveni DESC);

-- 4. Create table public.prijate_doklady_polozky
CREATE TABLE IF NOT EXISTS public.prijate_doklady_polozky (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doklad_id           UUID NOT NULL REFERENCES public.prijate_doklady(id) ON DELETE CASCADE,
    poradi              INTEGER NOT NULL DEFAULT 0,
    typ                 TEXT NOT NULL DEFAULT 'produkt' CHECK (typ IN ('produkt', 'volna_polozka', 'sleva', 'text_radek')),
    produkt_id          UUID REFERENCES public.produkty(id) ON DELETE SET NULL,
    nazev               TEXT NOT NULL,
    popis               TEXT,
    jednotka            TEXT NOT NULL DEFAULT 'ks',
    mnozstvi            NUMERIC(12, 4) NOT NULL DEFAULT 1,
    cena_bez_dph        NUMERIC(15, 4) NOT NULL DEFAULT 0,
    sazba_dph           NUMERIC(5, 2)  NOT NULL DEFAULT 21.00,
    sleva_procent       NUMERIC(5, 2)  NOT NULL DEFAULT 0,
    radek_bez_dph       NUMERIC(15, 4) NOT NULL DEFAULT 0,
    radek_dph           NUMERIC(15, 4) NOT NULL DEFAULT 0,
    radek_celkem        NUMERIC(15, 4) NOT NULL DEFAULT 0,
    vytvoreno_at        TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL
);

-- 5. Audit Log tables
CREATE TABLE IF NOT EXISTS public.vydane_doklady_audit_log (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doklad_id   UUID NOT NULL REFERENCES public.vydane_doklady(id) ON DELETE CASCADE,
    akce        TEXT NOT NULL,
    stary_stav  JSONB,
    novy_stav   JSONB,
    poznamka    TEXT,
    uzivatel_id UUID REFERENCES public.profily_uzivatelu(id) ON DELETE SET NULL,
    vytvoreno_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL
);
ALTER TABLE public.vydane_doklady_audit_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Přihlášení mohou číst audit log vydaných" ON public.vydane_doklady_audit_log;
CREATE POLICY "Přihlášení mohou číst audit log vydaných" ON public.vydane_doklady_audit_log FOR SELECT TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS public.prijate_doklady_audit_log (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doklad_id   UUID NOT NULL REFERENCES public.prijate_doklady(id) ON DELETE CASCADE,
    akce        TEXT NOT NULL,
    stary_stav  JSONB,
    novy_stav   JSONB,
    poznamka    TEXT,
    uzivatel_id UUID REFERENCES public.profily_uzivatelu(id) ON DELETE SET NULL,
    vytvoreno_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL
);
ALTER TABLE public.prijate_doklady_audit_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Přihlášení mohou číst audit log přijatých" ON public.prijate_doklady_audit_log;
CREATE POLICY "Přihlášení mohou číst audit log přijatých" ON public.prijate_doklady_audit_log FOR SELECT TO authenticated USING (true);

-- 6. Sequencing Functions
CREATE OR REPLACE FUNCTION public.vydane_doklady_next_number(
    p_typ TEXT,
    p_rok INTEGER DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER
)
RETURNS TEXT
SECURITY DEFINER
AS $$
DECLARE
    v_prefix TEXT;
    v_seq    INTEGER;
BEGIN
    v_prefix := CASE p_typ
        WHEN 'nabidka'          THEN 'NAB'
        WHEN 'objednavka'       THEN 'OBJ'
        WHEN 'zalohova_faktura' THEN 'ZAL'
        WHEN 'faktura'          THEN 'FAK'
        ELSE 'DOK'
    END;

    -- Transaction advisory lock
    PERFORM pg_advisory_xact_lock(hashtext(p_typ), p_rok);

    SELECT COALESCE(
        MAX(CAST(SPLIT_PART(cislo, '-', 3) AS INTEGER)),
        0
    ) + 1
    INTO v_seq
    FROM public.vydane_doklady
    WHERE typ = p_typ
      AND EXTRACT(YEAR FROM datum_vystaveni) = p_rok;

    RETURN FORMAT('%s-%s-%s', v_prefix, p_rok, LPAD(v_seq::TEXT, 4, '0'));
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.prijate_doklady_next_number(
    p_typ TEXT,
    p_rok INTEGER DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER
)
RETURNS TEXT
SECURITY DEFINER
AS $$
DECLARE
    v_prefix TEXT;
    v_seq    INTEGER;
BEGIN
    v_prefix := CASE p_typ
        WHEN 'objednavka_dodavateli' THEN 'OBD'
        WHEN 'prijata_faktura'       THEN 'PFA'
        ELSE 'PRD'
    END;

    -- Transaction advisory lock
    PERFORM pg_advisory_xact_lock(hashtext(p_typ), p_rok);

    SELECT COALESCE(
        MAX(CAST(SPLIT_PART(cislo, '-', 3) AS INTEGER)),
        0
    ) + 1
    INTO v_seq
    FROM public.prijate_doklady
    WHERE typ = p_typ
      AND EXTRACT(YEAR FROM datum_vystaveni) = p_rok;

    RETURN FORMAT('%s-%s-%s', v_prefix, p_rok, LPAD(v_seq::TEXT, 4, '0'));
END;
$$ LANGUAGE plpgsql;

-- 7. Data Migration
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'doklady') THEN
        -- Copy sales documents
        INSERT INTO public.vydane_doklady (
            id, cislo, typ, stav, zakaznik_id, rodic_id, datum_vystaveni, datum_splatnosti, duzp, datum_platnosti,
            mena, kurz_k_czk, platce_dph, reverse_charge, zpusob_uhrady, jazyk, tisk_podpisu, zalohova_castka, zalohova_procento,
            poznamky, interni_poznamky, firemni_udaje_snapshot, zakaznik_udaje_snapshot, deleted_at, vytvoreno_at, aktualizovano_at, vytvoril_id, upravil_id
        )
        SELECT
            id, cislo, typ, stav, zakaznik_id, rodic_id, datum_vystaveni, datum_splatnosti, duzp, datum_platnosti,
            mena, kurz_k_czk, platce_dph, reverse_charge, zpusob_uhrady, jazyk, tisk_podpisu, zalohova_castka, zalohova_procento,
            poznamky, interni_poznamky, firemni_udaje_snapshot, zakaznik_udaje_snapshot, deleted_at, vytvoreno_at, aktualizovano_at, vytvoril_id, upravil_id
        FROM public.doklady
        WHERE zakaznik_id IS NOT NULL;

        -- Copy sales items
        INSERT INTO public.vydane_doklady_polozky (
            id, doklad_id, poradi, typ, produkt_id, nazev, popis, jednotka, mnozstvi, cena_bez_dph, sazba_dph, sleva_procent, radek_bez_dph, radek_dph, radek_celkem, vytvoreno_at
        )
        SELECT
            id, doklad_id, poradi, typ, produkt_id, nazev, popis, jednotka, mnozstvi, cena_bez_dph, sazba_dph, sleva_procent, radek_bez_dph, radek_dph, radek_celkem, vytvoreno_at
        FROM public.doklady_polozky
        WHERE doklad_id IN (SELECT id FROM public.vydane_doklady);

        -- Copy procurement documents
        INSERT INTO public.prijate_doklady (
            id, cislo, typ, stav, dodavatel_id, rodic_id, datum_vystaveni, datum_splatnosti, duzp,
            mena, kurz_k_czk, platce_dph, zpusob_uhrady, jazyk, poznamky, interni_poznamky, dodavatel_udaje_snapshot, deleted_at, vytvoreno_at, aktualizovano_at, vytvoril_id, upravil_id
        )
        SELECT
            id, cislo, 'prijata_faktura', 'uhrazeno', dodavatel_id, rodic_id, datum_vystaveni, datum_splatnosti, duzp,
            mena, kurz_k_czk, platce_dph, zpusob_uhrady, jazyk, poznamky, interni_poznamky, zakaznik_udaje_snapshot, deleted_at, vytvoreno_at, aktualizovano_at, vytvoril_id, upravil_id
        FROM public.doklady
        WHERE dodavatel_id IS NOT NULL;

        -- Copy procurement items
        INSERT INTO public.prijate_doklady_polozky (
            id, doklad_id, poradi, typ, produkt_id, nazev, popis, jednotka, mnozstvi, cena_bez_dph, sazba_dph, sleva_procent, radek_bez_dph, radek_dph, radek_celkem, vytvoreno_at
        )
        SELECT
            id, doklad_id, poradi, typ, produkt_id, nazev, popis, jednotka, mnozstvi, cena_bez_dph, sazba_dph, sleva_procent, radek_bez_dph, radek_dph, radek_celkem, vytvoreno_at
        FROM public.doklady_polozky
        WHERE doklad_id IN (SELECT id FROM public.prijate_doklady);

        -- Rename old tables to deprecated rather than dropping them immediately (safety fallback)
        ALTER TABLE public.doklady_audit_log RENAME TO _deprecated_doklady_audit_log;
        ALTER TABLE public.doklady_polozky RENAME TO _deprecated_doklady_polozky;
        ALTER TABLE public.doklady RENAME TO _deprecated_doklady;
    END IF;
END $$;
