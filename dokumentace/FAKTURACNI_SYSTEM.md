# Fakturační Systém — AZ Composites ERP
**Verze:** 1.0 | **Datum:** 2026-06-19 | **Status:** Schváleno, připraveno k implementaci

Implementace kompletního fakturačního pipeline ve stávajícím Next.js/Supabase ERP systému.
Pokrývá celý obchodní cyklus: **Nabídka → Objednávka → Zálohová faktura → Faktura vystavená**.

---

## Firemní Údaje (Výchozí seed — editovatelné v UI)

| Pole | Hodnota |
|------|---------|
| **Obchodní jméno** | Ing. Filip Klier |
| **IČO** | 23048255 |
| **DIČ** | CZ9906261937 |
| **Adresa** | Jankovcova 1587/8, 17000 Praha, Česká republika |
| **Forma** | OSVČ → budoucí přechod na s.r.o. |
| **DPH** | Plátce DPH (21% základní, 12% snížená) |

> **Poznámka k přechodu OSVČ → s.r.o.:** Tabulka `firemni_nastaveni` je navržena tak, že stačí změnit údaje v UI administrace (nové IČO, DIČ, název). Systém automaticky použije nové údaje na všechny nové doklady. Historické doklady zůstanou s původními údaji díky uložení snapshot v `doklady.firemni_udaje_snapshot JSONB`.

---

## Potvrzená Rozhodnutí

| Rozhodnutí | Volba |
|-----------|-------|
| PDF generování | `@react-pdf/renderer` (již nainstalován) |
| QR Platba | `qrcode` npm + **SPAYD formát** (standard ČR/EU) |
| Zákazníci | Nová entita `zakaznici` — oddělená od `dodavatele` |
| DPH | Plátce DPH + přepínač neplátce pro budoucnost |
| Číslovací řada | `NAB-2026-0001`, `OBJ-2026-0001`, `ZAL-2026-0001`, `FAK-2026-0001` |
| Nastavení firmy | Editovatelné v UI pod `/nastaveni/firma` (jen admin) |

---

## Architektura — Dokladový Cyklus

```
Nabídka (NAB)  ──→  Objednávka (OBJ)  ──→  Zálohová faktura (ZAL)  ──→  Faktura (FAK)
                          │                                                    │
                          └────────────────────── přímá fakturace ────────────┘
```

- Každý doklad je řádek v tabulce `doklady` s polem `typ`
- Doklady jsou propojeny přes `rodic_id` (OBJ → FAK, ZAL → FAK)
- Finální faktura automaticky odečítá zaplacenou zálohu jako zápornou řádku

---

## Databázové Schéma

### Tabulka `firemni_nastaveni`
```sql
CREATE TABLE firemni_nastaveni (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    klic         TEXT UNIQUE NOT NULL,  -- 'hlavni_profil'
    hodnota      JSONB NOT NULL,
    -- hodnota obsahuje:
    -- { obchodni_jmeno, ico, dic, adresa{ulice,mesto,psc,stat},
    --   iban, banka_nazev, email_fakturace, telefon, web,
    --   platce_dph BOOLEAN, logo_url }
    aktualizovano_at TIMESTAMPTZ DEFAULT now(),
    upravil_id   UUID REFERENCES auth.users(id)
);
```

### Tabulka `zakaznici`
```sql
CREATE TABLE zakaznici (
    id                              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kod                             TEXT UNIQUE NOT NULL,  -- 'AZ-K-0001'
    nazev_spolecnosti               TEXT NOT NULL,
    ico                             TEXT,
    dic                             TEXT,
    je_platce_dph                   BOOLEAN DEFAULT true,
    zeme                            TEXT DEFAULT 'CZ',
    je_zahranicni                   BOOLEAN DEFAULT false,  -- → reverse charge
    email_fakturace                 TEXT,
    telefon                         TEXT,
    adresa                          JSONB,  -- {ulice, mesto, psc, stat}
    platebni_podminky_splatnost_dni INTEGER DEFAULT 14,
    poznamky                        TEXT,
    deleted_at                      TIMESTAMPTZ,
    vytvoreno_at                    TIMESTAMPTZ DEFAULT now(),
    aktualizovano_at                TIMESTAMPTZ DEFAULT now(),
    vytvoril_id                     UUID REFERENCES auth.users(id),
    upravil_id                      UUID REFERENCES auth.users(id)
);
```

