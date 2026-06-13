-- 1. Tabulka pro historii kurzů (Zdrojem bude ČNB)
CREATE TABLE historie_kurzu (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    datum DATE NOT NULL,
    mena TEXT NOT NULL, -- e.g., 'EUR', 'USD'
    kurz_czk NUMERIC(15, 4) NOT NULL, -- 1 EUR = X CZK
    mnozstvi INTEGER DEFAULT 1 NOT NULL, -- pro měny jako JPY nebo HUF (např. 100 HUF = X CZK)
    
    -- Unikátní klíč, aby pro jeden den a jednu měnu byl jen jeden záznam
    UNIQUE(datum, mena)
);

-- 2. Tabulka pro globální finanční nastavení a fixní poplatky
CREATE TABLE globalni_nastaveni_financi (
    id TEXT PRIMARY KEY DEFAULT 'default',
    
    -- Interní zajišťovací kurzy (pokud se Admin rozhodne nepoužít ČNB, ale svůj vlastní kurz)
    manualni_kurz_eur NUMERIC(15, 4),
    manualni_kurz_usd NUMERIC(15, 4),
    pouzivat_manualni_kurzy BOOLEAN DEFAULT false NOT NULL,
    
    -- Fixní poplatky (Landed Cost basics)
    poplatek_zahranicni_platba_czk NUMERIC(10, 2) DEFAULT 190.00, -- např. SWIFT
    poplatek_procleni_czk NUMERIC(10, 2) DEFAULT 0.00,
    marze_rezerva_procenta NUMERIC(5, 2) DEFAULT 0.00, -- dodatečná rezerva pro nepředvídatelné náklady
    
    vytvoreno_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    aktualizovano_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    upravil_id UUID REFERENCES profily_uzivatelu(id)
);

-- 3. Inicializace výchozího nastavení
INSERT INTO globalni_nastaveni_financi (id) VALUES ('default') ON CONFLICT DO NOTHING;

-- 4. Row Level Security
ALTER TABLE historie_kurzu ENABLE ROW LEVEL SECURITY;
ALTER TABLE globalni_nastaveni_financi ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Všichni přihlášení mohou číst kurzy" ON historie_kurzu FOR SELECT TO authenticated USING (true);
CREATE POLICY "Pouze Admini mohou měnit nastavení financí" ON globalni_nastaveni_financi FOR ALL TO authenticated USING (public.get_my_role() = 'admin');
CREATE POLICY "Všichni přihlášení mohou číst nastavení financí" ON globalni_nastaveni_financi FOR SELECT TO authenticated USING (true);
