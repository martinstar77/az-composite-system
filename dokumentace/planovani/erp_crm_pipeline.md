# ERP/CRM Systém — Vývojový Pipeline (AZ-Composites)

> **Verze**: 1.0 — Vytvořeno 25. 6. 2026  
> **Účel**: Tento dokument definuje vývojové priority vlastního ERP/CRM systému v souladu s obchodními fázemi popsanými v `plan_rozvoje.md`. Slouží jako živý roadmap pro technický vývoj.

---

## Architektura systému (přehled)

Systém je budován jako **Modulární Monolit** (Next.js 15 / Supabase) s jasně oddělenými doménovými moduly v `src/modules/`. Každý modul odpovídá jedné obchodní doméně a je navržen tak, aby mohl být v budoucnu vystaven jako nezávislé API pro napojení e-shopu nebo externích partnerů.

```
src/modules/
├── planning/        ✅ HOTOVO      — Projektové plánování, Milníky, Gantt
├── products/        🔄 ZÁKLAD      — PIM, Produktová databáze, Šarže
├── inventory/       🔄 ZÁKLAD      — WMS, Skladové pohyby, Lokace
├── documents/       ⏳ PLÁNOVÁNO  — SDS, TDS, CoC generátor
├── crm/             ⏳ PLÁNOVÁNO  — Zákazníci, Pipeline, Vzorkování
├── invoicing/       ⏳ PLÁNOVÁNO  — Fakturace, Nabídky, Objednávky
└── finance/         ⏳ PLÁNOVÁNO  — Cash Flow, Break-Even, Runway
```

---

## Fáze 0 — Kick-off (červen–červenec 2026)

> Cíl: Základní operabilita systému pro první objednávku.

### ✅ Dokončeno

| Modul | Funkce | Status |
|:---|:---|:---:|
| **Planning** | Projekty, Milníky, Timeline, Gantt | ✅ |
| **Products (PIM)** | Databáze produktů, Specifikace (JSONB), Smart SKU | ✅ |
| **Inventory (WMS)** | Základní skladové zásoby, Naskladnění | ✅ |
| **Invoicing** | Fakturace, QR platební kód, PDF export | ✅ |
| **Documents** | SDS/TDS nahrání, AI překlad, PDF generátor | ✅ |

### 🔄 Probíhá / Dokončit do konce července

| Priorita | Modul | Funkce | Termín |
|:---:|:---|:---|:---:|
| 🔴 P0 | **Products** | Etikety (Labels) — tisk štítků pro zásilky | 31. 7. |
| 🔴 P0 | **Inventory** | Šarže (Batches) — evidence expirace a lot čísla | 31. 7. |
| 🟠 P1 | **Invoicing** | Generování cenové nabídky (PDF) | 31. 7. |

---

## Fáze 1 — Budování a Růst (srpen–září 2026)

> Cíl: Systém musí aktivně podporovat obchodní aktivity — pipeline zákazníků, evidenci vzorků a základní finanční přehled.

### 🔴 P0 — Kritická priorita (musí být hotovo v srpnu)

#### Modul: CRM — Správa zákazníků a obchodního pipeline

Toto je v tuto chvíli **největší mezera systému**. Bez CRM modulu nejsou obchodní aktivity sledovatelné a firma ztrácí paměť.

**Datový model:**
```
contacts (zákazníci / firmy)
  ├── id (UUID)
  ├── company_name
  ├── ico (IČO — pro ARES napojení)
  ├── contact_person
  ├── email / phone
  ├── segment (laminátovny, automotive, sport, stavebnictví...)
  ├── status (lead | prospect | active | inactive)
  └── tenant_id

opportunities (obchodní příležitosti)
  ├── id (UUID)
  ├── contact_id → contacts
  ├── title (název příležitosti)
  ├── value_czk (odhadovaná hodnota)
  ├── stage (new | contacted | sample_sent | offer_sent | negotiation | won | lost)
  ├── next_action_date (datum příštího follow-up)
  ├── assigned_to → profiles
  └── notes

meetings (schůzky a aktivity)
  ├── contact_id → contacts
  ├── opportunity_id → opportunities
  ├── type (meeting | call | email | demo)
  ├── scheduled_at
  └── outcome (výsledek)
```

