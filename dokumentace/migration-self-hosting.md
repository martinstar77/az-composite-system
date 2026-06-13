# Migrační Plán: Self-Hosting a Bezpečnost (Fáze 3.10) - Enterprise V4 (Comprehensive)

Tento dokument detailně popisuje strategii a postup pro přechod projektu AZ-Composites z lokálního vývoje na produkční Self-Hosted infrastrukturu postavenou na Proxmox VE. 

**Tato verze plánu (V4) je finální, komplexní a zahrnuje všechny technické detaily, bezpečnostní audity a budoucí vývojové workflow.**

## 1. Architektonický Přehled (Cílový Stav)

*   **Infrastruktura:** Proxmox VE (IP: `192.168.100.89` / Tailscale: `100.107.103.110`).
*   **WAF & Edge:** **Cloudflare** jako první linie obrany (DDoS ochrana, cachování statiky, skrytí skutečné IP Proxmoxu).
*   **PaaS / Deployment:** **Coolify** (Self-Hosted Vercel alternativa) pro automatické CI/CD nasazování Next.js z gitu a správu reverzní proxy (Traefik).
*   **Databáze a Backend:** **Supabase** (Postgres 17) běžící přes Docker Compose. Zcela izolované na úrovni Docker sítí, bez publikovaných portů ven.

---

## 2. Realizované Kroky (Status: SUCCESS)

### 2.1. Infrastructure Tuning & Security
*   [x] **Sítě:** Instalace a konfigurace UFW firewallu (Tailscale bypass, Cloudflare only). *(Aktuálně neaktivní pro ladění, viz bod 6.1)*.
*   [x] **Storage:** Zrcadlený ZFS pool `zrcadlo` (439GB volno) úspěšně namountován pro Supabase Storage.
*   [x] **PaaS:** Coolify úspěšně nainstalováno a opraveno (AppArmor výjimky, Port 8080 fix). Server je v Coolify označen jako **Healthy**.
*   [x] **SSH Hardening:** Přístup pro Coolify zajištěn přes RSA klíče, mstarman má `sudo` bez hesla (dočasně).

### 2.2. Backend & Data Migration
*   [x] **Supabase Setup:** Instalace Supabase v `/opt/supabase`. Upgrade na **Postgres 17** (shodný s MacBookem).
*   [x] **Port Conflict Fix:** Supabase Kong přesunut na port **8081**, aby nekolidoval s Coolify (8000).
*   [x] **DB Tuning:** Postgres nastaven na `shared_buffers=4GB`.
*   [x] **Zero Data Loss Import:** Úspěšný import 38 tabulek a dat z MacBooku (`az_composites_dump.sql`).

---

## 3. Aktuální Fáze: Krok 8 - Nasazení Aplikace (Next.js)

### 3.1. Připojení GitHubu
1.  V Coolify -> **Sources** -> Přidat **GitHub App**.
2.  Autorizovat přístup k repozitáři `az-composites`.

### 3.2. Konfigurace Prostředí (Environment Variables)
Při vytváření nového Resource (Next.js) použít tyto produkční hodnoty:

| Proměnná | Hodnota pro Proxmox |
| :--- | :--- |
| `DATABASE_URL` | `postgresql://supabase_admin:DB_PASS_f6fb03bf5d8d0baa17edc59f@10.0.1.1:5432/postgres` |
| `NEXT_PUBLIC_SUPABASE_URL` | `http://100.107.103.110:8081` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...4GE` |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...t4Q` |

---

## 4. Budoucí Kroky (Checklist dokončení)

9.  [ ] **Aplikace:** První úspěšný Build a Deploy Next.js aplikace v Coolify.
10. [ ] **Sítě:** Konfigurace domény (např. erp.az-composites.cz) v Cloudflare a nasazení SSL v Coolify.
11. [ ] **Zálohy (Enterprise):**
    *   Implementace denních `pg_dump` šifrovaných (GPG) a odesílaných na S3 (AWS/Backblaze).
    *   Nastavení Point-In-Time Recovery (PITR) pomocí archivace WAL do ZFS zrcadla.
12. [ ] **Monitoring:** Instalace **Uptime Kuma** pro sledování zdraví webu a DB (notifikace Slack/Email).

---

## 5. Závěrečný Bezpečnostní Audit (Lockdown)

Po dokončení migrace **MUSÍ** být provedeny tyto kroky, aby byl systém bezpečný:

### 5.1. Síťový Lockdown
*   [ ] **UFW Enable:** Znovu zapnout firewall (`ufw enable`).
*   [ ] **UFW Rules:** Ověřit, že porty 8000, 8081 a 5432 jsou povolené **pouze** pro rozhraní `tailscale0` a `docker0`. Z veřejné IP nesmí být vidět nic kromě 80/443 (pro Cloudflare).
*   [ ] **DB Port Isolation:** Ujistit se, že Postgres v `docker-compose.yml` neposlouchá na `0.0.0.0:5432`, ale pouze na `127.0.0.1:5432`.

### 5.2. Oprávnění a AppArmor
*   [ ] **Sudo Security:** Smazat soubor `/etc/sudoers.d/mstarman` (zrušit NOPASSWD).
*   [ ] **AppArmor Revision:** Zkusit znovu zapnout AppArmor a vytvořit výjimku jen pro konkrétní Docker kontejnery, místo globálního vypnutí.
*   [ ] **Secrets Audit:** Prověřit, že v `.env` souborech nejsou žádná defaultní hesla a že tyto soubory nejsou v Gitu.

---

## 6. Enterprise GitOps Workflow (Budoucí Vývoj)

### 6.1. Development Pipeline
*   **Místní vývoj (MacBook):** Programování, `npm run dev`, testování s lokální Supabase (testovací data).
*   **Migrace Databáze:** Jakákoliv změna schématu se musí dít přes migrační skripty ve složce `supabase/migrations/`.
*   **CI/CD:** `git push origin main` -> Automatický build v Coolify na Proxmoxu.

### 6.2. Správa Produkční Databáze
*   Nikdy neměnit tabulky ručně přes UI.
*   Používat `supabase db diff` pro generování změn.
*   Deploy migrací provádět buď přes Coolify (před-deploy skript), nebo ručně přes Tailscale.

---

## Shrnutí Postupu (Final Checklist)

1. [x] **Sítě:** Instalace a konfigurace UFW firewallu.
2. [x] **Storage:** Nalezení mountpointu pro ZFS zrcadlo.
3. [x] **PaaS:** Instalace Coolify a oprava AppArmor/Portů.
4. [x] **Backend:** Příprava Supabase Dockeru s Volume routingem (ZFS).
5. [x] **Backend:** Tuning Postgres konfigurace (RAM 4GB, PG 17).
6. [x] **Migrace:** Export DB z MacBooku a úspěšný import na Proxmox.
7. [ ] **Aplikace:** Propojení s GitHubem a první produkční Build.
8. [ ] **Sítě:** Cloudflare WAF konfigurace a SSL.
9. [ ] **Zálohy:** PITR a S3 automatizace.
10. [ ] **Monitoring:** Uptime Kuma setup.
11. [ ] **Security:** Finální Lockdown (UFW zapnout, Sudo heslo zapnout).
