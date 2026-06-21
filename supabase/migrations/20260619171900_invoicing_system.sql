-- ============================================================
-- FAKTURAČNÍ SYSTÉM — AZ Composites ERP
-- Migrace: Firemní nastavení, Zákazníci, Doklady, Položky
-- ============================================================

-- ============================================================
-- 1. FIREMNÍ NASTAVENÍ (editovatelné v UI /nastaveni/firma)
-- ============================================================
CREATE TABLE public.firemni_nastaveni (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    klic                TEXT UNIQUE NOT NULL,
    -- JSONB hodnota obsahuje celý firemní profil:
    -- { obchodni_jmeno, ico, dic, platce_dph, adresa{ulice,mesto,psc,stat},
    --   iban, banka_nazev, email_fakturace, telefon, web, logo_url }
    hodnota             JSONB NOT NULL DEFAULT '{}'::jsonb,
    aktualizovano_at    TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL,
    upravil_id          UUID REFERENCES public.profily_uzivatelu(id) ON DELETE SET NULL
);

-- RLS
ALTER TABLE public.firemni_nastaveni ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Přihlášení mohou číst firemní nastavení"
    ON public.firemni_nastaveni FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Pouze admini mohou měnit firemní nastavení"
    ON public.firemni_nastaveni FOR ALL
    TO authenticated
    USING (public.get_my_role() = 'admin')
    WITH CHECK (public.get_my_role() = 'admin');

-- Seed: výchozí firemní profil
INSERT INTO public.firemni_nastaveni (klic, hodnota) VALUES (
    'hlavni_profil',
    '{
        "obchodni_jmeno": "Ing. Filip Klier",
        "ico": "23048255",
        "dic": "CZ9906261937",
        "platce_dph": true,
        "adresa": {
            "ulice": "Jankovcova 1587/8",
            "mesto": "Praha",
            "psc": "17000",
            "stat": "Česká republika"
        },
        "iban": "",
        "banka_nazev": "",
        "email_fakturace": "",
        "telefon": "",
        "web": "",
        "logo_url": ""
    }'::jsonb
);


-- ============================================================
-- 2. ZÁKAZNÍCI (Odběratelé — oddělená entita od dodavatelů)
-- ============================================================
CREATE TABLE public.zakaznici (
    id                                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kod                                 TEXT UNIQUE NOT NULL, -- 'AZ-K-0001'
    nazev_spolecnosti                   TEXT NOT NULL,
    ico                                 TEXT,
    dic                                 TEXT,
    je_platce_dph                       BOOLEAN DEFAULT true,
    zeme                                TEXT NOT NULL DEFAULT 'CZ',
    je_zahranicni                       BOOLEAN NOT NULL DEFAULT false, -- → reverse charge

    -- Kontakt
    email_fakturace                     TEXT,
    telefon                             TEXT,

    -- Fakturační adresa
    adresa                              JSONB DEFAULT '{}'::jsonb,
    -- { ulice, mesto, psc, stat }

    -- Obchodní podmínky
    platebni_podminky_splatnost_dni     INTEGER NOT NULL DEFAULT 14,
    poznamky                            TEXT,

    -- Soft delete + audit
    deleted_at                          TIMESTAMP WITH TIME ZONE,
    vytvoreno_at                        TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL,
    aktualizovano_at                    TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL,
    vytvoril_id                         UUID REFERENCES public.profily_uzivatelu(id) ON DELETE SET NULL,
    upravil_id                          UUID REFERENCES public.profily_uzivatelu(id) ON DELETE SET NULL
);

-- RLS
ALTER TABLE public.zakaznici ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Přihlášení mohou číst zákazníky"
    ON public.zakaznici FOR SELECT
    TO authenticated
    USING (deleted_at IS NULL);

CREATE POLICY "Admini a manažeři a obchodníci mohou spravovat zákazníky"
    ON public.zakaznici FOR ALL
    TO authenticated
    USING (public.get_my_role() IN ('admin', 'manager', 'sales'))
    WITH CHECK (public.get_my_role() IN ('admin', 'manager', 'sales'));

-- Indexy
CREATE INDEX zakaznici_kod_idx ON public.zakaznici (kod);
CREATE INDEX zakaznici_nazev_idx ON public.zakaznici (nazev_spolecnosti);
CREATE INDEX zakaznici_deleted_at_idx ON public.zakaznici (deleted_at);


