import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const CREATOR_ID = '834df162-22a7-479a-983a-32fc99b5ccd0'; // filip.klier@azcomposite.com

// ─────────────────────────────────────────────
// PROJEKT + MILNÍKY — plan_rozvoje.md v2.0
// Aktualizace: 25. 6. 2026 (CEO audit)
// ─────────────────────────────────────────────

const PROJEKT = {
  nazev: 'Vznik firmy',
  popis:
    'Kompletní strategický plán pro založení, růst, stabilizaci a technický rozvoj společnosti AZ-Composites. ' +
    'Zahrnuje 4 milníky od Kick-off (červen 2026) po plný e-shop a škálování (2027). ' +
    'Plán koresponduje s vývojovým pipeline ERP/CRM systému (viz erp_crm_pipeline.md).',
  stav: 'active',
  barva: '#8A0485',
  datum_zahajeni: '2026-06-01',
  datum_ukonceni: '2027-09-30',
};

const MILNIKY = [
  {
    nazev: 'Milník 0 — Kick-off',
    popis: `**Termín:** 1. 6. – 31. 7. 2026
**Provozní status:** Sklad distribuovaný u zakladatele, testují se základní procesy toku objednávky.

### Hlavní úkoly
- [x] Definice a tvorba základního ceníku
- [x] Spuštění systému pro generování a správu SDS, TDS a etiket (Labels)
- [x] Prvotní naskladnění produktů (fyzicky uloženo u jednoho ze zakladatelů)
- [x] Zabezpečení obalových materiálů pro kompozity a chemii
- [x] Zpracování logistických procesů (Doprava – jak odesílat, ADR limity)
- [x] Úspěšné doručení a vyfakturování první objednávky`,
    stav: 'in_progress',
    priorita: 'critical',
    datum_zahajeni: '2026-06-01',
    datum_splatnosti: '2026-07-31',
    progres_procenta: 90,
    poradi: 0,
  },
  {
    nazev: 'Milník 1 — Budování a Růst',
    popis: `**Termín:** 1. 8. – 30. 9. 2026
**Provozní status:** Sklad zůstává u zakladatele, roste objem transakcí. Obchodní procesy se standardizují a digitalizují v ERP/CRM.

### Obchod & Provoz
- [ ] Aktivní B2B obchod: Obchodní schůzky se zákazníky, zasílání cenových nabídek, důsledné follow-ups
- [ ] Logistický provoz: Pravidelné objednávání u dodavatelů a odesílání zboží zákazníkům
- [ ] Finance: Zavedení rutinního účetnictví a sledování profitability

### Právní & Strategické
- [ ] Registrace ochranné známky (Trademark) AZ-Composites – podat na ÚPV nejpozději v srpnu
- [ ] Zahájit právní přípravu s.r.o. (registrace trvá 6–8 týdnů – nečekat na říjen!)
- [ ] Strategické plánování infrastruktury a příprava na škálování (navázání na Fázi 2)

### ERP/CRM Vývoj (VÝVOJ)
- [ ] **CRM Pipeline:** Spuštění CRM modulu – kontakty, pipeline stavů nabídek, plánování schůzek a follow-up. Cíl: 30–50 aktivních B2B leads v systému
- [ ] **Evidence vzorkování:** Digitalizace vzorků v ERP – každý vzorek = karta s vazbou na zákazníka, šarži, datum odeslání, stav testu a automatický follow-up úkol po 14 dnech
- [ ] **Cash Flow Model:** Implementace finančního modulu – Runway, Break-Even kalkulátor, marže na úrovni produktu

### ADR & Logistika
- [ ] Uzavřít ADR rámcovou smlouvu s dopravcem (DPD, Geis nebo DSV) – nutné pro expedici pryskyřic a katalyzátorů`,
    stav: 'planned',
    priorita: 'high',
    datum_zahajeni: '2026-08-01',
    datum_splatnosti: '2026-09-30',
    progres_procenta: 0,
    poradi: 1,
  },
  {
    nazev: 'Milník 2 — Stabilizace a Sjednocení',
    popis: `**Termín:** 1. 10. – 31. 12. 2026
**Provozní status:** Fyzická a právní konsolidace firmy. Přesun do sjednoceného skladu, transformace na s.r.o.

> ⚠️ **Důležité:** S.r.o. zahájit v srpnu (Fáze 1), ne až v říjnu! Přesun skladu plánovat jako samostatný sprint s předem oznámeným výpadkem pro zákazníky (min. 2 týdny předem).

### Logistika & Sklad
- [ ] Pronájem profesionálního skladu a kanceláří (trvat na doložce o přednostním právu na rozšíření)
- [ ] Přesun všech zásob od zakladatele do sjednoceného skladu (izolovaný operační sprint)
- [ ] Rozšiřování skladových lokací a regálových systémů pro nové produktové řady

### Právní transformace
- [ ] Dokončení registrace s.r.o. a převod obchodních aktivit z OSVČ
- [ ] Převod skladových zásob (prodej OSVČ → s.r.o. nebo nepeněžitý vklad) – ERP fakturační snapshot + uzávěrka

### Rozšíření portfolia & Marketing
- [ ] Přidávání dalších produktů a dodavatelů do PIM databáze
- [ ] Spuštění cílených marketingových kampaní na podporu B2B brandu
- [ ] Rozvoj marketingové infrastruktury

### AI & Technologie
- [ ] Širší integrace AI: automatické vytěžování dodavatelských faktur a dodacích listů
- [ ] AI podpora překladů legislativy (SDS/TDS z angličtiny/němčiny)

### Finance
- [ ] Injekce dodatečného vlastního kapitálu od zakladatelů (evidovat jako půjčka společníka nebo příplatek mimo základní kapitál)`,
    stav: 'planned',
    priorita: 'medium',
    datum_zahajeni: '2026-10-01',
    datum_splatnosti: '2026-12-31',
    progres_procenta: 0,
    poradi: 2,
  },
  {
    nazev: 'Milník 3 — E-shop & Škálování',
    popis: `**Termín:** od 1. 1. 2027 (plný fokus)
**Provozní status:** E-shop je od tohoto bodu hlavním strategickým fokusem. Spuštění probíhá iterativně.

### E-shop Roadmap (Headless – napojení na ERP databázi)
- [ ] **Q1/2027 (Jan–Mar):** API vrstva pro produkty, ceny a real-time dostupnost z WMS
- [ ] **Q2/2027 (Apr–Jun):** MVP e-shop – Katalog + Košík + B2B objednávka + Napojení fakturace
- [ ] **Q3/2027 (Jul–Sep):** Full Headless – šarže na e-shopu, SDS/TDS ke stažení, COC automaticky
- [ ] **Q4/2027 (Oct–Dec):** AI konfigurátor laminátu – zákazník zadá parametry, systém doporučí produkt + kalkulaci spotřeby

### Tým & Finance
- [ ] Přechod všech 3 zakladatelů na placené full-time / part-time úvazky hrazené z cash flow firmy
- [ ] Kapitálové posílení: Další finanční vklady zakladatelů na základě růstových potřeb

### Sklad & Zásoby
- [ ] Masivní nákup zásob pro okamžité vykrývání e-shopových objednávek (zajištění vysokého SLA)
- [ ] Další skladová expanze a optimalizace procesů vychystávání (picking) pro e-shopové expedice

### AI & Zákaznické funkce
- [ ] AI konfigurátor laminátu: zákazník zadá rozměry, teplotu, zatížení → systém doporučí tkaninu + pryskyřici + množství + cenu
- [ ] Zákaznický portál: B2B zákazník vidí historii objednávek, faktury, dostupné vzorky`,
    stav: 'planned',
    priorita: 'medium',
    datum_zahajeni: '2027-01-01',
    datum_splatnosti: '2027-09-30',
    progres_procenta: 0,
    poradi: 3,
  },
];

