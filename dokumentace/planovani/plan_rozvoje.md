# Strategický Plán Rozvoje a Implementace ERP/CRM (AZ-Composites)

> **Verze**: 2.0 — Aktualizace po CEO auditu ze dne 25. 6. 2026.

Tento dokument slouží jako archivovaný strategický a procesní audit rozvojového plánu společnosti **AZ-Composites**. Definuje roli vlastního softwaru jako sjednoceného ERP/CRM systému a detailně rozebírá časový harmonogram fází (Milestones), včetně integrace e-shopu, vzorkování a správy legislativní dokumentace. Rozvojový plán softwaru je podrobně rozpracován v samostatném dokumentu **`erp_crm_pipeline.md`**, který koresponduje s těmito fázemi a určuje priority vývoje.

---

## 1. ERP & CRM jako technologické jádro firmy

Pro dosažení ambice technologické špičky (úroveň Amazon / Rohlík) je klíčové, že **tento vyvíjený software je jediným zdrojem pravdy (Single Source of Truth)**. Sjednocuje v sobě:
* **CRM (Customer Relationship Management)**: Evidence B2B partnerů, obchodních příležitostí, schůzek, cenových nabídek a sledování testování vzorků (Sampling).
* **ERP (Enterprise Resource Planning)**: 
  * **PIM (Product Information Management)**: Databáze produktů, specifikací, šarží, technických (TDS) a bezpečnostních (SDS) listů.
  * **WMS (Warehouse Management System)**: Skladové zásoby, lokace, expirace, šarže a sledování pohybu zboží.
  * **Invoicing (Fakturace)**: Automatické generování dokladů (faktury, zálohy, nabídky) s napojením na platební brány a QR kódy.

### Napojení E-shopu
E-shop (spuštěný ve Fázi 3) **nebude mít vlastní izolovanou databázi produktů a skladů**. Bude přímou nadstavbou (Headless řešením) napojenou na databázi tohoto ERP/CRM softwaru. 
* Změna ceny nebo naskladnění v ERP se okamžitě projeví na e-shopu.
* Objednávka z e-shopu ihned zarezervuje konkrétní šarži v WMS a vygeneruje příslušné doklady.

---

## 2. Harmonogram rozvoje: Fáze a Milníky

### Milník 0 — Kick-off (Příprava a První doručení)
* **Termín**: 1. 6. až 31. 7.
* **Hlavní úkoly**:
  * [x] Definice a tvorba základního ceníku.
  * [x] Spuštění systému pro generování a správu SDS, TDS a etiket (Labels).
  * [x] Prvotní naskladnění produktů (fyzicky uloženo u jednoho ze zakladatelů).
  * [x] Zabezpečení obalových materiálů pro kompozity a chemii.
  * [x] Zpracování logistických procesů (Doprava – jak odesílat, ADR limity).
  * [x] Úspěšné doručení a vyfakturování první objednávky.
* **Provozní status**: Sklad je distribuovaný, testují se základní procesy toku objednávky.

---

### Milník 1 — Budování a Růst (Aktivní obchod a Příprava)
* **Termín**: 1. 8. až 30. 9.
* **Hlavní úkoly**:
  * [ ] **Aktivní B2B obchod**: Obchodní schůzky se zákazníky, zasílání cenových nabídek, důsledné follow-ups.
  * [ ] **Logistický provoz**: Pravidelné objednávání u dodavatelů a odesílání zboží zákazníkům.
  * [ ] **Finance**: Zavedení rutinního účetnictví a sledování profitability.
  * [ ] **Právní ochrana**: Registrace ochranné známky (Trademark) AZ-Composites — podat na ÚPV nejpozději v srpnu.
  * [ ] **Strategické plánování**: Detailní procesní plánování infrastruktury a příprava na škálování (navázání na Fázi 2).
  * [ ] **CRM Pipeline (VÝVOJ)**: Spuštění CRM modulu pro správu zákazníků a obchodních příležitostí — kontakty, pipeline stavů nabídek, plánování schůzek a follow-up. Minimální cíl: 30–50 aktivních B2B leads evidovaných v systému.
  * [ ] **Evidence vzorkování (VÝVOJ)**: Digitalizace procesu vzorkování v ERP — každý vzorek musí mít kartu s vazbou na zákazníka, šarži, datum odeslání, stav testu a automatický follow-up úkol. Tato data jsou strategickým aktivem firmy.
  * [ ] **Cash Flow Model (VÝVOJ)**: Implementace základního finančního modulu v ERP — přehled příjmů vs. výdajů, Runway (délka přežití firmy na aktuální hotovosti), Break-Even kalkulátor a sledování marží na úrovni produktu.
