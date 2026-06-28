import React from 'react'
import { Document, Page, Text, View, StyleSheet, Image, Font } from '@react-pdf/renderer'
import { Product } from '@/modules/products/types'
import { PricingBreakdown } from '@/modules/finance/utils/calculations'
import { getThemeTokens } from '@/shared/utils/theme'
import path from 'path'

// Extract theme tokens dynamically from globals.css
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
} else {
  Font.register({
    family: 'Roboto',
    fonts: [
      { src: '/fonts/Roboto-Regular.ttf' },
      { src: '/fonts/Roboto-Bold.ttf', fontWeight: 'bold' }
    ]
  })
}

const styles = StyleSheet.create({
  page: {
    fontFamily:  'Roboto',
    fontSize:    8.5,
    color:       COLORS.text,
    paddingTop:  30,
    paddingBottom: 50,
    paddingLeft: 28,
    paddingRight: 28,
    backgroundColor: COLORS.white,
  },
  
  // ── Hlavička (branding) ──
  headerContainer: {
    position: 'relative',
    width: '100%',
    height: 55,
    marginBottom: 18,
  },
  headerImage: {
    position: 'absolute',
    top: -15,
    left: 0,
    width: '100%',
    height: 52,
  },
  headerTextContainer: {
    position: 'absolute',
    top: 10,
    right: 12,
    alignItems: 'flex-end',
  },
  documentTypeLabel: {
    fontSize:   16,
    fontWeight: 'bold',
    color:      COLORS.primary,
    marginBottom: 3,
  },
  documentSubLabel: {
    fontSize: 8.5,
    color:    COLORS.muted,
  },

  // ── Sekce hlavních kategorií ──
  categoryHeader: {
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
    paddingLeft: 8,
    paddingVertical: 4,
    marginTop: 18,
    marginBottom: 8,
    backgroundColor: '#fbf7fc',
    borderRadius: 2,
  },
  categoryTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: COLORS.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },

  // ── Podsekce (podkategorie / materiály) ──
  subgroupHeader: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingBottom: 2,
    marginTop: 12,
    marginBottom: 6,
  },
  subgroupTitle: {
    fontSize: 8.5,
    fontWeight: 'bold',
    color: COLORS.darkGray,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // ── Tabulky ──
  table: {
    width: '100%',
    marginBottom: 6,
  },
  tableHeader: {
    flexDirection:   'row',
    backgroundColor: COLORS.primary,
    paddingVertical: 5,
    paddingHorizontal: 5,
    borderRadius:    3,
    marginBottom:    0,
  },
  thText: {
    fontSize:   7,
    fontWeight: 'bold',
    color:      COLORS.white,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  tableRow: {
    flexDirection:   'row',
    paddingVertical: 5,
    paddingHorizontal: 5,
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.border,
    alignItems:      'center',
  },
  tableRowAlt: {
    backgroundColor: COLORS.tableAlt,
  },
  tdText: {
    fontSize: 8,
    color:    COLORS.text,
  },
  tdBold: {
    fontSize: 8,
    color:    COLORS.text,
    fontWeight: 'bold',
  },
  tdMuted: {
    fontSize: 7,
    color:    COLORS.muted,
  },

  // ── Šířky sloupců ──
  colName: { flex: 4.2 },
  colSku: { flex: 2.5 },
  colUnitPrice: { flex: 2.2, textAlign: 'right' },
  colUnitCount: { flex: 1.2, textAlign: 'right' },
  colTotalPrice: { flex: 2.0, textAlign: 'right' },
  colPackSize: { flex: 1.2, textAlign: 'right' },

  // ── Patička ──
  footer: {
    position:  'absolute',
    bottom:    20,
    left:      28,
    right:     28,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 0.5,
    borderTopColor: COLORS.border,
    paddingTop:    6,
  },
  footerText: {
    fontSize: 7,
    color:    COLORS.muted,
  },
  pageNumber: {
    fontSize: 7,
    color:    COLORS.muted,
  },
})

