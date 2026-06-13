# AZ-Composites ERP/CRM: Master Implementation Plan

Tento dokument slouží jako hlavní cestovní mapa (Roadmap) pro vývoj celého systému. Postupujeme striktně od základů (fyzické produkty) přes nákup, sklady, až po komplexní finanční modelování a prodeje.

## Phase 0: Security & UI Shell (App Foundation) - [HOTOVO ✅]
Cíl: Zajistit aplikaci proti neoprávněnému přístupu a nastavit profesionální firemní design (AZ Composite).
- [x] Zabezpečení: Supabase Email/Password Auth a přesměrování neověřených uživatelů na `/login`.
- [x] RBAC (Role-Based Access Control): Tabulka rolí a profilů (Admin, Skladník, Obchod, Manažer).
- [x] UI Shell: Tmavý levý Sidebar, horní hlavička s firemním logem a odhlášením (Logout).
- [x] Design System: Aplikace firemních barev AZ Composite (Purple #8A0485, Dark Gray #4D4D4D) bez "cirkusového" efektu.
- [x] Notifikace: Profesionální toast oznámení (Sonner) pro všechny systémové akce.

## Phase 1: Core PIM (Product Information Management) - [HOTOVO ✅]
Cíl: Vytvořit robustní databázi fyzických produktů a jejich technických parametrů.
- [x] Návrh Enterprise SQL schématu (Číselníky, JSONB s GIN indexem).
- [x] Skript pro import produktů a zobrazení v profesionálním DataGridu (Tanstack Table).
- [x] UI: Dynamický formulář pro přidávání produktů napojený na reálné číselníky (Kategorie, Jednotky).

## Phase 1.5: Advanced Product Operations & Digital Twin - [HOTOVO ✅]
Cíl: Povýšit katalog na úroveň operativního nástroje pro technologickou firmu s exaktní datovou integritou.
- [x] Funkcionalita: Plnohodnotná **Editace parametrů** produktu včetně JSONB specifikací.
- [x] Enterprise DataGrid: Multi-column sorting a **Kategorizační filtry** pro tisíce položek.
- [x] Skladové základy: Implementace **Minimální a Optimální skladové zásoby** s vizuálním varováním v tabulce.
- [x] Audit Trail: Sledování historie (kdo a kdy vytvořil/upravil produkt) s vazbou na Nicknames.

## Phase 1.6: Smart SKU Generator & Data Integrity - [HOTOVO ✅]
Cíl: Eliminovat lidskou chybovost při zadávání kódů a automatizovat rozpad parametrů do JSONB.
- [x] Vizuální Generátor Kódů: Dedikovaná rozhraní pro Tkaniny, Pryskyřice, Cores, Nářadí atd.
- [x] Smart Decomposition: Automatický rozklad SKU do JSONB parametrů pro e-shop filtry.
- [x] Live Validation: Asynchronní kontrola duplicit v databázi během psaní kódu.

## Phase 1.8: System Administration & Team Management - [HOTOVO ✅]
Cíl: Vytvořit rozhraní pro správu zaměstnanců a přidělování přístupových práv (RBAC).
- [x] User Management: UI pro přímé vytváření uživatelů s heslem a unikátním Nicknamem.
- [x] Role & Permissions Manager: Administrátorská matice pro zapínání/vypínání modulů jednotlivým rolím.
- [x] Admin Actions: Reset hesel a bezpečné mazání uživatelů přes AlertDialog.
- [ ] 1.8.2: Bezpečnostní profil: Možnost pro uživatele změnit si své heslo (Plánováno v budoucí sekci "Můj Profil").

## Phase 2: Sourcing & Procurement (Dodavatelé) - [HOTOVO ✅]
Cíl: Propojit fyzické produkty s globálním trhem a nákupními podmínkami.

### 2.1: Master Database Dodavatelů - [HOTOVO ✅]
*   **DB Schéma:** Tabulka `dodavatele` s auditními poli. - [x]
*   **UI:** Kompletní CRUD správa dodavatelů (Seznam, Přidání, Editace, Smazání). - [x]

### 2.2: Relace Produkt-Dodavatel (Sourcing Ceník) - [HOTOVO ✅]
*   **DB Schéma:** Vazební tabulka `produkt_dodavatel` s nákupními cenami (EUR/USD) a auditem. - [x]
*   **UI:** Nová záložka na detailu produktu umožňující přiřazení více dodavatelů k jednomu materiálu. - [x]

## Phase 2.5: UI/UX DataGrid Excellence - [HOTOVO ✅]
Cíl: Povýšit uživatelské rozhraní na úroveň multifunkčního nástroje.
- [x] Univerzální Řazení a Sloupcové "Faceted" Filtry napříč celou aplikací. - [x]

## Phase 3: Dynamic Pricing & Financial Engine - [HOTOVO ✅]
Cíl: Automatizovat výpočet reálných nákladů (v CZK) a řídit ziskovost pomocí dynamických prodejních modelů.

### 3.1: Multi-Currency Engine (ČNB Integrace) - [HOTOVO ✅]
*   **Technický požadavek:** Tabulka `historie_kurzu`.
*   **Automatizace:** Cron job (Edge Function), který denně importuje kurzy z ČNB API.
*   **UI:** Dashboard "Měny", kde Admin vidí aktuální kurzy a může nastavit "Interní firemní kurz" pro výpočty.

### 3.2: Landed Cost Configurator (Nákladový model) - [HOTOVO ✅]
*   **Formulář poplatků:** Globální nastavení pro:
    *   Fixní poplatky za platbu do zahraničí (např. 190 CZK / platba).
    *   Logistické šablony (Cena za kg dopravy z Asie vs. EU).
    *   Váhové kalkulace (Systém bere hmotnost z PIM a násobí ji tarifem dopravy).
*   **Status Done:** Každý produkt má vypočítanou "Čistou nákladovou cenu na regále" (Landed Cost).

### 3.3: Tiered Pricing System (Cenové hladiny) - [HOTOVO ✅]
*   **Logika:** Definice cenových hladin: Retail (B2C), Partner (B2B), VIP/Production.
*   **Množstevní slevy:** Tabulka `cenove_breaky` (Plánováno pro B2B portál).
*   **Status Done:** Systém generuje 3 různé ceny pro každý produkt na základě jedné marže.

### 3.4: Margin Protection UI - [HOTOVO ✅]
*   **UI:** Zobrazení "Target Margin %" vs. "Real Margin %" na základě aktuálních cen a kurzů. Vizuální upozornění, pokud marže klesne pod kritickou mez.
*   **Status Done:** Možnost vidět reálný profit u každého produktu v reálném čase.

### 3.5: Logistické šablony a Excel Parity - [HOTOVO ✅]
*   **Logika:** Definice logistických tras (Čína, EU, ČR) obsahujících dopravní tarify, clo a granulární poplatky (SWIFT, balné, odpady).
*   **Sourcing:** Přímé napojení nákupních ceníků na logistické šablony a specifikace nákupních měrných jednotek.
*   **Status Done:** Kalkulace Landed Cost je identická s produkčním Excelem.

### 3.6: Dynamický Price Model (In-line ladění) - [HOTOVO ✅]
*   **Ladění modelu:** Možnost operativně upravovat cílové marže (Retail, Partner, VIP) přímo v záložce kalkulace a ihned vidět dopad na koncovou cenu bez opuštění stránky.

### 3.7: Mass Management & Category Defaults (Efektivita správy) - [HOTOVO ✅]
*   **Kategorijní dědičnost:** Možnost nastavit výchozí "Target Marže" a "Logistickou šablonu" na úrovni celé Kategorie (např. Tkaniny -> 30% marže, Šablona Čína). Při vytvoření nového produktu se tyto hodnoty automaticky zdedí.
*   **Hromadné operace:** Možnost vybrat 50 produktů v DataGridu a jedním kliknutím u nich změnit marži nebo logistickou trasu (Bulk Edit).
*   **Duplikace produktů:** Tlačítko "Klonovat" na detailu produktu, které zkopíruje specifikace, sourcing i pricing nastavení pro rychlé zakládání variant.

### 3.8: B2B/B2C Dynamic Catalog Generator & Price Matrix (Katalogy na míru) - [HOTOVO ✅]
*   **Architektura Katalogu:** Systém nepracuje se statickým ceníkem, ale tvoří "Price Matrix". Pro každý produkt z PIM systému umí vygenerovat ceník na základě typu zákazníka (Retail, Partner, VIP).
*   **Klientský (Externí) Export:** Možnost jedním kliknutím vygenerovat PDF nebo Excel ceník pro zákazníka. Zákazník uvidí jen své nákupní ceny (založené např. na VIP marži) bez zobrazení vnitřních nákladů.
*   **Manažerský (Interní) Katalog:** Zcela dedikované rozhraní pro Obchodní oddělení. Zobrazuje ucelený list produktů s klíčovými metrikami:
    *   **Min. Cena (Low Margin):** Cena při nejslabší koruně (ochrana před ztrátou).
    *   **Max. Cena (High Margin):** Ziskový potenciál při silné koruně.
    *   **Sweet Spot (Target):** Doporučená prodejní cena kalkulovaná z aktuálního kurzu a cílové marže.
*   **Dynamické slevy a Množství:** Tento katalog se stane základem pro Fázi 5 a Fázi 7 (E-commerce), kdy systém umí automaticky nabídnout individuální cenu po přihlášení zákazníka na portál.

### 3.9: Správce Marží (Category Margin Manager) - [NÁSLEDUJE]
*   **Dashboard Správce Marží:** UI v modulu Finance pro zobrazení všech kategorií a nastavení jejich defaultních hodnot (Retail %, Partner %, VIP %, Logistická šablona).
*   **Dědičnost při zakládání:** Automatické propsání těchto hodnot z kategorie do nově vytvářených produktů.
*   **Plošný přepis (Push Updates):** Tlačítko pro okamžitý hromadný přepis marží a logistiky u všech existujících produktů spadajících do dané kategorie. Tím lze rychle reagovat na změny na trhu bez nutnosti ručního klikání.

### 3.10: Secure Production Deployment (Self-Hosting & Bezpečnost)
*   **Architektura Serveru:** Přesun aplikace na vlastní domácí server (On-Premise) s důrazem na maximální kontrolu nad daty.
*   **Deployment a PaaS (Vercel Alternativa):** Pro správu nasazení (deploymentu) využijeme platformu **Coolify** (nebo alternativu jako CapRover/Dokku). Coolify nám umožní pohodlně nasadit Next.js aplikaci přímo z Gitu s automatickými buildy bez nutnosti cloudu, a zároveň vizuálně spravovat Docker kontejnery.
*   **Bezpečný Admin Přístup (Tailscale):** K serveru (SSH terminál, Coolify dashboard a správa databáze) se bude přistupovat výhradně přes privátní overlay síť Tailscale, čímž se zcela skryjí administrativní porty před veřejným internetem.
*   **Veřejný Webový Přístup:** Pro zaměstnance a klienty bude aplikace publikována do internetu. Reverzní proxy (zabudovaná v Coolify, např. Traefik/Caddy) bezpečně vystaví pouze webové rozhraní aplikace na portech 80/443 (HTTP/HTTPS) a zajistí automatické SSL certifikáty (Let's Encrypt).
*   **Self-Hosted Supabase:** Nasazení open-source Supabase stacku přes Docker Compose přímo na vlastním serveru. API vrstva (PostgREST) bude odstíněna a přístupná pouze skrze zabezpečenou webovou aplikaci.
*   **Ochrana Dat a Disaster Recovery (Zálohování do S3):**
    *   Generování pevných, unikátních JWT secretů a změna výchozích hesel k databázi v `.env` souborech.
    *   Implementace automatických zálohovacích skriptů (např. periodický `pg_dump`), které budou šifrované zálohy odesílat na bezpečné externí S3 kompatibilní úložiště (off-site záloha).
*   **Hardening Serveru:** Důkladný bezpečnostní audit operačního systému (UFW Firewall, omezení služeb, fail2ban).

## Phase 4: WMS & Multi-Location Tracking (Sklady a Šarže)
Cíl: Přechod na paperless skladování s podporou více fyzických lokalit a přesnou evidencí.

### 4.1: Warehouse Topology (Multi-Warehouse)
*   **DB Schéma:** Tabulky `sklady` (např. Sklad-Praha, Sklad-Brno) a `skladove_lokace` (Regál, Police, Pozice).
*   **Logika:** Každá šarže (batch) je vždy přiřazena ke konkrétnímu skladu a lokaci.
*   **Status Done:** Systém v reálném čase ukazuje, kde přesně zboží leží.

### 4.2: Batch Management & Traceability (Šarže)
*   **Logika:** Tabulka `skladove_sarze`. Každý kus na skladě má své UUID, vazbu na `produkty.id` a `vytvoreno_at`.
*   **Traceability:** Sledování exspirace (Datum nákupu + `produkty.shelf_life_mesice`).

## Phase 5: CRM & Sales (Obchodní Modul)
...

## Phase 6: Strategic Finance & Performance Dashboard - [NÁSLEDUJE]
Cíl: Makroekonomický pohled na zdraví firmy, řízení cash-flow a strategické plánování nákupů.

### 6.1: Global Profitability & Margin Analytics
*   **Logika:** Agregace dat z prodejů (Fáze 5) a nákladů (Fáze 3).
*   **Portfolio Health:** Globální pohled na nejvýdělečnější a nejméně ziskové produkty.
*   **Kategorijní výkonnost:** Agregovaný pohled na průměrnou marži za jednotlivé kategorie (např. Tkaniny průměrně generují 28%, zatímco Pryskyřice 15%).
*   **Detekce anomálií:** Upozornění na produkty, jejichž "Risk Marže" klesla pod definovanou úroveň (např. < 10%).
*   **Metriky:** Sledování celkového obratu (Revenue) a hrubého zisku (Gross Profit).
*   **Status Done:** Dashboard s grafy vývoje zisku v čase.

### 6.2: Cash-flow Forecasting (Předpověď hotovosti)
*   **Logika:** Sledování splatností faktur od dodavatelů vs. faktur od zákazníků.
*   **Predikce:** Výhled na příštích 30-90 dní. Systém varuje, pokud hrozí nedostatek hotovosti na plánované nákupy.
*   **Status Done:** Graf "Cash-flow runway" zobrazující reálnou a očekávanou hotovost.

### 6.3: Inventory Procurement Planning (Plánování nákupů)
*   **Logika:** Algoritmus spojující rychlost prodeje (Velocity) se skladovou zásobou a dodacími lhůtami (Lead Time z Fáze 2).
*   **Automatizace:** Systém navrhuje "Nákupní seznam" – co je třeba objednat dnes, abychom za 3 týdny neměli prázdný regál.

### 6.4: Investment & Fixed Costs Tracker
*   **Logika:** Evidence investic (stroje, vybavení) a fixních měsíčních nákladů (nájem, energie).
*   **Amortizace:** Rozpuštění investičních nákladů do celkového finančního zdraví firmy.

## Phase 7: Omnichannel E-commerce (Budoucnost)
...
## Phase 8: Production Hardening & Reliability (Provoz na webu)
...
## Phase 9: Strategic Scalability & Compliance (Vize 2027+)
...
## Phase 10: Strategic Planning & PM (Vize a Řízení firmy)
...