async function seed() {
  console.log('\n🚀 Starting seed of development plan (v2.0)...\n');

  // ─── 1. Upsert projektu ───────────────────────────────────────────────────
  const { data: existingProj } = await supabase
    .from('projekty_planovani')
    .select('id')
    .eq('nazev', PROJEKT.nazev)
    .is('deleted_at', null)
    .maybeSingle();

  let projektId = existingProj?.id;

  if (!projektId) {
    console.log("📁 Project 'Vznik firmy' not found — creating...");
    const { data: newProj, error } = await supabase
      .from('projekty_planovani')
      .insert({ ...PROJEKT, vytvoril_id: CREATOR_ID, upravil_id: CREATOR_ID })
      .select('id')
      .single();

    if (error || !newProj) {
      console.error('❌ Error creating project:', error);
      process.exit(1);
    }
    projektId = newProj.id;
    console.log(`✅ Project created: ${projektId}`);
  } else {
    console.log(`📁 Project exists (${projektId}) — updating metadata...`);
    const { error } = await supabase
      .from('projekty_planovani')
      .update({ ...PROJEKT, upravil_id: CREATOR_ID })
      .eq('id', projektId);

    if (error) console.error('⚠️  Error updating project:', error);
    else console.log('✅ Project metadata updated.');
  }

  // ─── 2. Smazat staré milníky a vložit nové ───────────────────────────────
  console.log('\n🗑️  Removing old milestones...');
  const { error: deleteError } = await supabase
    .from('milniky')
    .delete()
    .eq('projekt_id', projektId);

  if (deleteError) {
    console.error('❌ Error deleting old milestones:', deleteError);
    process.exit(1);
  }
  console.log('✅ Old milestones removed.\n');

  // ─── 3. Vložit milníky ───────────────────────────────────────────────────
  console.log('📌 Inserting milestones...');
  for (const m of MILNIKY) {
    const { error } = await supabase.from('milniky').insert({
      projekt_id: projektId,
      nazev: m.nazev,
      popis: m.popis,
      stav: m.stav,
      priorita: m.priorita,
      datum_zahajeni: m.datum_zahajeni,
      datum_splatnosti: m.datum_splatnosti,
      progres_procenta: m.progres_procenta,
      poradi: m.poradi,
      vlastnik_id: CREATOR_ID,
      vytvoril_id: CREATOR_ID,
      upravil_id: CREATOR_ID,
    });

    if (error) {
      console.error(`  ❌ Error inserting '${m.nazev}':`, error.message);
    } else {
      const progress = m.progres_procenta > 0 ? ` (${m.progres_procenta}%)` : '';
      console.log(`  ✅ '${m.nazev}'${progress}`);
    }
  }

  console.log('\n🎉 Seeding finished successfully — plan_rozvoje.md v2.0 is live!\n');
}

seed();
