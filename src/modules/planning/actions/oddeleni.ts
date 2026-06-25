'use server'

import { createClient } from '@/shared/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import type { FirmaOddeleni } from '../types'

const oddeleniSchema = z.object({
  id: z.string().min(2, 'Kód oddělení musí mít aspoň 2 znaky').max(50).regex(/^[a-z0-9-_]+$/, 'Kód oddělení smí obsahovat pouze malá písmena, čísla, pomlčky a podtržítka'),
  nazev: z.string().min(1, 'Název oddělení je povinný').max(200),
  vlastnik_id: z.string().uuid().optional().nullable(),
  barva: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Neplatný formát barvy (očekává se HEX, např. #ff0000)'),
  popis: z.string().optional().nullable(),
  kpi: z.string().optional().nullable(),
})

export async function getOddeleni(): Promise<{ success: boolean; data?: FirmaOddeleni[]; error?: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Nepřihlášený uživatel' }

    // Načteme oddělení a připojíme vlastníky
    const { data, error } = await supabase
      .from('oddeleni')
      .select(`
        *,
        vlastnik:vlastnik_id (
          id,
          jmeno
        )
      `)
      .order('nazev', { ascending: true })

    if (error) throw error

    // Načteme počty rozpracovaných úkolů pro každé oddělení
    const { data: ukolyCounts, error: countErr } = await supabase
      .from('ukoly_planovani')
      .select('oddeleni, stav')
      .is('deleted_at', null)
      .neq('stav', 'done')

    const countsMap: Record<string, number> = {}
    if (!countErr && ukolyCounts) {
      ukolyCounts.forEach(u => {
        countsMap[u.oddeleni] = (countsMap[u.oddeleni] || 0) + 1
      })
    }

    const result = (data ?? []).map(d => ({
      ...d,
      pocet_aktivnich_ukolu: countsMap[d.id] || 0
    })) as FirmaOddeleni[]

    return { success: true, data: result }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

export async function upsertOddeleni(
  payload: unknown,
  isEdit = false
): Promise<{ success: boolean; data?: FirmaOddeleni; error?: string }> {
  try {
    const validated = oddeleniSchema.parse(payload)
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Nepřihlášený uživatel' }

    const dbPayload = {
      nazev: validated.nazev,
      vlastnik_id: validated.vlastnik_id || null,
      barva: validated.barva,
      popis: validated.popis || null,
      kpi: validated.kpi || null,
    }

    let data
    let error

    if (isEdit) {
      // UPDATE
      const { data: updated, error: err } = await supabase
        .from('oddeleni')
        .update(dbPayload)
        .eq('id', validated.id)
        .select(`
          *,
          vlastnik:vlastnik_id (
            id,
            jmeno
          )
        `)
        .single()
      data = updated
      error = err
    } else {
      // INSERT
      const { data: inserted, error: err } = await supabase
        .from('oddeleni')
        .insert({ ...dbPayload, id: validated.id })
        .select(`
          *,
          vlastnik:vlastnik_id (
            id,
            jmeno
          )
        `)
        .single()
      data = inserted
      error = err
    }

    if (error) throw error

    revalidatePath('/planovani/struktura')
    revalidatePath('/planovani/ukoly')
    return { success: true, data: data as FirmaOddeleni }
  } catch (e: any) {
    if (e.name === 'ZodError') {
      return { success: false, error: e.errors.map((err: any) => err.message).join(', ') }
    }
    return { success: false, error: e.message }
  }
}

export async function deleteOddeleni(
  oddeleniId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Nepřihlášený uživatel' }

    // Kontrola, zda neexistují aktivní (nedokončené) úkoly navázané na toto oddělení
    const { data: activeTasks, error: checkError } = await supabase
      .from('ukoly_planovani')
      .select('id, nazev')
      .eq('oddeleni', oddeleniId)
      .is('deleted_at', null)
      .limit(1)

    if (checkError) throw checkError

    if (activeTasks && activeTasks.length > 0) {
      return { 
        success: false, 
        error: `Nelze smazat oddělení, protože na něj jsou stále navázány úkoly (např. „${activeTasks[0].nazev}“). Úkoly nejprve smažte nebo přeregistrujte na jiné oddělení.` 
      }
    }

    // Provedeme smazání
    const { error } = await supabase
      .from('oddeleni')
      .delete()
      .eq('id', oddeleniId)

    if (error) throw error

    revalidatePath('/planovani/struktura')
    revalidatePath('/planovani/ukoly')
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}
