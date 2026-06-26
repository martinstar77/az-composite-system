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

export type OddeleniType = string

export interface FirmaOddeleni {
  id: string
  nazev: string
  vlastnik_id: string | null
  barva: string
  popis: string | null
  kpi: string | null
  vytvoreno_at: string
  // Joined
  vlastnik?: UzivatelMinRef | null
  pocet_aktivnich_ukolu?: number
}

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

export interface CilOddeleniMilniku {
  id: string
  milnik_id: string
  oddeleni_id: string
  nazev: string
  popis: string | null
  stav: 'planned' | 'in_progress' | 'completed' | 'cancelled'
  vytvoreno_at: string
  aktualizovano_at: string
  vytvoril_id: string | null
  upravil_id: string | null
}

export interface AgendaTopic {
  id: string
  nazev: string
  popis: string | null
  prezentuje_id: string | null
  doba_minut: number
  stav: 'planned' | 'discussed'
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
  lokalita: string | null
  barva: string | null
  cil_id: string | null
  agenda: AgendaTopic[]
  zapis: string | null
  parent_id: string | null
  // Joinovaná data (volitelné — dle dotazu)
  vlastnik?: UzivatelMinRef | null
  milnik?: Pick<Milnik, 'id' | 'nazev' | 'barva' | 'projekt_id'> | null
  oddeleni_info?: { id: string; nazev: string; barva: string; vlastnik_id: string | null } | null
  cil_info?: { id: string; nazev: string; stav: string } | null
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
  lokalita?: string | null
  barva?: string | null
  cil_id?: string | null
  agenda?: AgendaTopic[]
  zapis?: string | null
  parent_id?: string | null
}

// --- UI Konstanty pro úkoly ---

export const STAV_UKOLU_CONFIG: Record<StavUkolu, { label: string; color: string; bg: string; dot: string }> = {
  todo:        { label: 'K dispozici', color: 'text-zinc-500',    bg: 'bg-zinc-100 dark:bg-zinc-800',          dot: 'bg-zinc-400' },
  in_progress: { label: 'Probíhá',    color: 'text-blue-600',    bg: 'bg-blue-50 dark:bg-blue-950/40',        dot: 'bg-blue-500' },
  done:        { label: 'Hotovo',      color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/40',  dot: 'bg-emerald-500' },
  blocked:     { label: 'Blokováno',  color: 'text-red-600',     bg: 'bg-red-50 dark:bg-red-950/40',          dot: 'bg-red-500' },
}

export const ODDELENI_CONFIG: Record<OddeleniType, { label: string; color: string; bg: string; colorHex: string }> = {
  management: { label: 'Management',  color: 'text-purple-700 dark:text-purple-200',  bg: 'bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800/40', colorHex: '#a855f7' },
  sales:      { label: 'Obchod',      color: 'text-blue-700 dark:text-blue-200',    bg: 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800/40', colorHex: '#3b82f6' },
  purchasing: { label: 'Nákup',       color: 'text-sky-700 dark:text-sky-200',     bg: 'bg-sky-50 dark:bg-sky-950/40 border-sky-200 dark:border-sky-800/40', colorHex: '#0ea5e9' },
  logistics:  { label: 'Logistika',   color: 'text-emerald-700 dark:text-emerald-200', bg: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/40', colorHex: '#10b981' },
  backbone:   { label: 'IT / Systém', color: 'text-violet-700 dark:text-violet-200',  bg: 'bg-violet-50 dark:bg-violet-950/40 border-violet-200 dark:border-violet-800/40', colorHex: '#8b5cf6' },
  finance:    { label: 'Finance',     color: 'text-amber-700 dark:text-amber-200',   bg: 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/40', colorHex: '#f59e0b' },
  rd:         { label: 'R&D',         color: 'text-teal-700 dark:text-teal-200',    bg: 'bg-teal-50 dark:bg-teal-950/40 border-teal-200 dark:border-teal-800/40', colorHex: '#14b8a6' },
  marketing:  { label: 'Marketing',   color: 'text-pink-700 dark:text-pink-200',    bg: 'bg-pink-50 dark:bg-pink-950/40 border-pink-200 dark:border-pink-800/40', colorHex: '#ec4899' },
  backoffice: { label: 'Back Office', color: 'text-zinc-700 dark:text-zinc-200',    bg: 'bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700', colorHex: '#71717a' },
  legal:      { label: 'Právní',      color: 'text-orange-700 dark:text-orange-200',  bg: 'bg-orange-50 dark:bg-orange-950/40 border-orange-200 dark:border-orange-900/40', colorHex: '#f97316' },
}

export const TYP_UDALOSTI_CONFIG: Record<TypUdalostiType, { label: string; icon: string; color: string }> = {
  task:     { label: 'Úkol',        icon: '✓',  color: 'text-blue-700 dark:text-blue-200' },
  meeting:  { label: 'Schůzka',     icon: '👥', color: 'text-purple-700 dark:text-purple-200' },
  order:    { label: 'Objednávka',  icon: '📦', color: 'text-yellow-700 dark:text-yellow-200' },
  deadline: { label: 'Deadline',    icon: '🔴', color: 'text-red-700 dark:text-red-200' },
}

