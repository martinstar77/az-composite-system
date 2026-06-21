'use server'

import { createClient } from '@/shared/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { Zakaznik } from '../types'
import { zakaznikSchema } from '../types/formSchema'

/**
 * Načte seznam všech aktivních zákazníků.
 */
export async function getZakaznici(): Promise<Zakaznik[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('zakaznici')
    .select(`
      *,
      vytvoril:vytvoril_id ( jmeno ),
      upravil:upravil_id ( jmeno )
    `)
    .is('deleted_at', null)
    .order('nazev_spolecnosti', { ascending: true })

  if (error) {
    console.error('[getZakaznici]', error)
    return []
  }

  return data as Zakaznik[]
}

/**
 * Načte jednoho zákazníka podle ID.
 */
export async function getZakaznikById(id: string): Promise<Zakaznik | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('zakaznici')
    .select(`
      *,
      vytvoril:vytvoril_id ( jmeno ),
      upravil:upravil_id ( jmeno )
    `)
    .eq('id', id)
    .is('deleted_at', null)
    .single()

  if (error || !data) return null
  return data as Zakaznik
}

/**
 * Generuje automatický kód zákazníka (AZ-K-0001, AZ-K-0002, ...)
 */
export async function generateZakaznikKod(): Promise<string> {
  const supabase = await createClient()

  const { count } = await supabase
    .from('zakaznici')
    .select('*', { count: 'exact', head: true })

  const n = (count ?? 0) + 1
  return `AZ-K-${String(n).padStart(4, '0')}`
}

/**
 * Vytvoří nového zákazníka.
 */
export async function createZakaznik(
  formData: Record<string, unknown>
): Promise<{ success: boolean; id?: string; error?: string }> {
  const supabase = await createClient()

  const parsed = zakaznikSchema.safeParse(formData)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Neplatná data' }
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Nejste přihlášeni' }

  const { data, error } = await supabase
    .from('zakaznici')
    .insert({
      ...parsed.data,
      vytvoril_id:     user.id,
      upravil_id:      user.id,
    })
    .select('id')
    .single()

  if (error) {
    console.error('[createZakaznik]', error)
    if (error.code === '23505') {
      return { success: false, error: `Zákazník s kódem "${parsed.data.kod}" již existuje.` }
    }
    return { success: false, error: 'Chyba při vytváření zákazníka: ' + error.message }
  }

  revalidatePath('/zakaznici')

  return { success: true, id: data.id }
}

/**
 * Aktualizuje existujícího zákazníka.
 */
export async function updateZakaznik(
  id: string,
  formData: Record<string, unknown>
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  const parsed = zakaznikSchema.safeParse(formData)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Neplatná data' }
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Nejste přihlášeni' }

  const { error } = await supabase
    .from('zakaznici')
    .update({
      ...parsed.data,
      upravil_id:      user.id,
      aktualizovano_at: new Date().toISOString(),
    })
    .eq('id', id)
    .is('deleted_at', null)

  if (error) {
    console.error('[updateZakaznik]', error)
    return { success: false, error: 'Chyba při aktualizaci: ' + error.message }
  }

  revalidatePath('/zakaznici')
  revalidatePath(`/zakaznici/${id}`)

  return { success: true }
}

/**
 * Soft-delete zákazníka.
 */
export async function deleteZakaznik(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Nejste přihlášeni' }

  const { error } = await supabase
    .from('zakaznici')
    .update({
      deleted_at:      new Date().toISOString(),
      upravil_id:      user.id,
    })
    .eq('id', id)

  if (error) {
    console.error('[deleteZakaznik]', error)
    return { success: false, error: 'Chyba při mazání: ' + error.message }
  }

  revalidatePath('/zakaznici')

  return { success: true }
}
