# Implementace: Plánovací Modul v2.0

> **Verze**: 2.0 — Anti-byrokracie, maximální efektivita  
> **Vytvořeno**: 25. 6. 2026  
> **Navazuje na**: `plan_rozvoje.md`, `organizace_a_oddeleni.md`, `erp_crm_pipeline.md`  
> **Cíl**: Přidat ke stávajícím milníkům plnohodnotné úkoly s datem, odpovědnou osobou a kalendářovým pohledem. Vše mobile-first.

---

## Architektura (TL;DR)

```
projekty_planovani  →  milniky  →  ukoly_planovani  (NOVÁ tabulka)
      (existuje)       (existuje)    │
                                     ├─ oddeleni (TEXT enum, ne FK)
                                     ├─ typ_udalosti (task/meeting/order/deadline)
                                     ├─ datum_splatnosti + datum_zahajeni
                                     └─ checklist (JSONB pole — bez extra tabulky)
```

**Proč takto?**  
- Žádná extra tabulka pro oddělení — oddělení je prostý `TEXT CHECK` constraint.  
- Žádná tabulka pro podúkoly — checklist je JSONB array na úkolu.  
- 1 nová tabulka místo plánovaných 3. Méně JOIN dotazů = rychlejší systém.

---

## KROK 1 — Databázová migrace

**Soubor**: `supabase/migrations/20260625130000_planning_tasks.sql`

- [x] Vytvořit tabulku `ukoly_planovani` s těmito sloupci:
  - `id` UUID PK
  - `milnik_id` UUID FK → `milniky(id)` ON DELETE CASCADE
  - `nazev` TEXT NOT NULL
  - `popis` TEXT (volitelné)
  - `stav` TEXT CHECK (`todo` | `in_progress` | `done` | `blocked`) DEFAULT `todo`
  - `priorita` TEXT CHECK (`low` | `medium` | `high` | `critical`) DEFAULT `medium`
  - `oddeleni` TEXT CHECK (`management` | `sales` | `purchasing` | `logistics` | `backbone` | `finance` | `rd` | `marketing` | `backoffice` | `legal`) DEFAULT `management`
  - `typ_udalosti` TEXT CHECK (`task` | `meeting` | `order` | `deadline`) DEFAULT `task`
  - `vlastnik_id` UUID FK → `profily_uzivatelu(id)` ON DELETE SET NULL
  - `datum_zahajeni` DATE (volitelné)
  - `datum_splatnosti` DATE (volitelné) — zobrazení v kalendáři
  - `checklist` JSONB DEFAULT `'[]'` — pole `[{"text": "...", "done": false}]`
  - Audit: `deleted_at`, `vytvoreno_at`, `aktualizovano_at`, `vytvoril_id`, `upravil_id`
- [x] Zapnout RLS (`ENABLE ROW LEVEL SECURITY`)
- [x] Přidat RLS politiky:
  - SELECT: přihlášení vidí vše (kde `deleted_at IS NULL`)
  - INSERT: přihlášení mohou vytvářet (kde `vytvoril_id = auth.uid()`)
  - UPDATE: přihlášení mohou editovat (kde `deleted_at IS NULL`)
  - DELETE: pouze admin
- [x] Přidat indexy:
  - `(milnik_id)` — pro načítání úkolů milníku
  - `(datum_splatnosti)` — pro kalendářové dotazy
  - `(oddeleni)` — pro filtraci
  - `(vlastnik_id)` — pro „moje úkoly"
  - `(deleted_at)` — soft delete filtr
- [x] Přidat trigger `aktualizovano_at` (reusovat existující funkci `update_aktualizovano_at()`)
- [x] Otestovat: `npx supabase db push`

---

## KROK 2 — TypeScript typy

**Soubor**: `src/modules/planning/types/index.ts`

- [x] Přidat `OddeleniType` — union type pro 10 oddělení:
  ```ts
  export type OddeleniType =
    | 'management' | 'sales' | 'purchasing' | 'logistics'
    | 'backbone' | 'finance' | 'rd' | 'marketing'
    | 'backoffice' | 'legal';
  ```
