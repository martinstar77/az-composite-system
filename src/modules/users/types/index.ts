export interface Role {
  id: string
  nazev: string
}

export interface UserProfile {
  id: string
  email: string
  jmeno: string | null
  role_id: string
  c_role_uzivatelu?: Role
  vytvoreno_at: string
}
