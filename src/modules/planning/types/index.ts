// ============================================================
// PLÁNOVACÍ MODUL — TypeScript typy
// ============================================================

export type StavProjektu = 'planned' | 'active' | 'completed' | 'on_hold' | 'archived'
export type StavMilniku = 'planned' | 'in_progress' | 'completed' | 'blocked' | 'cancelled'
export type PrioritaMilniku = 'low' | 'medium' | 'high' | 'critical'

export interface UzivatelRef {
  jmeno: string
}

export interface Projekt {
  id: string
  nazev: string
  popis: string | null
  stav: StavProjektu
  barva: string
  datum_zahajeni: string | null
  datum_ukonceni: string | null
  tenant_id: string | null
  deleted_at: string | null
  vytvoreno_at: string
  aktualizovano_at: string
  vytvoril_id: string | null
  upravil_id: string | null
  // Joined
  vytvoril?: UzivatelRef | null
  upravil?: UzivatelRef | null
  // Aggregated (from server-side)
  pocet_milniku?: number
  dokonceno_milniku?: number
  prumerne_progres?: number
}

export interface Milnik {
  id: string
  projekt_id: string
  nazev: string
  popis: string | null
  stav: StavMilniku
  priorita: PrioritaMilniku
  datum_zahajeni: string | null
  datum_splatnosti: string | null
  datum_dokonceni: string | null
  progres_procenta: number
  poradi: number
  vlastnik_id: string | null
  barva: string | null
  tenant_id: string | null
  deleted_at: string | null
  vytvoreno_at: string
  aktualizovano_at: string
  vytvoril_id: string | null
  upravil_id: string | null
  // Joined
  vlastnik?: UzivatelRef | null
  vytvoril?: UzivatelRef | null
  upravil?: UzivatelRef | null
}

// --- Konstanty pro UI ---