-- ============================================================
-- 3. DOKLADY — Hlavička (Nabídka / Objednávka / Záloha / Faktura)
-- ============================================================
CREATE TABLE public.doklady (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Identifikace
    cislo                   TEXT UNIQUE NOT NULL, -- 'FAK-2026-0001'
    typ                     TEXT NOT NULL CHECK (typ IN (
                                'nabidka',
                                'objednavka',
                                'zalohova_faktura',
                                'faktura'
                            )),
    stav                    TEXT NOT NULL DEFAULT 'koncept' CHECK (stav IN (
                                'koncept',
                                'odeslano',
                                'uhrazeno',
                                'castecne_uhrazeno',
                                'stornovano',
                                'po_splatnosti'
                            )),

    -- Vazby
    zakaznik_id             UUID NOT NULL REFERENCES public.zakaznici(id),
    rodic_id                UUID REFERENCES public.doklady(id) ON DELETE SET NULL,
    -- Příklady: OBJ je rodič FAK; ZAL je rodič FAK (odpočet zálohy)

    -- Datumy
    datum_vystaveni         DATE NOT NULL DEFAULT CURRENT_DATE,
    datum_splatnosti        DATE,
    duzp                    DATE, -- Datum uskutečnění zdanitelného plnění (povinné pro faktury plátce DPH)
    datum_platnosti         DATE, -- Pro nabídky: platí do

    -- Měna a kurz (snapshot v době vystavení)
    mena                    TEXT NOT NULL DEFAULT 'CZK',
    kurz_k_czk              NUMERIC(10, 4) NOT NULL DEFAULT 1.0000,

    -- DPH konfigurace (snapshot v době vystavení)
    platce_dph              BOOLEAN NOT NULL DEFAULT true,
    reverse_charge          BOOLEAN NOT NULL DEFAULT false,

    -- Způsob úhrady
    zpusob_uhrady           TEXT NOT NULL DEFAULT 'prevod' CHECK (zpusob_uhrady IN (
                                'prevod',
                                'hotovost',
                                'karta'
                            )),

    -- Zálohy (pro typ 'zalohova_faktura')
    zalohova_castka         NUMERIC(15, 2), -- Fixní částka zálohy
    zalohova_procento       NUMERIC(5, 2),  -- NEBO % ze součtu objednávky

    -- Texty
    poznamky                TEXT,           -- Viditelné zákazníkem
    interni_poznamky        TEXT,           -- Interní, nezobrazují se v PDF

    -- Snapshot údajů v době vystavení (historická integrita + GDPR)
    -- Po změně firemních údajů nebo zákazníka zůstanou historické faktury správné
    firemni_udaje_snapshot  JSONB,
    zakaznik_udaje_snapshot JSONB,

    -- Soft delete + audit
    deleted_at              TIMESTAMP WITH TIME ZONE,
    vytvoreno_at            TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL,
    aktualizovano_at        TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL,
    vytvoril_id             UUID REFERENCES public.profily_uzivatelu(id) ON DELETE SET NULL,
    upravil_id              UUID REFERENCES public.profily_uzivatelu(id) ON DELETE SET NULL
);

-- RLS
ALTER TABLE public.doklady ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Přihlášení mohou číst doklady"
    ON public.doklady FOR SELECT
    TO authenticated
    USING (deleted_at IS NULL);

CREATE POLICY "Admini, manažeři a obchodníci mohou spravovat doklady"
    ON public.doklady FOR ALL
    TO authenticated
    USING (public.get_my_role() IN ('admin', 'manager', 'sales'))
    WITH CHECK (public.get_my_role() IN ('admin', 'manager', 'sales'));

-- Výkonnostní indexy
CREATE INDEX doklady_typ_idx       ON public.doklady (typ);
CREATE INDEX doklady_stav_idx      ON public.doklady (stav);
CREATE INDEX doklady_zakaznik_idx  ON public.doklady (zakaznik_id);
CREATE INDEX doklady_rodic_idx     ON public.doklady (rodic_id);
CREATE INDEX doklady_datum_idx     ON public.doklady (datum_vystaveni DESC);
CREATE INDEX doklady_deleted_idx   ON public.doklady (deleted_at);
CREATE INDEX doklady_cislo_idx     ON public.doklady (cislo);


-- ============================================================
-- 4. POLOŽKY DOKLADŮ
-- ============================================================
CREATE TABLE public.doklady_polozky (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doklad_id           UUID NOT NULL REFERENCES public.doklady(id) ON DELETE CASCADE,
    poradi              INTEGER NOT NULL DEFAULT 0,

    typ                 TEXT NOT NULL DEFAULT 'produkt' CHECK (typ IN (
                            'produkt',          -- Produkt z PIM
                            'volna_polozka',    -- Ručně zadaná položka
                            'sleva',            -- Řádková sleva / doprava
                            'zalohovy_odpocet', -- Odpočet zálohy (záporná hodnota)
                            'text_radek'        -- Textový oddělovač bez ceny
                        )),

    -- Vazba na PIM (nullable pro volné položky)
    produkt_id          UUID REFERENCES public.produkty(id) ON DELETE SET NULL,

    -- Popis (override nebo volná položka)
    nazev               TEXT NOT NULL,
    popis               TEXT,
    jednotka            TEXT NOT NULL DEFAULT 'ks',

    -- Číselné hodnoty
    mnozstvi            NUMERIC(12, 4) NOT NULL DEFAULT 1,
    cena_bez_dph        NUMERIC(15, 4) NOT NULL DEFAULT 0, -- Jednotková cena bez DPH
    sazba_dph           NUMERIC(5, 2)  NOT NULL DEFAULT 21.00, -- 0, 12, 21
    sleva_procent       NUMERIC(5, 2)  NOT NULL DEFAULT 0,

    -- Vypočítané součty (ukládáme pro historii — ceny produktů se mění!)
    radek_bez_dph       NUMERIC(15, 2) NOT NULL DEFAULT 0, -- množství × cena × (1 - sleva/100)
    radek_dph           NUMERIC(15, 2) NOT NULL DEFAULT 0,
    radek_celkem        NUMERIC(15, 2) NOT NULL DEFAULT 0, -- bez_dph + dph

    vytvoreno_at        TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL
);

