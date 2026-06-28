import { resolvePackageDimensions } from "./packagingEngine"
import { calculateProductPricing } from "./calculations"
import { ExchangeRate, GlobalFinanceSettings } from "../types"
import { LogisticsTemplate, BaliciProfil } from "../types/logistics"

// Mock Exchange Rates
const rates: ExchangeRate[] = [
  { id: "1", datum: "2026-06-21", mena: "EUR", kurz_czk: 25.0, mnozstvi: 1 },
  { id: "2", datum: "2026-06-21", mena: "USD", kurz_czk: 23.0, mnozstvi: 1 }
]

// Mock Settings
const settings: GlobalFinanceSettings = {
  id: "default",
  manualni_kurz_eur: null,
  manualni_kurz_usd: null,
  pouzivat_manualni_kurzy: false,
  poplatek_zahranicni_platba_czk: 190,
  poplatek_procleni_czk: 0,
  marze_rezerva_procenta: 0, // Set to 0 to compare base pricing easily
  doprava_eur_za_kg: 2.50,
  clo_default_procenta: 0,
  aktualizovano_at: new Date().toISOString(),
  upravil_id: null
}

// Profiles
const pRoll127: BaliciProfil = {
  nazev: "Role tkanina 127cm",
  typ_obalu: "role",
  delka_cm: 127,
  je_delka_fixni: true,
  je_sirka_fixni: false,
  je_vyska_fixni: false,
  padding_delka_cm: 1.5,
  padding_sirka_cm: 0,
  padding_vyska_cm: 0,
  koeficient_objemove_hmotnosti: 5000,
  hustota_kg_dm3: 0.45,
  vytvoreno_at: "",
  aktualizovano_at: ""
}

const pBoxStandard: BaliciProfil = {
  nazev: "Krabice standard",
  typ_obalu: "krabice_standard",
  je_delka_fixni: false,
  je_sirka_fixni: false,
  je_vyska_fixni: false,
  padding_delka_cm: 0,
  padding_sirka_cm: 0,
  padding_vyska_cm: 0,
  koeficient_objemove_hmotnosti: 5000,
  hustota_kg_dm3: 0.45,
  vytvoreno_at: "",
  aktualizovano_at: ""
}

const pSacek: BaliciProfil = {
  nazev: "LQ Sáček",
  typ_obalu: "sacek",
  delka_cm: 40,
  sirka_cm: 30,
  vyska_cm: 25,
  je_delka_fixni: true,
  je_sirka_fixni: true,
  je_vyska_fixni: true,
  padding_delka_cm: 0,
  padding_sirka_cm: 0,
  padding_vyska_cm: 0,
  koeficient_objemove_hmotnosti: 5000,
  hustota_kg_dm3: 0.45,
  vytvoreno_at: "",
  aktualizovano_at: ""
}

const pPaleta: BaliciProfil = {
  nazev: "Paleta standard",
  typ_obalu: "paleta",
  delka_cm: 170,
  sirka_cm: 110,
  vyska_cm: 122,
  je_delka_fixni: true,
  je_sirka_fixni: true,
  je_vyska_fixni: true,
  padding_delka_cm: 0,
  padding_sirka_cm: 0,
  padding_vyska_cm: 0,
  koeficient_objemove_hmotnosti: 5000,
  hustota_kg_dm3: 0.45,
  vytvoreno_at: "",
  aktualizovano_at: ""
}

// Templates
const tCina: LogisticsTemplate = {
  nazev: "Čína - UPS Express Saver",
  typ_vypoctu_dopravy: "vaha_kg",
  sazba_dopravy: 0,
  typ_vypoctu_dopravy_v2: "linear_czk",
  koeficient_a: 94.788,
  koeficient_b: 1830.2,
  bezpecnostni_koeficient: 1.05,
  poplatek_banka_czk: 190,
  poplatek_procleni_czk: 0,
  poplatek_odpady_czk: 0,
  poplatek_balne_czk: 0,
  vychozi_clo_procenta: 0,
  zeme_puvodu: "CN",
  typ_dopravy: "balik_standard"
}

