-- 1. Alter check constraints on typ columns
ALTER TABLE public.vydane_doklady DROP CONSTRAINT IF EXISTS vydane_doklady_typ_check;
ALTER TABLE public.vydane_doklady ADD CONSTRAINT vydane_doklady_typ_check CHECK (typ IN ('nabidka', 'objednavka', 'zalohova_faktura', 'faktura', 'opravny_doklad'));

ALTER TABLE public.prijate_doklady DROP CONSTRAINT IF EXISTS prijate_doklady_typ_check;
ALTER TABLE public.prijate_doklady ADD CONSTRAINT prijate_doklady_typ_check CHECK (typ IN ('objednavka_dodavateli', 'prijata_faktura', 'prijata_zalohova_faktura', 'prijaty_opravny_doklad'));

-- 2. Update sequencing functions to support new prefixes
-- Dropping it first so we can cleanly replace with updated definition
DROP FUNCTION IF EXISTS public.vydane_doklady_next_number(TEXT, INTEGER);

CREATE OR REPLACE FUNCTION public.vydane_doklady_next_number(
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
    v_prefix := CASE p_typ
        WHEN 'nabidka'          THEN 'NAB'
        WHEN 'objednavka'       THEN 'OBJ'
        WHEN 'zalohova_faktura' THEN 'ZAL'
        WHEN 'faktura'          THEN 'FAK'
        WHEN 'opravny_doklad'   THEN 'OPR'
        ELSE 'DOK'
    END;

    -- Transaction advisory lock
    PERFORM pg_advisory_xact_lock(hashtext(p_typ), p_rok);

    SELECT COALESCE(
        MAX(CAST(SPLIT_PART(cislo, '-', 3) AS INTEGER)),
        0
    ) + 1
    INTO v_seq
    FROM public.vydane_doklady
    WHERE typ = p_typ
      AND EXTRACT(YEAR FROM datum_vystaveni) = p_rok;

    RETURN FORMAT('%s-%s-%s', v_prefix, p_rok, LPAD(v_seq::TEXT, 4, '0'));
END;
$$ LANGUAGE plpgsql;

-- Replace prijate_doklady_next_number function
DROP FUNCTION IF EXISTS public.prijate_doklady_next_number(TEXT, INTEGER);

CREATE OR REPLACE FUNCTION public.prijate_doklady_next_number(
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
    v_prefix := CASE p_typ
        WHEN 'objednavka_dodavateli'    THEN 'OBD'
        WHEN 'prijata_faktura'          THEN 'PFA'
        WHEN 'prijata_zalohova_faktura' THEN 'PZF'
        WHEN 'prijaty_opravny_doklad'   THEN 'OPD'
        ELSE 'PRD'
    END;

    -- Transaction advisory lock
    PERFORM pg_advisory_xact_lock(hashtext(p_typ), p_rok);

    SELECT COALESCE(
        MAX(CAST(SPLIT_PART(cislo, '-', 3) AS INTEGER)),
        0
    ) + 1
    INTO v_seq
    FROM public.prijate_doklady
    WHERE typ = p_typ
      AND EXTRACT(YEAR FROM datum_vystaveni) = p_rok;

    RETURN FORMAT('%s-%s-%s', v_prefix, p_rok, LPAD(v_seq::TEXT, 4, '0'));
END;
$$ LANGUAGE plpgsql;
