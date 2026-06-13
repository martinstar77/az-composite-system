'use server'

import { createClient } from '@/shared/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { Supplier } from '../types'
import { SupplierFormValues } from '../types/formSchema'

export async function getSuppliers(): Promise<{ data: Supplier[] | null, error: any }> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('dodavatele')
    .select(`
      *,
      vytvoril:vytvoril_id ( jmeno ),
      upravil:upravil_id ( jmeno )
    `)
    .is('deleted_at', null)
    .order('nazev_spolecnosti')
  
  return { data, error }
}

export async function createSupplier(formData: SupplierFormValues) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  const dbPayload = {
    kod: formData.kod,
    nazev_spolecnosti: formData.nazev_spolecnosti,
    zeme_puvodu: formData.zeme_puvodu,
    vychozi_mena: formData.vychozi_mena,
    platebni_podminky_splatnost_dni: formData.platebni_podminky_splatnost_dni,
    vychozi_lead_time_tydny: formData.vychozi_lead_time_tydny,
    kontakty: {
      email_objednavky: formData.email_objednavky,
      jmeno_zastupce: formData.jmeno_zastupce,
      telefonni_cislo: formData.telefonni_cislo
    },
    vytvoril_id: user?.id,
    upravil_id: user?.id
  }

  const { data, error } = await supabase
    .from('dodavatele')
    .insert([dbPayload])
    .select()

  if (!error) revalidatePath('/dodavatele')
  return { data, error }
}

export async function updateSupplier(id: string, formData: SupplierFormValues) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  const dbPayload = {
    kod: formData.kod,
    nazev_spolecnosti: formData.nazev_spolecnosti,
    zeme_puvodu: formData.zeme_puvodu,
    vychozi_mena: formData.vychozi_mena,
    platebni_podminky_splatnost_dni: formData.platebni_podminky_splatnost_dni,
    vychozi_lead_time_tydny: formData.vychozi_lead_time_tydny,
    kontakty: {
      email_objednavky: formData.email_objednavky,
      jmeno_zastupce: formData.jmeno_zastupce,
      telefonni_cislo: formData.telefonni_cislo
    },
    upravil_id: user?.id,
    aktualizovano_at: new Date().toISOString()
  }

  const { data, error } = await supabase
    .from('dodavatele')
    .update(dbPayload)
    .eq('id', id)
    .select()

  if (!error) revalidatePath('/dodavatele')
  return { data, error }
}

export async function deleteSupplier(id: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('dodavatele')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
  
  if (!error) revalidatePath('/dodavatele')
  return { data, error }
}

export async function getProductSourcing(productId: string): Promise<{ data: any[] | null, error: any }> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('produkt_dodavatel')
    .select(`
      *,
      dodavatele (
        kod,
        nazev_spolecnosti,
        zeme_puvodu
      ),
      c_merne_jednotky:nakupni_mj_id ( nazev, zkratka ),
      vytvoril:vytvoril_id ( jmeno ),
      upravil:upravil_id ( jmeno )
    `)
    .eq('produkt_id', productId)
    .is('deleted_at', null)
    .order('is_primary', { ascending: false })
  
  return { data, error }
}

export async function upsertProductSourcing(payload: {
  id?: string
  produkt_id: string
  dodavatel_id: string
  nakupni_cena: number
  mena: string
  moq: number
  lead_time_tydny?: number
  is_primary?: boolean
  logisticka_sablona_id?: string | null
  nakupni_mj_id?: string | null
  prevodni_pomer_na_zakladni?: number
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const dbPayload = {
    ...payload,
    upravil_id: user?.id,
    aktualizovano_at: new Date().toISOString()
  }

  if (!payload.id) {
    // @ts-ignore
    dbPayload.vytvoril_id = user?.id
  }

  const { data, error } = await supabase
    .from('produkt_dodavatel')
    .upsert(dbPayload)
    .select()

  if (!error) revalidatePath(`/produkty/${payload.produkt_id}`)
  return { data, error }
}

export async function deleteProductSourcing(id: string, productId: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('produkt_dodavatel')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)

  if (!error) revalidatePath(`/produkty/${productId}`)
  return { error }
}

