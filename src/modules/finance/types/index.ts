export interface ExchangeRate {
  id: string
  datum: string
  mena: string
  kurz_czk: number
  mnozstvi: number
}

export interface GlobalFinanceSettings {
  id: string
  manualni_kurz_eur: number | null
  manualni_kurz_usd: number | null
  pouzivat_manualni_kurzy: boolean
  poplatek_zahranicni_platba_czk: number
  poplatek_procleni_czk: number
  marze_rezerva_procenta: number
  doprava_eur_za_kg: number
  clo_default_procenta: number
  aktualizovano_at: string
  upravil_id: string | null
  upravil?: { jmeno: string }
}

export * from "./logistics"

