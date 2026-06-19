export interface NoteFolder {
  id: string
  nazev: string
  barva: string
  is_shared: boolean
  tenant_id: string | null
  vytvoril_id: string | null
  upravil_id: string | null
  vytvoreno_at: string
  aktualizovano_at: string
  vytvoril?: { jmeno: string | null }
  upravil?: { jmeno: string | null }
}

export interface Note {
  id: string
  slozka_id: string | null
  nazev: string
  obsah: string | null
  obsah_txt: string | null
  is_shared: boolean
  tenant_id: string | null
  vytvoril_id: string | null
  upravil_id: string | null
  vytvoreno_at: string
  aktualizovano_at: string
  vytvoril?: { jmeno: string | null }
  upravil?: { jmeno: string | null }
}
