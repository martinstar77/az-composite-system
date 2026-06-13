-- 1. Allow authenticated users (specifically admins/managers) to upsert exchange rates
DROP POLICY IF EXISTS "Admini mohou vse v historie_kurzu" ON historie_kurzu;
CREATE POLICY "Admini mohou vse v historie_kurzu" 
ON historie_kurzu FOR ALL 
TO authenticated 
USING (public.get_my_role() IN ('admin', 'manager'));

-- 2. Ensure read access is still open for everyone authenticated
DROP POLICY IF EXISTS "Všichni přihlášení mohou číst kurzy" ON historie_kurzu;
CREATE POLICY "Všichni přihlášení mohou číst kurzy" 
ON historie_kurzu FOR SELECT 
TO authenticated 
USING (true);
