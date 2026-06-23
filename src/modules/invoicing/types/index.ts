import type { Supplier } from '@/modules/sourcing/types'

// ============================================================
// FAKTURAČNÍ SYSTÉM — TypeScript Typy
// ============================================================

// ─────────────────────────────────────────────
// Firemní Nastavení
// ─────────────────────────────────────────────
export interface FiremniAdresa {
  ulice: string
  mesto: string
  psc: string
  stat: string
}

export interface FiremniProfil {
  obchodni_jmeno: string
  ico: string
  dic: string
  platce_dph: boolean
  adresa: FiremniAdresa
  typ_spojeni?: 'uctu' | 'iban'
  iban: string
  cislo_uctu?: string
  banka_nazev: string
  email_fakturace: string
  telefon: string
  web: string
  logo_url: string
}

export interface FiremniNastaveni {
  id: string
  klic: string
  hodnota: FiremniProfil
  aktualizovano_at: string
  upravil_id: string | null
}

// ─────────────────────────────────────────────
// Zákazník
// ─────────────────────────────────────────────
export interface ZakaznikAdresa {
  ulice?: string
  mesto?: string
  psc?: string
  stat?: string
}

export interface Zakaznik {
  id: string
  kod: string
  nazev_spolecnosti: string
  ico: string | null
  dic: string | null
  je_platce_dph: boolean
  zeme: string
  je_zahranicni: boolean
  email_fakturace: string | null
  telefon: string | null
  adresa: ZakaznikAdresa
  platebni_podminky_splatnost_dni: number
  poznamky: string | null
  deleted_at: string | null
  vytvoreno_at: string
  aktualizovano_at: string
  vytvoril_id: string | null
  upravil_id: string | null
  // Join fields
  vytvoril?: { jmeno: string } | null
  upravil?: { jmeno: string } | null
}

// ─────────────────────────────────────────────
// Doklady
// ─────────────────────────────────────────────
export type DokladTyp = 'nabidka' | 'objednavka' | 'zalohova_faktura' | 'faktura'
export type DokladStav =
  | 'koncept'
  | 'odeslano'
  | 'uhrazeno'
  | 'castecne_uhrazeno'
  | 'stornovano'
  | 'po_splatnosti'
export type ZpusobUhrady = 'prevod' | 'hotovost' | 'karta'

export type PolozkaTyp =
  | 'produkt'
  | 'volna_polozka'
  | 'sleva'
  | 'zalohovy_odpocet'
  | 'text_radek'
  | 'zaokrouhleni'

export interface DokladPolozka {
  id: string
  doklad_id: string
  poradi: number
  typ: PolozkaTyp
  produkt_id: string | null
  nazev: string
  popis: string | null
  jednotka: string
  mnozstvi: number
  cena_bez_dph: number
  sazba_dph: number
  sleva_procent: number
  radek_bez_dph: number
  radek_dph: number
  radek_celkem: number
  vytvoreno_at: string
}

export interface Doklad {
  id: string
  cislo: string
  typ: DokladTyp
  stav: DokladStav
  zakaznik_id: string | null
  dodavatel_id: string | null
  rodic_id: string | null
  datum_vystaveni: string
  datum_splatnosti: string | null
  duzp: string | null
  datum_platnosti: string | null
  mena: string
  kurz_k_czk: number
  platce_dph: boolean
  reverse_charge: boolean
  zpusob_uhrady: ZpusobUhrady
  jazyk: 'cs' | 'en'
  tisk_podpisu: boolean
  zalohova_castka: number | null
  zalohova_procento: number | null
  poznamky: string | null
  interni_poznamky: string | null
  firemni_udaje_snapshot: FiremniProfil | null
  zakaznik_udaje_snapshot: any | null // Holds either customer or supplier details snapshot
  deleted_at: string | null
  vytvoreno_at: string
  aktualizovano_at: string
  vytvoril_id: string | null
  upravil_id: string | null
  // Join fields
  zakaznik?: Zakaznik | null
  dodavatel?: Supplier | null
  polozky?: DokladPolozka[]
  vytvoril?: { jmeno: string } | null
  upravil?: { jmeno: string } | null
}

// ─────────────────────────────────────────────
// Přijaté doklady (Procurement / Supplier)
// ─────────────────────────────────────────────
export type PrijatyDokladTyp = 'objednavka_dodavateli' | 'prijata_faktura'
export type PrijatyDokladStav = 'koncept' | 'odeslano' | 'doruceno' | 'schvaleno' | 'uhrazeno' | 'stornovano'

