import { ExchangeRate, GlobalFinanceSettings } from "@/modules/finance/types"
import { LogisticsTemplate } from "../types/logistics"

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
  template?: LogisticsTemplate | null
): PricingBreakdown | null {
  if (totalUnits <= 0) totalUnits = 1 // Prevent division by zero

  // 1. Determine exchange rate
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

  // EUR rate for shipping/template logic
  let eurRate = 25
  const cnbEur = rates.find(r => r.mena === 'EUR')
  if (settings.pouzivat_manualni_kurzy) {
    eurRate = settings.manualni_kurz_eur || 25
  } else {
    eurRate = cnbEur ? cnbEur.kurz_czk / cnbEur.mnozstvi : 25
  }

  // --- CALCULATE TOTALS ---
  const totalPurchasePriceOrig = purchasingUnitPrice // 981 EUR (for the whole package)
  const totalPurchasePriceCzk = totalPurchasePriceOrig * rate   // 23,797.18 CZK
  
  // Shipping Cost Logic
  let totalShippingCostCzk = 0
  if (template) {
    if (template.typ_vypoctu_dopravy === 'procentualni') {
      totalShippingCostCzk = totalPurchasePriceCzk * template.sazba_dopravy
    } else if (template.typ_vypoctu_dopravy === 'vaha_kg') {
      totalShippingCostCzk = weightKg * template.sazba_dopravy * eurRate
    } else {
      totalShippingCostCzk = template.sazba_dopravy * eurRate // Fixed cost per batch
    }
  } else {
    totalShippingCostCzk = weightKg * settings.doprava_eur_za_kg * eurRate
  }
  
  // Customs Logic
  const cloPercent = productClo !== null && productClo !== undefined && productClo > 0 
    ? productClo 
    : (template?.vychozi_clo_procenta ?? settings.clo_default_procenta)
  const totalCustomsCostCzk = (totalPurchasePriceCzk + totalShippingCostCzk) * (cloPercent / 100)
  
  // Granular Fees (CZK) - These are usually fixed per delivery/order, not per unit
  const totalBankFeesCzk = template?.poplatek_banka_czk ?? settings.poplatek_zahranicni_platba_czk
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
    const costOrig = (purchasingUnitPrice * r) + totalShippingCostCzk + totalCustomsCostCzk + totalBankFeesCzk + totalClearingFeesCzk + totalWasteFeesCzk + totalPackagingFeesCzk + totalBufferAmount
    const costUnit = costOrig / totalUnits
    return ((b2cUnitPrice - costUnit) / b2cUnitPrice) * 100
  }

  return {
    exchangeRateUsed: rate,
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
    highMargin: calculateMargin(strongestRate)
  }
}

