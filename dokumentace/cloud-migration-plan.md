# Strategický Plán: Přechod na Cloud (Vercel & Supabase Cloud)

Tento dokument popisuje kroky pro rychlý a efektivní přesun systému AZ-Composite z lokálního Proxmoxu do profesionálního cloudu. Cílem je nulová údržba infrastruktury a maximální dostupnost.

---

## 📌 AKTUÁLNÍ STAV (Pauza - k řešení později)
*   ✅ **Frontend (Vercel):** Aplikace je úspěšně nasazena, zkompilována a běží.
*   ✅ **Propojení:** Vercel má správně nastavené Environment Variables pro připojení k Supabase Cloudu.
*   ❌ **Backend (Supabase Data):** Aplikace sice běží, ale databáze v Supabase Cloudu je **prázdná** (chybí data v číselnících jako jsou `kategorie`, `produkty` atd.). 
    *   *Důvod:* Původní importní soubor z MacBooku (`az_composites_dump.sql`) obsahoval systémové příkazy (tvorba rolí, event triggery), které Supabase Cloud z bezpečnostních důvodů odmítl a import přerušil dříve, než se nahrála data.
*   **Další krok při návratu:** Provést "čistý" import pouze dat a struktury bez systémových rolí (viz bod 1.2).

---

## 1. FÁZE: Příprava Supabase Cloud (Backend)
*Cíl: Přesunout databázi z MacBooku do spravovaného cloudu Supabase.*

### 1.1. Založení Projektu - [HOTOVO ✅]
1.  Vytvořit účet na [supabase.com](https://supabase.com).
2.  Založit nový projekt `az-composite-system` (Region: Frankfurt).

### 1.2. Import Dat (K DOKONČENÍ ⚠️)
Původní "Full Dump" selhal na systémových právech. Je nutné provést rozdělený import:

**Krok A: Import Schématu (Struktura tabulek)**
V lokálním terminálu MacBooku vygenerovat čisté schéma:
```bash
docker exec -t supabase_db_system pg_dump -U postgres --schema-only --no-owner --no-privileges postgres > ~/az_schema.sql
```
Nahrát do Cloudu:
```bash
psql -h aws-0-eu-west-1.pooler.supabase.com -p 6543 -d postgres -U postgres.natwtoqreniqupbvulso < ~/az_schema.sql
```

**Krok B: Import Dat (Obsah tabulek)**
V lokálním terminálu vygenerovat pouze data (číselníky, produkty):
```bash
docker exec -t supabase_db_system pg_dump -U postgres --data-only --column-inserts --no-owner --no-privileges postgres > ~/az_data.sql
```
Nahrát do Cloudu:
```bash
psql -h aws-0-eu-west-1.pooler.supabase.com -p 6543 -d postgres -U postgres.natwtoqreniqupbvulso < ~/az_data.sql
```

---

## 2. FÁZE: Příprava Vercel (Frontend) - [HOTOVO ✅]
*Cíl: Nasadit Next.js aplikaci přímo z GitHubu.*

### 2.1. Propojení s GitHubem - [HOTOVO ✅]
1.  Zbytečný kód nasazování na Proxmox (`deploy.yml`) odstraněn.
2.  Projekt importován z repozitáře `az-composite-system`.

### 2.2. Konfigurace Environment Variables - [HOTOVO ✅]
Ve Vercel dashboardu byly úspěšně vloženy klíče z nového Supabase projektu (URL, ANON_KEY, SERVICE_ROLE_KEY, DATABASE_URL na portu 5432).

---

## 3. FÁZE: Doména a SSL (K DOKONČENÍ ⚠️)
*Cíl: Propojení s doménou az-composite.cz.*

### 3.1. Nastavení na Vercelu
1.  Ve Vercelu (Settings -> Domains) přidat `erp.az-composite.cz`.
2.  Vercel vygeneruje CNAME záznam (např. `cname.vercel-dns.com`).

### 3.2. Nastavení ve Wedosu
1.  V administraci Wedos přidat CNAME záznam pro `erp` směřující na Vercel.
2.  Vercel automaticky vystaví SSL certifikát.

---

## 4. FÁZE: Budoucí Workflow (Cloud Native)

*   **Vývoj:** Probíhá lokálně na MacBooku.
*   **Nasazení:** `git push origin main` -> Vercel automaticky nasadí novou verzi během 1 minuty.
*   **Zálohy:** Supabase Cloud provádí automatické denní zálohy v ceně tarifu.
*   **Škálování:** Pokud přijde 100 nových zaměstnanců, Cloud se automaticky přizpůsobí.
