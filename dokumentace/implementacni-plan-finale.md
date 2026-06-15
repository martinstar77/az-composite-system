# Finální Implementační Plán: Zálohy, Bezpečnost a Publikace (Strict Order)

Tento dokument slouží jako podrobný krok-za-krokem návod pro dokončení migrace. Vychází z architektury popsané v `self-hosting-bible.md`.

**DŮLEŽITÉ UPOZORNĚNÍ K POSLOUPNOSTI:**
Fáze jsou seřazeny podle principu "Security First". Databáze musí být uzamčena (RLS) a server musí mít zvednuté štíty (UFW) **JEŠTĚ PŘEDTÍM**, než vytvoříme tunel do veřejného internetu.

---

## FÁZE 1: Zabezpečení Databáze a Aplikace (Database Hardening)
*Cíl: Zamezit neoprávněnému přístupu k datům na aplikační i databázové vrstvě (Ochrana zevnitř).*

### Krok 1.1: Row Level Security (RLS)
Supabase (Postgres) standardně nechává nově vytvořené tabulky otevřené. Pokud je získána adresa API a Anon klíč, kdokoliv může data číst/mazat.
1.  **Ověření:** V Supabase Studiu zkontrolovat všechny tabulky ve schématu `public`.
2.  **Aktivace:** Na všechny produkční tabulky (např. `produkty`, `dodavatele`) aplikovat `ALTER TABLE tabulka ENABLE ROW LEVEL SECURITY;`.
3.  **Politiky (Policies):** Vytvořit a otestovat striktní pravidla (např. čtení pro `authenticated` uživatele, zápis pouze pro roli `admin`).

### Krok 1.2: Ochrana API Klíčů (Code Audit)
1.  Zkontrolovat zdrojový kód Next.js, zda nikde neuniká `SUPABASE_SERVICE_ROLE_KEY`. Tento klíč smí být použit **výhradně** v backendových API routách (Server Actions/Edge Functions).

---

## FÁZE 2: Finální Bezpečnostní Lockdown (Server Hardening)
*Cíl: Zamknout server před světem a zamezit Dockeru v děravění firewallu (Ochrana zvenku).*

### Krok 2.1: Docker Firewall Protection
Docker standardně ignoruje UFW a otevírá porty napřímo v iptables. To musíme zamezit.
1.  Ověřit, že v souboru `/etc/docker/daemon.json` je nastaveno `"iptables": false`, aby Docker nemohl obejít UFW.
2.  Na Proxmoxu nastavit defaultní pravidla:
    ```bash
    ufw default deny incoming
    ufw default allow outgoing
    ```
3.  Povolit Tailscale (Admin Cesta):
    ```bash
    ufw allow in on tailscale0
    ```

### Krok 2.2: Oprávnění a Uživatelé
1.  Zrušit možnost používat `sudo` bez hesla pro uživatele `mstarman` (ochrana proti kompromitaci účtu):
    ```bash
    rm /etc/sudoers.d/mstarman
    ```
2.  Zapnout UFW firewall: `ufw enable`.

---

## FÁZE 3: Publikace do Internetu (Cloudflare Tunnels - Safe CNAME Method)
*Cíl: Zpřístupnit uzamčenou aplikaci na subdoméně (např. system.az-composite.cz) bez narušení existujícího webu na Vercelu a firemních e-mailů u Wedosu. Zcela bez otevírání portů na routeru.*

### Krok 3.1: Vytvoření Cloudflare Tunelu (Na Proxmoxu)
Cloudflare Tunel vytvoří odchozí šifrované spojení ze serveru ven, takže náš UFW firewall může zůstat zamčený.
1.  Přihlásit se na [Cloudflare.com](https://www.cloudflare.com/) (nebo vytvořit účet zdarma).
2.  V levém menu přejít do sekce **"Zero Trust"** -> **"Networks"** -> **"Tunnels"**.
3.  Kliknout na **"Create a tunnel"**. Vybrat **"Cloudflared"**.
4.  Pojmenovat ho např. `az-proxmox-tunnel`.
5.  Zvolit prostředí **"Docker"**.
6.  Cloudflare vygeneruje dlouhý příkaz začínající `docker run cloudflare/cloudflared...`. **Zkopírovat tento příkaz.**
7.  Přihlásit se na Proxmox Shell (jako `root`) a příkaz spustit.
8.  V Cloudflare dashboardu se status tunelu změní na **"Healthy"** (Zelená).

### Krok 3.2: Nastavení směrování a zisk CNAME (Na Cloudflare)
1.  V detailu běžícího tunelu kliknout na záložku **"Public Hostname"**.
2.  Zde *nebudeme* vybírat vaši doménu ze seznamu (protože jsme nepřevedli nameservery). Vytvoříme tzv. "External CNAME".
3.  Pokud to Cloudflare Zero Trust vyžaduje, přidáme doménu `az-composite.cz` do Cloudflare jen jako "DNS-only" (bez převodu nameserverů) nebo využijeme přímou CNAME hodnotu tunelu, kterou nám Cloudflare přidělí (např. `f83j-29kd.cfargotunnel.com`).
4.  Jako cílovou (Origin) službu nastavíme: 
    *   Type: `HTTP`
    *   URL: `100.107.103.110:3000` (Tailscale IP, kde naslouchá Coolify Proxy).

### Krok 3.3: Nasměrování Subdomény (Ve Wedosu)
Tento krok propojí vaši veřejnou doménu s tunelem.
1.  Přihlásit se do administrace **Wedos** (`klient.wedos.cz`).
2.  Přejít na **Domény** -> `az-composite.cz` -> **DNS záznamy** (NE "Změna DNS serverů"!).
3.  Přidat nový záznam:
    *   **Název:** `system` (nebo `erp`, `portal` - vytvoří `system.az-composite.cz`)
    *   **Typ:** `CNAME`
    *   **Data:** Zkopírovaná adresa tunelu od Cloudflare (např. `f83j-29kd.cfargotunnel.com`).
4.  Uložit změny a počkat (15-60 minut) na propsání DNS v internetu.

### Krok 3.4: Finální Validace
1.  **Cesta A (Veřejnost):** Zkusit načíst `https://system.az-composite.cz`. Musí fungovat bez zapnutého Tailscale na klientovi.
2.  **Cesta B (Admin):** Zkusit SSH k serveru (`ssh mstarman@100.107.103.110`). Musí fungovat POUZE se zapnutým Tailscale.

---

## FÁZE 4: Enterprise Zálohy (Point-In-Time Recovery & S3)
*Cíl: Zajistit automatickou obnovitelnost dat.*

### Krok 4.1: S3 a WAL-G Konfigurace
1.  Vytvořit kbelík na AWS S3 nebo Backblaze B2 a vygenerovat klíče.
2.  Na Proxmoxu v adresáři `/opt/supabase/docker/.env` nastavit S3 klíče.
3.  Aktivovat `wal_level = replica` a `archive_mode = on` v konfiguraci Postgresu.
4.  Vytvořit cron job na Proxmoxu pro noční base backup a průběžné odesílání WAL logů (každých 5 minut).
