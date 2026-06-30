import React from 'react'
import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer'
import { Product } from '@/modules/products/types'
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
    paddingTop:  48,
    paddingBottom: 40,
    paddingLeft: 24,
    paddingRight: 24,
    backgroundColor: COLORS.white,
  },
  titleContainer: {
    position: 'absolute',
    top: 12,
    left: 24,
    right: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1.5,
    borderBottomColor: COLORS.primary,
    paddingBottom: 4,
  },
  titleText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  metaText: {
    fontSize: 6.5,
    color: COLORS.muted,
  },
  categoryHeader: {
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
    paddingLeft: 6,
    paddingVertical: 3,
    marginTop: 14,
    marginBottom: 6,
    backgroundColor: '#fbf7fc',
    borderRadius: 2,
  },
  categoryTitle: {
    fontSize: 8.5,
    fontWeight: 'bold',
    color: COLORS.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  subgroupHeader: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingBottom: 1,
    marginTop: 8,
    marginBottom: 4,
  },
  subgroupTitle: {
    fontSize: 7.5,
    fontWeight: 'bold',
    color: COLORS.darkGray,
  },
  table: {
    width: '100%',
    borderWidth: 0.5,
    borderColor: COLORS.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: COLORS.primary,
  },
  thText: {
    color: COLORS.white,
    fontWeight: 'bold',
    fontSize: 6,
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
    fontSize: 6,
    padding: 3,
  },
  tdBold: {
    fontSize: 6,
    fontWeight: 'bold',
    padding: 3,
  },
  textRight: {
    textAlign: 'right',
  },
  colName: {
    width: 140,
  },
  colSupplier: {
    width: 110,
  },
  colPurchase: {
    width: 65,
  },
  colLogistics: {
    width: 90,
  },
  colMargins: {
    width: 90,
  },
  colPackaging: {
    width: 90,
  },
  colWeight: {
    width: 65,
  },
  colStatus: {
    width: 60,
  },
  footer: {
    position: 'absolute',
    bottom: 16,
    left: 24,
    right: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 0.5,
    borderTopColor: COLORS.border,
    paddingTop: 4,
  },
  footerText: {
    fontSize: 5.5,
    color: COLORS.muted,
  },
  pageNumber: {
    fontSize: 5.5,
    color: COLORS.muted,
  }
})

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

function translateCategory(id: string, name: string, lang: 'cs' | 'en'): string {
  if (lang === 'cs') {
    const csMap: Record<string, string> = {
      vyztuzne_materialy: "Výztužné materiály",
      prepregy: "Prepregy",
      pryskyrice: "Pryskyřice a Gelcoaty",
      brouseni_a_lesteni: "Broušení a leštění",
      lepidla: "Strukturální lepidla",
      spotrebni_chemie: "Spotřební chemie a čističe",
      cores_standard: "Jádrové materiály",
      cores_active: "Active Core Technology",
      consumables: "Spotřební materiál",
      naradi: "Nářadí",
      chemie: "Chemie"
    }
    return csMap[id] || name
  } else {
    const enMap: Record<string, string> = {
      vyztuzne_materialy: "Reinforcement Materials",
      prepregs: "Prepregs",
      pryskyrice: "Resins & Gelcoats",
      brouseni_a_lesteni: "Sanding & Polishing",
      lepidla: "Structural Adhesives",
      spotrebni_chemie: "Consumable Chemicals & Cleaners",
      cores_standard: "Core Materials",
      cores_active: "Active Core Technology",
      consumables: "Consumables",
      naradi: "Tools",
      chemie: "Chemicals"
    }
    return enMap[id] || name
  }
}

interface Subgroup {
  key: string
  label: string
  priority: number
  products: any[]
}

interface CategoryGroup {
  id: string
  name: string
  subgroups: Subgroup[]
}

interface ProductCatalogPDFProps {
  products: any[]
  lang: 'cs' | 'en'
}