* **Provozní status**: Sklad zůstává u zakladatele, ale roste objem transakcí. Obchodní procesy se standardizují a digitalizují v ERP/CRM systému.

---

### Milník 2 — Stabilizace a Sjednocení (Fyzická a Právní konsolidace)
* **Termín**: 1. 10. až 31. 12.
* **Hlavní úkoly**:
  * [ ] **Sjednocení logistiky**: Pronájem profesionálního skladu a kanceláří. Přesun všech zásob od zakladatele do nového sjednoceného skladu.
  * [ ] **Právní transformace**: Založení společnosti **s.r.o.** a převod obchodních aktivit z OSVČ.
  * [ ] **Skladová expanze**: Rozšiřování skladových lokací a regálových systémů pro nové produktové řady.
  * [ ] **Rozšíření portfolia**: Přidávání dalších produktů a dodavatelů do PIM databáze.
  * [ ] **Marketing**: Spuštění cílených marketingových kampaní na podporu B2B brandu.
  * [ ] **AI implementace**: Širší integrace umělé inteligence (AI) – automatické vytěžování dodavatelských faktur a dodacích listů, podpora překladů legislativy.
  * [ ] **Vklad kapitálu**: Injekce dodatečného vlastního kapitálu přímo od zakladatelů pro financování expanze.

---

### Milník 3 — E-shop & Škálování (Plný provoz)
* **Termín**: od 1. 1. 2027 — **E-shop je od tohoto bodu hlavním strategickým fokusem**. Spuštění bude probíhat iterativně: MVP Q2/2027, full Headless verze Q3/2027.
* **Hlavní úkoly**:
  * [ ] **E-shop (Plný fokus od 1. 1. 2027)**: Vývoj a spuštění B2B/B2C e-shopové nadstavby přímo napojené na ERP databázi. MVP verze (katalog, košík, objednávka) v Q2/2027, Headless full-stack napojení na WMS/PIM/Fakturaci v Q3/2027.
  * [ ] **Kapitálové posílení**: Další finanční vklady zakladatelů na základě růstových potřeb.
  * [ ] **Zvýšení zásob**: Masivní nákup zásob pro okamžité vykrývání e-shopových objednávek (zajištění vysokého SLA).
  * [ ] **Profesionalizace týmu**: Přechod všech 3 zakladatelů na placené full-time / part-time úvazky hrazené přímo z cash flow a výnosů firmy.
  * [ ] **Další skladová expanze**: Optimalizace procesů vychystávání (picking) pro rychlé e-shopové expedice.
  * [ ] **AI konfigurátor (výhled)**: Zákaznický AI konfigurátor laminátu — zákazník zadá parametry (rozměry, teplota, zatížení), systém doporučí tkaninu, pryskyřici, množství a cenu na základě PIM a CRM dat.

---

## 3. Detailní procesní návrh klíčových modulů

### A. Evidence a sledování vzorků (Sampling)
Vzhledem k tomu, že první vzorky již byly úspěšně odeslány, je nutné proces digitalizovat v našem ERP/CRM:
1. **Karta vzorku**: V databázi se eviduje položka jako typ `vzorek` s vazbou na `kontakt_id` (zákazník) a `sarze_id` (přesná šarže odeslaného materiálu).
2. **Skladový odpis**: Systém automaticky sníží stav skladu (metráž tkaniny/váha pryskyřice) a zaeviduje nulový finanční pohyb s příznakem „Marketing - Vzorek“.
3. **Automatická notifikace**: Obchodníkovi se v CRM automaticky vygeneruje úkol pro follow-up po uplynutí doby potřebné na otestování (např. 14 dní).
4. **Technická zpětná vazba**: Výsledky testů (viskozita, kompatibilita, kvalita povrchu) se ukládají přímo k dané obchodní příležitosti pro budoucí technické reference.