interface PricedProduct extends Product {
  pricing: PricingBreakdown | null
}

interface CatalogPDFProps {
  products: PricedProduct[]
  tier: "retail" | "partner" | "partner_5" | "partner_10" | "partner_15" | "partner_20"
  targetCurrency: "CZK" | "EUR" | "USD"
  exchangeRate: number
  lang?: 'cs' | 'en'
}

interface Subgroup {
  key: string
  label: string
  priority: number
  products: PricedProduct[]
}

interface CategoryGroup {
  id: string
  name: string
  subgroups: Subgroup[]
}

function translateCategory(id: string, name: string, lang: 'cs' | 'en'): string {
  if (lang === 'cs') {
    const csMap: Record<string, string> = {
      vyztuzne_materialy: "Výztužné materiály",
      prepregy: "Prepregy",
      pryskyrice: "Pryskyřice a Gelcoaty",
      brouseni_a_lesteni: "Broušení a leštění",
      lepidla: "Lepidla",
      spotrebni_chemie: "Spotřební chemie a čističe",
      cores_standard: "Jádrové materiály",
      cores_active: "Active Core Technology",
      consumables: "Spotřební materiál",
      naradi: "Nářadí",
      chemie: "Chemie"
    };
    return csMap[id] || name;
  } else {
    const enMap: Record<string, string> = {
      vyztuzne_materialy: "Reinforcement Materials",
      prepregy: "Prepregs",
      pryskyrice: "Resins & Gelcoats",
      brouseni_a_lesteni: "Sanding & Polishing",
      lepidla: "Adhesives",
      spotrebni_chemie: "Consumable Chemicals & Cleaners",
      cores_standard: "Core Materials",
      cores_active: "Active Core Technology",
      consumables: "Consumables",
      naradi: "Tools",
      chemie: "Chemicals"
    };
    return enMap[id] || name;
  }
}

function translateUnit(abbr: string, lang: 'cs' | 'en'): string {
  if (lang === 'cs') return abbr;
  const unitMap: Record<string, string> = {
    'ks': 'pcs',
    'bm': 'm',
    'm2': 'm²',
    'kg': 'kg',
    'l': 'l',
    'bal.': 'pack',
    'bal': 'pack'
  };
  return unitMap[abbr.toLowerCase()] || abbr;
}

