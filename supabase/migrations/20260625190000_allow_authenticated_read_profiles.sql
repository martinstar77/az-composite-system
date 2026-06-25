-- Drop old SELECT policies on profily_uzivatelu
DROP POLICY IF EXISTS "Uzivatele mohou cist vlastni profil" ON public.profily_uzivatelu;
DROP POLICY IF EXISTS "Admini mohou cist vse" ON public.profily_uzivatelu;

-- Create a new policy allowing any authenticated user to SELECT any profile
CREATE POLICY "Prihlaseni uzivatele mohou cist vsechny profily" 
ON public.profily_uzivatelu FOR SELECT 
TO authenticated 
USING (true);
