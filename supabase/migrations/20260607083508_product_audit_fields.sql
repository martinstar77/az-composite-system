-- 1. Enforce unique nicknames for unambiguous logging
ALTER TABLE profily_uzivatelu ADD CONSTRAINT unique_nickname UNIQUE (jmeno);

-- 2. Add audit fields to products
ALTER TABLE produkty 
ADD COLUMN vytvoril_id UUID REFERENCES profily_uzivatelu(id),
ADD COLUMN upravil_id UUID REFERENCES profily_uzivatelu(id);

-- 3. Update existing records (if any) to be owned by the main admin for consistency
DO $$
DECLARE
    admin_id UUID;
BEGIN
    SELECT id INTO admin_id FROM profily_uzivatelu WHERE role_id = 'admin' LIMIT 1;
    IF admin_id IS NOT NULL THEN
        UPDATE produkty SET vytvoril_id = admin_id, upravil_id = admin_id WHERE vytvoril_id IS NULL;
    END IF;
END $$;
