export interface Product {
  id: string
  sku: string
  nazev: string
  
  // Relations
  kategorie_id: string
  c_kategorie?: { nazev: string }
  
  zakladni_mj_id: string
  c_merne_jednotky_zakladni?: { nazev: string, zkratka: string }
  
  // Logistics
  mnozstvi_v_baleni: number | null
  jednotka_baleni_id: string | null
  c_merne_jednotky_baleni?: { nazev: string, zkratka: string }
  
  hmotnost_baliku_kg: number | null
  shelf_life_mesice: number | null
  
  // Defaults
  def_typ_skladovani: string | null
  def_proces_odeslani_id: string | null
  c_procesy_odeslani?: { nazev: string }
  
  def_typ_labelu_id: string | null
  c_typy_labelu?: { nazev: string }
  
  stav_katalogu_id: string | null
  c_stavy_produktu?: { nazev: string }
  
  // Flexible
  specifikace: any
  
  vytvoreno_at: string
  aktualizovano_at: string
  
  // Stock Levels
  min_skladova_zasoba: number | null
  opt_skladova_zasoba: number | null
  deleted_at: string | null

  // Pricing & Margins
  cilova_marze_retail_procenta: number
  cilova_marze_partner_procenta: number
  cilova_marze_vip_procenta: number
  cilova_marze_premarket_open_procenta: number
  clo_procenta: number

  // Audit Fields
  vytvoril_id: string | null
  vytvoril?: { jmeno: string }
  upravil_id: string | null
  upravil?: { jmeno: string }

  // Nested Sourcing (DataGrid)
  produkt_dodavatel?: {
    nakupni_cena: number
    mena: string
    is_primary: boolean
    logisticka_sablona_id?: string | null
    prevodni_pomer_na_zakladni?: number | null
    moq?: number | null
    logisticke_sablony?: { nazev: string } | null
  }[]
  produkt_mnozstevni_slevy?: {
    id: string
    mnozstvi_od: number
    typ_zakaznika: 'B2C' | 'B2B'
    sleva_procenta: number
  }[]
}