- [x] Přidat `TypUdalostiType` — union type:
  ```ts
  export type TypUdalostiType = 'task' | 'meeting' | 'order' | 'deadline';
  ```
- [x] Přidat `ChecklistItem`:
  ```ts
  export interface ChecklistItem { text: string; done: boolean; }
  ```
- [x] Přidat `UkolPlanovani` interface:
  ```ts
  export interface UkolPlanovani {
    id: string;
    milnik_id: string;
    nazev: string;
    popis?: string;
    stav: 'todo' | 'in_progress' | 'done' | 'blocked';
    priorita: 'low' | 'medium' | 'high' | 'critical';
    oddeleni: OddeleniType;
    typ_udalosti: TypUdalostiType;
    vlastnik_id?: string;
    datum_zahajeni?: string;   // ISO date string
    datum_splatnosti?: string; // ISO date string
    checklist: ChecklistItem[];
    deleted_at?: string;
    vytvoreno_at: string;
    aktualizovano_at: string;
    vytvoril_id?: string;
    upravil_id?: string;
    // Joinovaná data (volitelné)
    vlastnik?: { id: string; jmeno: string; avatar_url?: string; };
    milnik?: { id: string; nazev: string; };
  }
  ```
- [x] Přidat `UkolPlanovaniPayload` (pro insert/update — bez audit polí)
- [x] Ověřit TypeScript build: `npm run build`

---

## KROK 3 — Server Actions

**Soubor**: `src/modules/planning/actions/ukoly.ts`

- [x] `getUkolyByMilnik(milnikId: string): Promise<UkolPlanovani[]>`
  - Načte všechny úkoly daného milníku (bez `deleted_at`)
  - Join s `profily_uzivatelu` (vlastník — id, jmeno, avatar_url)
  - Seřadit: nejdříve `critical`, pak `high`, pak dle `datum_splatnosti`
- [x] `getUkolyByDateRange(from: Date, to: Date, filters?: { oddeleni?: OddeleniType; vlastnik_id?: string }): Promise<UkolPlanovani[]>`
  - Vrátí úkoly kde `datum_splatnosti BETWEEN from AND to` OR `datum_zahajeni BETWEEN from AND to`
  - Použije se pro `PlanningCalendar`
- [x] `getMilnikyDeadlines(from: Date, to: Date): Promise<Pick<Milnik, 'id'|'nazev'|'datum_splatnosti'|'barva'>[]>`
  - Pro zobrazení deadlinů milníků v kalendáři
- [x] `upsertUkol(payload: UkolPlanovaniPayload, id?: string): Promise<UkolPlanovani>`
  - INSERT nebo UPDATE dle přítomnosti `id`
  - Automaticky vyplní `vytvoril_id` / `upravil_id` ze session
- [x] `toggleUkolStav(id: string, stav: UkolPlanovani['stav']): Promise<void>`
  - Rychlé přepnutí stavu (optimistic update v UI)
- [x] `toggleChecklistItem(ukolId: string, index: number, done: boolean): Promise<void>`
  - Patch JSONB pole: update `checklist[index].done = done`
  - Použít Supabase `jsonb_set()` nebo načíst + přepsat array
- [x] `deleteUkol(id: string): Promise<void>`
  - Soft delete: nastaví `deleted_at = now()`

---

## KROK 4 — UI: UkolRow komponenta

**Soubor**: `src/modules/planning/components/UkolRow.tsx`

- [x] Jednořádkový kompaktní item:
  - Vlevo: barevný dot podle `oddeleni` + checkbox stavu (kliknutím přepne `todo` ↔ `done`)
  - Střed: název úkolu (tučně), pod ním datum + typ události (faded text)
  - Vpravo: avatar vlastníka + badge priority
- [x] Kliknutím na řádek → rozbalí se (accordion):
  - Popis (pokud existuje)
  - Checklist items (každý s checkboxem)
  - Tlačítko "Upravit" → otevře `UkolFormDialog`
  - Tlačítko "Smazat" (s potvrzením)
