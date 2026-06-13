import { Product } from "../../products/types"
import { Supplier } from "./index"

export interface ProductSupplier {
  id: string
  produkt_id: string
  dodavatel_id: string
  nakupni_cena: number
  mena: string
  moq: number
  lead_time_tydny: number | null
  is_primary: boolean
  
  // Relations
  dodavatele?: Supplier
  
  // Audit
  vytvoreno_at: string
  aktualizovano_at: string
  vytvoril?: { jmeno: string }
  upravil?: { jmeno: string }
}
