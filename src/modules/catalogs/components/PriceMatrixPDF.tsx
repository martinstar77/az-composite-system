import React from 'react'
import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer'
import { Product } from '@/modules/products/types'
import { PricingBreakdown } from '@/modules/finance/utils/calculations'
import { getThemeTokens } from '@/shared/utils/theme'
import path from 'path'

const tokens = getThemeTokens()
const COLORS = {
  primary:    tokens.primary || '#8A0485',
  darkGray:   tokens['muted-foreground'] || '#4D4D4D',
  text:       tokens.foreground || '#18181b',
  muted:      tokens['muted-foreground'] || '#71717a',
  border:     tokens.border || '#e4e4e7',
  background: tokens.background || '#fafafa',
  white:      '#ffffff',
  tableAlt:   '#f5f5f8',
  cogsBg:     '#fffdf5',
  salesBg:    '#f5f9ff',
  cogsBorder: '#f0e3b9',
  salesBorder: '#d6e4f0'
}

// Register Roboto font to support Czech diacritics
const isNode = typeof process !== 'undefined' && process.versions && !!process.versions.node
if (isNode) {
  const fontsDir = path.join(process.cwd(), 'public', 'fonts')
  Font.register({
    family: 'Roboto',
    fonts: [
      { src: path.join(fontsDir, 'Roboto-Regular.ttf') },
      { src: path.join(fontsDir, 'Roboto-Bold.ttf'), fontWeight: 'bold' }
    ]
  })
}

const styles = StyleSheet.create({
  page: {
    fontFamily:  'Roboto',
    fontSize:    7,
    color:       COLORS.text,
    paddingTop:  40,
    paddingBottom: 40,
    paddingLeft: 24,
    paddingRight: 24,
    backgroundColor: COLORS.white,
  },
  titleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1.5,
    borderBottomColor: COLORS.primary,
    paddingBottom: 6,
    marginBottom: 12,
  },
  titleText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  metaText: {
    fontSize: 7.5,
    color: COLORS.muted,
  },
  table: {
    width: '100%',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: COLORS.primary,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.primary,
  },
  thText: {
    color: COLORS.white,
    fontWeight: 'bold',
    fontSize: 6.5,
    padding: 3,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.border,
    alignItems: 'center',
  },
  tableRowAlt: {
    backgroundColor: COLORS.tableAlt,
  },
  tdText: {
    fontSize: 6.5,
    padding: 3,
  },
  tdBold: {
    fontSize: 6.5,
    fontWeight: 'bold',
    padding: 3,
  },
  textRight: {
    textAlign: 'right',
  },
  colName: {
    width: 140,
  },
  colSourcing: {
    width: 100,
  },
  colPurchase: {
    width: 60,
  },
  colShipping: {
    width: 48,
  },
  colCustoms: {
    width: 40,
  },
  colBank: {
    width: 45,
  },
  colClearing: {
    width: 45,
  },
  colWaste: {
    width: 40,
  },
  colPackFee: {
    width: 40,
  },
  colSafety: {
    width: 50,
  },
  colBuffer: {
    width: 48,
  },
  colLanded: {
    width: 65,
  },
  colB2c: {
    width: 75,
  },
  colB2b: {
    width: 75,
  },
  colDiscount: {
    width: 50,
  },
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 24,
    right: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 0.5,
    borderTopColor: COLORS.border,
    paddingTop: 4,
  },
  footerText: {
    fontSize: 6,
    color: COLORS.muted,
  },
  pageNumber: {
    fontSize: 6,
    color: COLORS.muted,
  }
})

interface PriceMatrixPDFProps {
  products: any[]
  viewMode: 'cogs' | 'sales'
  unitMode: 'basic' | 'packaging'
  targetCurrency: string
  exchangeRate: number
  lang: 'cs' | 'en'
}

