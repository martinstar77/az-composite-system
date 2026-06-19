-- 1. Tabulka složek poznámek (slozky_poznamek)
CREATE TABLE public.slozky_poznamek (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nazev TEXT NOT NULL,
    barva TEXT DEFAULT 'text-blue-500',
    is_shared BOOLEAN DEFAULT false NOT NULL,
    tenant_id UUID, -- Pro budoucí multi-tenancy izolaci
    vytvoril_id UUID REFERENCES public.profily_uzivatelu(id) ON DELETE SET NULL,
    upravil_id UUID REFERENCES public.profily_uzivatelu(id) ON DELETE SET NULL,
    vytvoreno_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    aktualizovano_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Zapnutí RLS pro složky
ALTER TABLE public.slozky_poznamek ENABLE ROW LEVEL SECURITY;

-- RLS Politiky pro složky
CREATE POLICY "Select note folders"
    ON public.slozky_poznamek FOR SELECT
    TO authenticated
    USING (deleted_at IS NULL AND (vytvoril_id = auth.uid() OR is_shared = true));

CREATE POLICY "Insert note folders"
    ON public.slozky_poznamek FOR INSERT
    TO authenticated
    WITH CHECK (vytvoril_id = auth.uid());

CREATE POLICY "Update note folders"
    ON public.slozky_poznamek FOR UPDATE
    TO authenticated
    USING (deleted_at IS NULL AND (vytvoril_id = auth.uid() OR is_shared = true))
    WITH CHECK (deleted_at IS NULL AND (vytvoril_id = auth.uid() OR is_shared = true));

CREATE POLICY "Delete note folders"
    ON public.slozky_poznamek FOR DELETE
    TO authenticated
    USING (deleted_at IS NULL AND (vytvoril_id = auth.uid() OR is_shared = true));


-- 2. Tabulka poznámek (poznamky)
CREATE TABLE public.poznamky (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slozka_id UUID REFERENCES public.slozky_poznamek(id) ON DELETE SET NULL,
    nazev TEXT NOT NULL DEFAULT 'Bez názvu',
    obsah TEXT, -- Bohatý HTML text z editoru Tiptap
    obsah_txt TEXT, -- Čistý text bez HTML pro vyhledávání a náhledy
    is_shared BOOLEAN DEFAULT false NOT NULL,
    tenant_id UUID, -- Pro budoucí multi-tenancy izolaci
    vytvoril_id UUID REFERENCES public.profily_uzivatelu(id) ON DELETE SET NULL,
    upravil_id UUID REFERENCES public.profily_uzivatelu(id) ON DELETE SET NULL,
    vytvoreno_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    aktualizovano_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Zapnutí RLS pro poznámky
ALTER TABLE public.poznamky ENABLE ROW LEVEL SECURITY;

-- RLS Politiky pro poznámky
CREATE POLICY "Select notes"
    ON public.poznamky FOR SELECT
    TO authenticated
    USING (deleted_at IS NULL AND (vytvoril_id = auth.uid() OR is_shared = true));

CREATE POLICY "Insert notes"
    ON public.poznamky FOR INSERT
    TO authenticated
    WITH CHECK (vytvoril_id = auth.uid());

CREATE POLICY "Update notes"
    ON public.poznamky FOR UPDATE
    TO authenticated
    USING (deleted_at IS NULL AND (vytvoril_id = auth.uid() OR is_shared = true))
    WITH CHECK (deleted_at IS NULL AND (vytvoril_id = auth.uid() OR is_shared = true));

CREATE POLICY "Delete notes"
    ON public.poznamky FOR DELETE
    TO authenticated
    USING (deleted_at IS NULL AND (vytvoril_id = auth.uid() OR is_shared = true));


-- Výkonnostní indexy
CREATE INDEX slozky_poznamek_vytvoril_idx ON public.slozky_poznamek (vytvoril_id);
CREATE INDEX slozky_poznamek_is_shared_idx ON public.slozky_poznamek (is_shared);
CREATE INDEX poznamky_slozka_idx ON public.poznamky (slozka_id);
CREATE INDEX poznamky_vytvoril_idx ON public.poznamky (vytvoril_id);
CREATE INDEX poznamky_is_shared_idx ON public.poznamky (is_shared);
