-- Migration: Add product logistics integrity constraints and validations
-- Enforces Amazon/Rohlik grade data quality checks on products.

-- 1. Add CHECK constraints for active products ('ready_to_order')
ALTER TABLE produkty
ADD CONSTRAINT check_ready_product_weight 
CHECK (
  deleted_at IS NOT NULL 
  OR stav_katalogu_id != 'ready_to_order' 
  OR (hmotnost_baliku_kg IS NOT NULL AND hmotnost_baliku_kg > 0)
) NOT VALID;

ALTER TABLE produkty
ADD CONSTRAINT check_ready_product_pack_size 
CHECK (
  deleted_at IS NOT NULL 
  OR stav_katalogu_id != 'ready_to_order' 
  OR (mnozstvi_v_baleni IS NOT NULL AND mnozstvi_v_baleni > 0)
) NOT VALID;

-- 2. Create PL/pgSQL function to validate specifications and physical constraints
CREATE OR REPLACE FUNCTION fn_validate_product_logistics()
RETURNS TRIGGER AS $$
DECLARE
  spec_objem TEXT;
  spec_mnozstvi TEXT;
  spec_typ TEXT;
  spec_chemie TEXT;
  parsed_vol NUMERIC;
  density NUMERIC;
  net_weight_est NUMERIC;
  is_roll BOOLEAN;
  pack_type TEXT;
  podkat TEXT;
  podtyp_fch TEXT;
BEGIN
  -- Ignore soft-deleted products
  IF NEW.deleted_at IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Only perform validation if status is 'ready_to_order'
  IF NEW.stav_katalogu_id = 'ready_to_order' THEN
    
    -- Extract values from JSONB specifications safely
    spec_objem := NEW.specifikace->>'objem';
    spec_mnozstvi := NEW.specifikace->>'mnozstvi';
    spec_typ := NEW.specifikace->>'typ';
    spec_chemie := NEW.specifikace->>'chemie';

    -- Physical Paradox check (Gross weight < Net weight)
    net_weight_est := NULL;

    -- Estimate Net Weight for resins
    IF NEW.kategorie_id = 'pryskyrice' AND NEW.zakladni_mj_id = 'kg' THEN
      parsed_vol := NULL;
      IF NEW.specifikace->>'objem_nakup_l' IS NOT NULL THEN
        -- Simple parsing of float
        parsed_vol := CAST(substring(NEW.specifikace->>'objem_nakup_l' from '^[0-9.]+') AS NUMERIC);
      END IF;
      
      IF parsed_vol IS NOT NULL AND parsed_vol > 0 THEN
        density := CASE 
          WHEN spec_typ = 'HRD' THEN 0.95 
          WHEN spec_chemie = 'EP' THEN 1.15
          WHEN spec_chemie = 'VE' THEN 1.12
          WHEN spec_chemie = 'PE' THEN 1.13
          WHEN spec_chemie = 'GEL' THEN 1.20
          ELSE 1.0
        END;
        net_weight_est := parsed_vol * density;
      END IF;

    -- Estimate Net Weight for chemistry
    ELSIF NEW.kategorie_id IN ('chemie', 'spotrebni_chemie') AND NEW.zakladni_mj_id = 'l' THEN
      parsed_vol := NULL;
      IF spec_objem IS NOT NULL THEN
        parsed_vol := CAST(substring(spec_objem from '^[0-9.]+') AS NUMERIC);
        IF spec_objem LIKE '%ml' THEN
          parsed_vol := parsed_vol / 1000.0;
        END IF;
      ELSIF spec_mnozstvi IS NOT NULL THEN
        parsed_vol := CAST(substring(spec_mnozstvi from '^[0-9.]+') AS NUMERIC);
        IF spec_mnozstvi LIKE '%ml' THEN
          parsed_vol := parsed_vol / 1000.0;
        END IF;
      END IF;

      IF parsed_vol IS NOT NULL AND parsed_vol > 0 THEN
        density := CASE WHEN NEW.specifikace->>'vlastnost' = 'EP' THEN 1.15 ELSE 1.0 END;
        net_weight_est := parsed_vol * density;
      END IF;
    END IF;

    -- Throw exception if physical weight paradox occurs
    IF net_weight_est IS NOT NULL AND NEW.hmotnost_baliku_kg IS NOT NULL THEN
      -- Allow 0.05kg tolerance for floating-point inaccuracies
      IF NEW.hmotnost_baliku_kg < (net_weight_est - 0.05) THEN
        RAISE EXCEPTION 'Physical paradox for SKU %: Gross weight (%) is lower than estimated net weight (%)', 
          NEW.sku, NEW.hmotnost_baliku_kg, net_weight_est;
      END IF;
    END IF;

    -- Roll packaging profile validation
    IF NEW.kategorie_id IN ('vyztuzne_materialy', 'consumables') THEN
      pack_type := COALESCE(NEW.specifikace->>'typ_baleni', 'role');
      podkat := COALESCE(NEW.specifikace->>'podkategorie', '');
      podtyp_fch := COALESCE(NEW.specifikace->>'podtyp_fch', '');
      
      is_roll := (pack_type = 'role') 
                 OR (podkat IN ('BF', 'RF', 'PP', 'PP-PTFE', 'BC', 'FM'))
                 OR (podkat = 'FCH' AND podtyp_fch IN ('SPRL', 'OMEGA', 'TUBE', 'TTUBE'));
                 
      IF is_roll AND NEW.balici_profil_id IS NULL THEN
        RAISE EXCEPTION 'Logistics validation failed for SKU %: Roll-based product must have a packaging profile assigned (balici_profil_id).',
          NEW.sku;
      END IF;
    END IF;

  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Create Trigger
CREATE OR REPLACE TRIGGER trg_validate_product_logistics
BEFORE INSERT OR UPDATE ON produkty
FOR EACH ROW
EXECUTE FUNCTION fn_validate_product_logistics();
