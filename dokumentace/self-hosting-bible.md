# The Self-Hosting Bible: Proxmox, Coolify & Supabase Enterprise Setup

Tento dokument je "Biblí" a podrobným manuálem, který zachycuje reálné zkušenosti, "zákopové války" s jádrem Linuxu a finální vítěznou Enterprise architekturu při nasazování projektu AZ-Composites na vlastní hardware. Slouží jako ultimátní reference pro jakýkoliv další self-hosting projekt.

---

## 1. Architektura a Filozofie (Proč jsme to udělali takto)

Tato architektura byla navržena s důrazem na absolutní bezpečnost (Zero Trust) a spolehlivost (Immutable Artifacts), odpovídající standardům moderních technologických firem. Vyhnuli jsme se běžným "domácím" řešením (bastlení) ve prospěch robustních postupů.

### 1.1. Ingress a Síť (Cloudflare Tunnels místo Port Forwardingu)
*   **Zavržené řešení:** Klasický Port Forwarding (otevření portu 80/443 na routeru). Toto vystavuje veřejnou IP adresu serveru celému internetu, čímž se server stává terčem neustálého skenování a pokusů o průnik.
*   **Vítězné řešení (Zero Trust):** Cloudflare Tunnels (cloudflared). Na Proxmoxu běží malý démon, který navazuje bezpečné, odchozí spojení do sítě Cloudflare. Veškerý provoz z internetu směřující na naši doménu je nejprve filtrován na síti Cloudflare (WAF, DDoS ochrana) a až poté je propuštěn tunelem do serveru. Lokální router nemá žádné otevřené porty a IP adresa serveru zůstává utajena.

### 1.2. CI/CD Pipeline (GitHub Actions místo On-Server Buildu)
*   **Zavržené řešení (Nixpacks):** Stahovat zdrojový kód z gitu přímo na produkční server a nechat Coolify kompilovat aplikaci.
    *   *Proč to selhalo:* Proxmox je hypervizor s extrémně agresivním bezpečnostním modelem (AppArmor). Zakazuje procesům uvnitř kontejnerů sahat na vnitřní systémové prostředky hostitele (jako je Docker socket). Navíc kompilace zatěžuje CPU produkčního serveru.
*   **Vítězná Enterprise Architektura (Push Image):**
    1.  Vývoj probíhá lokálně na MacBooku.
    2.  Při `git push` servery GitHubu (GitHub Actions) zdarma zkompilují aplikaci do "neměnného" Docker obrazu (Immutable Artifact) a uloží ji do GitHub Container Registry (GHCR).
    3.  Coolify na Proxmoxu funguje pouze jako "hloupý spouštěč" – stáhne si hotový obraz z GHCR a nahodí ho za mili-sekundu. Obešli jsme tím veškeré kompilace a restrikce jádra.

---

## 2. Hardening a Příprava Proxmoxu (Hostitel)

Než vůbec začneme uvažovat o aplikacích, musíme "vyjednávat" s Proxmoxem.

### 2.1. Vypnutí AppArmoru (The Final Boss)
Proxmox natvrdo vnucuje Dockeru restrikce, které rozbijí interní komunikaci Coolify i Supabase. Obešli jsme to na úrovni zavaděče jádra:
```bash
sed -i 's/GRUB_CMDLINE_LINUX_DEFAULT="quiet"/GRUB_CMDLINE_LINUX_DEFAULT="quiet apparmor=0"/' /etc/default/grub
update-grub
reboot
```

### 2.2. Vnitřní síťové mosty (Docker vs. Tailscale)
Po každém restartu serveru iptables zahazovaly vnitřní pakety z Dockeru na port 22. Trvale jsme tyto "dveře zevnitř" otevřeli:
```bash
iptables -I INPUT -p tcp --dport 22 -j ACCEPT
apt-get install -y iptables-persistent
netfilter-persistent save
```

### 2.3. Optimalizace Disků (Hybrid)
Fyzický audit ukázal, že server má rychlé NVMe (s ext4) a velké HDD jako ZFS zrcadlo.
*   **Databáze (Rychlost):** Nechali jsme ji běžet na NVMe (`/opt/supabase`).
*   **Média a Zálohy (Kapacita):** Tyto složky jsme nalinkovali jako volume do ZFS zrcadla (`/zrcadlo/...`).

