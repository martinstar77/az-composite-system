-- Add audit fields to produkt_dodavatel table
ALTER TABLE produkt_dodavatel 
ADD COLUMN vytvoril_id UUID REFERENCES profily_uzivatelu(id),
ADD COLUMN upravil_id UUID REFERENCES profily_uzivatelu(id);
