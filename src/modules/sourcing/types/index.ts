export interface Supplier {
  id: string
  kod: string
  nazev_spolecnosti: string
  ico?: string | null
  dic?: string | null
  zeme_puvodu: string | null
  vychozi_mena: string
  platebni_podminky_splatnost_dni: number
  vychozi_lead_time_tydny: number
  kontakty: {
    email_objednavky?: string
    jmeno_zastupce?: string
    telefonni_cislo?: string
    [key: string]: any
  }
  adresa?: {
    ulice?: string
    mesto?: string
    psc?: string
    stat?: string
  }
  vytvoreno_at: string
  aktualizovano_at: string
  deleted_at: string | null

  // Audit Fields
  vytvoril_id: string | null
  vytvoril?: { jmeno: string }
  upravil_id: string | null
  upravil?: { jmeno: string }
}