### Tabulka `doklady`
```sql
CREATE TABLE doklady (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cislo                   TEXT UNIQUE NOT NULL,  -- 'FAK-2026-0001'
    typ                     TEXT NOT NULL CHECK (typ IN ('nabidka','objednavka','zalohova_faktura','faktura')),
    stav                    TEXT NOT NULL DEFAULT 'koncept'
                            CHECK (stav IN ('koncept','odeslano','uhrazeno','castecne_uhrazeno','stornovano','po_splatnosti')),
    
    -- Vazby
    zakaznik_id             UUID NOT NULL REFERENCES zakaznici(id),
    rodic_id                UUID REFERENCES doklady(id),  -- ZAL/FAK → OBJ, FAK → ZAL
    
    -- Datumy
    datum_vystaveni         DATE NOT NULL DEFAULT CURRENT_DATE,
    datum_splatnosti        DATE,
    duzp                    DATE,  -- Datum uskutečnění zdanitelného plnění
    datum_platnosti         DATE,  -- Pro nabídky: platnost do
    
    -- Měna a kurz
    mena                    TEXT NOT NULL DEFAULT 'CZK',
    kurz_k_czk              NUMERIC(10, 4) DEFAULT 1.0,
    
    -- DPH konfigurace (snapshot v době vystavení)
    platce_dph              BOOLEAN NOT NULL DEFAULT true,
    reverse_charge          BOOLEAN NOT NULL DEFAULT false,
    
    -- Způsob úhrady
    zpusob_uhrady           TEXT DEFAULT 'prevod'  -- 'prevod', 'hotovost', 'karta'
                            CHECK (zpusob_uhrady IN ('prevod','hotovost','karta')),
    
    -- Zálohy (pro zálohové faktury)
    zalohova_castka         NUMERIC(15, 2),         -- fixní částka zálohy
    zalohova_procento       NUMERIC(5, 2),           -- NEBO % ze součtu
    
    -- Texty
    poznamky                TEXT,
    interni_poznamky        TEXT,
    
    -- Snapshot firemních údajů v době vystavení (GDPR + historická integrita)
    firemni_udaje_snapshot  JSONB,
    zakaznik_udaje_snapshot JSONB,
    
    -- Audit
    deleted_at              TIMESTAMPTZ,
    vytvoreno_at            TIMESTAMPTZ DEFAULT now(),
    aktualizovano_at        TIMESTAMPTZ DEFAULT now(),
    vytvoril_id             UUID REFERENCES auth.users(id),
    upravil_id              UUID REFERENCES auth.users(id)
);
```

### Tabulka `doklady_polozky`
```sql
CREATE TABLE doklady_polozky (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doklad_id               UUID NOT NULL REFERENCES doklady(id) ON DELETE CASCADE,
    poradi                  INTEGER NOT NULL DEFAULT 0,
    
    typ                     TEXT NOT NULL DEFAULT 'produkt'
                            CHECK (typ IN ('produkt','volna_polozka','sleva','zalohovy_odpocet','text_radek')),
    
    -- Vazba na PIM (nullable pro volné položky)
    produkt_id              UUID REFERENCES produkty(id),
    
    -- Popis (pro volné položky nebo override názvu produktu)
    nazev                   TEXT NOT NULL,
    popis                   TEXT,
    jednotka                TEXT DEFAULT 'ks',
    
    -- Číselné hodnoty
    mnozstvi                NUMERIC(12, 4) NOT NULL DEFAULT 1,
    cena_bez_dph            NUMERIC(15, 4) NOT NULL,  -- jednotková cena bez DPH
    sazba_dph               NUMERIC(5, 2) NOT NULL DEFAULT 21.00,  -- 0, 12, 21
    sleva_procent           NUMERIC(5, 2) NOT NULL DEFAULT 0,
    
    -- Vypočítané (uloženy pro historii — ceny se mění!)
    radek_bez_dph           NUMERIC(15, 2) NOT NULL,  -- mnozstvi * cena * (1 - sleva/100)
    radek_dph               NUMERIC(15, 2) NOT NULL,
    radek_celkem            NUMERIC(15, 2) NOT NULL,  -- radek_bez_dph + radek_dph
    
    vytvoreno_at            TIMESTAMPTZ DEFAULT now()
);
```