export const STAV_PROJEKTU_CONFIG: Record<StavProjektu, { label: string; color: string; bg: string }> = {
  planned:   { label: 'Plánován',    color: 'text-zinc-500',   bg: 'bg-zinc-100 dark:bg-zinc-800' },
  active:    { label: 'Probíhá',     color: 'text-blue-600',   bg: 'bg-blue-50 dark:bg-blue-950/40' },
  completed: { label: 'Dokončen',    color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/40' },
  on_hold:   { label: 'Pozastaven', color: 'text-amber-600',  bg: 'bg-amber-50 dark:bg-amber-950/40' },
  archived:  { label: 'Archivován', color: 'text-zinc-400',   bg: 'bg-zinc-50 dark:bg-zinc-900' },
}

export const STAV_MILNIKU_CONFIG: Record<StavMilniku, { label: string; color: string; bg: string; dot: string }> = {
  planned:     { label: 'Plánován',   color: 'text-zinc-500',    bg: 'bg-zinc-100 dark:bg-zinc-800',          dot: 'bg-zinc-400' },
  in_progress: { label: 'Probíhá',   color: 'text-blue-600',    bg: 'bg-blue-50 dark:bg-blue-950/40',        dot: 'bg-blue-500' },
  completed:   { label: 'Dokončen',  color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/40',  dot: 'bg-emerald-500' },
  blocked:     { label: 'Blokován',  color: 'text-red-600',     bg: 'bg-red-50 dark:bg-red-950/40',          dot: 'bg-red-500' },
  cancelled:   { label: 'Zrušen',    color: 'text-zinc-400',    bg: 'bg-zinc-50 dark:bg-zinc-900',           dot: 'bg-zinc-300' },
}

export const PRIORITA_CONFIG: Record<PrioritaMilniku, { label: string; color: string; icon: string }> = {
  low:      { label: 'Nízká',    color: 'text-zinc-400',    icon: '↓' },
  medium:   { label: 'Střední',  color: 'text-blue-500',    icon: '→' },
  high:     { label: 'Vysoká',   color: 'text-amber-500',   icon: '↑' },
  critical: { label: 'Kritická', color: 'text-red-500',     icon: '⚡' },
}

// ============================================================
// ÚKOLY PLÁNOVÁNÍ (ukoly_planovani)
// ============================================================

export type StavUkolu = 'todo' | 'in_progress' | 'done' | 'blocked'
export type PrioritaUkolu = 'low' | 'medium' | 'high' | 'critical'

export type OddeleniType =
  | 'management'
  | 'sales'
  | 'purchasing'
  | 'logistics'
  | 'backbone'
  | 'finance'
  | 'rd'
  | 'marketing'
  | 'backoffice'
  | 'legal'

export type TypUdalostiType = 'task' | 'meeting' | 'order' | 'deadline'

export interface ChecklistItem {
  text: string
  done: boolean
}

export interface UzivatelMinRef {
  id: string
  jmeno: string
  avatar_url?: string | null
}

export interface UkolPlanovani {
  id: string
  milnik_id: string
  nazev: string
  popis: string | null
  stav: StavUkolu
  priorita: PrioritaUkolu
  oddeleni: OddeleniType
  typ_udalosti: TypUdalostiType
  vlastnik_id: string | null
  datum_zahajeni: string | null   // ISO date string 'YYYY-MM-DD'
  datum_splatnosti: string | null // ISO date string 'YYYY-MM-DD'
  checklist: ChecklistItem[]
  tenant_id: string | null
  deleted_at: string | null
  vytvoreno_at: string
  aktualizovano_at: string
  vytvoril_id: string | null
  upravil_id: string | null
  // Joinovaná data (volitelné — dle dotazu)
  vlastnik?: UzivatelMinRef | null
  milnik?: Pick<Milnik, 'id' | 'nazev' | 'barva' | 'projekt_id'> | null
}

/** Payload pro INSERT / UPDATE — bez audit polí */
export interface UkolPlanovaniPayload {
  milnik_id: string
  nazev: string
  popis?: string | null
  stav?: StavUkolu
  priorita?: PrioritaUkolu
  oddeleni: OddeleniType
  typ_udalosti?: TypUdalostiType
  vlastnik_id?: string | null
  datum_zahajeni?: string | null
  datum_splatnosti?: string | null
  checklist?: ChecklistItem[]
}

// --- UI Konstanty pro úkoly ---

export const STAV_UKOLU_CONFIG: Record<StavUkolu, { label: string; color: string; bg: string; dot: string }> = {
  todo:        { label: 'K dispozici', color: 'text-zinc-500',    bg: 'bg-zinc-100 dark:bg-zinc-800',          dot: 'bg-zinc-400' },
  in_progress: { label: 'Probíhá',    color: 'text-blue-600',    bg: 'bg-blue-50 dark:bg-blue-950/40',        dot: 'bg-blue-500' },
  done:        { label: 'Hotovo',      color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/40',  dot: 'bg-emerald-500' },
  blocked:     { label: 'Blokováno',  color: 'text-red-600',     bg: 'bg-red-50 dark:bg-red-950/40',          dot: 'bg-red-500' },
}

export const ODDELENI_CONFIG: Record<OddeleniType, { label: string; color: string; bg: string }> = {
  management: { label: 'Management',  color: 'text-purple-600',  bg: 'bg-purple-100 dark:bg-purple-950/40' },
  sales:      { label: 'Obchod',      color: 'text-blue-600',    bg: 'bg-blue-100 dark:bg-blue-950/40' },
  purchasing: { label: 'Nákup',       color: 'text-sky-600',     bg: 'bg-sky-100 dark:bg-sky-950/40' },
  logistics:  { label: 'Logistika',   color: 'text-emerald-600', bg: 'bg-emerald-100 dark:bg-emerald-950/40' },
  backbone:   { label: 'IT / Systém', color: 'text-violet-600',  bg: 'bg-violet-100 dark:bg-violet-950/40' },
  finance:    { label: 'Finance',     color: 'text-amber-600',   bg: 'bg-amber-100 dark:bg-amber-950/40' },
  rd:         { label: 'R&D',         color: 'text-teal-600',    bg: 'bg-teal-100 dark:bg-teal-950/40' },
  marketing:  { label: 'Marketing',   color: 'text-pink-600',    bg: 'bg-pink-100 dark:bg-pink-950/40' },
  backoffice: { label: 'Back Office', color: 'text-zinc-600',    bg: 'bg-zinc-100 dark:bg-zinc-800' },
  legal:      { label: 'Právní',      color: 'text-orange-700',  bg: 'bg-orange-100 dark:bg-orange-950/40' },
}

export const TYP_UDALOSTI_CONFIG: Record<TypUdalostiType, { label: string; icon: string; color: string }> = {
  task:     { label: 'Úkol',        icon: '✓',  color: 'text-blue-600' },
  meeting:  { label: 'Schůzka',     icon: '👥', color: 'text-purple-600' },
  order:    { label: 'Objednávka',  icon: '📦', color: 'text-emerald-600' },
  deadline: { label: 'Deadline',    icon: '🔴', color: 'text-red-600' },
}