### B. Modul dokumentace (SDS, TDS, CoC)
Tento modul zajišťuje právní bezchybnost prodeje kompozitů v EU:
* **SDS (Bezpečnostní listy)**: Systém umožňuje nahrát cizojazyčný originál, AI (Gemini) extrahuje piktogramy, H-věty a P-věty, přeloží sekce 1 až 16 do češtiny a vygeneruje legislativně validní PDF.
* **TDS (Technické listy)**: Ukládání fyzikálních a zpracovatelských vlastností produktů. Data jsou přístupná pro e-shop i pro generování PDF listů.
* **CoC (Certifikáty shody)**: Při expedici objednávky systém na jedno kliknutí vygeneruje atest shody pro expedované šarže.

### C. Finanční plánování mezd zakladatelů
Pro bezpečný přechod zakladatelů na placené úvazky (Milník 3) bude do modulu Fakturace implementován **Break-Even Simulator**. Ten na základě marží, fixních nákladů (nájem skladu, servery) a variabilních nákladů (doprava, obaly) vypočítá:
* Minimální nutný měsíční obrat pro pokrytí mezd.
* Požadovaný počet a průměrnou hodnotu objednávek (AOV).
* Aktuální stav Runway (doba, po kterou firma přežije s aktuální hotovostí).

---

## 4. Doporučení pro vedení společnosti (CEO Audit v2.0)

1. **Ochranná známka (Fáze 1)**: Podání přihlášky na Úřad průmyslového vlastnictví (ÚPV) neodkládejte. Průzkum a zápis trvá cca 3–5 měsíců. Podání v srpnu zaručí zápis před spuštěním e-shopu.
2. **CRM pipeline — okamžitě**: Do CRM systému zadejte prvních 30–50 potenciálních B2B zákazníků s kontakty a plánovaným datem prvního oslovení. Bez naplněné pipeline nebudete mít platící zákazníky v září.
3. **ADR smlouva s dopravcem**: Uzavřete ADR rámcovou smlouvu (DPD, Geis nebo DSV) ještě v červenci. Bez ní nemůžete legálně expedovat větší množství pryskyřic a katalyzátorů.
4. **Smlouva o nájmu skladu (Fáze 2)**: Při vyjednávání nájmu skladu v říjnu trvejte na doložce o **přednostním právu na pronájem sousedních prostor** nebo možnosti flexibilního rozšíření. Šetří to náklady na budoucí stěhování při růstu zásob.
5. **Registrace s.r.o. (začít v srpnu, ne v říjnu)**: Zahajte právní přípravu s.r.o. již v srpnu. Registrace trvá 6–8 týdnů — pokud začnete v říjnu, přijdete o provozní měsíc v nejkritičtějším období Fáze 2.
6. **Přesun skladu jako samostatný sprint**: Fyzický přesun zásob do nového skladu plánujte jako izolovaný operační sprint s předem oznámeným výpadkem. Zákazníci musí být informováni minimálně 2 týdny předem.
7. **Vklad kapitálu zakladatelů**: Všechny vklady zakladatelů (Fáze 2 a 3) evidujte v ERP jako *půjčku společníka* nebo *příplatek mimo základní kapitál*, což umožní jejich snadné a daňově optimální splacení zpět zakladatelům, jakmile firma dosáhne ziskovosti.
8. **Vzorkování = strategická databáze**: Každý vzorek odeslaný zákazníkovi bez záznamu v ERP je ztracená obchodní paměť. Evidence výsledků testů umožní v budoucnosti AI-asistované doporučování produktů.