- [x] Barevné kódování oddělení (konstantní mapa `ODDELENI_COLORS`):
  ```ts
  const ODDELENI_COLORS: Record<OddeleniType, string> = {
    management: 'var(--color-primary)',  // purple
    sales: '#2563eb',
    purchasing: '#0284c7',
    logistics: '#16a34a',
    backbone: '#7c3aed',
    finance: '#b45309',
    rd: '#0d9488',
    marketing: '#db2777',
    backoffice: '#6b7280',
    legal: '#92400e',
  };
  ```
- [x] Stav `todo` → název normálně, `done` → přeškrtnutý text, `blocked` → červený rámeček
- [x] Ověřit na mobilu (touch target min 44px)

---

## KROK 5 — UI: Integrace do MilnikCard

**Soubor**: `src/modules/planning/components/MilnikCard.tsx`

- [x] Přidat sekci "Úkoly" pod stávající obsah milník karty
- [x] Načíst úkoly přes `getUkolyByMilnik(milnik.id)` (server side)
- [x] Zobrazit seznam `<UkolRow />` komponent
- [x] Progres bar milníku přepočítat automaticky z `done / celkem` úkolů (pokud milník nemá manuální progres)
- [x] Přidat tlačítko **"+ Přidat úkol"** pod seznam:
  - Inline mini-form (bez dialogu): pole pro název + Enter = uložit
  - Defaultně přiřadí aktuálně přihlášeného uživatele a dnešní datum + 7 dní
- [x] Tlačítko "Zobrazit vše" (pokud > 5 úkolů) — skryje přebytečné řádky

---

## KROK 6 — UI: UkolFormDialog

**Soubor**: `src/modules/planning/components/UkolFormDialog.tsx`

- [x] Dialog pro plné vytvoření/editaci úkolu
- [x] Pole:
  - Název (text input, required)
  - Popis (textarea, volitelné)
  - Oddělení (select, povinné)
  - Typ události (select: Úkol / Schůzka / Objednávka / Deadline)
  - Vlastník (select z profily_uzivatelu)
  - Datum zahájení (date picker, volitelné)
  - Datum splatnosti (date picker, volitelné)
  - Priorita (radio/segmented: Nízká / Střední / Vysoká / Kritická)
  - Checklist (dynamický seznam — tlačítko "Přidat položku", každá s textem a možností smazání)
- [x] Submit → `upsertUkol(payload)`
- [x] Použít `render` prop pro trigger (bez `asChild`)
- [x] Validace přes Zod schema

---

## KROK 7 — UI: PlanningCalendar

**Soubor**: `src/modules/planning/components/PlanningCalendar.tsx`

> ⚠️ Neinstalovat externí kalendářovou knihovnu bez předchozí diskuse. Implementovat vlastní lehký kalendář nebo použít `react-big-calendar` / `@fullcalendar/react`.

- [x] Prozkoumat dostupné knihovny (`npm ls react-big-calendar @fullcalendar/react`) — vybrat tu, která je již nainstalována, nebo nejlehčí možnost
- [x] Struktura pohledů:
  - **Měsíc** (výchozí) — přehled na celý měsíc, eventu zobrazeny jako pill
  - **Týden** — grid 7 sloupců, eventu v časových blocích
  - **Den** — detail pro operativní plánování
- [x] Zdroje událostí:
  - `getUkolyByDateRange(startOfMonth, endOfMonth)` — barevné dle `oddeleni`
  - `getMilnikyDeadlines(startOfMonth, endOfMonth)` — zobrazeny jako diamant/flag
- [x] Filtrační panel:
  - Multi-select oddělení (pill buttons s barvami)
  - Filtr vlastníka (avatar chips)
  - Filtr typu události (task / meeting / order / deadline)
- [x] Klik na prázdný den → otevře `UkolFormDialog` s předvyplněným `datum_splatnosti`
- [x] Klik na existující event → otevře `UkolFormDialog` v edit módu
- [x] **Mobile-first**:
  - Swipe doleva/doprava = změna měsíce (touch event listener)
  - Eventy jsou touch-friendly (min height, tap target)
  - Na úzkých obrazovkách skryje filtry do toggleable panelu

---

## KROK 8 — Integrace do MilestoneTimeline

**Soubor**: `src/modules/planning/components/MilestoneTimeline.tsx`

