-- ============================================================
-- PLÁNOVACÍ MODUL — Organizační struktura a oddělení (dynamic CRUD)
-- ============================================================

-- 1. Vytvoření tabulky oddělení
CREATE TABLE IF NOT EXISTS public.oddeleni (
    id                  TEXT PRIMARY KEY,
    nazev               TEXT NOT NULL,
    vlastnik_id         UUID REFERENCES public.profily_uzivatelu(id) ON DELETE SET NULL,
    barva               TEXT NOT NULL DEFAULT '#4D4D4D',
    popis               TEXT,
    kpi                 TEXT,
    vytvoreno_at        TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL
);

-- RLS politiky pro oddělení
ALTER TABLE public.oddeleni ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Všichni přihlášení uživatelé mohou číst oddělení" 
ON public.oddeleni FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Všichni přihlášení uživatelé mohou zapisovat/upravovat oddělení" 
ON public.oddeleni FOR ALL 
TO authenticated 
USING (true)
WITH CHECK (true);

-- 2. Seedování výchozích 10 oddělení z organizace_a_oddeleni.md
INSERT INTO public.oddeleni (id, nazev, vlastnik_id, barva, popis, kpi) VALUES
('management', 'Management & Strategie', NULL, '#8A0485', 'Krátkodobé, střednědobé a dlouhodobé plánování, vize firmy, schvalování investic, strategická partnerství.', 'Růst hodnoty firmy (Valuation), celkový obrat a ziskovost (EBITDA)'),
('finance', 'Finance', '18eca23b-ec53-4444-8671-bd64f823ef8e', '#4D4D4D', 'Vedení účetnictví, finanční plánování, cashflow, správa bankovních účtů a plateb.', 'Udržení kladného cash flow, včasné splácení závazků, přesnost finančních forecastů'),
('sales', 'Obchod (Sales)', '834df162-22a7-479a-983a-32fc99b5ccd0', '#2563eb', 'Vyhledávání a evidence B2B zákazníků, obchodní jednání, příprava nabídek, péče o klíčové zákazníky.', 'Počet nových akvírovaných zákazníků, konverzní poměr nabídek, celkový objem prodejů'),
('purchasing', 'Nákup (Purchasing)', '834df162-22a7-479a-983a-32fc99b5ccd0', '#0ea5e9', 'Hledání a vyjednávání s globálními dodavateli, vyjednávání cen a SLA podmínek.', 'Průměrná hrubá marže, nákupní úspory, spolehlivost dodavatelů (OTIF)'),
('backbone', 'IT / Systém (Backbone)', '18eca23b-ec53-4444-8671-bd64f823ef8e', '#7c3aed', 'Správa a vývoj vlastního ERP/CRM, automatizace procesů, správa e-shopu a infrastruktury.', 'Uptime systému (99.9%), rychlost vývoje nových modulů (Velocity), procento automatizovaných procesů'),
('rd', 'R&D (Vývoj produktů)', '834df162-22a7-479a-983a-32fc99b5ccd0', '#0d9488', 'Fyzické testování vzorků (tkaniny, pryskyřice, prepregy), vývoj nových kompozitních produktů.', 'Počet úspěšně zalistovaných nových produktů, úspěšnost testů vzorků, rychlost uvedení na trh'),
('logistics', 'Logistika & Sklad', '18eca23b-ec53-4444-8671-bd64f823ef8e', '#16a34a', 'Příjem zboží, správa skladových lokací, expedice zásilek, zajišťování dopravy, správa ADR limitů.', 'Rychlost expedice do 24h, chybovost balení, optimální stav zásob'),
('backoffice', 'Backoffice', '918428ed-fa42-47ae-9570-b11a68f84ca5', '#22c55e', 'Podpora nákupu a prodeje, tisk etiket na obaly, správa dokumentace a certifikátů, technické listy.', 'Rychlost vyřízení reklamace, bezchybnost vygenerované dokumentace, podklady pro účetnictví'),
('legal', 'Právní (Legal)', '918428ed-fa42-47ae-9570-b11a68f84ca5', '#ea580c', 'Tvorba a aktualizace VOP, soulad s nařízením REACH/CLP pro chemie, GDPR compliance.', '100% soulad s legislativou, nula pokut při kontrolách, rychlost revize smluv'),
('marketing', 'Marketing', '834df162-22a7-479a-983a-32fc99b5ccd0', '#db2777', 'Budování vizuální identity, správa sociálních sítí a reklamních kampaní, tvorba brožur a katalogů.', 'Počet marketingových leadů (MQL), návratnost investic do reklamy (ROAS)')
ON CONFLICT (id) DO UPDATE SET
  nazev = EXCLUDED.nazev,
  vlastnik_id = EXCLUDED.vlastnik_id,
  barva = EXCLUDED.barva,
  popis = EXCLUDED.popis,
  kpi = EXCLUDED.kpi;

-- 3. Odstranění CHECK constraintu z tabulky ukoly_planovani (pokud existuje)
ALTER TABLE public.ukoly_planovani DROP CONSTRAINT IF EXISTS ukoly_planovani_oddeleni_check;

-- 4. Přidání cizího klíče k ukoly_planovani
-- Nejdříve se ujistíme, že všechny hodnoty v ukoly_planovani.oddeleni existují v oddeleni.id
UPDATE public.ukoly_planovani 
SET oddeleni = 'management' 
WHERE oddeleni NOT IN (SELECT id FROM public.oddeleni);

-- Přidáme foreign key
ALTER TABLE public.ukoly_planovani
ADD CONSTRAINT fk_ukoly_planovani_oddeleni
FOREIGN KEY (oddeleni) REFERENCES public.oddeleni(id) ON UPDATE CASCADE;
