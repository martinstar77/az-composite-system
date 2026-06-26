'use server'

import { createClient } from '@/shared/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import type {
  UkolPlanovani,
  UkolPlanovaniPayload,
  OddeleniType,
  ChecklistItem,
} from '../types'

// ============================================================
// Zod schémata
// ============================================================

const ukolSchema = z.object({
  milnik_id: z.string().uuid(),
  nazev: z.string().min(1, 'Název úkolu je povinný').max(500),
  popis: z.string().optional().nullable(),
  stav: z.enum(['todo', 'in_progress', 'done', 'blocked']).default('todo'),
  priorita: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  oddeleni: z.enum([
    'management', 'sales', 'purchasing', 'logistics',
    'backbone', 'finance', 'rd', 'marketing', 'backoffice', 'legal',
  ]).default('management'),
  typ_udalosti: z.enum(['task', 'order', 'deadline']).default('task'),
  vlastnik_id: z.string().uuid().optional().nullable(),
  datum_zahajeni: z.string().optional().nullable(),
  datum_splatnosti: z.string().optional().nullable(),
  checklist: z.array(z.object({
    text: z.string().min(1),
    done: z.boolean(),
  })).default([]),
  lokalita: z.string().optional().nullable(),
  barva: z.string().optional().nullable(),
  cil_id: z.string().uuid().optional().nullable(),
  parent_meeting_id: z.string().uuid().optional().nullable(),
})

// ============================================================
// SELECT helper — sloupce + join
// ============================================================
const UKOL_SELECT = `
  *,
  vlastnik:vlastnik_id (
    id,
    jmeno
  ),
  milnik:milnik_id (
    id,
    nazev,
    barva,
    projekt_id
  ),
  oddeleni_info:oddeleni (
    id,
    nazev,
    barva,
    vlastnik_id
  ),
  cil_info:cil_id (
    id,
    nazev,
    stav
  )
` as const

