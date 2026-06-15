# Supabase MCP: Průvodce Konfigurací pro AZ-Composites

Tento dokument popisuje, jak propojit AI asistenty (Antigravity IDE, Cursor) přímo s vaší Supabase databází pomocí MCP (Model Context Protocol). MCP umožňuje AI přímý přístup ke schématu, datům a nástrojům pro správu databáze.

---

## Co MCP umožňuje

Jakmile je MCP nakonfigurováno, AI asistent dokáže:
- 📋 Číst strukturu databáze (tabulky, sloupce, indexy)
- 🔍 Spouštět SQL dotazy pro analýzu dat
- ✏️ Generovat a aplikovat migrační soubory
- 🔒 Kontrolovat a navrhovat RLS (Row Level Security) politiky
- 📊 Analyzovat výkon dotazů

---

## Metoda 1: Hosted OAuth (Doporučeno pro Antigravity IDE)

### Jak nastavit

1. **Otevřete MCP konfigurace** v Antigravity IDE:
   - Klikněte na `...` (tři tečky) v panelu agenta
   - Vyberte **Manage MCP Servers**
   - Klikněte na **View raw config**

2. **Přidejte Supabase server** do konfiguračního souboru (`mcp_config.json`):

```json
{
  "mcpServers": {
    "supabase": {
      "type": "http",
      "url": "https://mcp.supabase.com/mcp"
    }
  }
}
```

   > **Pro produkci (bezpečnější – read-only):**
   > ```json
   > {
   >   "mcpServers": {
   >     "supabase": {
   >       "type": "http",
   >       "url": "https://mcp.supabase.com/mcp?read_only=true"
   >     }
   >   }
   > }
   > ```

3. **Uložte** a **restartujte** IDE.

4. **Autentizace:** IDE vás vyzve k přihlášení přes browser (Supabase OAuth) – stačí schválit a propojení je hotovo.

5. **Ověření:** Zeptejte se AI: *"Jaké tabulky jsou v mé databázi?"* – AI by měla vrátit seznam tabulek z vašeho projektu.

---

## Metoda 2: Lokální NPX Server (s Personal Access Token)

Tato metoda je vhodná, pokud chcete přesně kontrolovat, ke kterému projektu má AI přístup.

### Krok 1: Získat Personal Access Token

1. Přihlaste se na [supabase.com/dashboard/account/tokens](https://supabase.com/dashboard/account/tokens)
2. Klikněte na **Generate new token**
3. Pojmenujte ho `az-composites-mcp` a zkopírujte vygenerovaný token (`sbp_...`)

### Krok 2: Konfigurace MCP

```json
{
  "mcpServers": {
    "supabase": {
      "command": "npx",
      "args": [
        "-y",
        "@supabase/mcp-server-supabase@latest",
        "--project-ref",
        "natwtoqreniqupbvulso"
      ],
      "env": {
        "SUPABASE_ACCESS_TOKEN": "sbp_xxxxxxxxxxxxxxxx"
      }
    }
  }
}
```

> ⚠️ **NIKDY neukládejte Personal Access Token do Git repozitáře!** Použijte proměnnou prostředí nebo hesla managera.

---

## Bezpečnostní Doporučení

| Prostředí | Doporučení |
|---|---|
| Lokální vývoj | Plný přístup (read + write) |
| Staging | Read + write, ale separátní projekt |
| Produkce | **Read-only** (`?read_only=true`) |
| Sdílený tým | Každý vývojář má vlastní PAT |

---

## Specifika projektu AZ-Composites

- **Project Ref:** `natwtoqreniqupbvulso`
- **Region:** Frankfurt (eu-west-1)
- **Pooler URL:** `aws-0-eu-west-1.pooler.supabase.com`
- **Databáze:** PostgreSQL 17 (dle self-hosting bible)

### Příklady dotazů pro AI s MCP

Po nakonfigurování MCP můžete AI pokládat přirozeným jazykem:

- *"Zkontroluj, zda jsou všechny tabulky chráněné RLS polítikami"*
- *"Vytvoř migraci pro přidání sloupce `poznamka` do tabulky `produkty`"*
- *"Kolika produktů chybí kategorie?"*
- *"Jaký je aktuální kurz EUR z tabulky `historie_kurzu`?"*

---

## Troubleshooting

**Problem:** MCP server není aktivní (červená/žlutá ikona)
- Zkontrolujte, zda je konfigurace validní JSON
- Restartujte IDE
- Ověřte autentizaci: OAuth session mohla expirovat

**Problem:** AI nevidí správný projekt
- Přidejte `?project_ref=natwtoqreniqupbvulso` do URL (Metoda 1)
- Nebo použijte `--project-ref natwtoqreniqupbvulso` v args (Metoda 2)

**Problem:** Permission denied na write operace
- Odstraňte `?read_only=true` parametr (pokud byl nastaven)
- Zkontrolujte, že váš Supabase účet má Owner/Admin roli v projektu