### Pomocná SQL funkce — atomická číselná řada
```sql
CREATE OR REPLACE FUNCTION next_document_number(p_typ TEXT, p_rok INT DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)::INT)
RETURNS TEXT AS $$
DECLARE
    v_prefix TEXT;
    v_seq    INT;
BEGIN
    v_prefix := CASE p_typ
        WHEN 'nabidka'           THEN 'NAB'
        WHEN 'objednavka'        THEN 'OBJ'
        WHEN 'zalohova_faktura'  THEN 'ZAL'
        WHEN 'faktura'           THEN 'FAK'
        ELSE 'DOK'
    END;
    
    SELECT COALESCE(MAX(CAST(SPLIT_PART(cislo, '-', 3) AS INT)), 0) + 1
    INTO v_seq
    FROM doklady
    WHERE typ = p_typ
      AND EXTRACT(YEAR FROM datum_vystaveni) = p_rok
    FOR UPDATE;
    
    RETURN FORMAT('%s-%s-%s', v_prefix, p_rok, LPAD(v_seq::TEXT, 4, '0'));
END;
$$ LANGUAGE plpgsql;
```

---

## Struktura Nového Modulu

```
src/modules/invoicing/
├── types/
│   ├── index.ts                   # Doklad, Polozka, Zakaznik, FiremniNastaveni
│   └── formSchema.ts              # Zod schemas
├── actions/
│   ├── customers.ts               # CRUD zákazníků
│   ├── documents.ts               # CRUD dokladů, změny stavů, konverze
│   ├── pdf.ts                     # Server Action → PDF buffer
│   ├── qr.ts                      # SPAYD QR jako data URI
│   └── settings.ts                # Firemní nastavení (get/upsert)
├── components/
│   ├── DocumentsDataTable.tsx     # Přehled dokladů (TanStack) s filtry
│   ├── DocumentForm.tsx           # Formulář dokladu (sdílený)
│   ├── DocumentLineItems.tsx      # Editor položek
│   ├── CustomerSelector.tsx       # Dropdown výběru zákazníka
│   ├── ProductPicker.tsx          # Výběr z PIM nebo volná položka
│   ├── DocumentStatusBadge.tsx    # Badge pro stav dokladu
│   ├── InvoicePDF.tsx             # react-pdf šablona
│   ├── CustomerDataTable.tsx      # Seznam zákazníků
│   ├── CustomerForm.tsx           # Formulář zákazníka
│   └── CompanySettingsForm.tsx    # Editace firemního profilu
└── utils/
    ├── calculations.ts            # DPH, součty, zálohy, zaokrouhlení
    ├── numbering.ts               # Wrapper nad DB funkcí
    └── spayd.ts                   # SPAYD QR string builder

src/app/(app)/
├── faktury/
│   ├── page.tsx                   # Dashboard dokladů (tabbed: FAK/NAB/OBJ/ZAL)
│   ├── novy/page.tsx              # Nový doklad (?typ=faktura atd.)
│   └── [id]/page.tsx              # Detail / editace / preview / tisk
├── zakaznici/
│   ├── page.tsx                   # Seznam zákazníků
│   └── [id]/page.tsx              # Detail zákazníka + history dokladů
└── nastaveni/
    ├── uzivatele/                 # [EXISTUJE]
    └── firma/page.tsx             # [NEW] Firemní profil a fakturační údaje
```

---

## QR Platba — SPAYD Formát

```typescript
// src/modules/invoicing/utils/spayd.ts
export function buildSpaydString(params: {
  iban: string
  castka: number
  mena: string
  variabilniSymbol: string
  zprava: string
}): string {
  return [
    'SPD*1.0',
    `ACC:${params.iban}`,
    `AM:${params.castka.toFixed(2)}`,
    `CC:${params.mena}`,
    `X-VS:${params.variabilniSymbol}`,
    `MSG:${params.zprava.slice(0, 60)}`,
  ].join('*')
}
// Výsledek: SPD*1.0*ACC:CZ...*AM:12345.00*CC:CZK*X-VS:20260001*MSG:Faktura FAK-2026-0001
```

