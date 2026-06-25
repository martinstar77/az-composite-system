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
