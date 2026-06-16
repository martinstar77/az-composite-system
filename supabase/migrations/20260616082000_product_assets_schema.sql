-- 1. Číselník typů dokumentů
CREATE TABLE IF NOT EXISTS c_typy_dokumentu (
    id TEXT PRIMARY KEY,
    nazev TEXT NOT NULL
);

INSERT INTO c_typy_dokumentu (id, nazev) VALUES
('tds', 'Technický list (TDS)'),
('msds', 'Bezpečnostní list (MSDS)'),
('coa', 'Atest / Certifikát analýzy (COA)'),
('manual', 'Návod k použití'),
('cert', 'Kvalitativní certifikát')
ON CONFLICT (id) DO UPDATE SET nazev = EXCLUDED.nazev;

-- 2. Relační tabulka pro soubory
CREATE TABLE IF NOT EXISTS produkt_soubory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    produkt_id UUID REFERENCES produkty(id) ON DELETE CASCADE NOT NULL,
    typ_dokumentu_id TEXT REFERENCES c_typy_dokumentu(id) NOT NULL,
    nazev TEXT NOT NULL,
    file_path TEXT NOT NULL, -- např. "produkty/[produkt_id]/[file_id].pdf"
    file_size_bytes BIGINT NOT NULL,
    content_type TEXT NOT NULL,
    vytvoril_id UUID REFERENCES auth.users(id),
    vytvoreno_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_produkt_soubory_produkt_id ON produkt_soubory(produkt_id);

-- 3. Zavedení privátního bucketu v Supabase Storage
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'product-assets',
    'product-assets',
    false, -- FALSE = Privátní bucket
    20971520, -- Limit 20 MB na soubor
    ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

-- RLS Politiky pro storage.objects (Povolení pouze authenticated uživatelům pro tento bucket)
DROP POLICY IF EXISTS "Povolit cteni prihlasenym pro product-assets" ON storage.objects;
CREATE POLICY "Povolit cteni prihlasenym pro product-assets" ON storage.objects
    FOR SELECT TO authenticated USING (bucket_id = 'product-assets');

DROP POLICY IF EXISTS "Povolit zapis prihlasenym pro product-assets" ON storage.objects;
CREATE POLICY "Povolit zapis prihlasenym pro product-assets" ON storage.objects
    FOR INSERT TO authenticated WITH CHECK (bucket_id = 'product-assets');

DROP POLICY IF EXISTS "Povolit smazani prihlasenym pro product-assets" ON storage.objects;
CREATE POLICY "Povolit smazani prihlasenym pro product-assets" ON storage.objects
    FOR DELETE TO authenticated USING (bucket_id = 'product-assets');