// ============================================================
// getUkolyByMilnik
// Načte všechny úkoly daného milníku (bez smazaných)
// Seřazeno: critical → high → medium → low, poté datum_splatnosti ASC
// ============================================================
export async function getUkolyByMilnik(
  milnikId: string
): Promise<{ success: boolean; data?: UkolPlanovani[]; error?: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Nepřihlášený uživatel' }

    const { data, error } = await supabase
      .from('ukoly_planovani')
      .select(UKOL_SELECT)
      .eq('milnik_id', milnikId)
      .is('deleted_at', null)
      .order('datum_splatnosti', { ascending: true, nullsFirst: false })

    if (error) throw error
    return { success: true, data: (data ?? []) as UkolPlanovani[] }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

// ============================================================
// getUkolyByDateRange
// Pro KALENDÁŘOVÝ POHLED — vrátí úkoly kde datum_splatnosti
// nebo datum_zahajeni leží v zadaném rozsahu
// ============================================================
export async function getUkolyByDateRange(
  from: string,  // ISO date 'YYYY-MM-DD'
  to: string,    // ISO date 'YYYY-MM-DD'
  filters?: {
    oddeleni?: OddeleniType
    vlastnik_id?: string
  }
): Promise<{ success: boolean; data?: UkolPlanovani[]; error?: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Nepřihlášený uživatel' }

    // Sestavíme dotaz — OR podmínka přes datum_splatnosti a datum_zahajeni
    let query = supabase
      .from('ukoly_planovani')
      .select(UKOL_SELECT)
      .is('deleted_at', null)
      .or(
        `datum_splatnosti.gte.${from},datum_splatnosti.lte.${to},` +
        `datum_zahajeni.gte.${from},datum_zahajeni.lte.${to}`
      )

    if (filters?.oddeleni) {
      query = query.eq('oddeleni', filters.oddeleni)
    }

    if (filters?.vlastnik_id) {
      query = query.eq('vlastnik_id', filters.vlastnik_id)
    }

    const { data, error } = await query.order('datum_splatnosti', { ascending: true, nullsFirst: false })

    if (error) throw error
    return { success: true, data: (data ?? []) as UkolPlanovani[] }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

// ============================================================
// getMilnikyDeadlines
// Pro KALENDÁŘ — vrátí deadlini milníků v daném rozsahu
// ============================================================
// getMilnikyDeadlines
// Pro KALENDÁŘ — vrátí deadlini milníků v daném rozsahu
// ============================================================
export async function getMilnikyDeadlines(
  from: string,
  to: string
): Promise<{ success: boolean; data?: { id: string; nazev: string; datum_splatnosti: string; barva: string | null; projekt_id: string }[]; error?: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Nepřihlášený uživatel' }

    const { data, error } = await supabase
      .from('milniky')
      .select('id, nazev, datum_splatnosti, barva, projekt_id')
      .is('deleted_at', null)
      .not('datum_splatnosti', 'is', null)
      .gte('datum_splatnosti', from)
      .lte('datum_splatnosti', to)
      .order('datum_splatnosti', { ascending: true })

    if (error) throw error
    return { success: true, data: data ?? [] }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

// Helper pro automatický přepočet progresu milníku na základě úkolů
async function recalculateMilnikProgress(supabase: any, milnikId: string) {
  const { data: ukoly, error: err } = await supabase
    .from('ukoly_planovani')
    .select('stav')
    .eq('milnik_id', milnikId)
    .is('deleted_at', null)

  if (err || !ukoly) return

  if (ukoly.length === 0) {
    return
  }

  const doneCount = ukoly.filter((u: any) => u.stav === 'done').length
  const progress = Math.round((doneCount / ukoly.length) * 100)

  let stav = 'in_progress'
  let datum_dokonceni = null
  if (progress === 100) {
    stav = 'completed'
    datum_dokonceni = new Date().toISOString().split('T')[0]
  } else if (progress === 0) {
    stav = 'planned'
  }

  await supabase
    .from('milniky')
    .update({ 
      progres_procenta: progress,
      stav,
      datum_dokonceni,
      upravil_id: (await supabase.auth.getUser()).data.user?.id || null
    })
    .eq('id', milnikId)
}

// ============================================================
// upsertUkol
// Vytvoří nebo aktualizuje úkol
// ============================================================
export async function upsertUkol(
  payload: unknown,
  ukolId?: string
): Promise<{ success: boolean; data?: UkolPlanovani; error?: string }> {
  try {
    const validated = ukolSchema.parse(payload)
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Nepřihlášený uživatel' }

    // Fetch parent milnik to get its tenant_id
    let tenantId = null
    if (validated.milnik_id) {
      const { data: milnik } = await supabase
        .from('milniky')
        .select('tenant_id')
        .eq('id', validated.milnik_id)
        .single()
      tenantId = milnik?.tenant_id ?? null
    }

    const dbPayload = {
      milnik_id: validated.milnik_id,
      nazev: validated.nazev,
      popis: validated.popis ?? null,
      stav: validated.stav,
      priorita: validated.priorita,
      oddeleni: validated.oddeleni,
      typ_udalosti: validated.typ_udalosti,
      vlastnik_id: validated.vlastnik_id ?? null,
      datum_zahajeni: validated.datum_zahajeni ?? null,
      datum_splatnosti: validated.datum_splatnosti ?? null,
      checklist: validated.checklist,
      lokalita: validated.lokalita ?? null,
      barva: validated.barva ?? null,
      cil_id: validated.cil_id ?? null,
      parent_meeting_id: validated.parent_meeting_id ?? null,
      upravil_id: user.id,
      tenant_id: tenantId,
    }

    let staryStav = null
    if (ukolId) {
      const { data: oldUkol } = await supabase
        .from('ukoly_planovani')
        .select('*')
        .eq('id', ukolId)
        .single()
      staryStav = oldUkol
    }

    let data
    let error

    if (ukolId) {
      // UPDATE
      const { data: updated, error: err } = await supabase
        .from('ukoly_planovani')
        .update(dbPayload)
        .eq('id', ukolId)
        .select(UKOL_SELECT)
        .single()
      data = updated
      error = err
    } else {
      // INSERT
      const { data: inserted, error: err } = await supabase
        .from('ukoly_planovani')
        .insert({ ...dbPayload, vytvoril_id: user.id })
        .select(UKOL_SELECT)
        .single()
      data = inserted
      error = err
    }

    if (error) throw error

    // Zapsat do audit logu
    await supabase.from('ukoly_planovani_audit_log').insert({
      ukol_id: data.id,
      akce: ukolId ? 'upraveno' : 'vytvoreno',
      stary_stav: staryStav,
      novy_stav: data,
      uzivatel_id: user.id,
    })

    // Recalculate milestone progress
    await recalculateMilnikProgress(supabase, validated.milnik_id)

    revalidatePath('/planovani')
    revalidatePath('/planovani/ukoly')
    revalidatePath('/')
    return { success: true, data: data as UkolPlanovani }
  } catch (e: any) {
    if (e.name === 'ZodError') {
      return { success: false, error: e.errors.map((err: any) => err.message).join(', ') }
    }
    return { success: false, error: e.message }
  }
}

// ============================================================
// toggleUkolStav
// Rychlé přepnutí stavu bez reloadu celé stránky
// ============================================================
export async function toggleUkolStav(
  ukolId: string,
  stav: UkolPlanovani['stav']
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Nepřihlášený uživatel' }

    // Načíst starý stav pro audit
    const { data: current } = await supabase
      .from('ukoly_planovani')
      .select('stav, milnik_id')
      .eq('id', ukolId)
      .single()

    const { data: updated, error } = await supabase
      .from('ukoly_planovani')
      .update({ stav, upravil_id: user.id })
      .eq('id', ukolId)
      .select('milnik_id')
      .single()

    if (error) throw error

    // Zapsat do audit logu
    await supabase.from('ukoly_planovani_audit_log').insert({
      ukol_id: ukolId,
      akce: 'stav_zmeneno',
      stary_stav: current ? { stav: current.stav } : null,
      novy_stav: { stav },
      uzivatel_id: user.id,
    })

    if (updated?.milnik_id) {
      await recalculateMilnikProgress(supabase, updated.milnik_id)
    }

    revalidatePath('/planovani')
    revalidatePath('/planovani/ukoly')
    revalidatePath('/')
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

// ============================================================
// toggleChecklistItem
// Odškrtne/zaškrtne jednu položku checklistu bez reloadu úkolu
// Bezpečný přístup: načteme aktuální checklist, patchneme index, uložíme
// ============================================================
export async function toggleChecklistItem(
  ukolId: string,
  index: number,
  done: boolean
): Promise<{ success: boolean; checklist?: ChecklistItem[]; error?: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Nepřihlášený uživatel' }

    // Načti aktuální checklist
    const { data: current, error: fetchError } = await supabase
      .from('ukoly_planovani')
      .select('checklist')
      .eq('id', ukolId)
      .single()

    if (fetchError) throw fetchError

    const checklist: ChecklistItem[] = Array.isArray(current?.checklist) ? current.checklist : []

    if (index < 0 || index >= checklist.length) {
      return { success: false, error: 'Neplatný index checklistu' }
    }

    checklist[index] = { ...checklist[index], done }

    const { error: updateError } = await supabase
      .from('ukoly_planovani')
      .update({ checklist, upravil_id: user.id })
      .eq('id', ukolId)

    if (updateError) throw updateError

    // Poznámka: bez revalidatePath záměrně — UI aktualizuje optimisticky
    return { success: true, checklist }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

// ============================================================
// deleteUkol
// Soft delete — nastaví deleted_at
// ============================================================
export async function deleteUkol(
  ukolId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Nepřihlášený uživatel' }

    const { data: updated, error } = await supabase
      .from('ukoly_planovani')
      .update({
        deleted_at: new Date().toISOString(),
        upravil_id: user.id,
      })
      .eq('id', ukolId)
      .select('milnik_id')
      .single()

    if (error) throw error

    // Zapsat do audit logu
    await supabase.from('ukoly_planovani_audit_log').insert({
      ukol_id: ukolId,
      akce: 'smazano',
      uzivatel_id: user.id,
    })

    if (updated?.milnik_id) {
      await recalculateMilnikProgress(supabase, updated.milnik_id)
    }

    revalidatePath('/planovani')
    revalidatePath('/planovani/ukoly')
    revalidatePath('/')
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

// ============================================================
// createQuickUkol
// Rychlé vytvoření úkolu z inline formu (Enter = uložit)
// Minimální payload — jen název + milnik_id + oddělení
// ============================================================
export async function createQuickUkol(
  milnikId: string,
  nazev: string,
  oddeleni: OddeleniType = 'management'
): Promise<{ success: boolean; data?: UkolPlanovani; error?: string }> {
  return upsertUkol({
    milnik_id: milnikId,
    nazev: nazev.trim(),
    oddeleni,
    stav: 'todo',
    priorita: 'medium',
    typ_udalosti: 'task',
    checklist: [],
  })
}

// ============================================================
// getUkolyGlobal
// Načte úkoly napříč všemi projekty a milníky s volitelnými filtry
// ============================================================
export async function getUkolyGlobal(filters?: {
  oddeleni?: OddeleniType
  vlastnik_id?: string
  stav?: UkolPlanovani['stav']
  projekt_id?: string
  limit?: number
}): Promise<{ success: boolean; data?: UkolPlanovani[]; error?: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Nepřihlášený uživatel' }

    let query = supabase
      .from('ukoly_planovani')
      .select(UKOL_SELECT)
      .is('deleted_at', null)

    if (filters?.oddeleni) {
      query = query.eq('oddeleni', filters.oddeleni)
    }

    if (filters?.vlastnik_id) {
      query = query.eq('vlastnik_id', filters.vlastnik_id)
    }

    if (filters?.stav) {
      query = query.eq('stav', filters.stav)
    }

    if (filters?.limit) {
      query = query.limit(filters.limit)
    }

    // Seřadit: critical → high → medium → low, pak podle data splatnosti
    const { data, error } = await query
      .order('datum_splatnosti', { ascending: true, nullsFirst: false })

    if (error) throw error

    let result = (data ?? []) as UkolPlanovani[]

    // In-memory filter pro projekt_id (pokud je zadán) kvůli jednoduchosti a spolehlivosti
    if (filters?.projekt_id) {
      result = result.filter(u => u.milnik?.projekt_id === filters.projekt_id)
    }

    return { success: true, data: result }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}
