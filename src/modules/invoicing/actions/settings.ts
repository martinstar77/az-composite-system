'use server'

import { createClient } from '@/shared/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { FiremniNastaveni, FiremniProfil } from '../types'
import { firemniProfilSchema } from '../types/formSchema'

const KLIC = 'hlavni_profil'

/**
 * Načte firemní profil z DB.
 * Vrátí null, pokud ještě není žádný záznam (po první migraci by měl být seed).
 */
export async function getFiremniProfil(): Promise<FiremniProfil | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('firemni_nastaveni')
    .select('hodnota')
    .eq('klic', KLIC)
    .single()

  if (error || !data) return null
  return data.hodnota as FiremniProfil
}

/**
 * Uloží (upsert) firemní profil.
 * Pouze pro adminy — kontrolováno na úrovni RLS i zde.
 */
export async function upsertFiremniProfil(
  formData: Record<string, unknown>
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  // Validace
  const parsed = firemniProfilSchema.safeParse(formData)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Neplatná data' }
  }

  // Získat aktuálního uživatele
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Nejste přihlášeni' }

  const { error } = await supabase
    .from('firemni_nastaveni')
    .upsert(
      {
        klic:           KLIC,
        hodnota:        parsed.data,
        upravil_id:     user.id,
        aktualizovano_at: new Date().toISOString(),
      },
      { onConflict: 'klic' }
    )

  if (error) {
    console.error('[upsertFiremniProfil]', error)
    return { success: false, error: 'Chyba při ukládání: ' + error.message }
  }

  revalidatePath('/nastaveni/firma')
  revalidatePath('/faktury')

  return { success: true }
}
