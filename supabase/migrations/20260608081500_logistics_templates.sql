-- 1. Tabulka pro logistické šablony
CREATE TABLE logisticke_sablony (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nazev TEXT NOT NULL,
    
    -- Konfigurace dopravy
    typ_vypoctu_dopravy TEXT NOT NULL CHECK (typ_vypoctu_dopravy IN ('procentualni', 'vaha_kg', 'fixni')),
    sazba_dopravy NUMERIC(10, 4) DEFAULT 0 NOT NULL, -- např. 0.41 pro 41%, nebo 2.5 pro 2.5 EUR/kg
    
    -- Fixní poplatky v CZK (Excel parity)
    poplatek_banka_czk NUMERIC(10, 2) DEFAULT 190.00 NOT NULL, -- SWIFT/Bank fees
    poplatek_procleni_czk NUMERIC(10, 2) DEFAULT 0.00 NOT NULL,
    poplatek_odpady_czk NUMERIC(10, 2) DEFAULT 0.00 NOT NULL, -- Přijatý odpad
    poplatek_balne_czk NUMERIC(10, 2) DEFAULT 0.00 NOT NULL, -- Balení / Balení odpad
    
    -- Clo
    vychozi_clo_procenta NUMERIC(5, 2) DEFAULT 0.00 NOT NULL,
    
    -- Audit
    vytvoreno_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    aktualizovano_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    vytvoril_id UUID REFERENCES profily_uzivatelu(id),
    upravil_id UUID REFERENCES profily_uzivatelu(id)
);

-- 2. Propojení sourcingu se šablonou
ALTER TABLE produkt_dodavatel ADD COLUMN logisticka_sablona_id UUID REFERENCES logisticke_sablony(id);

-- 3. Row Level Security
ALTER TABLE logisticke_sablony ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Všichni přihlášení mohou číst šablony" 
ON logisticke_sablony FOR SELECT TO authenticated USING (true);

CREATE POLICY "Pouze Admini a Obchod mohou měnit šablony" 
ON logisticke_sablony FOR ALL TO authenticated 
USING (public.get_my_role() IN ('admin', 'obchod'));

-- 4. Audit trigger pro aktualizovano_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.aktualizovano_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_logisticke_sablony_updated_at
    BEFORE UPDATE ON logisticke_sablony
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