export function ProductCatalogPDF({ products, lang }: ProductCatalogPDFProps) {
  const isCs = lang === 'cs'

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
      c.subgroups.sort((a, b) => b.priority - a.priority)
      return c
    })

    return sortedCats
  })()

  const renderProductRow = (p: any, idx: number) => {
    const isAlt = idx % 2 === 1
    const primarySourcing = p.produkt_dodavatel?.find((s: any) => s.is_primary) || p.produkt_dodavatel?.[0]
    
    const supplier = primarySourcing?.dodavatele?.nazev_spolecnosti || '—'
    const purchasePrice = primarySourcing ? `${primarySourcing.nakupni_cena.toFixed(2)} ${primarySourcing.mena}` : '—'
    const template = primarySourcing?.logisticke_sablony?.nazev || '—'
    
    const baseUnit = p.c_merne_jednotky_zakladni?.zkratka || p.zakladni_mj_id || 'ks'
    const packUnit = p.c_merne_jednotky_baleni?.zkratka || p.jednotka_baleni_id || 'bal'
    const packQty = p.mnozstvi_v_baleni || 1
    const packagingText = `${packQty} ${baseUnit} / ${packUnit}`

    const weightText = p.hmotnost_baliku_kg !== null && p.hmotnost_baliku_kg !== undefined 
      ? `${p.hmotnost_baliku_kg.toFixed(2)} kg` 
      : '—'

    const marginsText = `B2C: ${p.cilova_marze_retail_procenta || 0}%\nB2B: ${p.cilova_marze_partner_procenta || 0}%`
    const statusText = p.c_stavy_produktu?.nazev || p.stav_katalogu_id || ""

    return (
      <View style={[styles.tableRow, isAlt ? styles.tableRowAlt : {}]} key={p.id} wrap={false}>
        {/* Název a SKU */}
        <View style={styles.colName}>
          <Text style={styles.tdBold}>{p.nazev}</Text>
          <Text style={[styles.tdText, { color: COLORS.muted, fontSize: 5, paddingTop: 0 }]}>{p.sku}</Text>
        </View>

        {/* Dodavatel */}
        <View style={styles.colSupplier}>
          <Text style={styles.tdText}>{supplier}</Text>
        </View>

        {/* Nákupní cena */}
        <View style={styles.colPurchase}>
          <Text style={[styles.tdText, styles.textRight, { fontWeight: 'bold' }]}>{purchasePrice}</Text>
        </View>

        {/* Logistika */}
        <View style={styles.colLogistics}>
          <Text style={styles.tdText}>{template}</Text>
        </View>

        {/* Cílové marže */}
        <View style={styles.colMargins}>
          <Text style={styles.tdText}>{marginsText}</Text>
        </View>

        {/* Balení */}
        <View style={styles.colPackaging}>
          <Text style={styles.tdText}>{packagingText}</Text>
        </View>

        {/* Hmotnost */}
        <View style={styles.colWeight}>
          <Text style={[styles.tdText, styles.textRight]}>{weightText}</Text>
        </View>

        {/* Stav */}
        <View style={styles.colStatus}>
          <Text style={styles.tdText}>{statusText}</Text>
        </View>
      </View>
    )
  }

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        {/* Hlavička */}
        <View style={styles.titleContainer} fixed>
          <View>
            <Text style={styles.titleText}>
              {isCs ? 'AZ COMPOSITE - KATALOG PRODUKTŮ (DEFINICE A LOGISTIKA)' : 'AZ COMPOSITE - PRODUCT CATALOG (DEFINITIONS & LOGISTICS)'}
            </Text>
            <Text style={styles.metaText}>
              {isCs ? 'Interní přehled fyzických produktů, nákupů a logistiky' : 'Internal overview of physical products, sourcing and logistics'}
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.metaText}>
              {isCs ? `Datum exportu: ${new Date().toLocaleDateString('cs-CZ')}` : `Date: ${new Date().toLocaleDateString('en-GB')}`}
            </Text>
          </View>
        </View>

        {/* Hierarchické tabulky podle kategorií a podkategorií */}
        {groupedCategories.map((cat, catIdx) => (
          <View key={cat.id} style={{ marginBottom: 16 }} break={catIdx > 0}>
            {/* Nadpis hlavní kategorie */}
            <View style={styles.categoryHeader} fixed={false}>
              <Text style={styles.categoryTitle}>
                {translateCategory(cat.id, cat.name, lang)}
              </Text>
            </View>

            {cat.subgroups.map((sub) => {
              const firstProducts = sub.products.slice(0, 2)
              const remainingProducts = sub.products.slice(2)

              return (
                <View key={sub.key} style={{ marginBottom: 12 }}>
                  {/* Společný blok nadpisu, hlavičky tabulky a prvních 2 řádků (nesmí se rozdělit) */}
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
                        <View style={styles.colName}>
                          <Text style={styles.thText}>{isCs ? 'Produkt' : 'Product'}</Text>
                        </View>
                        <View style={styles.colSupplier}>
                          <Text style={styles.thText}>{isCs ? 'Dodavatel' : 'Supplier'}</Text>
                        </View>
                        <View style={styles.colPurchase}>
                          <Text style={[styles.thText, styles.textRight]}>{isCs ? 'Nákup' : 'Purchase'}</Text>
                        </View>
                        <View style={styles.colLogistics}>
                          <Text style={styles.thText}>{isCs ? 'Logistika' : 'Logistics'}</Text>
                        </View>
                        <View style={styles.colMargins}>
                          <Text style={styles.thText}>{isCs ? 'Cílové marže' : 'Target Margins'}</Text>
                        </View>
                        <View style={styles.colPackaging}>
                          <Text style={styles.thText}>{isCs ? 'Balení' : 'Packaging'}</Text>
                        </View>
                        <View style={styles.colWeight}>
                          <Text style={[styles.thText, styles.textRight]}>{isCs ? 'Hmotnost' : 'Weight'}</Text>
                        </View>
                        <View style={styles.colStatus}>
                          <Text style={styles.thText}>{isCs ? 'Stav' : 'Status'}</Text>
                        </View>
                      </View>

                      {/* První 2 řádky tabulky */}
                      {firstProducts.map((p, idx) => renderProductRow(p, idx))}
                    </View>
                  </View>

                  {/* Zbývající řádky tabulky */}
                  {remainingProducts.length > 0 && (
                    <View style={[styles.table, { borderTopWidth: 0, borderRadius: 0 }]}>
                      {remainingProducts.map((p, idx) => renderProductRow(p, idx + 2))}
                    </View>
                  )}
                </View>
              )
            })}
          </View>
        ))}

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            {isCs 
              ? 'AZ Composite · Katalog Produktů · Slouží pouze pro interní potřeby společnosti.'
              : 'AZ Composite · Product Catalog · For internal use only.'}
          </Text>
          <Text style={styles.pageNumber} render={({ pageNumber, totalPages }) =>
            isCs ? `Strana ${pageNumber} / ${totalPages}` : `Page ${pageNumber} / ${totalPages}`
          } />
        </View>
      </Page>
    </Document>
  )
}
