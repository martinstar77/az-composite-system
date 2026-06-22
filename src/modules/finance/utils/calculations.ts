import { ExchangeRate, GlobalFinanceSettings } from "@/modules/finance/types"
import { LogisticsTemplate, BaliciProfil, StandardBoxSize } from "../types/logistics"
import { resolvePackageDimensions, PackageDimensions } from "./packagingEngine"

export interface PricingBreakdown {
  // Input Data Echo
  exchangeRateUsed: number
  currency: string
  totalUnits: number // e.g. 50 (m2)
  
  // Total Package Costs (Total)
  totalPurchasePriceCzk: number
  totalShippingCostCzk: number
  totalCustomsCostCzk: number
  totalBankFeesCzk: number
  totalClearingFeesCzk: number
  totalWasteFeesCzk: number
  totalPackagingFeesCzk: number
  
  // Per Unit Costs
  unitPurchasePriceCzk: number
  unitShippingCostCzk: number
  unitCustomsCostCzk: number
  unitBankFeesCzk: number
  unitClearingFeesCzk: number
  unitWasteFeesCzk: number
  unitPackagingFeesCzk: number

  // Landed Cost (Total & Unit)
  totalLandedCostBase: number
  totalBufferAmount: number
  totalLandedCostWithBuffer: number
  
  unitLandedCostBase: number
  unitBufferAmount: number
  unitLandedCostWithBuffer: number

  // Selling Prices (Per Unit)
  b2cUnitPrice: number
  b2bUnitPrice: number
  b2bDiscountedPrices: {
    5: number
    10: number
    15: number
    20: number
  }
  
  // Margins Amount (Per Unit)
  b2cUnitMarginAmount: number
  b2bUnitMarginAmount: number
  
  // Hedging scenarios
  currentMargin: number
  lowMargin: number // Weakest CZK
  highMargin: number // Strongest CZK

  // Shipping Engine v2 outputs
  billedWeightKg?: number
  volumetricWeightKg?: number
  packagingDimensions?: PackageDimensions
  shippingSafetyBufferCzk?: number

  // RoklenFX dynamic fee details
  exchangeRateRaw?: number
  roklenMarginApplied?: number
  swiftOurFeeCzk?: number
  swiftRoklenFeeCzk?: number
}