---

## 3. Nasazení Backend Stacku (Supabase)

Supabase běží odděleně od Coolify pro zajištění maximální datové integrity.

### 3.1. Příprava
Stáhli jsme oficiální `docker-compose.yml` z repozitáře Supabase do `/opt/supabase`. Provedli jsme upgrade na **Postgres 17**, aby verze odpovídala lokálnímu vývoji na MacBooku.

### 3.2. Řešení konfliktů a tuning
*   **Porty:** Coolify obsadilo port 8000. Supabase API bránu (Kong) jsme v `.env` posunuli na **8081**.
*   **RAM Tuning:** V `docker-compose.yml` jsme u `supabase-db` nastavili `command: postgres -c shared_buffers=4GB -c work_mem=32MB`.

### 3.3. Import Dat a "The Auth Trap"
Import proveden příkazem:
`cat dump.sql | docker exec -i supabase-db psql -U supabase_admin -d postgres`

**Kritická chyba po importu:** Natažení dumpu přepsalo vnitřní hesla rolí v Postgresu. Služba `supabase-auth` se následně nedokázala k DB připojit (Crash loop).
**Oprava:** Museli jsme natvrdo přepsat hesla pro vnitřní uživatele zpět na to, které očekává `.env` soubor:
```sql
ALTER USER supabase_auth_admin WITH PASSWORD 'nove_heslo_z_env';
ALTER USER authenticator WITH PASSWORD 'nove_heslo_z_env';
```

---

## 4. Nasazení Platformy (Coolify)

Coolify je naše řídící věž, která zprostředkovává aplikaci světu pomocí vnitřní proxy (Traefik).

### 4.1. Instalace a Opravy
1.  Oficiální curl skript často spadne, pokud neběží Docker. Museli jsme ho křísit manuálně.
2.  Základní konfigurační port Coolify je uvnitř kontejneru 8080.
3.  V Coolify UI jsme jako IP adresu serveru nastavili vnitřní Docker Gateway `10.0.1.1` (nebo Tailscale `100.107.103.110`), aby prošla validace spojení bez timeoutů.

### 4.2. Propojení s GitHubem
Využili jsme **GitHub App Integration** (Automated Setup). Při nastavování endpointu jsme GitHub donutili "zavolat" na naši veřejnou IP (případně jsme to u "neviditelných" serverů prováděli přes Tailscale endpoint).

---

## 5. Vývojové Workflow (CI/CD GitOps)

Zahození Nixpacks (auto-builderu) byla nejlepší volba. Vytvořili jsme neprůstřelnou dálnici mezi MacBookem a Proxmoxem.

### Krok 1: Multi-stage Dockerfile
Vytvořili jsme `Dockerfile` ve složce `system`. Zásadní bylo přidat do Next.js konfigurace parametr `output: "standalone"`, jinak obraz neobsahoval potřebné soubory.

### Krok 2: GitHub Actions
Ve složce `.github/workflows/deploy.yml` jsme nastavili pipeline, která:
1.  Sleduje git push do větve `main`.
2.  Vloží do buildu tajné proměnné z GitHub Secrets (např. `NEXT_PUBLIC_SUPABASE_URL`).
3.  Uloží hotový, odlehčený obraz do GitHub Container Registry (GHCR).

### Krok 3: Coolify jako Runner
V Coolify jsme založili projekt jako **Docker Image**.
*   **Image:** `ghcr.io/martinstar77/az-composite-system:latest`
*   **Ports:** `3000`
*   Vložili jsme Supabase proměnné (hesla, JWT, URL) do sekce Variables.
Po kliknutí na **Deploy** si Coolify jen stáhne hotový balíček a ihned ho spustí.

---

## 6. Závěr a Udržitelnost

Tento stack přežije výpadky proudu, snese masivní zátěž (díky ZFS/NVMe hybridu a 4GB RAM pro DB) a jeho nasazování je zcela plně automatizované. 

**Hlavní ponaučení pro budoucí projekty:**
1.  Na Proxmoxu nikdy nestavět kód přímo (buildovat jinde, nasazovat obrazy).
2.  Vždy vypnout AppArmor pro Docker na úrovni GRUBu.
3.  Po importu databáze vždy zkontrolovat synchronizaci hesel interních rolí (`supabase_auth_admin`, atd.).
