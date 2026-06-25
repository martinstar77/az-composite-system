'use server'

import { createClient } from '@/shared/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import type { CilOddeleniMilniku } from '../types'

const goalSchema = z.object({
  milnik_id: z.string().uuid(),
  oddeleni_id: z.string().min(1, 'Oddělení je povinné'),
  nazev: z.string().min(1, 'Název cíle je povinný').max(500),
  popis: z.string().optional().nullable(),
  stav: z.enum(['planned', 'in_progress', 'completed', 'cancelled']).default('planned'),
})

// ============================================================
// getCileByMilnik
// ============================================================
export async function getCileByMilnik(
  milnikId: string
): Promise<{ success: boolean; data?: CilOddeleniMilniku[]; error?: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Nepřihlášený uživatel' }

    const { data, error } = await supabase
      .from('cile_oddeleni_milniku')
      .select('*')
      .eq('milnik_id', milnikId)
      .order('vytvoreno_at', { ascending: true })

    if (error) throw error
    return { success: true, data: data ?? [] }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

// ============================================================
// upsertCil
// ============================================================
export async function upsertCil(
  payload: any,
  id?: string
): Promise<{ success: boolean; data?: CilOddeleniMilniku; error?: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Nepřihlášený uživatel' }

    const parsed = goalSchema.parse(payload)

    let result
    if (id) {
      // UPDATE
      const { data, error } = await supabase
        .from('cile_oddeleni_milniku')
        .update({
          ...parsed,
          upravil_id: user.id,
          aktualizovano_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select('*')
        .single()

      if (error) throw error
      result = data
    } else {
      // INSERT
      const { data, error } = await supabase
        .from('cile_oddeleni_milniku')
        .insert({
          ...parsed,
          vytvoril_id: user.id,
          upravil_id: user.id,
        })
        .select('*')
        .single()

      if (error) throw error
      result = data
    }

    // Zjistit projekt_id pro revalidaci
    const { data: milnikData } = await supabase
      .from('milniky')
      .select('projekt_id')
      .eq('id', parsed.milnik_id)
      .single()

    if (milnikData?.projekt_id) {
      revalidatePath(`/planovani/${milnikData.projekt_id}`)
    }
    revalidatePath('/planovani/kalendar')
    revalidatePath('/planovani/ukoly')

    return { success: true, data: result }
  } catch (e: any) {
    if (e instanceof z.ZodError) {
      return { success: false, error: e.issues[0].message }
    }
    return { success: false, error: e.message }
  }
}

// ============================================================
// deleteCil
// ============================================================
export async function deleteCil(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Nepřihlášený uživatel' }

    // Zjistit milnik_id před smazáním pro revalidaci
    const { data: goalData } = await supabase
      .from('cile_oddeleni_milniku')
      .select('milnik_id')
      .eq('id', id)
      .single()

    const { error } = await supabase
      .from('cile_oddeleni_milniku')
      .delete()
      .eq('id', id)

    if (error) throw error

    if (goalData?.milnik_id) {
      const { data: milnikData } = await supabase
        .from('milniky')
        .select('projekt_id')
        .eq('id', goalData.milnik_id)
        .single()

      if (milnikData?.projekt_id) {
        revalidatePath(`/planovani/${milnikData.projekt_id}`)
      }
    }
    revalidatePath('/planovani/kalendar')
    revalidatePath('/planovani/ukoly')

    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}
