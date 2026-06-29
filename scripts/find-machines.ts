import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const supabase = createClient(supabaseUrl, supabaseKey)

async function run() {
  const { data: products } = await supabase
    .from('produkty')
    .select('*, c_kategorie(*)')
    .or('nazev.ilike.%myc%,nazev.ilike.%rst%')
    .is('deleted_at', null)

  console.log('Products Found:')
  for (const p of products || []) {
    console.log(`- SKU: ${p.sku}, Name: ${p.nazev}, Category: ${p.kategorie_id} (${p.c_kategorie?.nazev}), Weight: ${p.hmotnost_baliku_kg} kg, Spec:`, p.specifikace)
  }
}

run().catch(console.error)
