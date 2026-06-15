-- Migration: Add volume discounts (quantity breaks) for products
-- Path: supabase/migrations/20260615111500_add_volume_discounts.sql

CREATE TABLE produkt_mnozstevni_slevy (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    produkt_id UUID REFERENCES produkty(id) ON DELETE CASCADE NOT NULL,
    mnozstvi_od NUMERIC(12, 4) NOT NULL,
    typ_zakaznika VARCHAR(10) NOT NULL CHECK (typ_zakaznika IN ('B2C', 'B2B')),
    sleva_procenta NUMERIC(5, 2) NOT NULL CHECK (sleva_procenta >= 0.00 AND sleva_procenta <= 100.00),
    
    -- Audit fields
    vytvoril_id UUID REFERENCES profily_uzivatelu(id) ON DELETE SET NULL,
    upravil_id UUID REFERENCES profily_uzivatelu(id) ON DELETE SET NULL,
    vytvoreno_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    aktualizovano_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    -- Constraint: Each product can only have one discount percentage per customer type at a specific quantity threshold
    CONSTRAINT unique_product_customer_qty UNIQUE (produkt_id, typ_zakaznika, mnozstvi_od)
);

-- Enable Row Level Security (RLS)
ALTER TABLE produkt_mnozstevni_slevy ENABLE ROW LEVEL SECURITY;

-- 1. Everyone authenticated can read volume discounts
DROP POLICY IF EXISTS "Všichni přihlášení mohou číst produkt_mnozstevni_slevy" ON produkt_mnozstevni_slevy;
CREATE POLICY "Všichni přihlášení mohou číst produkt_mnozstevni_slevy" 
ON produkt_mnozstevni_slevy FOR SELECT TO authenticated USING (true);

-- 2. Only admins and managers can modify volume discounts
DROP POLICY IF EXISTS "Pouze admini a manažeři mohou měnit produkt_mnozstevni_slevy" ON produkt_mnozstevni_slevy;
CREATE POLICY "Pouze admini a manažeři mohou měnit produkt_mnozstevni_slevy" 
ON produkt_mnozstevni_slevy FOR ALL TO authenticated USING (public.get_my_role() IN ('admin', 'manager'));
