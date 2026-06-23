import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const supabase = createClient(supabaseUrl, supabaseKey)

async function run() {
  const { data: products } = await supabase
    .from('produkty')
    .select('id, sku, nazev, kategorie_id')
    .is('deleted_at', null)

  if (!products) {
    console.log('No products found.')
    return
  }

  console.log(`Checking ${products.length} products for null values...`)
  let nullNazevCount = 0
  let nullSkuCount = 0
  let nullKategorieCount = 0

  products.forEach(p => {
    if (p.nazev === null || p.nazev === undefined) {
      nullNazevCount++
      console.log('Product with null nazev:', p)
    }
    if (p.sku === null || p.sku === undefined) {
      nullSkuCount++
      console.log('Product with null sku:', p)
    }
    if (p.kategorie_id === null || p.kategorie_id === undefined) {
      nullKategorieCount++
    }
  })

  console.log({ nullNazevCount, nullSkuCount, nullKategorieCount })
}

run().catch(console.error)
