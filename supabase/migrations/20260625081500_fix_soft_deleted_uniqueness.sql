-- 1. Drop unconditional unique constraints on kod for dodavatele and zakaznici
ALTER TABLE public.dodavatele DROP CONSTRAINT IF EXISTS dodavatele_kod_key;
ALTER TABLE public.zakaznici DROP CONSTRAINT IF EXISTS zakaznici_kod_key;

-- 2. Create partial unique indexes that only apply to active (non-soft-deleted) rows
CREATE UNIQUE INDEX IF NOT EXISTS dodavatele_kod_active_idx ON public.dodavatele (kod) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS zakaznici_kod_active_idx ON public.zakaznici (kod) WHERE deleted_at IS NULL;