const tItalieRov: LogisticsTemplate = {
  nazev: "Itálie - FedEx Rovnoměrné",
  typ_vypoctu_dopravy: "vaha_kg",
  sazba_dopravy: 0,
  typ_vypoctu_dopravy_v2: "linear_czk",
  koeficient_a: 18.804,
  koeficient_b: 349.38,
  bezpecnostni_koeficient: 1.05,
  poplatek_banka_czk: 190,
  poplatek_procleni_czk: 0,
  poplatek_odpady_czk: 0,
  poplatek_balne_czk: 0,
  vychozi_clo_procenta: 0,
  zeme_puvodu: "IT",
  typ_dopravy: "balik_standard"
}

const tItalieDl: LogisticsTemplate = {
  nazev: "Itálie - UPS/FedEx Dlouhé",
  typ_vypoctu_dopravy: "vaha_kg",
  sazba_dopravy: 0,
  typ_vypoctu_dopravy_v2: "segmented_czk",
  segmenty_dopravy: [
    { od_kg: 0, do_kg: 46.9, a: 14.26, b: 718.45, dopravce: "UPS Economy" },
    { od_kg: 47, do_kg: 60.9, a: 12.464, b: 1124.6, dopravce: "UPS Economy (Extra)" },
    { od_kg: 61, do_kg: 9999, a: 29.985, b: 1066.8, dopravce: "FedEx Economy Freight" }
  ],
  bezpecnostni_koeficient: 1.05,
  poplatek_banka_czk: 190,
  poplatek_procleni_czk: 0,
  poplatek_odpady_czk: 0,
  poplatek_balne_czk: 0,
  vychozi_clo_procenta: 0,
  zeme_puvodu: "IT",
  typ_dopravy: "balik_dlouhy"
}

const tPolskoLQ: LogisticsTemplate = {
  nazev: "Polsko LQ - BAPCO Fixní",
  typ_vypoctu_dopravy: "vaha_kg",
  sazba_dopravy: 0,
  typ_vypoctu_dopravy_v2: "fixed_eur",
  fixni_cena_eur: 50.00,
  bezpecnostni_koeficient: 1.05,
  poplatek_banka_czk: 190,
  poplatek_procleni_czk: 0,
  poplatek_odpady_czk: 0,
  poplatek_balne_czk: 0,
  vychozi_clo_procenta: 0,
  zeme_puvodu: "PL",
  typ_dopravy: "sacek_lq"
}

const tPaletaDE: LogisticsTemplate = {
  nazev: "Německo - Paleta",
  typ_vypoctu_dopravy: "vaha_kg",
  sazba_dopravy: 0,
  typ_vypoctu_dopravy_v2: "pallet_alloc",
  pallet_cena_eur: 225.02,
  pallet_pocet_produktu: 30,
  bezpecnostni_koeficient: 1.05,
  poplatek_banka_czk: 190,
  poplatek_procleni_czk: 0,
  poplatek_odpady_czk: 0,
  poplatek_balne_czk: 0,
  vychozi_clo_procenta: 0,
  zeme_puvodu: "DE",
  typ_dopravy: "paleta"
}