export function calculateProductPricing(
  purchasingUnitPrice: number, // Price per purchasing unit (e.g. 1 Role = 981 EUR)
  currency: string,
  totalUnits: number, // Conversion ratio (e.g. 1 Role = 50 m2)
  weightKg: number,
  productClo: number | null,
  margins: { retail: number, partner: number },
  rates: ExchangeRate[],
  settings: GlobalFinanceSettings,
  template?: LogisticsTemplate | null,
  baliciProfil?: BaliciProfil | null,
  balikOverrides?: { delka?: number | null, sirka?: number | null, vyska?: number | null } | null,
  boxSizesList?: StandardBoxSize[]
): PricingBreakdown | null {
  if (totalUnits <= 0) totalUnits = 1 // Prevent division by zero

  // 1. Resolve packaging dimensions and billedWeight
  const packDims = resolvePackageDimensions(
    weightKg,
    baliciProfil || null,
    balikOverrides || {},
    boxSizesList
  )
  const billedWeight = packDims.billedWeight_kg

  // 2. Determine base exchange rates
  let rate = 1
  if (currency === 'CZK') {
    rate = 1
  } else {
    if (settings.pouzivat_manualni_kurzy) {
      if (currency === 'EUR') rate = settings.manualni_kurz_eur || 25
      else if (currency === 'USD') rate = settings.manualni_kurz_usd || 23
      else {
        const cnbRate = rates.find(r => r.mena === currency)
        rate = cnbRate ? cnbRate.kurz_czk / cnbRate.mnozstvi : 1
      }
    } else {
      const cnbRate = rates.find(r => r.mena === currency)
      rate = cnbRate ? cnbRate.kurz_czk / cnbRate.mnozstvi : 1
    }
  }

  // EUR rate for shipping/template logic and tier checking
  let eurRate = 25
  const cnbEur = rates.find(r => r.mena === 'EUR')
  if (settings.pouzivat_manualni_kurzy) {
    eurRate = settings.manualni_kurz_eur || 25
  } else {
    eurRate = cnbEur ? cnbEur.kurz_czk / cnbEur.mnozstvi : 25
  }

  const cnbUsd = rates.find(r => r.mena === 'USD')
  const usdRate = settings.pouzivat_manualni_kurzy ? (settings.manualni_kurz_usd || 23) : (cnbUsd ? cnbUsd.kurz_czk / cnbUsd.mnozstvi : 23)

  // 3. Dynamic RoklenFX Margin & Bank/SWIFT fees
  let roklenMargin = 0
  let swiftRoklenFeeCzk = 0
  let swiftOurFeeCzk = 0

  if (currency !== 'CZK') {
    let priceInEur = purchasingUnitPrice
    if (currency === 'USD') {
      priceInEur = (purchasingUnitPrice * usdRate) / eurRate
    } else if (currency !== 'EUR') {
      priceInEur = (purchasingUnitPrice * rate) / eurRate
    }

    // Determine Roklen Margin Tier
    if (priceInEur <= 1000) {
      roklenMargin = 0.0048
    } else if (priceInEur <= 5000) {
      roklenMargin = 0.0024
    } else if (priceInEur <= 10000) {
      roklenMargin = 0.0012
    } else if (priceInEur <= 100000) {
      roklenMargin = 0.0010
    } else {
      roklenMargin = 0.0008
    }

    // Determine SWIFT Fees
    if (priceInEur < 1000) {
      swiftRoklenFeeCzk = 190
      swiftOurFeeCzk = 0
    } else if (priceInEur <= 4000) {
      swiftRoklenFeeCzk = 0
      swiftOurFeeCzk = 0.30 * purchasingUnitPrice
    } else {
      swiftRoklenFeeCzk = 0
      swiftOurFeeCzk = 0
    }
  }

  const effectiveRate = rate * (1 + roklenMargin)
  const effectiveEurRate = eurRate * (1 + roklenMargin)

  // --- CALCULATE TOTALS ---
  const totalPurchasePriceOrig = purchasingUnitPrice // 981 EUR (for the whole package)
  const totalPurchasePriceCzk = totalPurchasePriceOrig * effectiveRate   // 23,797.18 CZK (with Roklen margin)
  
  // Shipping Cost Logic
  let totalShippingCostCzk = 0
  let shippingSafetyBufferCzk = 0

  if (template) {
    const isV2 = template.typ_vypoctu_dopravy_v2 && template.typ_vypoctu_dopravy_v2 !== 'legacy'
    
    if (isV2) {
      const safety = template.bezpecnostni_koeficient ?? 1.05
      let baseCostCzk = 0

      switch (template.typ_vypoctu_dopravy_v2) {
        case 'linear_czk':
          baseCostCzk = (template.koeficient_a ?? 0) * billedWeight + (template.koeficient_b ?? 0)
          break

        case 'segmented_czk': {
          const segs = template.segmenty_dopravy || []
          const seg = segs.find(s =>
            billedWeight >= s.od_kg && (s.do_kg === null || billedWeight <= s.do_kg)
          ) ?? segs[segs.length - 1]
          
          if (seg) {
            baseCostCzk = seg.a * billedWeight + seg.b
          }
          break
        }

        case 'fixed_eur':
          baseCostCzk = (template.fixni_cena_eur ?? 0) * effectiveEurRate
          break

        case 'pallet_alloc':
          baseCostCzk = ((template.pallet_cena_eur ?? 0) * effectiveEurRate) / (template.pallet_pocet_produktu ?? 1)
          break

        default:
          break
      }

      totalShippingCostCzk = baseCostCzk * safety
      shippingSafetyBufferCzk = totalShippingCostCzk - baseCostCzk
    } else {
      // Legacy templates
      if (template.typ_vypoctu_dopravy === 'procentualni') {
        totalShippingCostCzk = totalPurchasePriceCzk * template.sazba_dopravy
      } else if (template.typ_vypoctu_dopravy === 'vaha_kg') {
        totalShippingCostCzk = billedWeight * template.sazba_dopravy * effectiveEurRate
      } else {
        totalShippingCostCzk = template.sazba_dopravy * effectiveEurRate // Fixed cost per batch
      }
    }
  } else {
    // Default fallback shipping logic
    totalShippingCostCzk = billedWeight * settings.doprava_eur_za_kg * effectiveEurRate
  }
  
  // Customs Logic
  const cloPercent = productClo !== null && productClo !== undefined && productClo > 0 
    ? productClo 
    : (template?.vychozi_clo_procenta ?? settings.clo_default_procenta)
  const totalCustomsCostCzk = (totalPurchasePriceCzk + totalShippingCostCzk) * (cloPercent / 100)
  
  // Granular Fees (CZK) - Dynamically calculated via RoklenFX defaults if standard v2, or fallback to fixed
  let totalBankFeesCzk = swiftRoklenFeeCzk + swiftOurFeeCzk
  
  if (template) {
    const isV2 = template.typ_vypoctu_dopravy_v2 && template.typ_vypoctu_dopravy_v2 !== 'legacy'
    // If the template has a customized bank fee (different from default 190.00) or is legacy, respect it as override
    if (!isV2 || (template.poplatek_banka_czk !== 190)) {
      totalBankFeesCzk = template.poplatek_banka_czk
      swiftRoklenFeeCzk = template.poplatek_banka_czk
      swiftOurFeeCzk = 0
    }
  } else if (currency !== 'CZK' && settings.poplatek_zahranicni_platba_czk !== 190) {
    // Respect settings override if custom
    totalBankFeesCzk = settings.poplatek_zahranicni_platba_czk
    swiftRoklenFeeCzk = settings.poplatek_zahranicni_platba_czk
    swiftOurFeeCzk = 0
  }

  const totalClearingFeesCzk = template?.poplatek_procleni_czk ?? 0
  const totalWasteFeesCzk = template?.poplatek_odpady_czk ?? 0
  const totalPackagingFeesCzk = template?.poplatek_balne_czk ?? 0
  
  // Total Landed Cost
  const totalLandedCostBase = totalPurchasePriceCzk + totalShippingCostCzk + totalCustomsCostCzk + totalBankFeesCzk + totalClearingFeesCzk + totalWasteFeesCzk + totalPackagingFeesCzk
  const totalBufferAmount = totalLandedCostBase * (settings.marze_rezerva_procenta / 100)
  const totalLandedCostWithBuffer = totalLandedCostBase + totalBufferAmount

  // --- CALCULATE PER UNIT ---
  const unitPurchasePriceCzk = totalPurchasePriceCzk / totalUnits
  const unitShippingCostCzk = totalShippingCostCzk / totalUnits
  const unitCustomsCostCzk = totalCustomsCostCzk / totalUnits
  const unitBankFeesCzk = totalBankFeesCzk / totalUnits
  const unitClearingFeesCzk = totalClearingFeesCzk / totalUnits
  const unitWasteFeesCzk = totalWasteFeesCzk / totalUnits
  const unitPackagingFeesCzk = totalPackagingFeesCzk / totalUnits

  const unitLandedCostBase = totalLandedCostBase / totalUnits
  const unitBufferAmount = totalBufferAmount / totalUnits
  const unitLandedCostWithBuffer = totalLandedCostWithBuffer / totalUnits
  
  // 6. Selling Prices (Price = Cost / (1 - Margin))
  const calculatePrice = (cost: number, marginPercent: number) => {
    if (marginPercent >= 100) return cost * 2
    return cost / (1 - marginPercent / 100)
  }

  const b2cUnitPrice = calculatePrice(unitLandedCostWithBuffer, margins.retail)
  const b2bUnitPrice = calculatePrice(unitLandedCostWithBuffer, margins.partner)

  const b2bDiscountedPrices = {
    5: b2bUnitPrice * 0.95,
    10: b2bUnitPrice * 0.90,
    15: b2bUnitPrice * 0.85,
    20: b2bUnitPrice * 0.80
  }

  // 7. Hedging Analysis (Simplified 5-year extremes)
  const strongestRate = currency === 'EUR' ? 23.5 : (currency === 'USD' ? 21.0 : 1)
  const weakestRate = currency === 'EUR' ? 27.5 : (currency === 'USD' ? 25.5 : 1)

  const calculateMargin = (r: number) => {
    const costOrig = (purchasingUnitPrice * r * (1 + roklenMargin)) + totalShippingCostCzk + totalCustomsCostCzk + totalBankFeesCzk + totalClearingFeesCzk + totalWasteFeesCzk + totalPackagingFeesCzk + totalBufferAmount
    const costUnit = costOrig / totalUnits
    return ((b2cUnitPrice - costUnit) / b2cUnitPrice) * 100
  }

  return {
    exchangeRateUsed: effectiveRate,
    currency,
    totalUnits,
    
    totalPurchasePriceCzk,
    totalShippingCostCzk,
    totalCustomsCostCzk,
    totalBankFeesCzk,
    totalClearingFeesCzk,
    totalWasteFeesCzk,
    totalPackagingFeesCzk,

    unitPurchasePriceCzk,
    unitShippingCostCzk,
    unitCustomsCostCzk,
    unitBankFeesCzk,
    unitClearingFeesCzk,
    unitWasteFeesCzk,
    unitPackagingFeesCzk,

    totalLandedCostBase,
    totalBufferAmount,
    totalLandedCostWithBuffer,
    
    unitLandedCostBase,
    unitBufferAmount,
    unitLandedCostWithBuffer,

    b2cUnitPrice,
    b2bUnitPrice,
    b2bDiscountedPrices,
    
    b2cUnitMarginAmount: b2cUnitPrice - unitLandedCostWithBuffer,
    b2bUnitMarginAmount: b2bUnitPrice - unitLandedCostWithBuffer,
    
    currentMargin: margins.retail,
    lowMargin: calculateMargin(weakestRate),
    highMargin: calculateMargin(strongestRate),

    // Shipping Engine v2 outputs
    billedWeightKg: billedWeight,
    volumetricWeightKg: packDims.volumetricWeight_kg,
    packagingDimensions: packDims,
    shippingSafetyBufferCzk,

    // RoklenFX dynamic details
    exchangeRateRaw: rate,
    roklenMarginApplied: roklenMargin,
    swiftOurFeeCzk,
    swiftRoklenFeeCzk
  }
}


