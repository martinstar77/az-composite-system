import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function main() {
  const { data } = await supabase.from('produkty').select('sku, nazev, mnozstvi_v_baleni, zakladni_mj_id, kategorie_id, specifikace, hmotnost_baliku_kg, hmotnost_zafixovana').like('sku', '%RST5%');
  console.log(data);
}
main();
