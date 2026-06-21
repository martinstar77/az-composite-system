import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing environment variables in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function check() {
  console.log("=== CHECKING FIREMNÍ NASTAVENÍ ===");
  const { data: settings, error: settingsErr } = await supabase
    .from('firemni_nastaveni')
    .select('*');
  
  if (settingsErr) {
    console.error("Error reading firemni_nastaveni:", settingsErr.message);
  } else {
    console.log("Records in firemni_nastaveni:", JSON.stringify(settings, null, 2));
  }

  console.log("\n=== CHECKING RECENT DOKLADY ===");
  const { data: doklady, error: dokladyErr } = await supabase
    .from('doklady')
    .select('id, cislo, typ, firemni_udaje_snapshot')
    .is('deleted_at', null)
    .order('vytvoreno_at', { ascending: false })
    .limit(5);

  if (dokladyErr) {
    console.error("Error reading doklady:", dokladyErr.message);
  } else {
    console.log("Recent 5 documents:", JSON.stringify(doklady, null, 2));
  }
}

check();