**UI komponenty:**
- `KontaktyPage` — DataGrid seznam zákazníků (filtr: segment, status)
- `KontaktDetail` — Karta zákazníka s historií aktivit, nabídek a vzorků
- `PipelineBoard` — Kanban board příležitostí podle fáze prodeje
- `PipelineTable` — Alternativní tabulkový pohled s řazením dle hodnoty/termínu

**Akceptační kritéria Fáze 1:**
- [ ] Evidovat min. 30–50 B2B kontaktů v systému
- [ ] Každá schůzka/telefonát/e-mail zaznamenán jako aktivita
- [ ] Automatické zobrazení příležitostí po termínu follow-up (červeně zvýrazněno)

---

#### Modul: CRM — Evidence vzorkování (Sampling)

Propojit vzorky s CRM kontakty a WMS zásobami. Každý vzorek = záznam v systému.

**Datový model:**
```
samples (vzorky)
  ├── id (UUID)
  ├── contact_id → contacts
  ├── opportunity_id → opportunities (volitelné)
  ├── product_id → products
  ├── batch_id → batches (šarže — přesná šarže odeslaného vzorku)
  ├── quantity + unit
  ├── sent_at
  ├── status (sent | in_testing | feedback_received | converted | rejected)
  ├── test_results (JSONB — viskozita, pevnost, kvalita povrchu...)
  ├── follow_up_date (automaticky: sent_at + 14 dní)
  └── converted_to_order_id (pokud vzorek vedl k objednávce)
```

**Logika:**
- Odeslání vzorku automaticky sníží stav WMS a vytvoří pohyb s příznakem `marketing_sample`
- Systém automaticky generuje follow-up úkol obchodníkovi po 14 dnech
- V CRM kartě zákazníka je viditelná sekce „Vzorky" s kompletní historií

**Akceptační kritéria Fáze 1:**
- [ ] Všechny dosud odeslané vzorky zpětně zadány do systému
- [ ] Automatický follow-up úkol funkční
- [ ] Vzorky provázány s příslušnou šarží v WMS

---

### 🟠 P1 — Vysoká priorita (dokončit do září)

#### Modul: Finance — Cash Flow Model a Break-Even

Základní finanční přehled pro rozhodování zakladatelů.

**Datový model:**
```
cash_flow_entries
  ├── id (UUID)
  ├── type (income | expense)
  ├── category (product_sale | shipping | supplier_invoice | salary | rent | marketing | founder_loan...)
  ├── amount_czk
  ├── date
  ├── linked_invoice_id (volitelné)
  └── note

finance_settings
  ├── monthly_fixed_costs (JSONB — nájem, servery, pojištění...)
  ├── founder_capital_injections (JSONB — přehled vkladů zakladatelů)
  └── break_even_targets (JSONB)
```

**UI Dashboard:**
- **Runway widget**: „Firma přežije dalších X měsíců při aktuálním výdejovém tempu"
- **Break-Even kalkulátor**: Kolik objednávek/měsíc při průměrné hodnotě Y CZK potřebujeme pro pokrytí fixních nákladů
- **Marže na produkt**: Nákupní cena vs. prodejní cena na úrovni každého produktu (% a CZK)
- **Vklady zakladatelů**: Evidence půjček společníka / příplatků mimo základní kapitál

**Akceptační kritéria Fáze 1:**
- [ ] Runway je viditelný na dashboardu v reálném čase
- [ ] Break-Even číslo je automaticky přepočítávané
- [ ] Marže sledovány na úrovni produktové kategorie

---

### 🟡 P2 — Střední priorita (Fáze 1, pokud zbyde kapacita)

| Modul | Funkce | Popis |
|:---|:---|:---|
| **Planning** | Propojení milníků s vývojovými úkoly | Každý milník v plánu → konkrétní backlog tasks v ERP |
| **Documents** | CoC generátor | Automatické generování Certificate of Conformity při expedici |
| **Invoicing** | Stavy objednávek | Sledování stavu: nabídka → potvrzena → expedována → zaplacena |
| **Notifications** | Interní notifikace | Upozornění na: expirace šarží, neplné zásoby, termíny follow-up |

---

## Fáze 2 — Stabilizace (říjen–prosinec 2026)

> Cíl: Systém zvládá plný WMS provoz v novém skladu + právní transformaci na s.r.o.

### 🔴 P0

