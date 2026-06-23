-- ============================================================
-- Fix RLS policy for firemni_nastaveni
-- Permits both 'admin' and 'manager' roles to update settings
-- ============================================================

DROP POLICY IF EXISTS "Pouze admini mohou měnit firemní nastavení" ON public.firemni_nastaveni;

CREATE POLICY "Pouze admini a manažeři mohou měnit firemní nastavení"
    ON public.firemni_nastaveni FOR ALL
    TO authenticated
    USING (public.get_my_role() IN ('admin', 'manager'))
    WITH CHECK (public.get_my_role() IN ('admin', 'manager'));