export const CatalogPDF = ({ products, tier, targetCurrency, exchangeRate, lang = 'cs' }: CatalogPDFProps) => {
  const isCs = lang === 'cs'

  const getTierLabel = () => {
    if (isCs) {
      switch (tier) {
        case 'retail': return 'MALOOBCHODNÍ CENÍK'
        case 'partner': return 'VELKOOBCHODNÍ CENÍK'
        case 'partner_5': return 'VELKOOBCHODNÍ CENÍK (-5 %)'
        case 'partner_10': return 'VELKOOBCHODNÍ CENÍK (-10 %)'
        case 'partner_15': return 'VELKOOBCHODNÍ CENÍK (-15 %)'
        case 'partner_20': return 'VELKOOBCHODNÍ CENÍK (-20 %)'
        default: return 'PRODUKTOVÝ CENÍK'
      }
    } else {
      switch (tier) {
        case 'retail': return 'RETAIL PRICELIST'
        case 'partner': return 'B2B PARTNER PRICELIST'
        case 'partner_5': return 'B2B PARTNER PRICELIST (-5%)'
        case 'partner_10': return 'B2B PARTNER PRICELIST (-10%)'
        case 'partner_15': return 'B2B PARTNER PRICELIST (-15%)'
        case 'partner_20': return 'B2B PARTNER PRICELIST (-20%)'
        default: return 'PRODUCT PRICELIST'
      }
    }
  }

  const formatSkuForPdf = (sku: string) => {
    if (!sku) return ''
    return sku.replace(/-/g, '-\u200B')
  }

  const getNumericPrice = (pr: PricingBreakdown | null) => {
    if (!pr) return 0
    let price = 0
    if (tier === 'retail') price = pr.b2cUnitPrice
    else if (tier === 'partner') price = pr.b2bUnitPrice
    else if (tier === 'partner_5') price = pr.b2bDiscountedPrices[5]
    else if (tier === 'partner_10') price = pr.b2bDiscountedPrices[10]
    else if (tier === 'partner_15') price = pr.b2bDiscountedPrices[15]
    else if (tier === 'partner_20') price = pr.b2bDiscountedPrices[20]
    
    if (targetCurrency !== 'CZK') {
      price = price / exchangeRate
    }
    return price
  }

  const today = isCs ? new Date().toLocaleDateString('cs-CZ') : new Date().toLocaleDateString('en-GB')
  const headerImagePath = path.join(process.cwd(), 'public', 'brand', 'katalog-hlavicka.png')

  // Group products hierarchically by main category and subcategory/material
  const groupedCategories = (() => {
    const cats: Record<string, CategoryGroup> = {}

    products.forEach((p) => {
      const catId = p.kategorie_id || 'nezařazeno'
      const catName = p.c_kategorie?.nazev || 'Nezařazeno'

      if (!cats[catId]) {
        cats[catId] = {
          id: catId,
          name: catName,
          subgroups: []
        }
      }

      let subKey = '_default'
      let subLabel = ''
      let subPriority = 0

      if (catId === 'vyztuzne_materialy') {
        const mat = p.specifikace?.materiál || p.specifikace?.material || 'OF'
        subKey = mat
        
        const materialMapCS: Record<string, string> = {
          CF: "Uhlíková vlákna (Carbon)",
          GF: "Skleněná vlákna (Glass)",
          AF: "Aramidová vlákna (Aramid)",
          BIOF: "Lněná vlákna (Bio Flax)",
          BIOH: "Konopná vlákna (Bio Hemp)",
          PAN: "Polyakrylonitrilová vlákna (PAN)",
          PET: "Polyesterová vlákna (PET)",
          HF: "Hybridní materiály",
          OF: "Ostatní výztuže"
        }
        const materialMapEN: Record<string, string> = {
          CF: "Carbon Fiber Reinforcements",
          GF: "Glass Fiber Reinforcements",
          AF: "Aramid Fiber Reinforcements",
          BIOF: "Flax Reinforcements (Bio Flax)",
          BIOH: "Hemp Reinforcements (Bio Hemp)",
          PAN: "Polyacrylonitrile Reinforcements (PAN)",
          PET: "Polyester Reinforcements (PET)",
          HF: "Hybrid Materials",
          OF: "Other Reinforcements"
        }
        
        subLabel = isCs ? (materialMapCS[mat] || "Ostatní výztuže") : (materialMapEN[mat] || "Other Reinforcements")
        const priorities: Record<string, number> = { CF: 10, GF: 9, AF: 8, HF: 7, BIOF: 6, BIOH: 5, PAN: 4, PET: 3, OF: 2 }
        subPriority = priorities[mat] || 0
      } else if (catId === 'consumables') {
        const sub = p.specifikace?.podkategorie || 'Ostatní'
        subKey = sub
        
        const consumableMapCS: Record<string, string> = {
          BF: "Vakuové fólie (Bagging Film)",
          RF: "Separační fólie (Release Film)",
          PP: "Strhávací tkaniny (Peel Ply)",
          "PP-PTFE": "Teflonové strhávací tkaniny (PTFE Peel Ply)",
          BC: "Odsávací netkané textilie (Breather / Bleeder)",
          ST: "Těsnicí pásky (Sealant Tape)",
          FT: "Lepicí pásky (Flash Tape)",
          FM: "Distribuční síťky (Flow Mesh)",
          FCH: "Distribuční kanálky (Flow Channel)",
          K: "Vakuové konektory a příslušenství"
        }
        const consumableMapEN: Record<string, string> = {
          BF: "Vacuum Bagging Films (Bagging Film)",
          RF: "Release Films (Release Film)",
          PP: "Peel Plies (Peel Ply)",
          "PP-PTFE": "PTFE Coated Peel Plies (PTFE Peel Ply)",
          BC: "Breather/Bleeder Felts (Breather / Bleeder)",
          ST: "Sealant Tapes (Sealant Tape)",
          FT: "Flash Tapes (Flash Tape)",
          FM: "Resin Distribution Mesh (Flow Mesh)",
          FCH: "Resin Distribution Channels (Flow Channel)",
          K: "Vacuum Connectors & Accessories"
        }
        
        subLabel = isCs ? (consumableMapCS[sub] || "Ostatní spotřební materiál") : (consumableMapEN[sub] || "Other Consumables")
        const priorities: Record<string, number> = { BF: 20, RF: 19, PP: 18, "PP-PTFE": 17, BC: 16, ST: 15, FT: 14, FM: 13, FCH: 12, K: 11 }
        subPriority = priorities[sub] || 0
      } else if (catId === 'naradi') {
        const sub = p.specifikace?.podkategorie || 'Ostatní'
        subKey = sub
        
        const toolMapCS: Record<string, string> = {
          BU: "Vakuové průchodky (Hose Connectors)",
          QR: "Rychlospojky (Quick Releases)",
          SQ: "Škrtící svorky (Hose Clamps)",
          V: "Vakuometry (Vacuum Gauges)"
        }
        const toolMapEN: Record<string, string> = {
          BU: "Vacuum Feedthroughs (Hose Connectors)",
          QR: "Quick Releases",
          SQ: "Hose Pinch Clamps",
          V: "Vacuum Gauges"
        }
        
        subLabel = isCs ? (toolMapCS[sub] || "Ostatní nářadí") : (toolMapEN[sub] || "Other Tools")
        const priorities: Record<string, number> = { BU: 30, QR: 29, SQ: 28, V: 27 }
        subPriority = priorities[sub] || 0
      }

      let subgroup = cats[catId].subgroups.find(s => s.key === subKey)
      if (!subgroup) {
        subgroup = {
          key: subKey,
          label: subLabel,
          priority: subPriority,
          products: []
        }
        cats[catId].subgroups.push(subgroup)
      }
      subgroup.products.push(p)
    })

    // Sort categories and subgroups
    const sortedCats = Object.values(cats).map(c => {
      c.subgroups.sort((a, b) => b.priority - a.priority)
      return c
    })

    return sortedCats
  })()

  return (
    <Document
      title={`${getTierLabel()} - ${today}`}
      author="AZ-Composites s.r.o."
    >
      <Page size="A4" style={styles.page}>
        {/* Branding Hlavička */}
        <View style={styles.headerContainer}>
          <Image src={headerImagePath} style={styles.headerImage} />
          <View style={styles.headerTextContainer}>
            <Text style={styles.documentTypeLabel}>{getTierLabel()}</Text>
            <Text style={styles.documentSubLabel}>
              {isCs ? 'Platnost od' : 'Valid from'}: {today} · {isCs ? 'Měna' : 'Currency'}: {targetCurrency}
            </Text>
            <Text style={[styles.documentSubLabel, { fontSize: 7, marginTop: 1 }]}>
              {isCs ? 'Platnost ceníku 14 dní · Ceny bez DPH' : 'Pricelist validity 14 days · Prices excl. VAT'}
            </Text>
          </View>
        </View>

        {/* Hierarchické tabulky podle kategorií a podkategorií */}
        {groupedCategories.map((cat) => (
          <View key={cat.id} style={{ marginBottom: 12 }}>
            {/* Nadpis hlavní kategorie */}
            <View style={styles.categoryHeader}>
              <Text style={styles.categoryTitle}>
                {translateCategory(cat.id, cat.name, lang)}
              </Text>
            </View>

            {cat.subgroups.map((sub) => (
              <View key={sub.key} style={{ marginBottom: 10 }}>
                {/* Nadpis podkategorie */}
                {sub.key !== '_default' ? (
                  <View style={styles.subgroupHeader}>
                    <Text style={styles.subgroupTitle}>{sub.label}</Text>
                  </View>
                ) : (
                  <View />
                )}

                {/* Tabulka položek */}
                <View style={styles.table}>
                  {/* Table Header */}
                  <View style={styles.tableHeader}>
                    <Text style={[styles.thText, styles.colName]}>{isCs ? "Název produktu" : "Product Name"}</Text>
                    <Text style={[styles.thText, styles.colSku]}>{isCs ? "Kód produktu" : "Product Code"}</Text>
                    <Text style={[styles.thText, styles.colUnitPrice]}>{isCs ? "Cena / jedn." : "Price / Unit"}</Text>
                    <Text style={[styles.thText, styles.colUnitCount]}>{isCs ? "Počet" : "Qty"}</Text>
                    <Text style={[styles.thText, styles.colTotalPrice]}>{isCs ? "Cena balení" : "Pack Price"}</Text>
                    <Text style={[styles.thText, styles.colPackSize]}>{isCs ? "Balení" : "Packaging"}</Text>
                  </View>

                  {/* Table Body */}
                  {sub.products.map((p, idx) => {
                    const pricePerUnit = getNumericPrice(p.pricing)
                    const qtyInPack = p.mnozstvi_v_baleni || 1
                    const totalPriceVal = pricePerUnit * qtyInPack
                    const rawUnitAbbr = p.c_merne_jednotky_zakladni?.zkratka || ''
                    const rawPackAbbr = p.c_merne_jednotky_baleni?.zkratka || 'bal.'
                    
                    const unitAbbr = translateUnit(rawUnitAbbr, lang)
                    const packAbbr = translateUnit(rawPackAbbr, lang)
                    const isAlt = idx % 2 === 1
                    
                    const onRequestText = isCs ? "Na dotaz" : "On request"
                    const productName = isCs ? p.nazev : (p.nazev_en || p.nazev)

                    return (
                      <View style={[styles.tableRow, isAlt ? styles.tableRowAlt : {}]} key={p.id} wrap={false}>
                        <View style={styles.colName}>
                          <Text style={styles.tdText}>{productName}</Text>
                        </View>
                        <Text style={[styles.tdText, styles.tdMuted, styles.colSku]}>
                          {formatSkuForPdf(p.sku)}
                        </Text>
                        <Text style={[styles.tdText, styles.colUnitPrice]}>
                          {pricePerUnit > 0 ? `${pricePerUnit.toFixed(2)} ${targetCurrency} / ${unitAbbr}` : onRequestText}
                        </Text>
                        <Text style={[styles.tdText, styles.colUnitCount]}>
                          {`${qtyInPack} ${unitAbbr}`}
                        </Text>
                        <Text style={[styles.tdBold, styles.colTotalPrice]}>
                          {pricePerUnit > 0 ? `${totalPriceVal.toFixed(2)} ${targetCurrency}` : onRequestText}
                        </Text>
                        <Text style={[styles.tdText, styles.colPackSize]}>
                          {`1 ${packAbbr}`}
                        </Text>
                      </View>
                    )
                  })}
                </View>
              </View>
            ))}
          </View>
        ))}

        {/* Patička */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            {isCs 
              ? "AZ-Composites s.r.o. · Ceny jsou bez DPH a nezahrnují finální dopravu ke klientovi." 
              : "AZ-Composites s.r.o. · Prices are excl. VAT and do not include final shipping to the client."}
          </Text>
          <Text style={styles.pageNumber} render={({ pageNumber, totalPages }) =>
            isCs ? `Strana ${pageNumber} / ${totalPages}` : `Page ${pageNumber} / ${totalPages}`
          } />
        </View>
      </Page>
    </Document>
  )
}
