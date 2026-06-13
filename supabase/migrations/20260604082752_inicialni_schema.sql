CREATE TABLE produkty (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nazev TEXT NOT NULL,
    sku TEXT UNIQUE NOT NULL,
    typ_materialu TEXT NOT NULL, -- napr. 'tkanina', 'prepreg', 'pryskyrice'
    technicke_parametry JSONB DEFAULT '{}'::jsonb, -- flexibilni pole pro specifika
    vytvoreno_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