- [x] Přidat toggle nad timeline: **"Přehled" | "Kalendář"**
- [x] Při aktivním "Přehled" → stávající zobrazení milníků + gantt
- [x] Při aktivním "Kalendář" → render `<PlanningCalendar />`
- [x] URL parameter `?view=calendar` pro přímé odkazování na kalendář

---

## KROK 9 — Commit & Deploy

- [x] `git add .`
- [x] `git commit -m "feat(planning): tasks with dates, checklist, and calendar view"`
- [x] `git push origin main`
- [x] Ověřit build na Vercel / produkci

---

## KROK 10 — Cíle a Vize oddělení pro Milníky (Taktická meziúroveň) [PLÁNOVÁNO]

Tento krok zavádí taktickou úroveň plánování pro propojení strategie (Milníky) a operativy (Úkoly).

### 1. DB Migrace: `supabase/migrations/20260625180000_departmental_goals.sql`
- Vytvořit tabulku `cile_oddeleni_milniku` s těmito sloupci:
  - `id` UUID PK
  - `milnik_id` UUID FK → `milniky(id)` ON DELETE CASCADE
  - `oddeleni_id` TEXT NOT NULL REFERENCES `oddeleni(id)` ON DELETE CASCADE
  - `nazev` TEXT NOT NULL
  - `popis` TEXT
  - `stav` TEXT CHECK (`planned` | `in_progress` | `completed` | `cancelled`) DEFAULT `planned`
  - Auditní pole: `vytvoreno_at`, `aktualizovano_at`, `vytvoril_id`, `upravil_id`
- Přidat sloupec `cil_id` UUID FK → `cile_oddeleni_milniku(id)` ON DELETE SET NULL do tabulky `ukoly_planovani`.
- Zapnout RLS a nastavit politiky (přihlášení vidí vše, zápis pro vlastníky/adminy).

### 2. TypeScript Typy (`src/modules/planning/types/index.ts`)
- Přidat interface `CilOddeleniMilniku`:
  ```ts
  export interface CilOddeleniMilniku {
    id: string
    milnik_id: string
    oddeleni_id: string
    nazev: string
    popis?: string | null
    stav: 'planned' | 'in_progress' | 'completed' | 'cancelled'
    vytvoreno_at: string
    vytvoril_id?: string | null
  }
  ```
- Upravit `UkolPlanovani` o volitelné pole `cil_id?: string | null`.

### 3. Server Actions (`src/modules/planning/actions/goals.ts` [NEW])
- `getCileByMilnik(milnikId: string): Promise<CilOddeleniMilniku[]>`
- `upsertCil(payload: Partial<CilOddeleniMilniku>): Promise<CilOddeleniMilniku>`
- `deleteCil(id: string): Promise<void>`

### 4. UI Integrace
- **Vytvoření/Správa cílů**: V detailu projektu / MilestoneTimeline přidat sekci „Taktické cíle oddělení“, kde může každý STO zapsat 1-2 vize pro danou fázi.
- **Seskupování úkolů**: V detailu milníku a Kanban boardu seskupit úkoly pod tyto cíle (swimlanes/akordeony). Při tvorbě úkolu umožnit přiřadit jej pod jeden z cílů oddělení.

---

## Závislosti a poznámky

| Závislost | Status | Poznámka |
|---|---|---|
| Supabase CLI | ✅ Nainstalovaný | Pro `db push` |
| `@supabase/supabase-js` | ✅ | Stávající |
| Kalendářová knihovna | ❓ | Zkontrolovat před krokem 7 |
| Zod | ✅ | Pro validaci formulářů |
| `next/font` + CSS vars | ✅ | Design tokeny z `globals.css` |

---

## Checklist: Kdy je modul hotový?

- [x] Lze přidat úkol k milníku s datem a osobou
- [x] Úkol se zobrazí v kalendářovém pohledu
- [x] Lze přidat checklist položky a odškrtnout je bez reloadu stránky
- [x] Kalendář funguje na mobilním prohlížeči (touch events)
- [x] Milník automaticky přepočítá progres z dokončených úkolů
- [x] TypeScript build projde bez chyb (`npm run build`)
- [x] Změny jsou pushnuty na GitHub
