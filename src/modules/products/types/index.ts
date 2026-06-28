export interface Product {
  id: string
  sku: string
  nazev: string
  nazev_en: string | null
  
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

  // Sales MOQ
  moq_prodejni: number | null
  moq_poznamka: string | null
  poznamka: string | null

  // Pricing & Margins
  cilova_marze_retail_procenta: number
  cilova_marze_partner_procenta: number
  cilova_marze_vip_procenta: number
  cilova_marze_premarket_open_procenta: number
  clo_procenta: number
  simulovana_velikost_objednavky: number

  // Packaging & Shipping Engine v2
  balici_profil_id: string | null
  balik_delka_cm_override: number | null
  balik_sirka_cm_override: number | null
  balik_vyska_cm_override: number | null
  c_balici_profily?: {
    id: string
    nazev: string
    typ_obalu: string
    delka_cm: number | null
    sirka_cm: number | null
    vyska_cm: number | null
    je_delka_fixni: boolean
    je_sirka_fixni: boolean
    je_vyska_fixni: boolean
    max_hmotnost_kg: number | null
    koeficient_objemove_hmotnosti: number
    padding_delka_cm: number
    padding_sirka_cm: number
    padding_vyska_cm: number
    hustota_kg_dm3: number
    poznamka: string | null
  } | null

  // Audit Fields
  vytvoril_id: string | null
  vytvoril?: { jmeno: string }
  upravil_id: string | null
  upravil?: { jmeno: string }

  // Nested Sourcing (DataGrid)
  produkt_dodavatel?: {
    dodavatel_id: string
    nakupni_cena: number
    mena: string
    is_primary: boolean
    logisticka_sablona_id?: string | null
    nakupni_mj_id?: string | null
    prevodni_pomer_na_zakladni?: number | null
    moq?: number | null
    logisticke_sablony?: { nazev: string } | null
    dodavatele?: { nazev_spolecnosti: string } | null
  }[]
  produkt_mnozstevni_slevy?: {
    id: string
    mnozstvi_od: number
    typ_zakaznika: 'B2C' | 'B2B'
    sleva_procenta: number
  }[]
}

