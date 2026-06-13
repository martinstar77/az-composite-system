-- Fix infinite recursion in RLS policies for profily_uzivatelu

DROP POLICY IF EXISTS "Admini mohou vse v profilech" ON profily_uzivatelu;
DROP POLICY IF EXISTS "Uzivatele mohou cist vlastni profil" ON profily_uzivatelu;

-- 1. Create a secure function to get the current user's role without triggering RLS recursion
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER -- Runs as database owner, bypassing RLS
SET search_path = public
AS $$
  SELECT role_id FROM profily_uzivatelu WHERE id = auth.uid();
$$;

-- 2. Re-create the policies using the secure function
CREATE POLICY "Uzivatele mohou cist vlastni profil" 
ON profily_uzivatelu FOR SELECT 
TO authenticated 
USING (auth.uid() = id);

-- We allow Admins to read all profiles
CREATE POLICY "Admini mohou cist vse" 
ON profily_uzivatelu FOR SELECT 
TO authenticated 
USING (public.get_my_role() = 'admin');

-- We allow Admins to update all profiles
CREATE POLICY "Admini mohou upravovat vse" 
ON profily_uzivatelu FOR UPDATE 
TO authenticated 
USING (public.get_my_role() = 'admin');
