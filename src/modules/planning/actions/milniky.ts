'use server'

import { createClient } from '@/shared/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { Milnik } from '../types'

// --- Zod schéma ---
const milnikSchema = z.object({
  projekt_id: z.string().uuid(),
  nazev: z.string().min(1, 'Název milníku je povinný').max(300),
  popis: z.string().optional().nullable(),
  stav: z.enum(['planned', 'in_progress', 'completed', 'blocked', 'cancelled']).default('planned'),
  priorita: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  datum_zahajeni: z.string().optional().nullable(),
  datum_splatnosti: z.string().optional().nullable(),
  datum_dokonceni: z.string().optional().nullable(),
  progres_procenta: z.number().int().min(0).max(100).default(0),
  vlastnik_id: z.string().uuid().optional().nullable(),
  barva: z.string().optional().nullable(),
})

const poradiSchema = z.array(z.object({
  id: z.string().uuid(),
  poradi: z.number().int(),
}))

// --- Výpis milníků pro projekt ---
export async function getMilniky(projektId: string): Promise<{ success: boolean; data?: Milnik[]; error?: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Nepřihlášený uživatel' }

    const { data, error } = await supabase
      .from('milniky')
      .select(`
        *,
        vlastnik:vlastnik_id ( jmeno ),
        vytvoril:vytvoril_id ( jmeno ),
        upravil:upravil_id ( jmeno )
      `)
      .eq('projekt_id', projektId)
      .is('deleted_at', null)
      .order('poradi', { ascending: true })

    if (error) throw error
    return { success: true, data: data as Milnik[] }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

// --- Vytvoření / Editace milníku ---
export async function upsertMilnik(
  payload: unknown,
  milnikId?: string
): Promise<{ success: boolean; data?: Milnik; error?: string }> {
  try {
    const validated = milnikSchema.parse(payload)
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Nepřihlášený uživatel' }

    const dbPayload = {
      projekt_id: validated.projekt_id,
      nazev: validated.nazev,
      popis: validated.popis ?? null,
      stav: validated.stav,
      priorita: validated.priorita,
      datum_zahajeni: validated.datum_zahajeni ?? null,
      datum_splatnosti: validated.datum_splatnosti ?? null,
      datum_dokonceni: validated.datum_dokonceni ?? null,
      progres_procenta: validated.progres_procenta,
      vlastnik_id: validated.vlastnik_id ?? null,
      barva: validated.barva ?? null,
      upravil_id: user.id,
    }

    let data
    let error

    if (milnikId) {
      const { data: updated, error: err } = await supabase
        .from('milniky')
        .update(dbPayload)
        .eq('id', milnikId)
        .select(`*, vlastnik:vlastnik_id ( jmeno )`)
        .single()
      data = updated
      error = err
    } else {
      // Zjistíme aktuální max poradi pro projekt
      const { data: existing } = await supabase
        .from('milniky')
        .select('poradi')
        .eq('projekt_id', validated.projekt_id)
        .is('deleted_at', null)
        .order('poradi', { ascending: false })
        .limit(1)

      const nextPoradi = existing && existing.length > 0 ? existing[0].poradi + 1 : 0

      const { data: inserted, error: err } = await supabase
        .from('milniky')
        .insert({ ...dbPayload, vytvoril_id: user.id, poradi: nextPoradi })
        .select(`*, vlastnik:vlastnik_id ( jmeno )`)
        .single()
      data = inserted
      error = err
    }

    if (error) throw error
    revalidatePath('/planovani')
    return { success: true, data: data as Milnik }
  } catch (e: any) {
    if (e.name === 'ZodError') {
      return { success: false, error: e.errors.map((err: any) => err.message).join(', ') }
    }
    return { success: false, error: e.message }
  }
}

// --- Hromadná aktualizace pořadí (drag-and-drop) ---
export async function updatePoradi(
  items: unknown
): Promise<{ success: boolean; error?: string }> {
  try {
    const validated = poradiSchema.parse(items)
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Nepřihlášený uživatel' }

    // Batch update — každý milník dostane nové pořadí
    const updates = validated.map(({ id, poradi }) =>
      supabase
        .from('milniky')
        .update({ poradi, upravil_id: user.id })
        .eq('id', id)
    )

    const results = await Promise.all(updates)
    const failed = results.find(r => r.error)
    if (failed?.error) throw failed.error

    revalidatePath('/planovani')
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

// --- Soft delete milníku ---
export async function deleteMilnik(milnikId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Nepřihlášený uživatel' }

    const { error } = await supabase
      .from('milniky')
      .update({
        deleted_at: new Date().toISOString(),
        upravil_id: user.id,
      })
      .eq('id', milnikId)

    if (error) throw error
    revalidatePath('/planovani')
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

// --- Rychlá aktualizace stavu / progressu milníku ---
export async function updateMilnikStav(
  milnikId: string,
  stav: Milnik['stav'],
  progres_procenta?: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Nepřihlášený uživatel' }

    const update: Record<string, unknown> = { stav, upravil_id: user.id }
    if (progres_procenta !== undefined) update.progres_procenta = progres_procenta
    // Automaticky nastavíme datum_dokonceni při completion
    if (stav === 'completed') {
      update.datum_dokonceni = new Date().toISOString().split('T')[0]
      update.progres_procenta = 100
    }

    const { error } = await supabase
      .from('milniky')
      .update(update)
      .eq('id', milnikId)

    if (error) throw error
    revalidatePath('/planovani')
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

// --- Aktualizace popisu a progressu (úkoly/checkboxy) ---
export async function updateMilnikTasks(
  milnikId: string,
  popis: string,
  progres_procenta: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Nepřihlášený uživatel' }

    const update: Record<string, unknown> = {
      popis,
      progres_procenta,
      upravil_id: user.id,
    }

    // Automaticky přehodit stav pokud je progress 100% nebo > 0%
    if (progres_procenta === 100) {
      update.stav = 'completed'
      update.datum_dokonceni = new Date().toISOString().split('T')[0]
    } else if (progres_procenta > 0) {
      update.stav = 'in_progress'
    }

    const { error } = await supabase
      .from('milniky')
      .update(update)
      .eq('id', milnikId)

    if (error) throw error
    revalidatePath('/planovani')
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}