export function PriceMatrixPDF({
  products,
  viewMode,
  unitMode,
  targetCurrency,
  exchangeRate,
  lang
}: PriceMatrixPDFProps) {
  const isCs = lang === 'cs'
  const isBasic = unitMode === 'basic'

  const formatCurrency = (val: number) => {
    let finalVal = val
    if (targetCurrency !== 'CZK') {
      finalVal = val / exchangeRate
    }
    return new Intl.NumberFormat(isCs ? 'cs-CZ' : 'en-US', {
      style: 'currency',
      currency: targetCurrency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(finalVal)
  }

  const getPackMultiplier = (p: any, pr: any) => {
    const primarySourcing = p.produkt_dodavatel?.find((s: any) => s.is_primary) || p.produkt_dodavatel?.[0]
    const isBuyingInBasicUnit = primarySourcing?.nakupni_mj_id === p.zakladni_mj_id &&
      (!primarySourcing?.prevodni_pomer_na_zakladni || primarySourcing.prevodni_pomer_na_zakladni === 1)
    const totalUnits = primarySourcing
      ? ((primarySourcing.prevodni_pomer_na_zakladni && primarySourcing.prevodni_pomer_na_zakladni !== 1)
          ? primarySourcing.prevodni_pomer_na_zakladni
          : (isBuyingInBasicUnit ? 1 : (p.mnozstvi_v_baleni || 1)))
      : 1
    const continuousUnits = ['liter', 'l', 'kg', 'm2', 'm', 'bm', 'g']
    const isContinuous = p.zakladni_mj_id ? continuousUnits.some(u => p.zakladni_mj_id.toLowerCase().includes(u)) : false
    return isContinuous ? totalUnits : (p.mnozstvi_v_baleni || 1)
  }

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        {/* Hlavička */}
        <View style={styles.titleContainer} fixed>
          <View>
            <Text style={styles.titleText}>
              {isCs ? 'AZ COMPOSITE - INTERNÍ PRICE MATRIX' : 'AZ COMPOSITE - INTERNAL PRICE MATRIX'}
            </Text>
            <Text style={styles.metaText}>
              {isCs 
                ? `Režim: ${viewMode === 'cogs' ? 'Náklady (COGS)' : 'Prodejní ceny (Sales)'} | Množství: ${isBasic ? '1 MJ (Základní)' : 'Celé balení'}`
                : `Mode: ${viewMode === 'cogs' ? 'Costs (COGS)' : 'Sales Prices'} | Quantity: ${isBasic ? '1 MJ (Basic)' : 'Whole package'}`
              }
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.metaText}>
              {isCs ? `Měna: ${targetCurrency}` : `Currency: ${targetCurrency}`}
            </Text>
            <Text style={styles.metaText}>
              {isCs ? `Datum exportu: ${new Date().toLocaleDateString('cs-CZ')}` : `Date: ${new Date().toLocaleDateString('en-GB')}`}
            </Text>
          </View>
        </View>

        {/* Tabulka */}
        <View style={styles.table}>
          {/* Záhlaví tabulky */}
          <View style={styles.tableHeader} fixed>
            <View style={styles.colName}>
              <Text style={styles.thText}>{isCs ? 'Produkt' : 'Product'}</Text>
            </View>
            <View style={styles.colSourcing}>
              <Text style={styles.thText}>{isCs ? 'Dodavatel / Šablona' : 'Supplier / Template'}</Text>
            </View>

            {viewMode === 'cogs' ? (
              <>
                <View style={styles.colPurchase}>
                  <Text style={[styles.thText, styles.textRight]}>{isCs ? 'Nákup' : 'Purchase'}</Text>
                </View>
                <View style={styles.colShipping}>
                  <Text style={[styles.thText, styles.textRight]}>{isCs ? 'Doprava' : 'Shipping'}</Text>
                </View>
                <View style={styles.colCustoms}>
                  <Text style={[styles.thText, styles.textRight]}>{isCs ? 'Clo' : 'Customs'}</Text>
                </View>
                <View style={styles.colBank}>
                  <Text style={[styles.thText, styles.textRight]}>{isCs ? 'Banka' : 'Bank'}</Text>
                </View>
                <View style={styles.colClearing}>
                  <Text style={[styles.thText, styles.textRight]}>{isCs ? 'Proclení' : 'Clearing'}</Text>
                </View>
                <View style={styles.colWaste}>
                  <Text style={[styles.thText, styles.textRight]}>{isCs ? 'Odpady' : 'Waste'}</Text>
                </View>
                <View style={styles.colPackFee}>
                  <Text style={[styles.thText, styles.textRight]}>{isCs ? 'Balné' : 'Pack Fee'}</Text>
                </View>
                <View style={styles.colSafety}>
                  <Text style={[styles.thText, styles.textRight]}>{isCs ? 'Pojištění' : 'Safety'}</Text>
                </View>
                <View style={styles.colBuffer}>
                  <Text style={[styles.thText, styles.textRight]}>{isCs ? 'Rezerva' : 'Buffer'}</Text>
                </View>
                <View style={styles.colLanded}>
                  <Text style={[styles.thText, styles.textRight]}>{isCs ? 'Landed Cost' : 'Landed Cost'}</Text>
                </View>
              </>
            ) : (
              <>
                <View style={styles.colPurchase}>
                  <Text style={[styles.thText, styles.textRight]}>{isCs ? 'Nákup' : 'Purchase'}</Text>
                </View>
                <View style={styles.colLanded}>
                  <Text style={[styles.thText, styles.textRight]}>{isCs ? 'Landed Cost' : 'Landed Cost'}</Text>
                </View>
                <View style={styles.colB2c}>
                  <Text style={[styles.thText, styles.textRight]}>{isCs ? 'Retail B2C' : 'Retail B2C'}</Text>
                </View>
                <View style={styles.colB2b}>
                  <Text style={[styles.thText, styles.textRight]}>{isCs ? 'Partner B2B' : 'Partner B2B'}</Text>
                </View>
                <View style={styles.colDiscount}>
                  <Text style={[styles.thText, styles.textRight]}>B2B -5%</Text>
                </View>
                <View style={styles.colDiscount}>
                  <Text style={[styles.thText, styles.textRight]}>B2B -10%</Text>
                </View>
                <View style={styles.colDiscount}>
                  <Text style={[styles.thText, styles.textRight]}>B2B -15%</Text>
                </View>
                <View style={styles.colDiscount}>
                  <Text style={[styles.thText, styles.textRight]}>B2B -20%</Text>
                </View>
              </>
            )}
          </View>

          {/* Řádky tabulky */}
          {products.map((p, idx) => {
            const pr: PricingBreakdown | null = p.pricing
            const hasPricing = !!pr
            const isAlt = idx % 2 === 1

            const primarySourcing = p.produkt_dodavatel?.find((s: any) => s.is_primary) || p.produkt_dodavatel?.[0]
            const template = primarySourcing?.logisticke_sablony?.nazev || '—'
            const supplier = primarySourcing?.dodavatele?.nazev_spolecnosti || '—'

            const mult = hasPricing ? (isBasic ? 1 : getPackMultiplier(p, pr)) : 1

            // Precalculated values in CZK
            const purchasePriceDisp = pr ? (pr.unitPurchasePriceCzk * mult) : 0
            const shippingDisp = pr ? (pr.unitShippingCostCzk * mult) : 0
            const customsDisp = pr ? (pr.unitCustomsCostCzk * mult) : 0
            const bankFeesDisp = pr ? (pr.unitBankFeesCzk * mult) : 0
            const clearingDisp = pr ? (pr.unitClearingFeesCzk * mult) : 0
            const wasteDisp = pr ? (pr.unitWasteFeesCzk * mult) : 0
            const packagingDisp = pr ? (pr.unitPackagingFeesCzk * mult) : 0
            const safetyBufferDisp = pr ? ((pr.shippingSafetyBufferCzk ? (pr.shippingSafetyBufferCzk / pr.totalUnits) : 0) * mult) : 0
            const bufferDisp = pr ? (pr.unitBufferAmount * mult) : 0
            const landedCostDisp = pr ? (pr.unitLandedCostWithBuffer * mult) : 0
            const b2cPriceDisp = pr ? (pr.b2cUnitPrice * mult) : 0
            const b2bPriceDisp = pr ? (pr.b2bUnitPrice * mult) : 0
            const b2bDiscountedDisp = pr ? {
              5: pr.b2bDiscountedPrices[5] * mult,
              10: pr.b2bDiscountedPrices[10] * mult,
              15: pr.b2bDiscountedPrices[15] * mult,
              20: pr.b2bDiscountedPrices[20] * mult
            } : { 5: 0, 10: 0, 15: 0, 20: 0 }

            return (
              <View style={[styles.tableRow, isAlt ? styles.tableRowAlt : {}]} key={p.id} wrap={false}>
                {/* Název a SKU */}
                <View style={styles.colName}>
                  <Text style={styles.tdBold}>{p.nazev}</Text>
                  <Text style={[styles.tdText, { color: COLORS.muted, fontSize: 5.5, paddingTop: 0 }]}>{p.sku}</Text>
                </View>

                {/* Sourcing */}
                <View style={styles.colSourcing}>
                  <Text style={styles.tdText}>{supplier}</Text>
                  <Text style={[styles.tdText, { color: COLORS.muted, fontSize: 5.5, paddingTop: 0 }]}>{template}</Text>
                </View>

                {viewMode === 'cogs' ? (
                  <>
                    <View style={styles.colPurchase}>
                      <Text style={[styles.tdText, styles.textRight, { fontWeight: 'bold' }]}>
                        {hasPricing ? formatCurrency(purchasePriceDisp) : '—'}
                      </Text>
                    </View>
                    <View style={styles.colShipping}>
                      <Text style={[styles.tdText, styles.textRight]}>
                        {hasPricing ? formatCurrency(shippingDisp) : '—'}
                      </Text>
                    </View>
                    <View style={styles.colCustoms}>
                      <Text style={[styles.tdText, styles.textRight]}>
                        {hasPricing ? formatCurrency(customsDisp) : '—'}
                      </Text>
                    </View>
                    <View style={styles.colBank}>
                      <Text style={[styles.tdText, styles.textRight]}>
                        {hasPricing ? formatCurrency(bankFeesDisp) : '—'}
                      </Text>
                    </View>
                    <View style={styles.colClearing}>
                      <Text style={[styles.tdText, styles.textRight]}>
                        {hasPricing ? formatCurrency(clearingDisp) : '—'}
                      </Text>
                    </View>
                    <View style={styles.colWaste}>
                      <Text style={[styles.tdText, styles.textRight]}>
                        {hasPricing ? formatCurrency(wasteDisp) : '—'}
                      </Text>
                    </View>
                    <View style={styles.colPackFee}>
                      <Text style={[styles.tdText, styles.textRight]}>
                        {hasPricing ? formatCurrency(packagingDisp) : '—'}
                      </Text>
                    </View>
                    <View style={styles.colSafety}>
                      <Text style={[styles.tdText, styles.textRight]}>
                        {hasPricing ? formatCurrency(safetyBufferDisp) : '—'}
                      </Text>
                    </View>
                    <View style={styles.colBuffer}>
                      <Text style={[styles.tdText, styles.textRight]}>
                        {hasPricing ? formatCurrency(bufferDisp) : '—'}
                      </Text>
                    </View>
                    <View style={[styles.colLanded, { backgroundColor: COLORS.cogsBg }]}>
                      <Text style={[styles.tdBold, styles.textRight, { color: COLORS.primary }]}>
                        {hasPricing ? formatCurrency(landedCostDisp) : '—'}
                      </Text>
                    </View>
                  </>
                ) : (
                  <>
                    <View style={styles.colPurchase}>
                      <Text style={[styles.tdText, styles.textRight]}>
                        {hasPricing ? formatCurrency(purchasePriceDisp) : '—'}
                      </Text>
                    </View>
                    <View style={styles.colLanded}>
                      <Text style={[styles.tdText, styles.textRight]}>
                        {hasPricing ? formatCurrency(landedCostDisp) : '—'}
                      </Text>
                    </View>
                    <View style={[styles.colB2c, { backgroundColor: COLORS.salesBg }]}>
                      <Text style={[styles.tdBold, styles.textRight]}>
                        {hasPricing ? formatCurrency(b2cPriceDisp) : '—'}
                      </Text>
                    </View>
                    <View style={[styles.colB2b, { backgroundColor: COLORS.salesBg }]}>
                      <Text style={[styles.tdBold, styles.textRight, { color: COLORS.primary }]}>
                        {hasPricing ? formatCurrency(b2bPriceDisp) : '—'}
                      </Text>
                    </View>
                    <View style={styles.colDiscount}>
                      <Text style={[styles.tdText, styles.textRight]}>
                        {hasPricing ? formatCurrency(b2bDiscountedDisp[5]) : '—'}
                      </Text>
                    </View>
                    <View style={styles.colDiscount}>
                      <Text style={[styles.tdText, styles.textRight]}>
                        {hasPricing ? formatCurrency(b2bDiscountedDisp[10]) : '—'}
                      </Text>
                    </View>
                    <View style={styles.colDiscount}>
                      <Text style={[styles.tdText, styles.textRight]}>
                        {hasPricing ? formatCurrency(b2bDiscountedDisp[15]) : '—'}
                      </Text>
                    </View>
                    <View style={styles.colDiscount}>
                      <Text style={[styles.tdText, styles.textRight]}>
                        {hasPricing ? formatCurrency(b2bDiscountedDisp[20]) : '—'}
                      </Text>
                    </View>
                  </>
                )}
              </View>
            )
          })}
        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            {isCs 
              ? 'AZ Composite · Interní Price Matrix · Ceny jsou důvěrné a slouží výhradně pro interní potřeby společnosti.'
              : 'AZ Composite · Internal Price Matrix · Prices are confidential and for internal use only.'}
          </Text>
          <Text style={styles.pageNumber} render={({ pageNumber, totalPages }) =>
            isCs ? `Strana ${pageNumber} / ${totalPages}` : `Page ${pageNumber} / ${totalPages}`
          } />
        </View>
      </Page>
    </Document>
  )
}
