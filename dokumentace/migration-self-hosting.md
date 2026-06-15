# Migrační Plán: Self-Hosting a Bezpečnost (Fáze 3.10) - Enterprise V4 (Comprehensive)

Tento dokument detailně popisuje strategii a postup pro přechod projektu AZ-Composites z lokálního vývoje na produkční Self-Hosted infrastrukturu postavenou na Proxmox VE. 

**Tato verze plánu (V4) je finální, komplexní a zahrnuje všechny technické detaily, bezpečnostní audity a budoucí vývojové workflow.**

## 1. Architektonický Přehled (Cílový Stav)

*   **Infrastruktura:** Proxmox VE (IP: `192.168.100.89` / Tailscale: `100.107.103.110`).
*   **Ingress (Zero Trust):** **Tailscale Funnel** vytvoří bezpečný šifrovaný tunel zevnitř serveru ven do sítě Tailscale. Tím odpadá nutnost otevírat porty na routeru.
*   **PaaS / Deployment:** **Coolify** (Self-Hosted Vercel alternativa) pro automatické stahování Docker obrazů (image) z GHCR.
*   **Databáze a Backend:** **Supabase** (Postgres 17) běžící přes Docker Compose. Zcela izolované na úrovni Docker sítí, bez publikovaných portů ven.

---

## 2. Realizované Kroky (Status: SUCCESS - Checkpoint 14.6.2026)

### 2.1. Infrastructure Tuning & Security
*   [x] **AppArmor Disabled:** Trvale vypnuto v GRUBu (`apparmor=0`), vyřešeny problémy s `Permission denied` v Dockeru.
*   [x] **Sítě:** UFW firewall nainstalován. Povoleny porty 22, 8000, 3000, 8081 a 5432 pro vnitřní i VPN provoz.
*   [x] **Storage:** Zrcadlený ZFS pool `zrcadlo` (439GB volno) namountován pro Supabase Storage.
*   [x] **PaaS:** Coolify funkční, server je označen jako **Healthy**.

### 2.2. Backend & Data Migration
*   [x] **Supabase Setup:** Instalace Supabase v `/opt/supabase`. Běží na **Postgres 17**.
*   [x] **Zero Data Loss Import:** Importováno 38 tabulek z MacBooku.
*   [x] **Auth Fix:** Opravena hesla vnitřních rolí (`supabase_auth_admin`, `authenticator`), aby služba Auth mohla komunikovat s DB.

### 2.3. Deployment
*   [x] **CI/CD Pipeline:** GitHub Actions vybudovány. Kód se automaticky builduje a pushuje do GHCR.
*   [x] **App Deployment:** Aplikace nasazena v Coolify z Docker Image.
*   [x] **Public Access:** Zprovozněn **Tailscale Funnel** na adrese `https://homeserver.taild83301.ts.net`.

---

## 3. Aktuální Otevřené Problémy (K řešení po zapnutí)

1.  **Coolify UI Unreachable:** Po posledním restartu se nedaří připojit na port 8000 (pravděpodobně reset UFW pravidel nebo port bindingu).
2.  **Application 500 Error:** Při přístupu přes Funnel vrací aplikace chybu 500.
    *   *Hypotéza:* Aplikace v kontejneru nedokáže oslovit Supabase API na `100.107.103.110:8081`. 
    *   *Nutná akce:* Změnit `NEXT_PUBLIC_SUPABASE_URL` v Coolify na vnitřní Docker IP nebo `http://supabase-kong:8000` v rámci Docker sítě.

---

## 4. Budoucí Kroky (Checklist dokončení)

8.  [ ] **Fix:** Zprovoznit Coolify UI (povolit port 8000 v UFW).
9.  [ ] **Fix:** Opravit 500 chybu v aplikaci (prověřit vnitřní síť Dockeru).
10. [ ] **Zálohy (Enterprise):** Implementace denních `pg_dump` šifrovaných (GPG) a odesílaných na S3.
11. [ ] **Monitoring:** Instalace **Uptime Kuma** pro sledování zdraví webu a DB.
12. [ ] **Security (Lockdown):** Zrušit `NOPASSWD` pro `mstarman` (pokud bylo mezitím obnoveno).
