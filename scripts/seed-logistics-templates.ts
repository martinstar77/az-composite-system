import { Client } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

const useCloud = process.argv.includes('--cloud') || process.argv.includes('--env=cloud');
const envFile = useCloud ? '.env.local' : '.env.docker.local';

console.log(`Loading environment config from: ${envFile}`);
dotenv.config({ path: path.resolve(process.cwd(), envFile) });

let pgClient: Client;

if (useCloud) {
  const password = process.env.DB_PASSWORD;
  if (!password) {
    console.error('ERROR: To seed the cloud database, you must provide the DB_PASSWORD environment variable.');
    console.error('Example:');
    console.error('  DB_PASSWORD="your-supabase-db-password" npx tsx scripts/seed-logistics-templates.ts --cloud');
    process.exit(1);
  }
  pgClient = new Client({
    user: 'postgres.natwtoqreniqupbvulso',
    host: 'aws-0-eu-west-1.pooler.supabase.com',
    database: 'postgres',
    password: password,
    port: 6543,
    ssl: {
      rejectUnauthorized: false
    }
  });
} else {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('ERROR: Missing DATABASE_URL in .env.docker.local');
    process.exit(1);
  }
  pgClient = new Client({
    connectionString
  });
}

interface SeedTemplate {
  nazev: string;
  zeme_puvodu: string;
  typ_dopravy: string;
  typ_vypoctu_dopravy_v2: 'linear_czk' | 'segmented_czk' | 'fixed_eur' | 'pallet_alloc';
  koeficient_a: number | null;
  koeficient_b: number | null;
  segmenty_dopravy: any[] | null;
  fixni_cena_eur: number | null;
  pallet_cena_eur: number | null;
  pallet_pocet_produktu: number | null;
  // Common columns
  typ_vypoctu_dopravy: 'procentualni' | 'vaha_kg' | 'fixni';
  sazba_dopravy: number;
  poplatek_banka_czk: number;
  poplatek_procleni_czk: number;
  poplatek_odpady_czk: number;
  poplatek_balne_czk: number;
  vychozi_clo_procenta: number;
  bezpecnostni_koeficient: number;
}

