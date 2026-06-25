-- Enable RLS on c_role_uzivatelu
ALTER TABLE c_role_uzivatelu ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read roles
DROP POLICY IF EXISTS "Kazdy prihlaseny muze cist role" ON c_role_uzivatelu;
CREATE POLICY "Kazdy prihlaseny muze cist role" 
ON c_role_uzivatelu FOR SELECT 
TO authenticated 
USING (true);

-- Allow admins to manage roles
DROP POLICY IF EXISTS "Admini mohou spravovat role" ON c_role_uzivatelu;
CREATE POLICY "Admini mohou spravovat role" 
ON c_role_uzivatelu FOR ALL 
TO authenticated 
USING (public.get_my_role() = 'admin');