export interface PrijatyDokladPolozka {
  id: string
  doklad_id: string
  poradi: number
  typ: 'produkt' | 'volna_polozka' | 'sleva' | 'text_radek'
  produkt_id: string | null
  nazev: string
  popis: string | null
  jednotka: string
  mnozstvi: number
  cena_bez_dph: number
  sazba_dph: number
  sleva_procent: number
  radek_bez_dph: number
  radek_dph: number
  radek_celkem: number
  vytvoreno_at: string
}

export interface PrijatyDoklad {
  id: string
  cislo: string
  externi_cislo_faktury: string | null
  typ: PrijatyDokladTyp
  stav: PrijatyDokladStav
  dodavatel_id: string | null
  rodic_id: string | null
  datum_vystaveni: string
  datum_prijeti: string | null
  datum_splatnosti: string | null
  duzp: string | null
  mena: string
  kurz_k_czk: number
  platce_dph: boolean
  zpusob_uhrady: ZpusobUhrady
  jazyk: 'cs' | 'en'
  tisk_splatnosti: boolean
  tisk_kurzu: boolean
  poznamky: string | null
  interni_poznamky: string | null
  dodavatel_udaje_snapshot: Supplier | null
  deleted_at: string | null
  vytvoreno_at: string
  aktualizovano_at: string
  vytvoril_id: string | null
  upravil_id: string | null
  // Join fields
  dodavatel?: Supplier | null
  polozky?: PrijatyDokladPolozka[]
  vytvoril?: { jmeno: string } | null
  upravil?: { jmeno: string } | null
}

// ─────────────────────────────────────────────
// DPH Rekapitulace (vypočítané, ne v DB)
// ─────────────────────────────────────────────
export interface DphSazka {
  sazba: number           // 0, 12, 21
  zaklad: number          // celková cena bez DPH pro tuto sazbu
  dph: number             // DPH pro tuto sazbu
  celkem: number          // zaklad + dph
}

export interface DokladSoucty {
  celkem_bez_dph: number
  dph_sazky: DphSazka[]  // Jedna položka pro každou použitou sazbu DPH
  celkem_dph: number
  celkem_s_dph: number
  zalohovy_odpocet: number
  k_uhrade: number        // celkem_s_dph - zalohovy_odpocet
}

// ─────────────────────────────────────────────
// Audit Log
// ─────────────────────────────────────────────
export interface DokladAuditLog {
  id: string
  doklad_id: string
  akce: string
  stary_stav: Record<string, unknown> | null
  novy_stav: Record<string, unknown> | null
  poznamka: string | null
  uzivatel_id: string | null
  vytvoreno_at: string
  uzivatel?: { jmeno: string } | null
}

// ─────────────────────────────────────────────
// Pomocné typy pro UI
// ─────────────────────────────────────────────

/** Lidsky čitelné popisky typů dokladů */
export const DOKLAD_TYP_LABELS: Record<DokladTyp, string> = {
  nabidka: 'Cenová nabídka',
  objednavka: 'Objednávka',
  zalohova_faktura: 'Zálohová faktura',
  faktura: 'Faktura',
}

export const PRIJATY_DOKLAD_TYP_LABELS: Record<PrijatyDokladTyp, string> = {
  objednavka_dodavateli: 'Objednávka dodavateli',
  prijata_faktura: 'Přijatá faktura',
}

/** Lidsky čitelné popisky stavů dokladů */
export const DOKLAD_STAV_LABELS: Record<DokladStav, string> = {
  koncept: 'Koncept',
  odeslano: 'Odesláno',
  uhrazeno: 'Uhrazeno',
  castecne_uhrazeno: 'Částečně uhrazeno',
  stornovano: 'Stornováno',
  po_splatnosti: 'Po splatnosti',
}

export const PRIJATY_DOKLAD_STAV_LABELS: Record<PrijatyDokladStav, string> = {
  koncept: 'Koncept',
  odeslano: 'Odesláno',
  doruceno: 'Doručeno',
  schvaleno: 'Schváleno',
  uhrazeno: 'Uhrazeno',
  stornovano: 'Stornováno',
}

/** Lidsky čitelné popisky způsobů úhrady */
export const ZPUSOB_UHRADY_LABELS: Record<ZpusobUhrady, string> = {
  prevod: 'Bankovní převod',
  hotovost: 'Hotovost',
  karta: 'Platební karta',
}

/** Dostupné sazby DPH v ČR */
export const DPH_SAZBY = [0, 12, 21] as const
export type DphSazbaHodnota = (typeof DPH_SAZBY)[number]
