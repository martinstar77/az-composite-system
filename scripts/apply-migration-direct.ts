import { Client } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

const password = process.env.DB_PASSWORD;
const migrationFile = process.argv[2] || '20260615111500_add_volume_discounts.sql';

if (!password) {
  console.error('ERROR: Pro spuštění skriptu musíte nastavit proměnnou prostředí DB_PASSWORD.');
  console.error('Příklad spuštění:');
  console.error('  DB_PASSWORD="moje-heslo-k-databazi" npx tsx scripts/apply-migration-direct.ts [migration_filename.sql]');
  process.exit(1);
}

const client = new Client({
  user: 'postgres.natwtoqreniqupbvulso',
  host: 'aws-0-eu-west-1.pooler.supabase.com',
  database: 'postgres',
  password: password,
  port: 6543,
  ssl: {
    rejectUnauthorized: false
  }
});

async function run() {
  const sqlFilePath = path.resolve(process.cwd(), 'supabase/migrations', migrationFile);
  
  if (!fs.existsSync(sqlFilePath)) {
    console.error(`ERROR: Soubor s migrací nebyl nalezen na adrese: ${sqlFilePath}`);
    process.exit(1);
  }

  const sql = fs.readFileSync(sqlFilePath, 'utf8');

  console.log('Připojování k databázi Supabase Cloud...');
  try {
    await client.connect();
    console.log('✅ Úspěšně připojeno.');

    console.log(`Aplikování migrace (${migrationFile})...`);
    await client.query(sql);
    console.log('🎉 Migrace byla úspěšně aplikována na vzdálenou databázi!');

  } catch (error) {
    console.error('❌ Chyba při provádění migrace:', error);
  } finally {
    await client.end();
  }
}

run();
