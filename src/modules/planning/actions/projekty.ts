'use server'

import { createClient } from '@/shared/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { Projekt } from '../types'

// --- Zod schéma ---
const projektSchema = z.object({
  nazev: z.string().min(1, 'Název projektu je povinný').max(200),
  popis: z.string().optional().nullable(),
  stav: z.enum(['planned', 'active', 'completed', 'on_hold', 'archived']).default('planned'),
  barva: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Neplatný formát barvy').default('#8A0485'),
  datum_zahajeni: z.string().optional().nullable(),
  datum_ukonceni: z.string().optional().nullable(),
})

// --- Výpis projektů ---
export async function getProjekty(): Promise<{ success: boolean; data?: Projekt[]; error?: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Nepřihlášený uživatel' }

    const { data, error } = await supabase
      .from('projekty_planovani')
      .select(`
        *,
        vytvoril:vytvoril_id ( jmeno ),
        upravil:upravil_id ( jmeno ),
        milniky!milniky_projekt_id_fkey (
          id,
          stav,
          progres_procenta,
          deleted_at
        )
      `)
      .is('deleted_at', null)
      .order('vytvoreno_at', { ascending: false })

    if (error) throw error

    // Agregace milníků na straně serveru
    const enriched = (data ?? []).map((p: any) => {
      const aktivni = (p.milniky ?? []).filter((m: any) => !m.deleted_at)
      const pocet_milniku = aktivni.length
      const dokonceno_milniku = aktivni.filter((m: any) => m.stav === 'completed').length
      const prumerne_progres = pocet_milniku > 0
        ? Math.round(aktivni.reduce((sum: number, m: any) => sum + (m.progres_procenta ?? 0), 0) / pocet_milniku)
        : 0
      const { milniky: _, ...rest } = p
      return { ...rest, pocet_milniku, dokonceno_milniku, prumerne_progres }
    })

    return { success: true, data: enriched as Projekt[] }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

// --- Detail projektu ---
export async function getProjekt(projektId: string): Promise<{ success: boolean; data?: Projekt; error?: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Nepřihlášený uživatel' }

    const { data, error } = await supabase
      .from('projekty_planovani')
      .select(`
        *,
        vytvoril:vytvoril_id ( jmeno ),
        upravil:upravil_id ( jmeno )
      `)
      .eq('id', projektId)
      .is('deleted_at', null)
      .single()

    if (error) throw error
    return { success: true, data: data as Projekt }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

// --- Vytvoření / Editace projektu ---
export async function upsertProjekt(
  payload: unknown,
  projektId?: string
): Promise<{ success: boolean; data?: { id: string }; error?: string }> {
  try {
    const validated = projektSchema.parse(payload)
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Nepřihlášený uživatel' }

    const dbPayload = {
      nazev: validated.nazev,
      popis: validated.popis ?? null,
      stav: validated.stav,
      barva: validated.barva,
      datum_zahajeni: validated.datum_zahajeni ?? null,
      datum_ukonceni: validated.datum_ukonceni ?? null,
      upravil_id: user.id,
    }

    let data
    let error

    if (projektId) {
      const { data: updated, error: err } = await supabase
        .from('projekty_planovani')
        .update(dbPayload)
        .eq('id', projektId)
        .select('id')
        .single()
      data = updated
      error = err
    } else {
      const { data: inserted, error: err } = await supabase
        .from('projekty_planovani')
        .insert({ ...dbPayload, vytvoril_id: user.id })
        .select('id')
        .single()
      data = inserted
      error = err
    }

    if (error) throw error
    revalidatePath('/planovani')
    return { success: true, data: data as { id: string } }
  } catch (e: any) {
    if (e.name === 'ZodError') {
      return { success: false, error: e.errors.map((err: any) => err.message).join(', ') }
    }
    return { success: false, error: e.message }
  }
}

// --- Soft delete projektu ---
export async function deleteProjekt(projektId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Nepřihlášený uživatel' }

    const { error } = await supabase
      .from('projekty_planovani')
      .update({
        deleted_at: new Date().toISOString(),
        upravil_id: user.id,
      })
      .eq('id', projektId)

    if (error) throw error
    revalidatePath('/planovani')
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}
