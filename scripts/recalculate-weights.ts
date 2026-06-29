import { createClient } from '@supabase/supabase-js'
import { calculateGrossWeight } from '../src/modules/products/utils/logisticsCalculator'
import * as dotenv from 'dotenv'
import * as path from 'path'

/**
 * Recalculate estimated package weights (hmotnost_baliku_kg) for all active products.
 * 
 * To run this script:
 *   npx tsx scripts/recalculate-weights.ts
 * 
 * Requirements:
 *   - .env.local must contain NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
 */

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function run() {
  console.log('Fetching active products...')
  const { data: products, error } = await supabase
    .from('produkty')
    .select('id, sku, nazev, kategorie_id, specifikace, mnozstvi_v_baleni, hmotnost_baliku_kg')
    .is('deleted_at', null)

  if (error) {
    console.error('Error fetching products:', error)
    process.exit(1)
  }

  console.log(`Found ${products.length} active products. Recalculating weights...`)
  let updatedCount = 0

  for (const product of products) {
    const specs = product.specifikace as Record<string, unknown> || {}
    const qty = product.mnozstvi_v_baleni || 1
    const category = product.kategorie_id || ''

    const result = calculateGrossWeight(category, specs, qty)
    const newWeight = result.weightKg

    if (newWeight !== null && newWeight !== product.hmotnost_baliku_kg) {
      console.log(`Product: ${product.sku} - ${product.nazev}`)
      console.log(`  Category: ${category}, Qty: ${qty}`)
      console.log(`  Old Weight: ${product.hmotnost_baliku_kg} kg`)
      console.log(`  New Weight: ${newWeight} kg (${result.breakdown})`)

      const { error: updateError } = await supabase
        .from('produkty')
        .update({ hmotnost_baliku_kg: newWeight })
        .eq('id', product.id)

      if (updateError) {
        console.error(`  Failed to update weight for product ${product.sku}:`, updateError)
      } else {
        console.log(`  [UPDATED SUCCESS]`)
        updatedCount++
      }
    }
  }

  console.log(`Recalculation complete. Updated ${updatedCount} products.`)
}

run().catch(err => {
  console.error('Unhandled error:', err)
  process.exit(1)
})
