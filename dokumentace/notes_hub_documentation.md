# Dokumentace a Návod na Replikaci: Notes Hub (Poznámkový blok)

Tento dokument detailně popisuje architekturu, databázové schéma a komponenty funkcionality **Notes Hub (Poznámkový blok)** z projektu Reflectory. Cílem je poskytnout kompletní podklady pro přesnou replikaci tohoto systému v jiném Next.js + Supabase projektu, případně pro přímé převzetí (zkopírování) stávajícího kódu.

---

## 1. Přehled konceptu a architektury

Poznámkový blok v Reflectory je navržen jako moderní, dvou-sloupcový workspace, který uživateli umožňuje:
* Organizovat poznámky do **složek (Note Folders)** s barevným odlišením.
* Vytvářet a editovat **bohaté textové poznámky (Rich Text Notes)** pomocí editoru **Tiptap** (Manifest V3 kompatibilní, s podporou formátování, barev, zvýraznění a checklistů).
* **Propojit poznámku s obchodním dnem (Session Date)**, což automaticky načte metriky z daného dne (Net P&L, počet obchodovaných instrumentů, celkový počet obchodů).
* **Připnout konkrétní obchody (Pinned Trades)** k dané poznámce pro rychlou referenci a přehled.

### Architektonické vrstvy:
1. **Databáze (Supabase / PostgreSQL)**: Dvě tabulky (`note_folders`, `notes`) se zapnutým Row Level Security (RLS) pro izolaci dat uživatelů.
2. **Backend / API (Next.js Server Actions)**: Soubor `note-actions.ts` zajišťující bezpečné CRUD operace nad databází a validaci vstupů pomocí knihovny **Zod**.
3. **Frontend (React + Tailwind CSS + Lucide Icons + Shadcn UI)**:
   - `RichTextEditor`: Obalovací komponenta kolem editoru Tiptap.
   - `NotesSidebar`: Levý panel se složkami a seznamem poznámek.
   - `NoteEditor`: Hlavní editační plocha s metadatovými poli, načítáním P&L a výběrem obchodů.
   - `NotesContainer`: Hlavní stavový kontejner, který drží informace o vybrané složce a aktivní poznámce.

---

## 2. Databázové schéma (SQL)

Pro fungování poznámek v Supabase je nutné spustit následující SQL skript (např. v SQL Editoru v Supabase). Skript definuje tabulky, vazby, RLS politiky a indexy.

```sql
-- 1. Tabulka složek poznámek (note_folders)
create table public.note_folders (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  name text not null,
  color text, -- CSS třída pro barvu složky (např. text-blue-400)
  created_at timestamptz default now(),
  updated_at timestamptz default now(),

  constraint note_folders_pkey primary key (id),
  constraint note_folders_user_id_fkey foreign key (user_id) references auth.users(id) on delete cascade
);

-- Zapnutí RLS pro složky
alter table public.note_folders enable row level security;

-- RLS Politika pro složky (Uživatel může spravovat pouze své složky)
create policy "Users can manage their own note folders"
  on public.note_folders for all
  using (auth.uid() = user_id);


-- 2. Tabulka poznámek (notes)
create table public.notes (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  folder_id uuid references public.note_folders(id) on delete set null,
  title text not null default 'Untitled',
  content jsonb, -- Ukládání bohatého textu ve formátu HTML / Tiptap JSON
  content_text text, -- Čistý text bez HTML značek pro fulltextové vyhledávání
  
  -- Propojení s obchodním deníkem (Volitelné)
  session_date date, -- Odkaz na konkrétní den
  account_id uuid references public.accounts(id) on delete set null, -- Propojení s účtem
  linked_trades uuid[], -- Pole ID připnutých obchodů
  
  created_at timestamptz default now(),
  updated_at timestamptz default now(),

  constraint notes_pkey primary key (id),
  constraint notes_user_id_fkey foreign key (user_id) references auth.users(id) on delete cascade
);

-- Zapnutí RLS pro poznámky
alter table public.notes enable row level security;

-- RLS Politika pro poznámky (Uživatel může spravovat pouze své poznámky)
create policy "Users can manage their own notes"
  on public.notes for all
  using (auth.uid() = user_id);

-- Výkonnostní indexy
create index notes_user_id_idx on public.notes (user_id);
create index notes_folder_id_idx on public.notes (folder_id);
create index notes_session_date_idx on public.notes (session_date);
```