-- RLS
ALTER TABLE public.doklady_polozky ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Přihlášení mohou číst položky dokladů"
    ON public.doklady_polozky FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Admini, manažeři a obchodníci mohou spravovat položky dokladů"
    ON public.doklady_polozky FOR ALL
    TO authenticated
    USING (public.get_my_role() IN ('admin', 'manager', 'sales'))
    WITH CHECK (public.get_my_role() IN ('admin', 'manager', 'sales'));

-- Index pro rychlé načtení položek konkrétního dokladu
CREATE INDEX doklady_polozky_doklad_idx  ON public.doklady_polozky (doklad_id, poradi);
CREATE INDEX doklady_polozky_produkt_idx ON public.doklady_polozky (produkt_id);


-- ============================================================
-- 5. AUDIT LOG DOKLADŮ
-- ============================================================
CREATE TABLE public.doklady_audit_log (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doklad_id       UUID NOT NULL REFERENCES public.doklady(id) ON DELETE CASCADE,
    akce            TEXT NOT NULL, -- 'vytvoreno', 'stav_zmeneno', 'upraveno', 'stornovano'
    stary_stav      JSONB,
    novy_stav       JSONB,
    poznamka        TEXT,
    uzivatel_id     UUID REFERENCES public.profily_uzivatelu(id) ON DELETE SET NULL,
    vytvoreno_at    TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL
);

ALTER TABLE public.doklady_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Přihlášení mohou číst audit log dokladů"
    ON public.doklady_audit_log FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Systém může zapisovat do audit logu"
    ON public.doklady_audit_log FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE INDEX doklady_audit_doklad_idx ON public.doklady_audit_log (doklad_id);
CREATE INDEX doklady_audit_uzivatel_idx ON public.doklady_audit_log (uzivatel_id);


-- ============================================================
-- 6. ATOMICKÁ FUNKCE PRO ČÍSLOVACÍ ŘADU
-- Zabezpečena FOR UPDATE — bez race condition při souběžném vytvoření
-- ============================================================
CREATE OR REPLACE FUNCTION public.next_document_number(
    p_typ TEXT,
    p_rok INTEGER DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_prefix TEXT;
    v_seq    INTEGER;
BEGIN
    -- Mapování typu na prefix
    v_prefix := CASE p_typ
        WHEN 'nabidka'          THEN 'NAB'
        WHEN 'objednavka'       THEN 'OBJ'
        WHEN 'zalohova_faktura' THEN 'ZAL'
        WHEN 'faktura'          THEN 'FAK'
        ELSE 'DOK'
    END;

    -- Získání transakčního advisory locku pro kombinaci typu a roku číslovací řady
    PERFORM pg_advisory_xact_lock(hashtext(p_typ), p_rok);

    -- Získání nejvyššího pořadového čísla a inkrementace
    SELECT COALESCE(
        MAX(CAST(SPLIT_PART(cislo, '-', 3) AS INTEGER)),
        0
    ) + 1
    INTO v_seq
    FROM public.doklady
    WHERE typ = p_typ
      AND EXTRACT(YEAR FROM datum_vystaveni) = p_rok;

    -- Formát: FAK-2026-0001
    RETURN FORMAT('%s-%s-%s', v_prefix, p_rok, LPAD(v_seq::TEXT, 4, '0'));
END;
$$;


-- ============================================================
-- 7. AUTO-UPDATE TRIGGER pro aktualizovano_at
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_aktualizovano_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.aktualizovano_at = timezone('utc', now());
    RETURN NEW;
END;
$$;

CREATE TRIGGER zakaznici_aktualizovano_at
    BEFORE UPDATE ON public.zakaznici
    FOR EACH ROW EXECUTE FUNCTION public.update_aktualizovano_at();

CREATE TRIGGER doklady_aktualizovano_at
    BEFORE UPDATE ON public.doklady
    FOR EACH ROW EXECUTE FUNCTION public.update_aktualizovano_at();

CREATE TRIGGER firemni_nastaveni_aktualizovano_at
    BEFORE UPDATE ON public.firemni_nastaveni
    FOR EACH ROW EXECUTE FUNCTION public.update_aktualizovano_at();
