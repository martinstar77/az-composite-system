-- Přidání sloupců pro Přípravu, Surový přepis a Návrh e-mailu do udalosti_planovani
ALTER TABLE public.udalosti_planovani 
ADD COLUMN IF NOT EXISTS priprava TEXT,
ADD COLUMN IF NOT EXISTS surovy_prepis TEXT,
ADD COLUMN IF NOT EXISTS email_navrh TEXT;

-- Přidání cizích klíčů pro propojení se Zákazníky a Dodavateli
ALTER TABLE public.udalosti_planovani 
ADD COLUMN IF NOT EXISTS zakaznik_id UUID REFERENCES public.zakaznici(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS dodavatel_id UUID REFERENCES public.dodavatele(id) ON DELETE SET NULL;

-- Vytvoření indexů pro rychlé dotazy v přehledech schůzek
CREATE INDEX IF NOT EXISTS idx_udalosti_planovani_zakaznik ON public.udalosti_planovani(zakaznik_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_udalosti_planovani_dodavatel ON public.udalosti_planovani(dodavatel_id) WHERE deleted_at IS NULL;