> [!NOTE]
> Ve stávajícím kódu se v poli `content` (které je v DB typu `jsonb`) ukládá HTML řetězec. Knihovna `supabase-js` a PostgreSQL automaticky uloží HTML string jako validní JSON hodnotu (zapouzdřenou v uvozovkách), což funguje bez problémů.

---

## 3. Serverové akce (Next.js Server Actions)

Kód pro komunikaci s databází na serveru se nachází v souboru [note-actions.ts](file:///Users/martin/Documents/Projects/Reflectory/web/app/actions/note-actions.ts). Tento soubor lze téměř kompletně převzít.

### Co je potřeba přizpůsobit:
- **Import Supabase klienta (`createClient`)**: V Reflectory se používá `@/lib/supabase/server`. V novém projektu musíte import nasměrovat na vaši inicializaci serverového Supabase klienta (využívajícího cookies).

### Zdrojový kód (`note-actions.ts`):
```typescript
'use server'

import { createClient } from "@/lib/supabase/server" // UPRAVIT podle vašeho projektu
import { revalidatePath } from "next/cache"
import { z } from "zod"

// --- Zod validační schémata ---
const folderSchema = z.object({
    name: z.string().min(1),
    color: z.string().optional(),
})

const noteSchema = z.object({
    title: z.string().min(1),
    content: z.any().optional(),
    content_text: z.string().optional(),
    folder_id: z.string().uuid().optional().nullable(),
    session_date: z.string().optional().nullable(),
    account_id: z.string().uuid().optional().nullable(),
    linked_trades: z.array(z.string().uuid()).optional(),
})

// --- Akce pro složky (Folders) ---

export async function getFolders() {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return { success: false, error: "Unauthorized" }

        const { data, error } = await supabase
            .from('note_folders')
            .select('*')
            .eq('user_id', user.id)
            .order('name')

        if (error) throw error
        return { success: true, data }
    } catch (e: any) {
        return { success: false, error: e.message }
    }
}

export async function upsertFolder(payload: unknown, folderId?: string) {
    try {
        const validated = folderSchema.parse(payload)
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return { success: false, error: "Unauthorized" }

        let error;
        if (folderId) {
            const { error: err } = await (supabase.from('note_folders') as any)
                .update(validated)
                .eq('id', folderId)
                .eq('user_id', user.id)
            error = err
        } else {
            const { error: err } = await (supabase.from('note_folders') as any)
                .insert({ ...validated, user_id: user.id })
            error = err
        }

        if (error) throw error
        revalidatePath('/dashboard/notes')
        return { success: true }
    } catch (e: any) {
        return { success: false, error: e.message }
    }
}

export async function deleteFolder(folderId: string) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return { success: false, error: "Unauthorized" }

        const { error } = await (supabase.from('note_folders') as any)
            .delete()
            .eq('id', folderId)
            .eq('user_id', user.id)

        if (error) throw error
        revalidatePath('/dashboard/notes')
        return { success: true }
    } catch (e: any) {
        return { success: false, error: e.message }
    }
}

// --- Akce pro poznámky (Notes) ---

export async function getNotes(folderId?: string | null) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return { success: false, error: "Unauthorized" }

        let query = (supabase.from('notes') as any)
            .select('*')
            .eq('user_id', user.id)
            .order('updated_at', { ascending: false })

        if (folderId) {
            query = query.eq('folder_id', folderId)
        } else if (folderId === null) {
            query = query.is('folder_id', null)
        }

        const { data, error } = await query

        if (error) throw error
        return { success: true, data }
    } catch (e: any) {
        return { success: false, error: e.message }
    }
}

export async function getNote(noteId: string) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return { success: false, error: "Unauthorized" }

        const { data, error } = await (supabase.from('notes') as any)
            .select('*, accounts(name)')
            .eq('id', noteId)
            .eq('user_id', user.id)
            .single()

        if (error) throw error
        return { success: true, data }
    } catch (e: any) {
        return { success: false, error: e.message }
    }
}

export async function upsertNote(payload: unknown, noteId?: string) {
    try {
        const validated = noteSchema.parse(payload)
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return { success: false, error: "Unauthorized" }

        let error;
        let data;
        if (noteId) {
            const { data: updated, error: err } = await (supabase.from('notes') as any)
                .update({ ...validated, updated_at: new Date().toISOString() })
                .eq('id', noteId)
                .eq('user_id', user.id)
                .select()
                .single()
            error = err
            data = updated
        } else {
            const { data: inserted, error: err } = await (supabase.from('notes') as any)
                .insert({ ...validated, user_id: user.id })
                .select()
                .single()
            error = err
            data = inserted
        }

        if (error) throw error
        revalidatePath('/dashboard/notes')
        return { success: true, data }
    } catch (e: any) {
        return { success: false, error: e.message }
    }
}

export async function deleteNote(noteId: string) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return { success: false, error: "Unauthorized" }

        const { error } = await (supabase.from('notes') as any)
            .delete()
            .eq('id', noteId)
            .eq('user_id', user.id)

        if (error) throw error
        revalidatePath('/dashboard/notes')
        return { success: true }
    } catch (e: any) {
        return { success: false, error: e.message }
    }
}
```

---

## 4. Rich Text Editor (Tiptap Wrapper)

Rich Text Editor se nachází v souboru [rich-text-editor.tsx](file:///Users/martin/Documents/Projects/Reflectory/web/components/journal/rich-text-editor.tsx). Jedná se o samostatnou UI komponentu postavenou na editoru **Tiptap**.

### Potřebné npm balíčky (dependencies):
Před použitím komponenty je nutné nainstalovat následující závislosti:
```bash
npm install @tiptap/react @tiptap/starter-kit @tiptap/extension-color @tiptap/extension-text-style @tiptap/extension-underline @tiptap/extension-placeholder @tiptap/extension-text-align @tiptap/extension-highlight @tiptap/extension-link @tiptap/extension-task-list @tiptap/extension-task-item lucide-react classnames
```

> [!TIP]
> Tiptap vyžaduje `@tailwindcss/typography` plugin pro správné stylování HTML elementů přes třídu `prose`. Doporučuje se ho přidat do `tailwind.config.js`:
> `plugins: [require('@tailwindcss/typography')]`

### Zdrojový kód (`rich-text-editor.tsx`):
Tento soubor lze zkopírovat **1:1** do vašeho projektu. Jediné, co je potřeba ověřit, jsou importy komponent jako `Button`, `Separator`, `Popover` z vašeho design systému (v Reflectory se používá **Shadcn UI**).

---

## 5. Komponenty uživatelského rozhraní (UI)

Zde je popsáno propojení tří hlavních klientských komponent z adresáře `web/components/notes`:

### 1. `NotesContainer` (Kontejner)
Nachází se v souboru [notes-container.tsx](file:///Users/martin/Documents/Projects/Reflectory/web/components/notes/notes-container.tsx). 
* Zajišťuje načítání složek a poznámek z databáze při startu nebo při změně filtru složky.
* Propojuje `NotesSidebar` s `NoteEditor`.
* **Klíčový kód:**
  ```typescript
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null) // null = Všechny poznámky
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null)
  ```

### 2. `NotesSidebar` (Boční panel)
Nachází se v souboru [sidebar-view.tsx](file:///Users/martin/Documents/Projects/Reflectory/web/components/notes/sidebar-view.tsx).
* Zobrazuje seznam složek s barvami.
* Obsahuje tlačítka pro vytvoření nové složky (zobrazí integrovaný dialog s výběrem barvy) a vytvoření nové poznámky.
* Zobrazuje seznam poznámek pro vybranou složku, se zobrazením data poslední změny a propojeného `session_date`.
* **Převzetí:** Lze zkopírovat, odstraňte pouze závislost na lokalizaci `useTranslation`, pokud ji v novém projektu nepoužíváte, a nahraďte texty napevno nebo vlastním lokalizačním systémem.

### 3. `NoteEditor` (Editor poznámky a metadata)
Nachází se v souboru [note-editor.tsx](file:///Users/martin/Documents/Projects/Reflectory/web/components/notes/note-editor.tsx).
* Obsahuje název poznámky, date picker (`Calendar`) pro přiřazení k `session_date`.
* **Automatické načítání P&L:**
  Pokud uživatel zvolí datum obchodní seance, komponenta asynchronně zavolá serverovou akci `getTrades(...)` z `trade-actions.ts` a spočítá P&L a počet instrumentů pro daný den.
* **Výběr obchodů (Trade Picker):**
  Umožňuje uživateli kliknout na tlačítko `+` a ze seznamu obchodů vybrat ty, které chce k poznámce připnout (uloží se do pole UUID `linked_trades`).
* **Převzetí:** Tento komponent má silnější vazby na zbytek aplikace Reflectory (volání `getTrades()` a `getAccounts()`). Při přenosu do jiného projektu je nutné buď:
  - Tyto vazby odstranit (pokud nový projekt neobsahuje obchody a účty) a ponechat čistě editaci textu, názvu a data.
  - Nebo upravit datové typy a API volání tak, aby odpovídaly vašemu datovému modelu obchodů v novém projektu.

---

## 6. Co lze zkopírovat přímo (Copy-Paste) a co upravit?

| Soubor / Část | Možnost přímého zkopírování | Co je nutné upravit / zkontrolovat |
| :--- | :--- | :--- |
| **SQL Schéma** | **100% zkopírovat** | Cizí klíč `account_id uuid references public.accounts(id)` na řádku 32 v `notes` tabulce upravte nebo odeberte, pokud v novém projektu tabulka `accounts` neexistuje. |
| **`rich-text-editor.tsx`** | **95% zkopírovat** | Ověřte cesty k importům z Shadcn UI (`@/components/ui/button`, atd.) a nainstalujte npm závislosti. |
| **`note-actions.ts`** | **90% zkopírovat** | Změňte import `@/lib/supabase/server` na váš serverový Supabase klient. |
| **`sidebar-view.tsx`** | **85% zkopírovat** | Odstraňte/nahraďte lokalizační hook `useTranslation` za váš standardní (nebo nahraďte texty napevno). |
| **`note-editor.tsx`** | **50% zkopírovat** | Zde je integrovaná vazba na trading (Net P&L, výběr účtů, propojování konkrétních obchodů). Pokud jej přenášíte do netradičního projektu, vymažte kód spojený s `metrics`, `getTrades`, `getAccounts`, `TradePicker` a ponechte pouze název, kalendář a textový editor. |
| **Styling (CSS)** | **100% zkopírovat** | Styly v `<style jsx global>` na konci `rich-text-editor.tsx` zajišťují správné vykreslení tiptap elementů. Ty fungují univerzálně. |

---

## 7. Jak postupovat při replikaci (Krok za krokem)

1. **Příprava DB:** Spusťte SQL skript pro tabulky `note_folders` a `notes` ve vašem Supabase projektu.
2. **Instalace NPM balíčků:** Spusťte instalaci všech Tiptap a formátovacích balíčků (viz sekce 4).
3. **Konfigurace Tailwind:** Pokud ještě nemáte, přidejte `@tailwindcss/typography` plugin do vašeho `tailwind.config.js`.
4. **Vytvoření serverových akcí:** Vytvořte soubor `note-actions.ts` v backendové části (např. `app/actions/`) a upravte import Supabase klienta.
5. **Kopírování Editoru:** Zkopírujte `rich-text-editor.tsx` do složky komponent.
6. **Kopírování Workspace:** Zkopírujte složku `notes` (obsahující `notes-container.tsx`, `sidebar-view.tsx`, `note-editor.tsx`) a upravte v nich importy, texty (pokud nepoužíváte i18n lokalizaci) a případně odeberte tradingové vazby v `note-editor.tsx`.
7. **Import do stránky:** Naimportujte `<NotesContainer />` do požadované Next.js routy.