const TEMPLATES: SeedTemplate[] = [
  {
    nazev: 'Čína - UPS Express Saver',
    zeme_puvodu: 'CN',
    typ_dopravy: 'balik_standard',
    typ_vypoctu_dopravy_v2: 'linear_czk',
    koeficient_a: 94.788,
    koeficient_b: 1830.2,
    segmenty_dopravy: null,
    fixni_cena_eur: null,
    pallet_cena_eur: null,
    pallet_pocet_produktu: null,
    typ_vypoctu_dopravy: 'vaha_kg',
    sazba_dopravy: 0,
    poplatek_banka_czk: 190,
    poplatek_procleni_czk: 0,
    poplatek_odpady_czk: 0,
    poplatek_balne_czk: 0,
    vychozi_clo_procenta: 0,
    bezpecnostni_koeficient: 1.05
  },
  {
    nazev: 'Itálie - FedEx Rovnoměrné',
    zeme_puvodu: 'IT',
    typ_dopravy: 'balik_standard',
    typ_vypoctu_dopravy_v2: 'linear_czk',
    koeficient_a: 18.804,
    koeficient_b: 349.38,
    segmenty_dopravy: null,
    fixni_cena_eur: null,
    pallet_cena_eur: null,
    pallet_pocet_produktu: null,
    typ_vypoctu_dopravy: 'vaha_kg',
    sazba_dopravy: 0,
    poplatek_banka_czk: 190,
    poplatek_procleni_czk: 0,
    poplatek_odpady_czk: 0,
    poplatek_balne_czk: 0,
    vychozi_clo_procenta: 0,
    bezpecnostni_koeficient: 1.05
  },
  {
    nazev: 'Itálie - UPS/FedEx Dlouhé',
    zeme_puvodu: 'IT',
    typ_dopravy: 'balik_dlouhy',
    typ_vypoctu_dopravy_v2: 'segmented_czk',
    koeficient_a: null,
    koeficient_b: null,
    segmenty_dopravy: [
      { od_kg: 0, do_kg: 46.9, a: 14.26, b: 718.45, dopravce: 'UPS Economy' },
      { od_kg: 47, do_kg: 60.9, a: 12.464, b: 1124.6, dopravce: 'UPS Economy (Extra)' },
      { od_kg: 61, do_kg: 9999, a: 29.985, b: 1066.8, dopravce: 'FedEx Economy Freight' }
    ],
    fixni_cena_eur: null,
    pallet_cena_eur: null,
    pallet_pocet_produktu: null,
    typ_vypoctu_dopravy: 'vaha_kg',
    sazba_dopravy: 0,
    poplatek_banka_czk: 190,
    poplatek_procleni_czk: 0,
    poplatek_odpady_czk: 0,
    poplatek_balne_czk: 0,
    vychozi_clo_procenta: 0,
    bezpecnostni_koeficient: 1.05
  },
  {
    nazev: 'Česko - GLS/TOPTRANS Dlouhé',
    zeme_puvodu: 'CZ',
    typ_dopravy: 'balik_dlouhy',
    typ_vypoctu_dopravy_v2: 'segmented_czk',
    koeficient_a: null,
    koeficient_b: null,
    segmenty_dopravy: [
      { od_kg: 0, do_kg: 30.9, a: 2.5374, b: 138.79, dopravce: 'GLS/DPD' },
      { od_kg: 31, do_kg: 50, a: 0, b: 876, dopravce: 'TOPTRANS' },
      { od_kg: 50.1, do_kg: 9999, a: 0, b: 1113, dopravce: 'TOPTRANS' }
    ],
    fixni_cena_eur: null,
    pallet_cena_eur: null,
    pallet_pocet_produktu: null,
    typ_vypoctu_dopravy: 'vaha_kg',
    sazba_dopravy: 0,
    poplatek_banka_czk: 190,
    poplatek_procleni_czk: 0,
    poplatek_odpady_czk: 0,
    poplatek_balne_czk: 0,
    vychozi_clo_procenta: 0,
    bezpecnostni_koeficient: 1.05
  },
  {
    nazev: 'Německo - GLS/UPS Dlouhé',
    zeme_puvodu: 'DE',
    typ_dopravy: 'balik_dlouhy',
    typ_vypoctu_dopravy_v2: 'segmented_czk',
    koeficient_a: null,
    koeficient_b: null,
    segmenty_dopravy: [
      { od_kg: 0, do_kg: 30.9, a: 15.16, b: 229.56, dopravce: 'GLS' },
      { od_kg: 31, do_kg: 60.9, a: 27.777, b: 144.67, dopravce: 'UPS Economy' },
      { od_kg: 61, do_kg: 9999, a: 8.1, b: 2487.8, dopravce: 'FedEx Economy Freight' }
    ],
    fixni_cena_eur: null,
    pallet_cena_eur: null,
    pallet_pocet_produktu: null,
    typ_vypoctu_dopravy: 'vaha_kg',
    sazba_dopravy: 0,
    poplatek_banka_czk: 190,
    poplatek_procleni_czk: 0,
    poplatek_odpady_czk: 0,
    poplatek_balne_czk: 0,
    vychozi_clo_procenta: 0,
    bezpecnostni_koeficient: 1.05
  },
  {
    nazev: 'Německo - GLS Rovnoměrné',
    zeme_puvodu: 'DE',
    typ_dopravy: 'balik_standard',
    typ_vypoctu_dopravy_v2: 'segmented_czk',
    koeficient_a: null,
    koeficient_b: null,
    segmenty_dopravy: [
      { od_kg: 0, do_kg: 30.9, a: 15.771, b: 216.52, dopravce: 'GLS' },
      { od_kg: 31, do_kg: 9999, a: 8.375, b: 918, dopravce: 'UPS Economy' }
    ],
    fixni_cena_eur: null,
    pallet_cena_eur: null,
    pallet_pocet_produktu: null,
    typ_vypoctu_dopravy: 'vaha_kg',
    sazba_dopravy: 0,
    poplatek_banka_czk: 190,
    poplatek_procleni_czk: 0,
    poplatek_odpady_czk: 0,
    poplatek_balne_czk: 0,
    vychozi_clo_procenta: 0,
    bezpecnostni_koeficient: 1.05
  },
  {
    nazev: 'Německo - Paleta',
    zeme_puvodu: 'DE',
    typ_dopravy: 'paleta',
    typ_vypoctu_dopravy_v2: 'pallet_alloc',
    koeficient_a: null,
    koeficient_b: null,
    segmenty_dopravy: null,
    fixni_cena_eur: null,
    pallet_cena_eur: 225.02,
    pallet_pocet_produktu: 30,
    typ_vypoctu_dopravy: 'vaha_kg',
    sazba_dopravy: 0,
    poplatek_banka_czk: 190,
    poplatek_procleni_czk: 0,
    poplatek_odpady_czk: 0,
    poplatek_balne_czk: 0,
    vychozi_clo_procenta: 0,
    bezpecnostni_koeficient: 1.05
  },
  {
    nazev: 'Španělsko - Paleta',
    zeme_puvodu: 'ES',
    typ_dopravy: 'paleta',
    typ_vypoctu_dopravy_v2: 'pallet_alloc',
    koeficient_a: null,
    koeficient_b: null,
    segmenty_dopravy: null,
    fixni_cena_eur: null,
    pallet_cena_eur: 225.02,
    pallet_pocet_produktu: 30,
    typ_vypoctu_dopravy: 'vaha_kg',
    sazba_dopravy: 0,
    poplatek_banka_czk: 190,
    poplatek_procleni_czk: 0,
    poplatek_odpady_czk: 0,
    poplatek_balne_czk: 0,
    vychozi_clo_procenta: 0,
    bezpecnostni_koeficient: 1.05
  },
  {
    nazev: 'Francie - Paleta',
    zeme_puvodu: 'FR',
    typ_dopravy: 'paleta',
    typ_vypoctu_dopravy_v2: 'pallet_alloc',
    koeficient_a: null,
    koeficient_b: null,
    segmenty_dopravy: null,
    fixni_cena_eur: null,
    pallet_cena_eur: 225.02,
    pallet_pocet_produktu: 30,
    typ_vypoctu_dopravy: 'vaha_kg',
    sazba_dopravy: 0,
    poplatek_banka_czk: 190,
    poplatek_procleni_czk: 0,
    poplatek_odpady_czk: 0,
    poplatek_balne_czk: 0,
    vychozi_clo_procenta: 0,
    bezpecnostni_koeficient: 1.05
  },
  {
    nazev: 'Francie - GLS Rovnoměrné',
    zeme_puvodu: 'FR',
    typ_dopravy: 'balik_standard',
    typ_vypoctu_dopravy_v2: 'segmented_czk',
    koeficient_a: null,
    koeficient_b: null,
    segmenty_dopravy: [
      { od_kg: 0, do_kg: 30.9, a: 15.771, b: 216.52, dopravce: 'GLS' },
      { od_kg: 31, do_kg: 9999, a: 8.375, b: 918, dopravce: 'UPS Economy' }
    ],
    fixni_cena_eur: null,
    pallet_cena_eur: null,
    pallet_pocet_produktu: null,
    typ_vypoctu_dopravy: 'vaha_kg',
    sazba_dopravy: 0,
    poplatek_banka_czk: 190,
    poplatek_procleni_czk: 0,
    poplatek_odpady_czk: 0,
    poplatek_balne_czk: 0,
    vychozi_clo_procenta: 0,
    bezpecnostni_koeficient: 1.05
  },
  {
    nazev: 'Polsko - GLS/UPS Rovnoměrné',
    zeme_puvodu: 'PL',
    typ_dopravy: 'balik_standard',
    typ_vypoctu_dopravy_v2: 'segmented_czk',
    koeficient_a: null,
    koeficient_b: null,
    segmenty_dopravy: [
      { od_kg: 0, do_kg: 30.9, a: 14.039, b: 153.3, dopravce: 'GLS' },
      { od_kg: 31, do_kg: 9999, a: 9.8, b: 874.4, dopravce: 'UPS Economy' }
    ],
    fixni_cena_eur: null,
    pallet_cena_eur: null,
    pallet_pocet_produktu: null,
    typ_vypoctu_dopravy: 'vaha_kg',
    sazba_dopravy: 0,
    poplatek_banka_czk: 190,
    poplatek_procleni_czk: 0,
    poplatek_odpady_czk: 0,
    poplatek_balne_czk: 0,
    vychozi_clo_procenta: 0,
    bezpecnostni_koeficient: 1.05
  },
  {
    nazev: 'Polsko LQ - BAPCO Fixní',
    zeme_puvodu: 'PL',
    typ_dopravy: 'sacek_lq',
    typ_vypoctu_dopravy_v2: 'fixed_eur',
    koeficient_a: null,
    koeficient_b: null,
    segmenty_dopravy: null,
    fixni_cena_eur: 50.00,
    pallet_cena_eur: null,
    pallet_pocet_produktu: null,
    typ_vypoctu_dopravy: 'vaha_kg',
    sazba_dopravy: 0,
    poplatek_banka_czk: 190,
    poplatek_procleni_czk: 0,
    poplatek_odpady_czk: 0,
    poplatek_balne_czk: 0,
    vychozi_clo_procenta: 0,
    bezpecnostni_koeficient: 1.05
  },
  {
    nazev: 'Nizozemsko - GLS/UPS Rovnoměrné',
    zeme_puvodu: 'NL',
    typ_dopravy: 'balik_standard',
    typ_vypoctu_dopravy_v2: 'segmented_czk',
    koeficient_a: null,
    koeficient_b: null,
    segmenty_dopravy: [
      { od_kg: 0, do_kg: 30.9, a: 18.929, b: 245.81, dopravce: 'GLS' },
      { od_kg: 31, do_kg: 9999, a: 12.1, b: 1204.8, dopravce: 'UPS Economy' }
    ],
    fixni_cena_eur: null,
    pallet_cena_eur: null,
    pallet_pocet_produktu: null,
    typ_vypoctu_dopravy: 'vaha_kg',
    sazba_dopravy: 0,
    poplatek_banka_czk: 190,
    poplatek_procleni_czk: 0,
    poplatek_odpady_czk: 0,
    poplatek_balne_czk: 0,
    vychozi_clo_procenta: 0,
    bezpecnostni_koeficient: 1.05
  }
];

