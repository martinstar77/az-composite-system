# Návod na spuštění projektu AZ-Composites System

Tento dokument popisuje kroky potřebné pro lokální spuštění vývojového prostředí projektu, včetně lokální databáze (Supabase) a importu testovacích dat.

---

## 1. Prerekvizity

Než začnete, ujistěte se, že máte nainstalované a spuštěné následující nástroje:
- **Node.js** (verze v25+)
- **Docker Desktop** (nezbytné pro lokální běh Supabase databáze)
- **Git**

---

## 2. Kde spouštět příkazy

Všechny příkazy spouštějte v kořenovém adresáři projektu:
```bash
/Users/martin/Documents/Projects/sw-development/az-composites/system
```

Otevřete si terminál v této složce. Pokud jste v jiné složce, přejděte tam:
```bash
cd /Users/martin/Documents/Projects/sw-development/az-composites/system
```

---

## 3. Postup spuštění

### Krok 1: Spusťte Docker
Ujistěte se, že je aplikace **Docker Desktop** spuštěná (v liště systému uvidíte běžící velrybu). Bez spuštěného Dockeru se databáze nespustí.

### Krok 2: Nainstalujte závislosti projektu
Pokud spouštíte projekt poprvé (nebo po aktualizaci z Gitu), nainstalujte NPM balíčky:
```bash
npm install
```

### Krok 3: Spusťte lokální databázi (Supabase)
Projekt používá lokální instanci Supabase, která běží v Dockeru. Spustíte ji pomocí:
```bash
npx supabase start
```
*Tento příkaz stáhne potřebné Docker image (pokud je spouštěn poprvé), nastartuje postgres a další služby a automaticky aplikuje všechny migrace ze složky `supabase/migrations`.*

Po úspěšném spuštění uvidíte v terminálu výpis s adresami a klíči. Tyto klíče jsou již přednastavené v `.env.local`.

### Krok 4: Vytvoření administrátorského účtu a import dat
Po prvním spuštění databáze je potřeba vytvořit výchozího uživatele a naimportovat testovací produkty.

1. **Vytvoření admin účtu:**
   ```bash
   npx tsx scripts/create-admin.ts
   ```
   Tím se v databázi vytvoří administrátor s těmito přihlašovacími údaji:
   - **E-mail:** `admin@az-composites.cz`
   - **Heslo:** `AdminPassword123!`

2. **Import testovacích produktů:**
   ```bash
   npx tsx scripts/import-products.ts
   ```
   Tento skript naimportuje produkty z připraveného JSON šablony `data_imports/01_produkty_template.json` do tabulky `produkty`.

### Krok 5: Spusťte Next.js vývojový server
Nyní můžete spustit samotnou webovou aplikaci:
```bash
npm run dev
```
Tento příkaz spustí Next.js na portu **3001** (jak je definováno v `package.json`).

---

## 4. Důležité porty a adresy v lokálním prostředí

Jakmile vše běží, máte k dispozici následující rozhraní:

- **Webová aplikace:** [http://localhost:3001](http://localhost:3001)
- **Supabase Studio (GUI pro databázi):** [http://localhost:54323](http://localhost:54323)
  *(Zde můžete vizuálně prohlížet tabulky, spouštět SQL dotazy a spravovat uživatele)*
- **API URL (Kong):** `http://127.0.0.1:54321`

---

## 5. Další užitečné příkazy pro správu databáze

- **Kontrola stavu služeb:**
  ```bash
  npx supabase status
  ```
- **Zastavení databáze (data zůstanou zachována):**
  ```bash
  npx supabase stop
  ```
- **Zastavení databáze s promazáním dat:**
  Pokud chcete vypnout databázi a smazat lokální data (pro čistý start příště):
  ```bash
  npx supabase stop --backup
  ```
- **Kompletní reset databáze:**
  Smaže všechna data, znovu spustí všechny migrace od nuly a vyčistí databázi:
  ```bash
  npx supabase db reset
  ```
  *(Po resetu je nutné znovu spustit skripty pro vytvoření admina a import produktů v Kroku 4!)*