function runTests() {
  console.log("=== SHIPPENGINE V2 VERIFICATION SCRIPT ===")
  
  // Test Case 1: Čína 13.3 kg (Krabice standard)
  const res1 = calculateProductPricing(100, "EUR", 1, 13.3, 0, { retail: 30, partner: 20 }, rates, settings, tCina, pBoxStandard)
  console.log("\n1. Čína 13.3 kg standard krabice:")
  console.log(`- Billed Weight: ${res1?.billedWeightKg} kg`)
  console.log(`- Shipping Cost CZK: ${res1?.totalShippingCostCzk} CZK`)
  console.log(`- Bank Fees CZK (SWIFT): ${res1?.totalBankFeesCzk} CZK (Expected: 190 CZK, outside EU)`)
  console.log(`- Expected Shipping: ~3244.97 CZK (94.788 * 13.3 + 1830.2) * 1.05`)

  // Test Case 2: Itálie rovnoměrné 10 kg
  const res2 = calculateProductPricing(100, "EUR", 1, 10.0, 0, { retail: 30, partner: 20 }, rates, settings, tItalieRov, pBoxStandard)
  console.log("\n2. Itálie rovnoměrné 10 kg standard krabice:")
  console.log(`- Billed Weight: ${res2?.billedWeightKg} kg`)
  console.log(`- Shipping Cost CZK: ${res2?.totalShippingCostCzk} CZK`)
  console.log(`- Bank Fees CZK (SWIFT): ${res2?.totalBankFeesCzk} CZK (Expected: 0 CZK, inside EU)`)
  console.log(`- Expected Shipping: ~564.29 CZK (18.804 * 10 + 349.38) * 1.05`)

  // Test Case 3: Itálie dlouhé 50 kg (segment 2)
  const res3 = calculateProductPricing(100, "EUR", 1, 50.0, 0, { retail: 30, partner: 20 }, rates, settings, tItalieDl, pRoll127)
  console.log("\n3. Itálie dlouhé 50 kg role 127cm (segment 2):")
  console.log(`- Billed Weight: ${res3?.billedWeightKg} kg`)
  console.log(`- Shipping Cost CZK: ${res3?.totalShippingCostCzk} CZK`)
  console.log(`- Expected Shipping: ~1835.19 CZK (12.464 * 50 + 1124.6) * 1.05`)

  // Test Case 4: Polsko LQ 48 ks -> 50 EUR * 25.0 * 1.0048 (RoklenFX Margin) * 1.05
  const res4 = calculateProductPricing(100, "EUR", 1, 20.0, 0, { retail: 30, partner: 20 }, rates, settings, tPolskoLQ, pSacek)
  console.log("\n4. Polsko LQ fixní 50 EUR:")
  console.log(`- Shipping Cost CZK: ${res4?.totalShippingCostCzk} CZK`)
  console.log(`- Bank Fees CZK (SWIFT): ${res4?.totalBankFeesCzk} CZK (Expected: 0 CZK, inside EU)`)
  console.log(`- Expected Shipping: 1318.80 CZK (50 * 25 * 1.0048 * 1.05)`)

  // Test Case 5: Paleta -> (225.02 EUR * 25 * 1.0048 / 30) * 1.05
  const res5 = calculateProductPricing(100, "EUR", 1, 150.0, 0, { retail: 30, partner: 20 }, rates, settings, tPaletaDE, pPaleta)
  console.log("\n5. Paleta Německo alokace:")
  console.log(`- Shipping Cost CZK: ${res5?.totalShippingCostCzk} CZK`)
  console.log(`- Expected Shipping: ~197.84 CZK (225.02 * 25 * 1.0048 / 30) * 1.05`)

  // Test Case 6: Role 35 kg (profil 127cm) průměr & objemová hmotnost
  const pack6 = resolvePackageDimensions(35.0, pRoll127, {})
  console.log("\n6. Role 35 kg (profil 127cm) rozměry:")
  console.log(`- Délka: ${pack6.delka_cm} cm`)
  console.log(`- Šířka: ${pack6.sirka_cm} cm`)
  console.log(`- Výška: ${pack6.vyska_cm} cm`)
  console.log(`- Objemová hmotnost: ${pack6.volumetricWeight_kg} kg`)
  console.log(`- Finální účtovaná hmotnost: ${pack6.billedWeight_kg} kg`)

  // Test Case 7: Splitting shipping and bank fees (qty = 48)
  const res7_single = calculateProductPricing(10, "EUR", 1, 1.0, 0, { retail: 30, partner: 20 }, rates, settings, tCina, pBoxStandard, {}, undefined, 48)
  const res7_batch = calculateProductPricing(10, "EUR", 1, 1.0, 0, { retail: 30, partner: 20 }, rates, settings, tCina, pBoxStandard, {}, undefined, 1)
  console.log("\n7. Batch splitting test (Čína, qty = 48 vs qty = 1):")
  console.log(`- Single shipping (qty=1): ${res7_batch?.totalShippingCostCzk} CZK`)
  console.log(`- Batch shipping (per unit, qty=48): ${res7_single?.totalShippingCostCzk} CZK`)
  console.log(`- Single SWIFT fee: ${res7_batch?.totalBankFeesCzk} CZK`)
  console.log(`- Batch SWIFT fee (per unit, qty=48): ${res7_single?.totalBankFeesCzk} CZK`)
}

runTests()