| Modul | Funkce | Popis |
|:---|:---|:---|
| **Inventory (WMS)** | Skladové lokace | Regály, pozice, víceskladová evidence po přesunu |
| **Inventory** | Inventura (Stocktaking) | Digitální inventurní proces s QR/čárovým kódem |
| **Finance** | Transformace OSVČ → s.r.o. | Fakturační snapshot, uzávěrka zásob, nové fakturační identity |
| **Products (PIM)** | Rozšíření portfolia | Hromadný import nových produktů (CSV/API dodavatele) |

### 🟠 P1

| Modul | Funkce | Popis |
|:---|:---|:---|
| **AI (interní)** | Vytěžování faktur | AI extrakce dat z dodavatelských faktur a dodacích listů |
| **AI (interní)** | Překlad legislativy | Automatický překlad SDS/TDS z angličtiny/němčiny |
| **Marketing** | Kampaně | Evidence marketingových aktivit a jejich propojení s CRM kontakty |
| **CRM** | Segmentace | Automatická segmentace zákazníků na základě nákupní historie a oborů |

---

## Fáze 3 — E-shop a Škálování (od 1. 1. 2027)

> Cíl: Headless e-shop jako přímá nadstavba ERP databáze.

### Architektura e-shopu

```
ERP Databáze (Single Source of Truth)
         │
    REST / GraphQL API
    (src/modules/*/api/)
         │
    ┌────┴────────────────┐
    │   B2B E-shop        │   B2C E-shop (výhled)
    │   (Next.js / Vercel)│
    └─────────────────────┘
```

### Vývojový roadmap e-shopu

| Kvartál | Deliverable |
|:---|:---|
| **Q1 2027 (Jan–Mar)** | API vrstva pro produkty, ceny a dostupnost (WMS stav v reálném čase) |
| **Q2 2027 (Apr–Jun)** | MVP e-shop: Katalog + Košík + B2B objednávka + Napojení fakturace |
| **Q3 2027 (Jul–Sep)** | Full Headless: Real-time WMS, šarže na e-shopu, SDS/TDS ke stažení |
| **Q4 2027 (Oct–Dec)** | AI konfigurátor laminátu, B2C rozšíření, personalizace |

### Klíčové USP e-shopu (oproti konkurenci)

1. **Real-time skladová dostupnost**: Zákazník vidí přesný počet metrů/kg **konkrétní šarže** včetně data expirace
2. **SDS/TDS v češtině ke stažení přímo u produktu**: Žádný distributor to nemá
3. **COC na jedno kliknutí**: Po objednávce zákazník dostane certifikát shody pro svoji šarži automaticky
4. **AI konfigurátor**: Zákazník zadá požadavky (rozměr, Vf, teplota) → systém doporučí produkt + kalkulaci spotřeby

---

## Technické standardy (připomínka)

Veškerý vývoj musí dodržovat `GEMINI.md` mandáty:

- **Zero hardcoded values** — vše přes CSS variables v `globals.css`
- **DataGrid pro všechny listové pohledy** — Tanstack Table + Shadcn
- **Server Actions** pro veškerý přístup k DB — žádné přímé volání Supabase z UI komponent
- **Audit log** — každá INSERT/UPDATE/DELETE v core tabulkách → záznam v audit logu
- **Soft delete** — core entity (Produkty, Zákazníci, Dodavatelé) nikdy fyzicky nesmazat
- **Atomic transactions** — multi-table operace vždy v `db.transaction()`
- **Tenant isolation** — veškeré queries musí respektovat `tenant_id`

---

## Backlog — Nápady a výhledy (zatím bez prioritizace)

- [ ] **Zákaznický portál**: B2B zákazník se přihlásí a vidí historii svých objednávek, faktury, dostupné vzorky
- [ ] **Dodavatelský portál**: Komunikace s dodavateli, automatické potvrzení objednávky
- [ ] **Prediktivní zásobování**: AI doporučení „objednejte šarži X, zásoby vydrží jen 3 týdny při aktuálním tempu odběru"
- [ ] **Multi-currency**: EUR cenník pro zahraniční zákazníky (automatický přepočet dle kurzu ČNB)
- [ ] **EDI napojení**: Automatická elektronická výměna dat s klíčovými odběrateli (automotive)
- [ ] **Barcode/QR skenování**: Mobilní WMS aplikace pro přijímání a výdej zboží přes telefon

---

*Dokument udržuje vývojový tým. Aktualizovat při každé změně priority nebo dokončení modulu.*
