# KOMPLETNÍ ARCHIV: Self-Hosting na Proxmox (Legacy)

Tento dokument slouží jako kompletní technický záznam stavu k 14. 6. 2026. Obsahuje všechny konfigurace, které jsme na Proxmoxu odladili. Slouží jako "záložní plán", pokud by se firma v budoucnu rozhodla vrátit ke kompletnímu self-hostingu.

## 1. Konfigurace Prostředí (Environment Variables)
Tyto hodnoty jsou aktuálně nastaveny na Proxmoxu a v Coolify:

| Proměnná | Hodnota pro Proxmox |
| :--- | :--- |
| `DATABASE_URL` | `postgresql://supabase_admin:DB_PASS_f6fb03bf5d8d0baa17edc59f@10.0.1.1:5432/postgres` |
| `NEXT_PUBLIC_SUPABASE_URL` | `http://100.107.103.110:8081` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJhbm9uIiwKICAgICJpc3MiOiAic3VwYWJhc2UtZGVtbyIsCiAgICAiaWF0IjogMTY0MTc2OTIwMCwKICAgICJleHAiOiAxNzk5NTM1NjAwCn0.dc_X5iR_VP_qT0zsiyj_I_OZ2T9FtRU2BBNWN8Bu4GE` |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJzZXJ2aWNlX3JvbGUiLAogICAgImlzcyI6ICJzdXBhYmFzZS1kZW1vIiwKICAgICJpYXQiOiAxNjQxNzY5MjAwLAogICAgImV4cCI6IDE3OTk1MzU2MDAKfQ.DaYlNEoUrrEn2Ig7tqibS-PHK5vgusbcbo7X36XVt4Q` |

---

## 2. Technické Hardening Kroky (Provedeno na Proxmox)

### 2.1. Kernel (AppArmor Fix)
Aby Docker a Coolify na Proxmoxu fungovaly bez chyb "Permission Denied", bylo nutné vypnout AppArmor přímo v GRUBu:
`sed -i 's/GRUB_CMDLINE_LINUX_DEFAULT="quiet"/GRUB_CMDLINE_LINUX_DEFAULT="quiet apparmor=0"/' /etc/default/grub && update-grub`

### 2.2. Sítě (UFW & Iptables)
Povolení vnitřní komunikace pro Docker a Tailscale:
`iptables -I INPUT -p tcp --dport 22 -j ACCEPT` (a uloženo přes `iptables-persistent`).

### 2.3. Supabase Auth Fix
Při importu databáze došlo k přepsání hesel systémových rolí. Oprava provedena pomocí:
`ALTER USER supabase_auth_admin WITH PASSWORD 'DB_PASS_f6fb03bf5d8d0baa17edc59f';`

---

## 3. Nedokončené kroky (Budoucí checklist pro návrat)

9.  [ ] **Aplikace:** První úspěšný Build a Deploy Next.js aplikace v Coolify.
10. [ ] **Sítě:** Konfigurace domény (např. erp.az-composites.cz) v Cloudflare a nasazení SSL v Coolify.
11. [ ] **Zálohy (Enterprise):**
    *   Implementace denních `pg_dump` šifrovaných (GPG) a odesílaných na S3 (AWS/Backblaze).
    *   Nastavení Point-In-Time Recovery (PITR) pomocí archivace WAL do ZFS zrcadla.
12. [ ] **Monitoring:** Instalace **Uptime Kuma** pro sledování zdraví webu a DB (notifikace Slack/Email).

---

## 4. Závěrečný Bezpečnostní Audit (Lockdown)
Po případném návratu na Proxmox **MUSÍ** být provedeny tyto kroky:

### 4.1. Síťový Lockdown
*   [ ] **UFW Enable:** Znovu zapnout firewall (`ufw enable`).
*   [ ] **UFW Rules:** Ověřit, že porty 8000, 8081 a 5432 jsou povolené **pouze** pro rozhraní `tailscale0` a `docker0`.
*   [ ] **DB Port Isolation:** Ujistit se, že Postgres neposlouchá na `0.0.0.0:5432`, ale pouze na `127.0.0.1:5432`.

### 4.2. Oprávnění
*   [ ] **Sudo Security:** Smazat soubor `/etc/sudoers.d/mstarman` (zrušit NOPASSWD).
*   [ ] **Secrets Audit:** Prověřit, že v `.env` souborech nejsou žádná defaultní hesla.

---

## 5. Enterprise GitOps Workflow
*   **Místní vývoj:** MacBook (`npm run dev`).
*   **Migrace DB:** `supabase db diff` -> commit do gitu.
*   **CI/CD:** `git push origin main` -> GitHub Actions vybuildí image a pošle do GHCR -> Coolify na Proxmoxu jej spustí.
