-- ============================================================
-- Fix pro next_document_number funkci
-- Nahrazuje nepovolený FOR UPDATE u agregované funkce MAX() transakčním advisory zámkem
-- ============================================================

CREATE OR REPLACE FUNCTION public.next_document_number(
    p_typ TEXT,
    p_rok INTEGER DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER
)
RETURNS TEXT
SECURITY DEFINER
AS $$
DECLARE
    v_prefix TEXT;
    v_seq    INTEGER;
BEGIN
    -- Mapování typu na prefix
    v_prefix := CASE p_typ
        WHEN 'nabidka'          THEN 'NAB'
        WHEN 'objednavka'       THEN 'OBJ'
        WHEN 'zalohova_faktura' THEN 'ZAL'
        WHEN 'faktura'          THEN 'FAK'
        ELSE 'DOK'
    END;

    -- Získání transakčního advisory locku pro kombinaci typu a roku číslovací řady
    PERFORM pg_advisory_xact_lock(hashtext(p_typ), p_rok);

    -- Získání nejvyššího pořadového čísla a inkrementace
    SELECT COALESCE(
        MAX(CAST(SPLIT_PART(cislo, '-', 3) AS INTEGER)),
        0
    ) + 1
    INTO v_seq
    FROM public.doklady
    WHERE typ = p_typ
      AND EXTRACT(YEAR FROM datum_vystaveni) = p_rok;

    -- Formát: FAK-2026-0001
    RETURN FORMAT('%s-%s-%s', v_prefix, p_rok, LPAD(v_seq::TEXT, 4, '0'));
END;
$$ LANGUAGE plpgsql;
