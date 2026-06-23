/**
 * InvoicePDF — react-pdf/renderer šablona
 *
 * Podporuje všechny 4 typy dokladů (Nabídka, Objednávka, Zálohová faktura, Faktura).
 * Podporuje plátce i neplátce DPH + reverse charge.
 * Obsahuje QR platbu (SPAYD) pokud je vyplněn IBAN.
 * Tabulka položek: Označení dodávky | Počet m.j. | Cena za m.j. | DPH % | Bez DPH | DPH | Celkem
 * Obsahuje plnou DPH rekapitulaci na konci.
 *
 * POUŽITÍ (Server Action):
 *   import { renderToBuffer } from '@react-pdf/renderer'
 *   const buffer = await renderToBuffer(<InvoicePDF doklad={doklad} qrDataUri={qr} />)
 */

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
  Image,
} from '@react-pdf/renderer'
import type { Doklad, FiremniProfil, DokladSoucty, DokladPolozka, PrijatyDoklad } from '../types'
import { DOKLAD_TYP_LABELS, ZPUSOB_UHRADY_LABELS } from '../types'
import { vypocitejSoucty, formatCzk, formatDatum, round2, formatMena } from '../utils/calculations'

import { getThemeTokens } from '@/shared/utils/theme'

import path from 'path'
import fs from 'fs'

// Extract theme tokens dynamically from globals.css
const tokens = getThemeTokens();
const COLORS = {
  primary:    tokens.primary || '#8A0485',
  darkGray:   tokens['muted-foreground'] || '#4D4D4D',
  text:       tokens.foreground || '#18181b',
  muted:      tokens['muted-foreground'] || '#71717a',
  border:     tokens.border || '#e4e4e7',
  background: tokens.background || '#fafafa',
  white:      '#ffffff',
  red:        '#dc2626',
  tableAlt:   '#f5f5f8',
  recapBg:    '#f0e8f3',  // Light purple tint for DPH recap
}

// Register Roboto and signature fonts to support Czech diacritics
// Use Node-specific process check to bypass static Next.js browser optimization
const isNode = typeof process !== 'undefined' && process.versions && !!process.versions.node;
if (isNode) {
  const fontsDir = path.join(process.cwd(), 'public', 'fonts');
  Font.register({
    family: 'Roboto',
    fonts: [
      { src: path.join(fontsDir, 'Roboto-Regular.ttf') },
      { src: path.join(fontsDir, 'Roboto-Bold.ttf'), fontWeight: 'bold' }
    ]
  });
  Font.register({
    family: 'AlexBrush',
    src: path.join(fontsDir, 'AlexBrush-Regular.ttf')
  });
  Font.register({
    family: 'Caveat',
    src: path.join(fontsDir, 'Caveat-Regular.ttf')
  });
} else {
  Font.register({
    family: 'Roboto',
    fonts: [
      { src: '/fonts/Roboto-Regular.ttf' },
      { src: '/fonts/Roboto-Bold.ttf', fontWeight: 'bold' }
    ]
  });
  Font.register({
    family: 'AlexBrush',
    src: '/fonts/AlexBrush-Regular.ttf'
  });
  Font.register({
    family: 'Caveat',
    src: '/fonts/Caveat-Regular.ttf'
  });
}

// ─── Helpery ───────────────────────────────────────────────────

/** Vyčistí akademické tituly a právní formy pro vytvoření přirozeného podpisu */
function getSignatureText(obchodniJmeno?: string): string {
  if (!obchodniJmeno) return 'Klier'
  // Odstranění akademických titulů a suffixů právních forem
  let name = obchodniJmeno
    .replace(/\b(Ing\.|Bc\.|Mgr\.|MUDr\.|MVDr\.|RNDr\.|PhDr\.|Ph\.D\.)/gi, '')
    .replace(/\b(s\.r\.o\.|a\.s\.|o\.p\.s\.|v\.o\.s\.)/gi, '')
    .trim()
  
  // Pokud je název moc dlouhý nebo prázdný, vrátíme výchozí příjmení
  if (name.length > 25 || name.length === 0) {
    return 'Klier'
  }
  return name
}

