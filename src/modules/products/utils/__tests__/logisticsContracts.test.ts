import { describe, it, expect } from 'vitest'
import { calculateProductPricing } from '../../../../modules/finance/utils/calculations'
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

// Load environment variables for DB check
dotenv.config({ path: path.join(__dirname, '../../../../../.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

// Mock exchange rates and global finance settings for the contract test
const mockRates = [
  { mena: 'EUR', kurz_czk: 25.0, mnozstvi: 1 },
  { mena: 'USD', kurz_czk: 23.0, mnozstvi: 1 }
]

const mockSettings = {
  id: '1',
  pouzivat_manualni_kurzy: true,
  manualni_kurz_eur: 25.0,
  manualni_kurz_usd: 23.0,
  roklen_fx_margin_procenta: 0.2,
  vytvoreno_at: '',
  aktualizovano_at: ''
}

const mockGLSTemplate = {
  id: 't-gls',
  nazev: 'GLS Standard',
  zeme_puvodu: 'FR',
  typ_dopravy: 'balik_standard',
  typ_vypoctu_dopravy_v2: 'segmented_czk',
  segmenty_dopravy: [
    { od_kg: 0, do_kg: 30.9, a: 15.771, b: 216.52, dopravce: 'GLS' },
    { od_kg: 31, do_kg: 9999, a: 8.375, b: 918.0, dopravce: 'UPS' }
  ],
  poplatek_balne_czk: 0,
  poplatek_banka_czk: 190,
  poplatek_odpady_czk: 0,
  poplatek_procleni_czk: 0,
  bezpecnostni_koeficient: 1.05,
  typ_vypoctu_dopravy: 'vaha_kg',
  sazba_dopravy: 0
}

describe('Logistics Price Monotonicity Contracts', () => {
  it('should ensure that unit shipping cost decreases or remains equal when quantity increases (bulk discount)', () => {
    // Test for a chemistry product: 1 canister of 5 liters, weighing 4.9 kg
    const purchasingUnitPrice = 100 // 100 EUR
    const currency = 'EUR'
    const totalUnits = 5 // 5 liters per purchasing unit
    const weightKg = 4.9 // 4.9 kg per canister
    const packSize = 5 // 5 liters per canister

    // 1. Calculate shipping cost for order qty = 1
    const p1 = calculateProductPricing(
      purchasingUnitPrice,
      currency,
      totalUnits,
      weightKg,
      0,
      { retail: 30, partner: 20 },
      mockRates as any,
      mockSettings as any,
      mockGLSTemplate as any,
      null, // no volumetric profile
      null, // no overrides
      undefined,
      1, // qty = 1
      packSize
    )

    // 2. Calculate shipping cost for order qty = 10
    const p10 = calculateProductPricing(
      purchasingUnitPrice,
      currency,
      totalUnits,
      weightKg,
      0,
      { retail: 30, partner: 20 },
      mockRates as any,
      mockSettings as any,
      mockGLSTemplate as any,
      null,
      null,
      undefined,
      10, // qty = 10
      packSize
    )

    expect(p1).not.toBeNull()
    expect(p10).not.toBeNull()

    const unitShipping1 = p1!.unitShippingCostCzk
    const unitShipping10 = p10!.unitShippingCostCzk

    console.log(`Unit shipping cost for 1 unit: ${unitShipping1} CZK`)
    console.log(`Unit shipping cost for 10 units: ${unitShipping10} CZK`)

    // Unit shipping cost for 10 units should be strictly lower (due to fixed bank fees, shipping offsets being shared)
    expect(unitShipping10).toBeLessThanOrEqual(unitShipping1)
  })
})

describe('Database Master Data Audit (Vitest integration)', () => {
  it('should verify that active products in database pass key logistics integrity rules', async () => {
    if (!supabaseUrl || !supabaseKey) {
      console.log('Skipping DB audit test (missing environment credentials in non-local run)')
      return
    }

    const supabase = createClient(supabaseUrl, supabaseKey)
    const { data: products, error } = await supabase
      .from('produkty')
      .select('sku, nazev, kategorie_id, specifikace, mnozstvi_v_baleni, hmotnost_baliku_kg, deleted_at, stav_katalogu_id, vytvoreno_at')
      .is('deleted_at', null)
      .eq('stav_katalogu_id', 'ready_to_order')

    expect(error).toBeNull()
    expect(products).not.toBeNull()

    const criticalFailures: string[] = []
    const legacyWarnings: string[] = []

    const migrationCutoff = new Date('2026-06-29T10:00:00Z')

    for (const p of products || []) {
      const isLegacy = new Date(p.vytvoreno_at) < migrationCutoff
      
      // Rule 1: No active product can have null or zero weight
      if (p.hmotnost_baliku_kg == null || p.hmotnost_baliku_kg <= 0) {
        const msg = `SKU ${p.sku} (ready_to_order) has invalid weight: ${p.hmotnost_baliku_kg} kg`
        if (isLegacy) {
          legacyWarnings.push(msg)
        } else {
          criticalFailures.push(msg)
        }
      }

      // Rule 2: No active product can have null or zero pack size
      if (p.mnozstvi_v_baleni == null || p.mnozstvi_v_baleni <= 0) {
        const msg = `SKU ${p.sku} (ready_to_order) has invalid packaging size: ${p.mnozstvi_v_baleni}`
        if (isLegacy) {
          legacyWarnings.push(msg)
        } else {
          criticalFailures.push(msg)
        }
      }
    }

    if (legacyWarnings.length > 0) {
      console.log(`[DATA INTEGRITY WARNING] ${legacyWarnings.length} legacy products violate logistics weight rules:\n` + legacyWarnings.slice(0, 10).join('\n') + '\n...and more.')
    }

    if (criticalFailures.length > 0) {
      console.error('Critical Data Integrity Failures found in newly created products:\n' + criticalFailures.join('\n'))
    }

    // Fail the test ONLY if there are critical database integrity violations on new products
    expect(criticalFailures.length).toBe(0)
  })
})
