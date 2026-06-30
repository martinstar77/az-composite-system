import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function main() {
  const { data } = await supabase.from('produkty').select(`
    sku,
    produkt_dodavatel (
      nakupni_cena, mena, nakupni_mj_id, prevodni_pomer_na_zakladni,
      logisticka_sablona_id,
      logisticke_sablony (
        typ_vypoctu_dopravy, sazba_dopravy, typ_vypoctu_dopravy_v2, koeficient_a, koeficient_b
      )
    )
  `).eq('sku', 'CLN-RST5-CON-200L');
  console.log(JSON.stringify(data, null, 2));
}
main();