async function seed() {
  console.log(`Connecting directly to PostgreSQL...`);
  try {
    await pgClient.connect();
    console.log(`Connected.`);

    // 1. Fetch existing templates to check matches by name
    const res = await pgClient.query('SELECT id, nazev FROM public.logisticke_sablony');
    const existingMap = new Map<string, string>();
    res.rows.forEach(row => existingMap.set(row.nazev, row.id));

    for (const template of TEMPLATES) {
      const existingId = existingMap.get(template.nazev);
      const segmentyJson = template.segmenty_dopravy ? JSON.stringify(template.segmenty_dopravy) : null;

      if (existingId) {
        console.log(`Updating existing template: "${template.nazev}" (ID: ${existingId})`);
        await pgClient.query(`
          UPDATE public.logisticke_sablony SET
            zeme_puvodu = $1,
            typ_dopravy = $2,
            typ_vypoctu_dopravy_v2 = $3,
            koeficient_a = $4,
            koeficient_b = $5,
            segmenty_dopravy = $6::jsonb,
            fixni_cena_eur = $7,
            pallet_cena_eur = $8,
            pallet_pocet_produktu = $9,
            typ_vypoctu_dopravy = $10,
            sazba_dopravy = $11,
            poplatek_banka_czk = $12,
            poplatek_procleni_czk = $13,
            poplatek_odpady_czk = $14,
            poplatek_balne_czk = $15,
            vychozi_clo_procenta = $16,
            bezpecnostni_koeficient = $17
          WHERE id = $18
        `, [
          template.zeme_puvodu,
          template.typ_dopravy,
          template.typ_vypoctu_dopravy_v2,
          template.koeficient_a,
          template.koeficient_b,
          segmentyJson,
          template.fixni_cena_eur,
          template.pallet_cena_eur,
          template.pallet_pocet_produktu,
          template.typ_vypoctu_dopravy,
          template.sazba_dopravy,
          template.poplatek_banka_czk,
          template.poplatek_procleni_czk,
          template.poplatek_odpady_czk,
          template.poplatek_balne_czk,
          template.vychozi_clo_procenta,
          template.bezpecnostni_koeficient,
          existingId
        ]);
        console.log(`✅ Updated "${template.nazev}" successfully.`);
      } else {
        console.log(`Inserting new template: "${template.nazev}"`);
        await pgClient.query(`
          INSERT INTO public.logisticke_sablony (
            nazev, zeme_puvodu, typ_dopravy, typ_vypoctu_dopravy_v2,
            koeficient_a, koeficient_b, segmenty_dopravy, fixni_cena_eur,
            pallet_cena_eur, pallet_pocet_produktu, typ_vypoctu_dopravy,
            sazba_dopravy, poplatek_banka_czk, poplatek_procleni_czk,
            poplatek_odpady_czk, poplatek_balne_czk, vychozi_clo_procenta,
            bezpecnostni_koeficient
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18
          )
        `, [
          template.nazev,
          template.zeme_puvodu,
          template.typ_dopravy,
          template.typ_vypoctu_dopravy_v2,
          template.koeficient_a,
          template.koeficient_b,
          segmentyJson,
          template.fixni_cena_eur,
          template.pallet_cena_eur,
          template.pallet_pocet_produktu,
          template.typ_vypoctu_dopravy,
          template.sazba_dopravy,
          template.poplatek_banka_czk,
          template.poplatek_procleni_czk,
          template.poplatek_odpady_czk,
          template.poplatek_balne_czk,
          template.vychozi_clo_procenta,
          template.bezpecnostni_koeficient
        ]);
        console.log(`✅ Inserted "${template.nazev}" successfully.`);
      }
    }
    
    console.log('Seeding finished successfully!');
  } catch (err: any) {
    console.error("❌ Database seeding error:", err.message);
  } finally {
    await pgClient.end();
  }
}

seed();
