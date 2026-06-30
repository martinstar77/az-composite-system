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
    paddingTop:  78,      // Increased to leave room for the absolute running header on every page
    paddingBottom: 50,
    paddingLeft: 28,
    paddingRight: 28,
    backgroundColor: COLORS.white,
  },
  
  // ── Hlavička (branding) ──
  // Container is absolute to serve as a running header on all pages without shifting layout content flow.
  headerContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 595,           // full width of A4 page
    height: 78,
  },
  headerImage: {
    position: 'absolute',
    top: 12,              // shifted down to leave a clean margin at the top of the page
    left: -14,            // push left relative to container edge to crop the PNG white border
    width: 609,           // covers right edge (-14 + 609 = 595)
    height: 59,           // preserves original 10.266 aspect ratio
  },
  headerTextContainer: {
    alignItems: 'flex-end',
  },
  firstPageHeaderInfo: {
    width: '100%',
    alignItems: 'flex-end',
    marginTop: -32,       // Pulls the text up so it aligns nicely with the running purple logo bar on page 1
    marginBottom: 20,
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
    fontSize: 6,
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

function isHighTemp(temp: any): boolean {
  if (!temp) return false
  const tempStr = String(temp).toUpperCase()
  if (tempStr.includes('HT')) return true
  if (tempStr.includes('LT')) return false
  const match = tempStr.match(/\d+/)
  if (match) {
    const val = parseInt(match[0])
    return val > 150
  }
  return false
}

import { translateCategory, translateUnit } from '../utils/catalogHelpers'

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
        const form = p.specifikace?.typ || 'WF'
        const weave = p.specifikace?.vazba || ''
        
        const materialMapCS: Record<string, string> = {
          CF: "Uhlíková vlákna",
          GF: "Skelná vlákna",
          AF: "Aramidová vlákna",
          BIOF: "Lněná vlákna",
          BIOH: "Konopná vlákna",
          PAN: "Polyakrylonitrilová vlákna",
          PET: "Polyesterová vlákna",
          HF: "Hybridní materiály",
          OF: "Ostatní výztuže"
        }
        const materialMapEN: Record<string, string> = {
          CF: "Carbon Fiber",
          GF: "Glass Fiber",
          AF: "Aramid Fiber",
          BIOF: "Flax Reinforcements",
          BIOH: "Hemp Reinforcements",
          PAN: "Polyacrylonitrile",
          PET: "Polyester",
          HF: "Hybrid Materials",
          OF: "Other Reinforcements"
        }

        const matNameCS = materialMapCS[mat] || "Ostatní výztuže"
        const matNameEN = materialMapEN[mat] || "Other Reinforcements"

        if (form === 'UD') {
          subKey = `${mat}_UD`
          subLabel = isCs ? `${matNameCS} - UD pásky` : `${matNameEN} - UD Tapes`
        } else if (form === 'BIAX') {
          subKey = `${mat}_BIAX`
          subLabel = isCs ? `${matNameCS} - biaxiální tkaniny` : `${matNameEN} - Biaxial Fabrics`
        } else if (form === 'MAT') {
          subKey = `${mat}_MAT`
          subLabel = isCs ? `${matNameCS} - rohože` : `${matNameEN} - Mats`
        } else if (form === 'WF') {
          if (weave === 'P') {
            subKey = `${mat}_WF_P`
            subLabel = isCs ? `${matNameCS} - tkaniny plátno (Plain)` : `${matNameEN} - Plain Weave Fabrics`
          } else if (weave === 'T22' || weave === 'T44') {
            subKey = `${mat}_WF_T`
            subLabel = isCs ? `${matNameCS} - tkaniny kepr (Twill)` : `${matNameEN} - Twill Weave Fabrics`
          } else {
            subKey = `${mat}_WF_other`
            subLabel = isCs ? `${matNameCS} - tkaniny ostatní` : `${matNameEN} - Other Fabrics`
          }
        } else {
          subKey = `${mat}_other`
          subLabel = isCs ? `${matNameCS} - ostatní` : `${matNameEN} - Other`
        }

        const matPriorities: Record<string, number> = { CF: 10, GF: 9, AF: 8, HF: 7, BIOF: 6, BIOH: 5, PAN: 4, PET: 3, OF: 2 }
        const basePriority = matPriorities[mat] || 0
        let formOffset = 0
        if (form === 'WF') {
          if (weave === 'T22' || weave === 'T44') formOffset = 0.5
          else if (weave === 'P') formOffset = 0.4
          else formOffset = 0.3
        } else if (form === 'UD') {
          formOffset = 0.2
        } else if (form === 'BIAX') {
          formOffset = 0.1
        }
        subPriority = basePriority + formOffset
      } else if (catId === 'consumables') {
        const sub = p.specifikace?.podkategorie || 'Ostatní'
        
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
          K: "Vakuové konektory a příslušenství",
          TUBE: "Hadice (Hoses)",
          MTI: "MTI systémy (MTI Systems)",
          KP: "Průchodné konektory (Through Connectors)",
          Ostatní: "Ostatní spotřební materiál"
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
          K: "Vacuum Connectors & Accessories",
          TUBE: "Hoses (Hoses)",
          MTI: "MTI Systems",
          KP: "Through Connectors",
          Ostatní: "Other Consumables"
        }

        if (sub === 'BF') {
          const isHT = isHighTemp(p.specifikace?.teplotni_odolnost)
          subKey = isHT ? 'BF_HT' : 'BF_LT'
          subLabel = isCs
            ? (isHT ? "Vakuové fólie - vysokoteplotní (High Temp)" : "Vakuové fólie - nízkoteplotní (Low Temp)")
            : (isHT ? "Vacuum Bagging Films - High Temp" : "Vacuum Bagging Films - Low Temp")
          subPriority = isHT ? 20.2 : 20.1
        } else if (sub === 'RF') {
          const isHT = isHighTemp(p.specifikace?.teplotni_odolnost)
          subKey = isHT ? 'RF_HT' : 'RF_LT'
          subLabel = isCs
            ? (isHT ? "Separační fólie - vysokoteplotní (High Temp)" : "Separační fólie - nízkoteplotní (Low Temp)")
            : (isHT ? "Release Films - High Temp" : "Release Films - Low Temp")
          subPriority = isHT ? 19.2 : 19.1
        } else if (sub === 'PP') {
          const poly = p.specifikace?.polymer || 'PA66'
          const weight = p.specifikace?.gramaz_gm2 || ''
          const polyLabel = poly === 'PE' ? 'Polyester (PE)' : 'Nylon (PA66)'
          subKey = `PP_${poly}_${weight}`
          subLabel = isCs
            ? `Strhávací tkaniny - ${polyLabel} ${weight ? `${weight} g/m²` : ''}`
            : `Peel Plies - ${polyLabel} ${weight ? `${weight} g/m²` : ''}`
          subPriority = 18.0 + (poly === 'PE' ? 0.2 : 0.4) + (weight ? parseFloat(weight) / 1000 : 0)
        } else {
          subKey = sub
          subLabel = isCs ? (consumableMapCS[sub] || "Ostatní spotřební materiál") : (consumableMapEN[sub] || "Other Consumables")
          const priorities: Record<string, number> = { 
            "PP-PTFE": 17, 
            BC: 16, 
            ST: 15, 
            FT: 14, 
            FM: 13, 
            FCH: 12, 
            K: 11, 
            TUBE: 10, 
            MTI: 9, 
            KP: 8, 
            Ostatní: 1 
          }
          subPriority = priorities[sub] || 0
        }
      } else if (catId === 'naradi') {
        const sub = p.specifikace?.podkategorie || 'Ostatní'
        
        const toolMapCS: Record<string, string> = {
          BU: "Vakuové průchodky (Hose Connectors)",
          QR: "Rychlospojky (Quick Releases)",
          SQ: "Škrtící svorky (Hose Clamps)",
          V: "Vakuometry (Vacuum Gauges)",
          CU: "Mycí stanice RST5",
          SU: "Spinner units Spin RST5",
          Ostatní: "Ostatní nářadí"
        }
        const toolMapEN: Record<string, string> = {
          BU: "Vacuum Feedthroughs (Hose Connectors)",
          QR: "Quick Releases",
          SQ: "Hose Pinch Clamps",
          V: "Vacuum Gauges",
          CU: "RST5 Cleaning Stations",
          SU: "Spinner Units Spin RST5",
          Ostatní: "Other Tools"
        }

        if (sub === 'QR') {
          const mat = p.specifikace?.material || 'other'
          const matMapCS: Record<string, string> = {
            BRS: "mosaz",
            STL: "ocel",
            SS: "nerez",
            other: "ostatní"
          }
          const matMapEN: Record<string, string> = {
            BRS: "brass",
            STL: "steel",
            SS: "stainless steel",
            other: "other"
          }
          const matLabelCS = matMapCS[mat] || mat.toLowerCase()
          const matLabelEN = matMapEN[mat] || mat.toLowerCase()
          subKey = `QR_${mat}`
          subLabel = isCs ? `Rychlospojky - ${matLabelCS}` : `Quick Releases - ${matLabelEN}`
          const priorities: Record<string, number> = { SS: 29.3, BRS: 29.2, STL: 29.1, other: 29.0 }
          subPriority = priorities[mat] || 29.0
        } else {
          subKey = sub
          subLabel = isCs ? (toolMapCS[sub] || "Ostatní nářadí") : (toolMapEN[sub] || "Other Tools")
          const priorities: Record<string, number> = { BU: 30, SQ: 28, V: 27, CU: 26, SU: 25, Ostatní: 1 }
          subPriority = priorities[sub] || 0
        }
      } else if (catId === 'brouseni_a_lesteni') {
        const sub = p.specifikace?.podkategorie || 'ostatni'
        subKey = sub
        
        const mapCS: Record<string, string> = {
          vosk: "Vosky a ochrana",
          pasty: "Brusné a lešticí pasty",
          brusne_kotouce: "Brusné a lešticí kotouče",
          prislusenstvi: "Příslušenství",
          ostatni: "Ostatní broušení a leštění"
        }
        const mapEN: Record<string, string> = {
          vosk: "Waxes & Protection",
          pasty: "Buffing & Polishing Compounds",
          brusne_kotouce: "Buffing & Polishing Pads",
          prislusenstvi: "Accessories",
          ostatni: "Other Sanding & Polishing"
        }
        
        subLabel = isCs ? (mapCS[sub] || "Ostatní") : (mapEN[sub] || "Other")
        const priorities: Record<string, number> = { pasty: 10, brusne_kotouce: 9, vosk: 8, prislusenstvi: 7, ostatni: 1 }
        subPriority = priorities[sub] || 0
      } else if (catId === 'chemie') {
        const sub = p.specifikace?.podkategorie || 'ostatni'
        subKey = sub
        
        const mapCS: Record<string, string> = {
          lepidlo_ve_spreji: "Lepidla ve spreji",
          blinder: "Bindery",
          plnic_poru_sealer: "Plniče pórů (Sealer)",
          separatory_release_agent: "Separátory (Release Agent)",
          ostatni: "Ostatní chemie"
        }
        const mapEN: Record<string, string> = {
          lepidlo_ve_spreji: "Spray Adhesives",
          blinder: "Binders",
          plnic_poru_sealer: "Pore Sealers",
          separatory_release_agent: "Release Agents",
          ostatni: "Other Chemicals"
        }
        
        subLabel = isCs ? (mapCS[sub] || "Ostatní chemie") : (mapEN[sub] || "Other Chemicals")
        const priorities: Record<string, number> = { separatory_release_agent: 10, plnic_poru_sealer: 9, blinder: 8, lepidlo_ve_spreji: 7, ostatni: 1 }
        subPriority = priorities[sub] || 0
      } else if (catId === 'spotrebni_chemie') {
        const sub = p.specifikace?.podkategorie || 'standard'
        subKey = sub
        
        const mapCS: Record<string, string> = {
          pmp: "PMP tekuté čističe",
          standard: "Čisticí prostředky",
          ostatni: "Ostatní čističe"
        }
        const mapEN: Record<string, string> = {
          pmp: "PMP Cleaners",
          standard: "Cleaning Products",
          ostatni: "Other Cleaners"
        }
        
        subLabel = isCs ? (mapCS[sub] || "Ostatní") : (mapEN[sub] || "Other")
        const priorities: Record<string, number> = { standard: 10, pmp: 9, ostatni: 1 }
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
      c.subgroups.sort((a, b) => {
        if (a.priority !== b.priority) return b.priority - a.priority
        return a.label.localeCompare(b.label, lang === 'en' ? 'en' : 'cs')
      })
      
      c.subgroups.forEach(sub => {
        sub.products.sort((p1: any, p2: any) => {
          const name1 = lang === 'en' ? (p1.nazev_en || p1.nazev || '') : (p1.nazev || '')
          const name2 = lang === 'en' ? (p2.nazev_en || p2.nazev || '') : (p2.nazev || '')
          return name1.localeCompare(name2, lang === 'en' ? 'en' : 'cs')
        })
      })
      
      return c
    })

    sortedCats.sort((a, b) => {
      const nameA = translateCategory(a.id, a.name, lang)
      const nameB = translateCategory(b.id, b.name, lang)
      return nameA.localeCompare(nameB, lang === 'en' ? 'en' : 'cs')
    })

    return sortedCats
  })()

  return (
    <Document
      title={`${getTierLabel()} - ${today}`}
      author="AZ Composite"
    >
      <Page size="A4" style={styles.page}>
        {/* Branding Hlavička */}
        <View style={styles.headerContainer} fixed>
          <Image src={headerImagePath} style={styles.headerImage} />
        </View>

        {/* Informace o ceníku - pouze na první straně, v normálním toku obsahu */}
        <View style={styles.firstPageHeaderInfo}>
          <View style={styles.headerTextContainer}>
            <Text style={styles.documentTypeLabel}>{getTierLabel()}</Text>
            <Text style={styles.documentSubLabel}>
              {isCs ? 'Platnost od' : 'Valid from'}: {today} · {isCs ? 'Měna' : 'Currency'}: {targetCurrency}
            </Text>
            <Text style={[styles.documentSubLabel, { fontSize: 7, marginTop: 1 }]}>
              {isCs ? 'Platnost ceníku 14 dní · Ceny bez DPH a nezahrnují dopravu' : 'Pricelist validity 14 days · Prices excl. VAT and shipping'}
            </Text>
            <Text style={[styles.documentSubLabel, { fontSize: 6, marginTop: 2, color: COLORS.muted, textAlign: 'right', maxWidth: 280 }]}>
              {isCs 
                ? 'Uvedené ceny jsou pouze informativní. Vyhrazujeme si právo na změnu cen vlivem změn v dodavatelském řetězci a kurzových výkyvů.' 
                : 'Indicative prices only. We reserve the right to change prices due to supply chain changes and exchange rate fluctuations.'}
            </Text>
          </View>
        </View>

        {/* Hierarchické tabulky podle kategorií a podkategorií */}
        {groupedCategories.map((cat, catIdx) => (
          <View key={cat.id} style={{ marginBottom: 12 }} break={catIdx > 0}>
            {/* Nadpis hlavní kategorie */}
            <View style={styles.categoryHeader}>
              <Text style={styles.categoryTitle}>
                {translateCategory(cat.id, cat.name, lang)}
              </Text>
            </View>

            {cat.subgroups.map((sub) => {
              const firstProducts = sub.products.slice(0, 3)
              const remainingProducts = sub.products.slice(3)

              return (
                <View key={sub.key} style={{ marginBottom: 10 }}>
                  {/* Společný blok nadpisu, hlavičky tabulky a prvních 3 řádků (nesmí se rozdělit) */}
                  <View wrap={false}>
                    {/* Nadpis podkategorie */}
                    {sub.key !== '_default' && (
                      <View style={styles.subgroupHeader}>
                        <Text style={styles.subgroupTitle}>{sub.label}</Text>
                      </View>
                    )}

                    {/* Tabulka položek */}
                    <View style={styles.table}>
                      {/* Table Header */}
                      <View style={styles.tableHeader}>
                        <Text style={[styles.thText, styles.colName]}>{isCs ? "Název produktu" : "Product Name"}</Text>
                        <Text style={[styles.thText, styles.colSku]}>{isCs ? "Kód produktu" : "Product Code"}</Text>
                        <Text style={[styles.thText, styles.colUnitPrice]}>{isCs ? "Cena / jedn." : "Price / Unit"}</Text>
                        <Text style={[styles.thText, styles.colUnitCount]}>{isCs ? "Počet" : "Qty"}</Text>
                        <Text style={[styles.thText, styles.colTotalPrice]}>{isCs ? "Cena celkem" : "Total Price"}</Text>
                        <Text style={[styles.thText, styles.colPackSize]}>{isCs ? "Balení" : "Packaging"}</Text>
                      </View>

                      {/* První 3 řádky tabulky */}
                      {firstProducts.map((p, idx) => {
                        const primarySourcing = p.produkt_dodavatel?.find(s => s.is_primary) || p.produkt_dodavatel?.[0]
                        const isBuyingInBasicUnit = primarySourcing?.nakupni_mj_id === p.zakladni_mj_id &&
                          (!primarySourcing?.prevodni_pomer_na_zakladni || primarySourcing.prevodni_pomer_na_zakladni === 1)
                        const continuousUnits = ['liter', 'l', 'kg', 'm2', 'm', 'bm', 'g']
                        const isContinuous = p.zakladni_mj_id ? continuousUnits.some(u => p.zakladni_mj_id.toLowerCase().includes(u)) : false
                        const parsedSpecMnozstvi = isContinuous
                          ? (parseFloat(String((p.specifikace as any)?.mnozstvi || (p.specifikace as any)?.objem_l)) || 1)
                          : 1
                        const actualQty = (p.mnozstvi_v_baleni || 1) * parsedSpecMnozstvi
                        const totalUnits = primarySourcing
                          ? ((primarySourcing.prevodni_pomer_na_zakladni && primarySourcing.prevodni_pomer_na_zakladni !== 1)
                              ? primarySourcing.prevodni_pomer_na_zakladni
                              : (isBuyingInBasicUnit ? 1 : (actualQty || 1)))
                          : 1

                        const packQty = isContinuous ? totalUnits : (p.mnozstvi_v_baleni || 1)
                        const pricePerUnit = getNumericPrice(p.pricing)
                        const totalPriceVal = pricePerUnit * packQty
                        const rawUnitAbbr = p.c_merne_jednotky_zakladni?.zkratka || ''
                        const rawPackAbbr = p.c_merne_jednotky_baleni?.zkratka || 'bal.'
                        
                        const unitAbbr = translateUnit(rawUnitAbbr, lang)
                        const packAbbr = translateUnit(rawPackAbbr, lang)
                        const isAlt = idx % 2 === 1
                        
                        const onRequestText = isCs ? "Na dotaz" : "On request"
                        const productName = isCs ? p.nazev : (p.nazev_en || '—')

                        return (
                          <View style={[styles.tableRow, isAlt ? styles.tableRowAlt : {}]} key={p.id} wrap={false}>
                            <View style={styles.colName}>
                              <Text style={styles.tdText}>{productName}</Text>
                              {p.specifikace?.tloustka_um && (
                                <Text style={[styles.tdText, styles.tdMuted, { fontSize: 6.5, marginTop: 1 }]}>
                                  {isCs ? `Tloušťka: ${p.specifikace.tloustka_um} µm` : `Thickness: ${p.specifikace.tloustka_um} µm`}
                                </Text>
                              )}
                            </View>
                            <Text style={[styles.tdText, styles.tdMuted, styles.colSku]}>
                              {formatSkuForPdf(p.sku)}
                            </Text>
                            <Text style={[styles.tdText, styles.colUnitPrice]}>
                              {pricePerUnit > 0 ? `${pricePerUnit.toFixed(2)} ${targetCurrency} / ${unitAbbr}` : onRequestText}
                            </Text>
                            <Text style={[styles.tdText, styles.colUnitCount]}>
                              {`${packQty} ${unitAbbr}`}
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

                  {/* Zbývající řádky tabulky (mohou se zalomit na další strany) */}
                  {remainingProducts.length > 0 && (
                    <View style={styles.table}>
                      {remainingProducts.map((p, idx) => {
                        const primarySourcing = p.produkt_dodavatel?.find(s => s.is_primary) || p.produkt_dodavatel?.[0]
                        const isBuyingInBasicUnit = primarySourcing?.nakupni_mj_id === p.zakladni_mj_id &&
                          (!primarySourcing?.prevodni_pomer_na_zakladni || primarySourcing.prevodni_pomer_na_zakladni === 1)
                        const continuousUnits = ['liter', 'l', 'kg', 'm2', 'm', 'bm', 'g']
                        const isContinuous = p.zakladni_mj_id ? continuousUnits.some(u => p.zakladni_mj_id.toLowerCase().includes(u)) : false
                        const parsedSpecMnozstvi = isContinuous
                          ? (parseFloat(String((p.specifikace as any)?.mnozstvi || (p.specifikace as any)?.objem_l)) || 1)
                          : 1
                        const actualQty = (p.mnozstvi_v_baleni || 1) * parsedSpecMnozstvi
                        const totalUnits = primarySourcing
                          ? ((primarySourcing.prevodni_pomer_na_zakladni && primarySourcing.prevodni_pomer_na_zakladni !== 1)
                              ? primarySourcing.prevodni_pomer_na_zakladni
                              : (isBuyingInBasicUnit ? 1 : (actualQty || 1)))
                          : 1

                        const packQty = isContinuous ? totalUnits : (p.mnozstvi_v_baleni || 1)
                        const pricePerUnit = getNumericPrice(p.pricing)
                        const totalPriceVal = pricePerUnit * packQty
                        const rawUnitAbbr = p.c_merne_jednotky_zakladni?.zkratka || ''
                        const rawPackAbbr = p.c_merne_jednotky_baleni?.zkratka || 'bal.'
                        
                        const unitAbbr = translateUnit(rawUnitAbbr, lang)
                        const packAbbr = translateUnit(rawPackAbbr, lang)
                        const isAlt = (idx + 3) % 2 === 1 // maintain alternating row color correctly
                        
                        const onRequestText = isCs ? "Na dotaz" : "On request"
                        const productName = isCs ? p.nazev : (p.nazev_en || '—')

                        return (
                          <View style={[styles.tableRow, isAlt ? styles.tableRowAlt : {}]} key={p.id} wrap={false}>
                            <View style={styles.colName}>
                              <Text style={styles.tdText}>{productName}</Text>
                              {p.specifikace?.tloustka_um && (
                                <Text style={[styles.tdText, styles.tdMuted, { fontSize: 6.5, marginTop: 1 }]}>
                                  {isCs ? `Tloušťka: ${p.specifikace.tloustka_um} µm` : `Thickness: ${p.specifikace.tloustka_um} µm`}
                                </Text>
                              )}
                            </View>
                            <Text style={[styles.tdText, styles.tdMuted, styles.colSku]}>
                              {formatSkuForPdf(p.sku)}
                            </Text>
                            <Text style={[styles.tdText, styles.colUnitPrice]}>
                              {pricePerUnit > 0 ? `${pricePerUnit.toFixed(2)} ${targetCurrency} / ${unitAbbr}` : onRequestText}
                            </Text>
                            <Text style={[styles.tdText, styles.colUnitCount]}>
                              {`${packQty} ${unitAbbr}`}
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
                  )}
                </View>
              )
            })}
          </View>
        ))}

        {/* Patička */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            {isCs 
              ? "AZ Composite · Ceny jsou bez DPH a nezahrnují finální dopravu ke klientovi." 
              : "AZ Composite · Prices are excl. VAT and do not include final shipping to the client."}
          </Text>
          <Text style={styles.pageNumber} render={({ pageNumber, totalPages }) =>
            isCs ? `Strana ${pageNumber} / ${totalPages}` : `Page ${pageNumber} / ${totalPages}`
          } />
        </View>
      </Page>
    </Document>
  )
}