/** Formátuje číslo jako číslo s pevnými 2 des. místy (bez symbolu měny) */
function formatNum(value: number): string {
  return new Intl.NumberFormat('cs-CZ', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

/** Vypočítá bez_dph, dph a celkem pro jednu položku */
function polozkaValues(p: DokladPolozka) {
  const zaklad = round2(p.mnozstvi * p.cena_bez_dph * (1 - (p.sleva_procent || 0) / 100))
  const dph    = round2(zaklad * ((p.sazba_dph || 0) / 100))
  return {
    bez_dph: zaklad,
    dph_castka: dph,
    celkem: round2(zaklad + dph),
  }
}

// ─── Styly ─────────────────────────────────────────────────────
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
    fontSize:   20,
    fontWeight: 'bold',
    color:      COLORS.primary,
    marginBottom: 3,
  },
  documentNumber: {
    fontSize: 10,
    fontWeight: 'bold',
    color:    COLORS.darkGray,
  },

  // ── Sekce stran (Dodavatel / Odběratel) ──
  partiesSection: {
    flexDirection: 'row',
    marginBottom:  16,
    gap:           14,
  },
  partyBox: {
    flex:           1,
    padding:        10,
    backgroundColor: COLORS.background,
    borderRadius:   4,
    borderWidth:    1,
    borderColor:    COLORS.border,
  },
  partyBoxHighlight: {
    borderColor: COLORS.primary,
    borderWidth: 1.5,
  },
  partyLabel: {
    fontSize:     6.5,
    fontWeight:   'bold',
    color:        COLORS.primary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom:  5,
    paddingBottom: 3,
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.border,
  },
  partyName: {
    fontSize:   10,
    fontWeight: 'bold',
    color:      COLORS.text,
    marginBottom: 4,
  },
  partyDetail: {
    fontSize: 8.5,
    color:    COLORS.darkGray,
    lineHeight: 1.6,
  },
  partyIds: {
    flexDirection: 'row',
    marginTop: 5,
    gap: 6,
  },
  idBadge: {
    paddingVertical: 1.5,
    paddingHorizontal: 5,
    backgroundColor: COLORS.background,
    borderRadius:    2,
    borderWidth:     0.5,
    borderColor:     COLORS.border,
  },
  idBadgePrimary: {
    backgroundColor: COLORS.primary,
    borderColor:     COLORS.primary,
  },
  idText: {
    fontSize: 7,
    color:    COLORS.darkGray,
  },
  idTextPrimary: {
    color:      COLORS.white,
    fontWeight: 'bold',
  },

  // ── Meta informace ──
  metaSection: {
    flexDirection:  'row',
    marginBottom:   14,
    flexWrap:       'wrap',
    gap:            6,
  },
  metaItem: {
    flex:           1,
    minWidth:       75,
    padding:        7,
    borderWidth:    1,
    borderColor:    COLORS.border,
    borderRadius:   4,
    backgroundColor: COLORS.background,
  },
  metaLabel: {
    fontSize:   6.5,
    color:      COLORS.muted,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom:  3,
  },
  metaValue: {
    fontSize: 9,
    fontWeight: 'bold',
    color:    COLORS.text,
  },

  // ── Tabulka položek ──
  tableSection: { marginBottom: 14 },

  // Hlavička tabulky
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

  // Řádky
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
  tableRowText: {
    backgroundColor: '#f0e8f3',
  },
  tableRowZaloha: {
    backgroundColor: '#fef3f3',
  },

  tdText: {
    fontSize: 8.5,
    color:    COLORS.text,
  },
  tdBold: {
    fontSize: 8.5,
    color:    COLORS.text,
    fontWeight: 'bold',
  },
  tdMuted: {
    fontSize: 7.5,
    color:    COLORS.muted,
    marginTop: 1.5,
  },
  tdRed: {
    fontSize: 8.5,
    color:    COLORS.red,
  },
  tdRedBold: {
    fontSize: 8.5,
    color:    COLORS.red,
    fontWeight: 'bold',
  },
  tdSectionLabel: {
    fontSize:   8,
    fontWeight: 'bold',
    color:      COLORS.primary,
    fontStyle:  'italic',
  },

  // ── Šířky sloupců tabulky ──
  // Označení | Počet m.j. | Cena/m.j. | DPH% | Bez DPH | DPH | Celkem
  colPopis:    { flex: 8 },
  colPocet:    { flex: 2.5, textAlign: 'right' },
  colCenaJedn: { flex: 2.5, textAlign: 'right' },
  colDphPct:   { flex: 1.5, textAlign: 'center' },
  colBezDph:   { flex: 2.5, textAlign: 'right' },
  colDphCast:  { flex: 2.5, textAlign: 'right' },
  colCelkem:   { flex: 2.5, textAlign: 'right' },

  // ── DPH Rekapitulace ──
  recapSection: {
    marginBottom: 12,
  },
  recapTitle: {
    fontSize:   7,
    fontWeight: 'bold',
    color:      COLORS.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom:  4,
  },
  recapTable: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 3,
  },
  recapHeader: {
    flexDirection: 'row',
    backgroundColor: COLORS.recapBg,
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.border,
  },
  recapRow: {
    flexDirection: 'row',
    paddingVertical: 3,
    paddingHorizontal: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.border,
  },
  recapRowTotal: {
    flexDirection: 'row',
    paddingVertical: 4,
    paddingHorizontal: 6,
    backgroundColor: COLORS.background,
  },
  recapThText: {
    fontSize: 7,
    fontWeight: 'bold',
    color:    COLORS.darkGray,
    textTransform: 'uppercase',
  },
  recapTdText: {
    fontSize: 8,
    color:    COLORS.text,
  },
  recapTdBold: {
    fontSize: 8,
    fontWeight: 'bold',
    color:    COLORS.text,
  },
  recapColSazba:  { flex: 1.5 },
  recapColZaklad: { flex: 3, textAlign: 'right' },
  recapColDph:    { flex: 3, textAlign: 'right' },
  recapColCelkem: { flex: 3, textAlign: 'right' },

  // ── Součty ──
  sumsSection: {
    flexDirection:  'row',
    justifyContent: 'flex-end',
    marginBottom:   14,
  },
  sumsBox: {
    width: 240,
  },
  sumRow: {
    flexDirection:   'row',
    justifyContent:  'space-between',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.border,
  },
  sumLabel: {
    fontSize: 8.5,
    color:    COLORS.muted,
  },
  sumValue: {
    fontSize: 8.5,
    color:    COLORS.text,
    fontWeight: 'bold',
  },
  sumZalohaRow: {
    flexDirection:   'row',
    justifyContent:  'space-between',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.border,
    backgroundColor: '#fef3f3',
  },
  sumTotalRow: {
    flexDirection:   'row',
    justifyContent:  'space-between',
    paddingVertical: 7,
    paddingHorizontal: 8,
    backgroundColor: COLORS.primary,
    borderRadius:    3,
    marginTop:       5,
  },
  sumTotalLabel: {
    fontSize:   11,
    fontWeight: 'bold',
    color:      COLORS.white,
  },
  sumTotalValue: {
    fontSize:   11,
    fontWeight: 'bold',
    color:      COLORS.white,
  },

  // ── QR + Platební info ──
  paymentSection: {
    flexDirection: 'row',
    marginBottom:  14,
    gap:           14,
    padding:       10,
    borderWidth:   1,
    borderColor:   COLORS.border,
    borderRadius:  4,
    backgroundColor: COLORS.background,
  },
  qrBox: {
    alignItems:     'center',
    justifyContent: 'center',
    width:          80,
  },
  qrLabel: {
    fontSize:   6.5,
    color:      COLORS.muted,
    marginTop:  4,
    textAlign:  'center',
  },
  paymentDetails: { flex: 1 },
  paymentTitle: {
    fontSize:   8,
    fontWeight: 'bold',
    color:      COLORS.darkGray,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom:  6,
  },
  paymentRow: {
    flexDirection: 'row',
    marginBottom:  3,
    alignItems:    'baseline',
  },
  paymentLabel: {
    fontSize: 7.5,
    color:    COLORS.muted,
    width:    80,
  },
  paymentValue: {
    fontSize:   8.5,
    fontWeight: 'bold',
    color:      COLORS.text,
    flex:       1,
  },

  // ── DPH info (neplátce / reverse charge) ──
  vatNoteBox: {
    padding:       8,
    backgroundColor: '#fef3c7',
    borderWidth:   1,
    borderColor:   '#f59e0b',
    borderRadius:  4,
    marginBottom:  10,
  },
  vatNoteText: {
    fontSize: 8.5,
    color:    '#92400e',
    fontWeight: 'bold',
  },

  // ── Poznámky ──
  notesSection: {
    marginBottom: 14,
    padding:      10,
    borderWidth:  1,
    borderColor:  COLORS.border,
    borderRadius: 4,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
  },
  notesLabel: {
    fontSize:     7,
    fontWeight:   'bold',
    color:        COLORS.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom:  4,
  },
  notesText: {
    fontSize:   8.5,
    color:      COLORS.darkGray,
    lineHeight: 1.6,
  },

  // ── Footer ──
  footer: {
    position:  'absolute',
    bottom:    20,
    left:      28,
    right: 28,
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

// ─── Hlavní komponenta ─────────────────────────────────────────

interface VerticalLabelProps {
  text: string
  color?: string
  style?: any
}

function VerticalLabel({ text, color = COLORS.primary, style }: VerticalLabelProps) {
  return (
    <View style={{
      width: 16,
      marginRight: 8,
      justifyContent: 'center',
      alignItems: 'center',
      ...style,
    }}>
      <Text style={{
        transform: 'rotate(-90deg)',
        color: color,
        fontSize: 7,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        letterSpacing: 0.8,
        width: 150,
        textAlign: 'center',
      }}>
        {text}
      </Text>
    </View>
  )
}

const translations = {
  cs: {
    nabidka: 'Cenová nabídka',
    objednavka: 'Objednávka',
    zalohova_faktura: 'Zálohová faktura',
    faktura: 'Faktura',
    opravny_doklad: 'Opravný daňový doklad',
    objednavka_dodavateli: 'Objednávka dodavateli',
    prijata_faktura: 'Přijatá faktura',
    prijata_zalohova_faktura: 'Přijatá zálohová faktura',
    prijaty_opravny_doklad: 'Přijatý opravný doklad',
    dodavatel: 'Dodavatel',
    odberatel: 'Odběratel',
    identifikacni_udaje: 'IDENTIFIKAČNÍ ÚDAJE',
    datum_vystaveni: 'Datum vystavení',
    datum_splatnosti: 'Datum splatnosti',
    duzp: 'DUZP',
    platnost_nabidky: 'Platnost nabídky',
    zpusob_uhrady: 'Způsob úhrady',
    mena_kurz: 'Měna / Kurz',
    platebni_udaje: 'PLATEBNÍ ÚDAJE',
    bankovni_ucet: 'Bankovní účet',
    variabilni: 'variabilní',
    konstantni: 'konstantní',
    zpusob_platby: 'Způsob platby',
    k_uhrade: 'K úhradě',
    qr_faktura: 'QR Faktura',
    fakturujeme_vam: 'FAKTURUJEME VÁM',
    oznaceni_dodavky: 'Označení dodávky',
    pocet_mj: 'Počet m.j.',
    cena_za_mj: 'Cena za m.j.',
    dph_pct: 'DPH %',
    bez_dph: 'Bez DPH',
    dph: 'DPH',
    celkem: 'Celkem',
    sleva: 'Sleva',
    penale_note: 'Dovolujeme si Vás upozornit, že v případě nedodržení data splatnosti uvedeného na faktuře Vám můžeme účtovat zákonný úrok z prodlení.',
    reverse_charge_note: 'Daň odvede zákazník (přenesení daňové povinnosti dle § 92a zákona o DPH).',
    non_vat_note: 'Výstavce není plátcem DPH.',
    rekapitulace: 'REKAPITULACE',
    razitko_podpis: 'Podpis / Razítko:',
    sazba_dph: 'Sazba DPH',
    zaklad: 'Základ',
    vyse_dph: 'Výše DPH',
    fakturovana_castka: 'Fakturovaná částka:',
    uhrazeno_zalohou: 'Uhrazeno zálohou:',
    celkem_k_uhrade: 'Celkem k úhradě:',
    poznamky: 'Poznámky',
    strana: 'Strana',
    ico: 'IČO',
    dic: 'DIČ',
    no_abbr: 'č.',
  },
  en: {
    nabidka: 'Price Offer',
    objednavka: 'Order',
    zalohova_faktura: 'Proforma Invoice',
    faktura: 'Invoice',
    opravny_doklad: 'Credit Note',
    objednavka_dodavateli: 'Purchase Order',
    prijata_faktura: 'Supplier Invoice',
    prijata_zalohova_faktura: 'Supplier Proforma Invoice',
    prijaty_opravny_doklad: 'Supplier Credit Note',
    dodavatel: 'Supplier',
    odberatel: 'Customer',
    identifikacni_udaje: 'IDENTIFICATION DATA',
    datum_vystaveni: 'Date of issue',
    datum_splatnosti: 'Due date',
    duzp: 'Tax date',
    platnost_nabidky: 'Validity of offer',
    zpusob_uhrady: 'Payment method',
    mena_kurz: 'Currency / Rate',
    platebni_udaje: 'PAYMENT DETAILS',
    bankovni_ucet: 'Bank account',
    variabilni: 'variable',
    konstantni: 'constant',
    zpusob_platby: 'Payment method',
    k_uhrade: 'To pay',
    qr_faktura: 'QR Invoice',
    fakturujeme_vam: 'ITEMS INVOICED',
    oznaceni_dodavky: 'Item description',
    pocet_mj: 'Qty / Unit',
    cena_za_mj: 'Unit price',
    dph_pct: 'VAT %',
    bez_dph: 'Excl. VAT',
    dph: 'VAT',
    celkem: 'Total',
    sleva: 'Discount',
    penale_note: 'Please note that in case of failure to meet the due date specified on the invoice, we may charge you interest on late payment.',
    reverse_charge_note: 'The tax shall be paid by the customer (reverse charge mechanism).',
    non_vat_note: 'The issuer is not a VAT payer.',
    rekapitulace: 'RECAPITULATION',
    razitko_podpis: 'Signature / Stamp:',
    sazba_dph: 'VAT rate',
    zaklad: 'Base',
    vyse_dph: 'VAT amount',
    fakturovana_castka: 'Invoiced amount:',
    uhrazeno_zalohou: 'Paid by advance:',
    celkem_k_uhrade: 'Total to pay:',
    poznamky: 'Notes',
    strana: 'Page',
    ico: 'Reg. No.',
    dic: 'VAT ID',
    no_abbr: 'No.',
  }
} as const

interface InvoicePDFProps {
  doklad: Doklad | PrijatyDoklad
  qrDataUri?: string | null  // PNG data URI z generatePaymentQR()
}

export function InvoicePDF({ doklad: dokladRaw, qrDataUri }: InvoicePDFProps) {
  const doklad = dokladRaw as any
  const firemni = doklad.firemni_udaje_snapshot
  const zakaznik = doklad.zakaznik_udaje_snapshot ?? doklad.zakaznik
  const soucty: DokladSoucty = vypocitejSoucty(doklad.polozky ?? [])

  const lang = (doklad.jazyk === 'en' ? 'en' : 'cs') as 'cs' | 'en'
  const t = translations[lang]

  const typLabel = (t as any)[doklad.typ] || doklad.typ
  const headerImagePath = path.join(process.cwd(), 'public', 'brand', 'katalog-hlavicka.png')
  const signatureImagePath = path.join(process.cwd(), 'public', 'Podpis.png')
  const hasSignatureImage = isNode && fs.existsSync(signatureImagePath)
  const shouldPrintSignature = (doklad as any).tisk_podpisu !== false

  const showDph = doklad.platce_dph && !(doklad as any).reverse_charge
  const polozky = doklad.polozky ?? []

  const paymentMethodLabel = lang === 'en'
    ? (doklad.zpusob_uhrady === 'prevod' ? 'Bank transfer' : doklad.zpusob_uhrady === 'hotovost' ? 'Cash' : 'Credit card')
    : (ZPUSOB_UHRADY_LABELS as any)[doklad.zpusob_uhrady] || ''

  const formatUnit = (unit?: string | null) => {
    if (!unit) return ''
    const u = unit.trim().toLowerCase()
    if (lang === 'en') {
      if (u === 'ks' || u === 'ks.') return ' pcs'
      if (u === 'kpl' || u === 'kpl.') return ' set'
    }
    return ' ' + unit
  }

  return (
    <Document
      title={`${typLabel} ${doklad.cislo}`}
      author={firemni?.obchodni_jmeno ?? 'AZ Composite'}
      subject={`${typLabel} ${t.no_abbr} ${doklad.cislo}`}
    >
      <Page size="A4" style={styles.page}>

        {/* ── Branding Hlavička ── */}
        <View style={styles.headerContainer}>
          <Image src={headerImagePath} style={styles.headerImage} />
          <View style={styles.headerTextContainer}>
            <Text style={styles.documentTypeLabel}>{typLabel.toUpperCase()}</Text>
            <Text style={styles.documentNumber}>{doklad.cislo}</Text>
          </View>
        </View>

        {/* ── STRANY (Dodavatel / Odběratel) ── */}
        <View style={{ flexDirection: 'row', marginBottom: 16 }}>
          <VerticalLabel text={t.identifikacni_udaje} />
          <View style={{ flex: 1, flexDirection: 'row', gap: 14 }}>
            {/* Naše firma */}
            <View style={[styles.partyBox, styles.partyBoxHighlight, { flex: 1 }]}>
              <Text style={styles.partyLabel}>{doklad.dodavatel_id ? t.odberatel : t.dodavatel}</Text>
              <Text style={styles.partyName}>{firemni?.obchodni_jmeno ?? ''}</Text>
              <Text style={styles.partyDetail}>
                {firemni?.adresa?.ulice ?? ''}{'\n'}
                {firemni?.adresa?.psc ?? ''} {firemni?.adresa?.mesto ?? ''}{'\n'}
                {firemni?.adresa?.stat ?? ''}
              </Text>
              {firemni?.email_fakturace && (
                <Text style={[styles.partyDetail, { marginTop: 4 }]}>
                  {firemni.email_fakturace}
                </Text>
              )}
              {firemni?.telefon && (
                <Text style={styles.partyDetail}>{firemni.telefon}</Text>
              )}
              <View style={styles.partyIds}>
                {firemni?.ico && (
                  <View style={styles.idBadge}>
                    <Text style={styles.idText}>{t.ico}: {firemni.ico}</Text>
                  </View>
                )}
                {firemni?.platce_dph && firemni?.dic && (
                  <View style={[styles.idBadge, styles.idBadgePrimary]}>
                    <Text style={[styles.idText, styles.idTextPrimary]}>{t.dic}: {firemni.dic}</Text>
                  </View>
                )}
              </View>
            </View>

            {/* Partner (zákazník / dodavatel) */}
            <View style={[styles.partyBox, { flex: 1 }]}>
              <Text style={styles.partyLabel}>{doklad.dodavatel_id ? t.dodavatel : t.odberatel}</Text>
              <Text style={styles.partyName}>{zakaznik?.nazev_spolecnosti ?? ''}</Text>
              <Text style={styles.partyDetail}>
                {(zakaznik?.adresa as Record<string, string> | undefined)?.ulice ?? ''}{'\n'}
                {(zakaznik?.adresa as Record<string, string> | undefined)?.psc ?? ''}{' '}
                {(zakaznik?.adresa as Record<string, string> | undefined)?.mesto ?? ''}{'\n'}
                {(zakaznik?.adresa as Record<string, string> | undefined)?.stat ?? ''}
              </Text>
              {zakaznik?.email_fakturace && (
                <Text style={[styles.partyDetail, { marginTop: 4 }]}>
                  {zakaznik.email_fakturace}
                </Text>
              )}
              <View style={styles.partyIds}>
                {zakaznik?.ico && (
                  <View style={styles.idBadge}>
                    <Text style={styles.idText}>{t.ico}: {zakaznik.ico}</Text>
                  </View>
                )}
                {zakaznik?.dic && (
                  <View style={[styles.idBadge, styles.idBadgePrimary]}>
                    <Text style={[styles.idText, styles.idTextPrimary]}>{t.dic}: {zakaznik.dic}</Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        </View>

        {/* ── META INFO ── */}
        <View style={{ flexDirection: 'row', marginBottom: 14 }}>
          <View style={{ width: 16, marginRight: 8 }} />
          <View style={{ flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>{t.datum_vystaveni}</Text>
              <Text style={styles.metaValue}>{formatDatum(doklad.datum_vystaveni)}</Text>
            </View>
            {doklad.datum_splatnosti && doklad.tisk_splatnosti !== false && (
              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>{t.datum_splatnosti}</Text>
                <Text style={styles.metaValue}>{formatDatum(doklad.datum_splatnosti)}</Text>
              </View>
            )}
            {doklad.duzp && doklad.platce_dph && (
              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>{t.duzp}</Text>
                <Text style={styles.metaValue}>{formatDatum(doklad.duzp)}</Text>
              </View>
            )}
            {doklad.datum_platnosti && doklad.typ === 'nabidka' && (
              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>{t.platnost_nabidky}</Text>
                <Text style={styles.metaValue}>{formatDatum(doklad.datum_platnosti)}</Text>
              </View>
            )}
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>{t.zpusob_uhrady}</Text>
              <Text style={styles.metaValue}>
                {paymentMethodLabel}
              </Text>
            </View>
            {doklad.mena !== 'CZK' && doklad.tisk_kurzu !== false && (
              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>{t.mena_kurz}</Text>
                <Text style={styles.metaValue}>{doklad.mena} ({doklad.kurz_k_czk} CZK)</Text>
              </View>
            )}
          </View>
        </View>

        {/* ── PLATEBNÍ ÚDAJE (purple bar) ── */}
        {(doklad.typ === 'faktura' || doklad.typ === 'zalohova_faktura') && (
          <View style={{
            flexDirection: 'row',
            backgroundColor: COLORS.primary,
            borderRadius: 4,
            marginBottom: 14,
            overflow: 'hidden',
          }}>
            {/* Vertikální štítek */}
            <View style={{
              width: 24,
              backgroundColor: '#6b0367',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <VerticalLabel text={t.platebni_udaje} color={COLORS.white} style={{ marginRight: 0, width: 24 }} />
            </View>

            {/* Hlavní obsah */}
            <View style={{
              flex: 1,
              flexDirection: 'row',
              padding: 9,
              justifyContent: 'space-between',
            }}>
              {/* Sloupec 1: Bankovní spojení */}
              <View style={{ flex: 1.6, gap: 3 }}>
                <Text style={{ fontSize: 7, color: '#f5c6f3', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  {t.bankovni_ucet}
                </Text>
                <Text style={{ fontSize: 9.5, fontWeight: 'bold', color: COLORS.white }}>
                  {firemni?.cislo_uctu || '—'}
                </Text>
                <Text style={{ fontSize: 7.5, color: '#f5c6f3' }}>
                  IBAN: <Text style={{ fontWeight: 'bold', color: COLORS.white }}>{firemni?.iban || '—'}</Text>
                </Text>
                <Text style={{ fontSize: 7.5, color: '#f5c6f3' }}>
                  SWIFT: <Text style={{ fontWeight: 'bold', color: COLORS.white }}>{firemni?.banka_nazev || '—'}</Text>
                </Text>
              </View>

              {/* Sloupec 2: Symboly */}
              <View style={{ flex: 0.9, gap: 3 }}>
                <Text style={{ fontSize: 7, color: '#f5c6f3', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Symbol
                </Text>
                <Text style={{ fontSize: 8, color: '#f5c6f3' }}>
                  {t.variabilni}: <Text style={{ fontWeight: 'bold', color: COLORS.white }}>{doklad.cislo.replace(/[^0-9]/g, '')}</Text>
                </Text>
                <Text style={{ fontSize: 8, color: '#f5c6f3' }}>
                  {t.konstantni}: <Text style={{ fontWeight: 'bold', color: COLORS.white }}>0308</Text>
                </Text>
              </View>

              {/* Sloupec 3: Způsob platby a K úhradě */}
              <View style={{ flex: 1.2, gap: 3, alignItems: 'flex-end', marginRight: 10 }}>
                <Text style={{ fontSize: 8, color: '#f5c6f3' }}>
                  {t.zpusob_platby}: <Text style={{ fontWeight: 'bold', color: COLORS.white }}>{paymentMethodLabel}</Text>
                </Text>
                <View style={{ marginTop: 4, alignItems: 'flex-end' }}>
                  <Text style={{ fontSize: 7, color: '#f5c6f3', textTransform: 'uppercase', letterSpacing: 0.5 }}>{t.k_uhrade}</Text>
                  <Text style={{ fontSize: 13, fontWeight: 'bold', color: COLORS.white }}>
                    {formatMena(soucty.k_uhrade, doklad.mena)}
                  </Text>
                </View>
              </View>

              {/* Sloupec 4: QR kód */}
              {qrDataUri ? (
                <View style={{
                  backgroundColor: COLORS.white,
                  padding: 3,
                  borderRadius: 3,
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 72,
                  height: 72,
                }}>
                  <Image src={qrDataUri} style={{ width: 62, height: 62 }} />
                  <Text style={{ fontSize: 5, color: COLORS.text, fontWeight: 'bold', marginTop: 1 }}>{t.qr_faktura}</Text>
                </View>
              ) : null}
            </View>
          </View>
        )}

        {/* ── FAKTURUJEME VÁM (Items Table) ── */}
        <View style={{ flexDirection: 'row', marginBottom: 14 }}>
          <VerticalLabel text={t.fakturujeme_vam} />
          <View style={{ flex: 1 }}>
            <View style={styles.tableHeader}>
              <Text style={[styles.thText, styles.colPopis]}>{t.oznaceni_dodavky}</Text>
              <Text style={[styles.thText, styles.colPocet]}>{t.pocet_mj}</Text>
              <Text style={[styles.thText, styles.colCenaJedn]}>{t.cena_za_mj}</Text>
              <Text style={[styles.thText, styles.colDphPct]}>{t.dph_pct}</Text>
              <Text style={[styles.thText, styles.colBezDph]}>{t.bez_dph}</Text>
              <Text style={[styles.thText, styles.colDphCast]}>{t.dph}</Text>
              <Text style={[styles.thText, styles.colCelkem]}>{t.celkem}</Text>
            </View>

            {polozky.map((polozka: any, i: number) => {
              const isAlt = i % 2 === 1

              // Textový řádek (sekce / nadpis)
              if (polozka.typ === 'text_radek') {
                return (
                  <View key={polozka.id} style={[styles.tableRow, styles.tableRowText]}>
                    <Text style={[styles.tdSectionLabel, { flex: 1 }]}>
                      {polozka.nazev}
                    </Text>
                  </View>
                )
              }

              // Zálohový odpočet
              if (polozka.typ === 'zalohovy_odpocet') {
                const baseVals = polozkaValues(polozka)
                const vals = {
                  sazba: polozka.sazba_dph,
                  bez_dph: -Math.abs(baseVals.bez_dph),
                  dph: showDph ? -Math.abs(baseVals.dph_castka) : 0,
                  celkem: showDph ? -Math.abs(baseVals.celkem) : -Math.abs(baseVals.bez_dph)
                }

                return (
                  <View key={polozka.id} style={[styles.tableRow, styles.tableRowZaloha]}>
                    <View style={styles.colPopis}>
                      <Text style={styles.tdRed}>{polozka.nazev}</Text>
                      {polozka.popis && (
                        <Text style={[styles.tdMuted, { color: COLORS.red }]}>{polozka.popis}</Text>
                      )}
                    </View>
                    <Text style={[styles.tdRed, styles.colPocet]}>
                      {formatNum(polozka.mnozstvi)}{formatUnit(polozka.jednotka)}
                    </Text>
                    <Text style={[styles.tdRedBold, styles.colCenaJedn]}>
                      -{formatNum(Math.abs(polozka.cena_bez_dph))}
                    </Text>
                    <Text style={[styles.tdRed, styles.colDphPct]}>{vals.sazba}</Text>
                    <Text style={[styles.tdRed, styles.colBezDph]}>{formatNum(vals.bez_dph)}</Text>
                    <Text style={[styles.tdRed, styles.colDphCast]}>{formatNum(vals.dph)}</Text>
                    <Text style={[styles.tdRedBold, styles.colCelkem]}>{formatNum(vals.celkem)}</Text>
                  </View>
                )
              }

              // Standardní položka (produkt / volná / zaokrouhlení)
              const baseVals = polozkaValues(polozka)
              const isRounding = polozka.typ === 'zaokrouhleni'
              const showItemDph = showDph && !isRounding
              
              const vals = {
                sazba: isRounding ? 0 : polozka.sazba_dph,
                bez_dph: baseVals.bez_dph,
                dph: showItemDph ? baseVals.dph_castka : 0,
                celkem: showItemDph ? baseVals.celkem : baseVals.bez_dph
              }

              return (
                <View key={polozka.id} style={[styles.tableRow, isAlt ? styles.tableRowAlt : {}]}>
                  <View style={styles.colPopis}>
                    <Text style={styles.tdText}>{polozka.nazev}</Text>
                    {polozka.popis && <Text style={styles.tdMuted}>{polozka.popis}</Text>}
                    {polozka.sleva_procent > 0 && (
                      <Text style={[styles.tdMuted, { color: COLORS.red }]}>
                        {t.sleva} {polozka.sleva_procent}%
                      </Text>
                    )}
                  </View>
                  <Text style={[styles.tdText, styles.colPocet]}>
                    {formatNum(polozka.mnozstvi)}{formatUnit(polozka.jednotka)}
                  </Text>
                  <Text style={[styles.tdText, styles.colCenaJedn]}>
                    {formatNum(polozka.cena_bez_dph)}
                  </Text>
                  <Text style={[styles.tdText, styles.colDphPct]}>{vals.sazba}</Text>
                  <Text style={[styles.tdText, styles.colBezDph]}>{formatNum(vals.bez_dph)}</Text>
                  <Text style={[styles.tdText, styles.colDphCast]}>{formatNum(vals.dph)}</Text>
                  <Text style={[styles.tdBold, styles.colCelkem]}>{formatNum(vals.celkem)}</Text>
                </View>
              )
            })}
          </View>
        </View>

        {/* ── UPOZORNĚNÍ A ZÁKONNÉ INFORMACE ── */}
        <View style={{ flexDirection: 'row', marginBottom: 10 }}>
          <View style={{ width: 16, marginRight: 8 }} />
          <View style={{ flex: 1, gap: 2 }}>
            {(doklad.typ === 'faktura' || doklad.typ === 'zalohova_faktura') && (
              <Text style={{ fontSize: 7, color: COLORS.muted }}>
                {t.penale_note}
              </Text>
            )}
            {doklad.reverse_charge && (
              <Text style={{ fontSize: 7, color: COLORS.muted, fontWeight: 'bold' }}>
                {t.reverse_charge_note}
              </Text>
            )}
            {!(doklad.dodavatel_id ? firemni?.platce_dph : doklad.platce_dph) && (
              <Text style={{ fontSize: 7, color: COLORS.muted, fontWeight: 'bold' }}>
                {t.non_vat_note}
              </Text>
            )}
          </View>
        </View>

        {/* ── REKAPITULACE & SOUČTY ── */}
        <View style={{ flexDirection: 'row', marginBottom: 14 }}>
          <VerticalLabel text={t.rekapitulace} />
          <View style={{ flex: 1, flexDirection: 'row', gap: 14 }}>
            {/* Razítko a podpis (levý sloupec) */}
            <View style={{
              flex: 1,
              padding: 8,
              borderWidth: 1,
              borderColor: COLORS.border,
              borderRadius: 4,
              backgroundColor: COLORS.background,
              justifyContent: 'space-between',
              minHeight: 85,
            }}>
              <Text style={{ fontSize: 7, color: COLORS.muted, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                {t.razitko_podpis}
              </Text>
              {shouldPrintSignature ? (
                <View style={{
                  flex: 1,
                  justifyContent: 'center',
                  alignItems: 'center',
                  height: 42,
                  marginTop: 2,
                }}>
                  {hasSignatureImage ? (
                    <Image
                      src={signatureImagePath}
                      style={{
                        width: 110,
                        height: 42,
                      }}
                    />
                  ) : (
                    <Text style={{
                      fontFamily: 'AlexBrush',
                      fontSize: 24,
                      color: '#0e2f5c', // Elegant blue ink
                      transform: 'rotate(-4deg)',
                    }}>
                      {getSignatureText(firemni?.obchodni_jmeno)}
                    </Text>
                  )}
                </View>
              ) : (
                <View style={{ height: 40 }} />
              )}
            </View>

            {/* Rekapitulace DPH & Celkové součty (pravý sloupec) */}
            <View style={{ flex: 1.5, gap: 8 }}>
              {/* DPH Tabulka */}
              {showDph && soucty.dph_sazky.length > 0 ? (
                <View style={styles.recapTable}>
                  <View style={styles.recapHeader}>
                    <Text style={[styles.recapThText, styles.recapColSazba]}>{t.sazba_dph}</Text>
                    <Text style={[styles.recapThText, styles.recapColZaklad]}>{t.zaklad}</Text>
                    <Text style={[styles.recapThText, styles.recapColDph]}>{t.vyse_dph}</Text>
                    <Text style={[styles.recapThText, styles.recapColCelkem]}>{t.celkem}</Text>
                  </View>
                  {soucty.dph_sazky.map((sazka) => (
                    <View key={sazka.sazba} style={styles.recapRow}>
                      <Text style={[styles.recapTdText, styles.recapColSazba]}>{sazka.sazba} %</Text>
                      <Text style={[styles.recapTdText, styles.recapColZaklad]}>{formatMena(sazka.zaklad, doklad.mena)}</Text>
                      <Text style={[styles.recapTdText, styles.recapColDph]}>{formatMena(sazka.dph, doklad.mena)}</Text>
                      <Text style={[styles.recapTdText, styles.recapColCelkem]}>{formatMena(sazka.celkem, doklad.mena)}</Text>
                    </View>
                  ))}
                  <View style={styles.recapRowTotal}>
                    <Text style={[styles.recapTdBold, styles.recapColSazba]}>{t.celkem}</Text>
                    <Text style={[styles.recapTdBold, styles.recapColZaklad]}>{formatMena(soucty.celkem_bez_dph, doklad.mena)}</Text>
                    <Text style={[styles.recapTdBold, styles.recapColDph]}>{formatMena(soucty.celkem_dph, doklad.mena)}</Text>
                    <Text style={[styles.recapTdBold, styles.recapColCelkem]}>{formatMena(soucty.celkem_s_dph, doklad.mena)}</Text>
                  </View>
                </View>
              ) : null}

              {/* Celkové částky */}
              <View style={{ gap: 3.5, paddingHorizontal: 2 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 8.5, color: COLORS.darkGray }}>{t.fakturovana_castka}</Text>
                  <Text style={{ fontSize: 9, fontWeight: 'bold', color: COLORS.text }}>
                    {formatMena(showDph ? soucty.celkem_s_dph : soucty.celkem_bez_dph, doklad.mena)}
                  </Text>
                </View>
                
                {soucty.zalohovy_odpocet > 0 && (
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ fontSize: 8.5, color: COLORS.red }}>{t.uhrazeno_zalohou}</Text>
                    <Text style={{ fontSize: 9, fontWeight: 'bold', color: COLORS.red }}>
                      -{formatMena(soucty.zalohovy_odpocet, doklad.mena)}
                    </Text>
                  </View>
                )}

                <View style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  backgroundColor: COLORS.primary,
                  paddingVertical: 5,
                  paddingHorizontal: 8,
                  borderRadius: 3,
                  marginTop: 2,
                }}>
                  <Text style={{ fontSize: 9.5, fontWeight: 'bold', color: COLORS.white }}>{t.celkem_k_uhrade}</Text>
                  <Text style={{ fontSize: 10, fontWeight: 'bold', color: COLORS.white }}>
                    {formatMena(soucty.k_uhrade, doklad.mena)}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* ── POZNÁMKY ── */}
        {doklad.poznamky && (
          <View style={{ flexDirection: 'row', marginBottom: 14 }}>
            <View style={{ width: 16, marginRight: 8 }} />
            <View style={[styles.notesSection, { flex: 1, marginBottom: 0 }]}>
              <Text style={styles.notesLabel}>{t.poznamky}</Text>
              <Text style={styles.notesText}>{doklad.poznamky}</Text>
            </View>
          </View>
        )}

        {/* ── FOOTER ── */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            {firemni?.obchodni_jmeno ?? ''}
            {firemni?.ico ? ` · ${t.ico}: ${firemni.ico}` : ''}
            {firemni?.platce_dph && firemni?.dic ? ` · ${t.dic}: ${firemni.dic}` : ''}
            {firemni?.email_fakturace ? ` · ${firemni.email_fakturace}` : ''}
            {firemni?.web ? ` · ${firemni.web}` : ''}
          </Text>
          <Text style={styles.pageNumber} render={({ pageNumber, totalPages }) =>
            `${t.strana} ${pageNumber} / ${totalPages}`
          } />
        </View>

      </Page>
    </Document>
  )
}

