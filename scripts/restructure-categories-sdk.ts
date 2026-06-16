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

async function run() {
  console.log("Restructuring categories...");
  
  // 1. Delete products in those categories to prevent constraints failure
  const { error: err1 } = await supabase
    .from('produkty')
    .delete()
    .in('kategorie_id', ['nastroje_rucni', 'nastroje_strojni', 'polotovary']);
  if (err1) console.error("Error deleting products:", err1.message);

  // 2. Delete categories
  const { error: err2 } = await supabase
    .from('c_kategorie')
    .delete()
    .in('id', ['nastroje_rucni', 'nastroje_strojni', 'polotovary']);
  if (err2) console.error("Error deleting old categories:", err2.message);

  // 3. Insert new categories
  const { error: err3 } = await supabase
    .from('c_kategorie')
    .upsert([
      { id: 'consumables', nazev: 'Spotřební materiál (Consumables)', popis: 'BF, RF, PP, BC, ST, FT, FM, FCH, T, C' },
      { id: 'naradi', nazev: 'Nářadí (Tools)', popis: 'BU, QR, SQ' }
    ]);
  if (err3) console.error("Error inserting new categories:", err3.message);
  else console.log("✅ Restructure successful!");
}

run();
