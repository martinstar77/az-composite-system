-- 1. Tabulka Dodavatelů (Sourcing Master Data)
CREATE TABLE dodavatele (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kod TEXT UNIQUE NOT NULL, -- e.g., 'HITEX'
    nazev_spolecnosti TEXT NOT NULL,
    zeme_puvodu TEXT,
    vychozi_mena TEXT NOT NULL DEFAULT 'EUR',
    
    -- Obchodní podmínky
    platebni_podminky_splatnost_dni INTEGER DEFAULT 0,
    vychozi_lead_time_tydny INTEGER DEFAULT 0,
    
    -- Kontakty a další flexibilní data
    kontakty JSONB DEFAULT '{}'::jsonb,
    
    deleted_at TIMESTAMP WITH TIME ZONE,
    vytvoreno_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    aktualizovano_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Vazební tabulka Produkt - Dodavatel (Nákupní ceník)
CREATE TABLE produkt_dodavatel (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    produkt_id UUID REFERENCES produkty(id) ON DELETE CASCADE NOT NULL,
    dodavatel_id UUID REFERENCES dodavatele(id) ON DELETE CASCADE NOT NULL,
    
    -- Nákupní podmínky pro tento konkrétní produkt od tohoto dodavatele
    nakupni_cena NUMERIC(15, 4) NOT NULL, -- 4 desetinná místa pro přesnost u malých položek
    mena TEXT NOT NULL DEFAULT 'EUR',
    moq NUMERIC(10, 2) DEFAULT 1, -- Minimum Order Quantity
    lead_time_tydny INTEGER, -- Specifický lead time (pokud je NULL, bere se z dodavatele)
    is_primary BOOLEAN DEFAULT false, -- Příznak, zda jde o hlavního dodavatele pro tento produkt
    
    -- Zajištění, aby jeden produkt měl od jednoho dodavatele jen jeden aktivní ceník (v základní verzi)
    UNIQUE(produkt_id, dodavatel_id),
    
    deleted_at TIMESTAMP WITH TIME ZONE,
    vytvoreno_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    aktualizovano_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