Zákazník naskenuje QR v mobilní aplikaci banky → platební příkaz se předvyplní automaticky.
Podporuje: Česká spořitelna, ČSOB, Komerční banka, Fio, Moneta, Raiffeisen, Air Bank.

---

## DPH Logika — Plátce vs. Neplátce

### Plátce DPH (aktuální stav)
- Faktury obsahují DPH tabulku (základ 21%, základ 12%, DPH celkem)
- DUZP (datum uskutečnění zdanitelného plnění) povinné
- DIČ zobrazeno na dokladu

### Neplátce DPH (budoucí s.r.o. nebo přechodové období)
- Přepínač `platce_dph = false` v `firemni_nastaveni`
- Systém automaticky nastaví `sazba_dph = 0` na všech položkách
- Místo DPH tabulky se zobrazí text: *"Nejsem plátcem DPH"*
- DIČ pole skryto

### Reverse Charge (zahraniční B2B)
- Flag `zakaznik.je_zahranicni = true` → `doklad.reverse_charge = true`
- Nulová DPH sazba + povinný text: *"Přenesení daňové povinnosti"*

---

## Nové Závislosti

```bash
npm install qrcode
npm install --save-dev @types/qrcode
```

*`@react-pdf/renderer` je již v package.json nainstalován (v4.5.1)*

---

## Fázový Plán Implementace

### Fáze 1 — Databáze & Seed (1 den)
- [ ] Migrace: `firemni_nastaveni`, `zakaznici`, `doklady`, `doklady_polozky`
- [ ] SQL funkce `next_document_number()`
- [ ] RLS politiky
- [ ] Seed firemních údajů (Ing. Filip Klier, IČO 23048255...)
- [ ] TypeScript typy + Zod schémata

### Fáze 2 — Server Actions (1 den)
- [ ] `settings.ts` — get/upsert firemního profilu
- [ ] `customers.ts` — CRUD zákazníků
- [ ] `documents.ts` — CRUD dokladů, změny stavů, konverze OBJ→FAK
- [ ] `qr.ts` + `spayd.ts`

### Fáze 3 — PDF Template (1 den)
- [ ] `InvoicePDF.tsx` — plný layout s logem, adresami, položkovou tabulkou, DPH rekapitulací, QR kódem
- [ ] `pdf.ts` server action
- [ ] Podpora všech 4 typů + obě DPH varianty

### Fáze 4 — UI: Nastavení Firmy + Zákazníci (1 den)
- [ ] `/nastaveni/firma` — `CompanySettingsForm.tsx`
- [ ] `/zakaznici` — `CustomerDataTable.tsx` + `CustomerForm.tsx`

### Fáze 5 — UI: Doklady (2 dny)
- [ ] `/faktury` — tabbed dashboard (Faktury / Nabídky / Objednávky / Zálohy)
- [ ] `DocumentsDataTable.tsx` — dense grid s filtry
- [ ] `/faktury/novy` — `DocumentForm.tsx` + `DocumentLineItems.tsx`
- [ ] Sidebar navigace — přidání nových položek

### Fáze 6 — PDF Preview & Download (0.5 dne)
- [ ] Preview v modalu (iframe nebo react-pdf viewer)
- [ ] Download tlačítko
- [ ] Tisk (window.print nebo PDF download)

---

## Verification Plan

```bash
# Nainstalovat qrcode
npm install qrcode @types/qrcode --save-dev

# Spustit dev server
npm run dev

# Vitest unit testy
npx vitest run src/modules/invoicing/utils/
```

**Manuální ověření:**
1. Přejít na `/nastaveni/firma` → vyplnit/upravit firemní údaje → uložit
2. Vytvořit zákazníka na `/zakaznici`
3. Vytvořit nabídku z produktů PIM → konvertovat na objednávku
4. Vystavit zálohovou fakturu (50%)
5. Vystavit finální fakturu → záloha automaticky odečtena
6. Stáhnout PDF → zkontrolovat layout + QR kód
7. Naskenovat QR v mobilní bance → ověřit předvyplnění platby
8. Přepnout `platce_dph = false` → zkontrolovat výstup PDF
