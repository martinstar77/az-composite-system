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
    ico: formData.ico || null,
    dic: formData.dic || null,
    zeme_puvodu: formData.zeme_puvodu,
    vychozi_mena: formData.vychozi_mena,
    platebni_podminky_splatnost_dni: formData.platebni_podminky_splatnost_dni,
    vychozi_lead_time_tydny: formData.vychozi_lead_time_tydny,
    kontakty: {
      email_objednavky: formData.email_objednavky,
      jmeno_zastupce: formData.jmeno_zastupce,
      telefonni_cislo: formData.telefonni_cislo
    },
    adresa: {
      ulice: formData.adresa_ulice,
      mesto: formData.adresa_mesto,
      psc: formData.adresa_psc,
      stat: formData.adresa_stat
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
    ico: formData.ico || null,
    dic: formData.dic || null,
    zeme_puvodu: formData.zeme_puvodu,
    vychozi_mena: formData.vychozi_mena,
    platebni_podminky_splatnost_dni: formData.platebni_podminky_splatnost_dni,
    vychozi_lead_time_tydny: formData.vychozi_lead_time_tydny,
    kontakty: {
      email_objednavky: formData.email_objednavky,
      jmeno_zastupce: formData.jmeno_zastupce,
      telefonni_cislo: formData.telefonni_cislo
    },
    adresa: {
      ulice: formData.adresa_ulice,
      mesto: formData.adresa_mesto,
      psc: formData.adresa_psc,
      stat: formData.adresa_stat
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
    .order('is_primary', { ascending: false })
    .order('aktualizovano_at', { ascending: false })
  
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

  // 1. If we are setting this supplier as primary, unset other active primary suppliers
  if (payload.is_primary) {
    await supabase
      .from('produkt_dodavatel')
      .update({ is_primary: false })
      .eq('produkt_id', payload.produkt_id)
      .is('deleted_at', null)
  }

  // 2. Check if there is an existing active sourcing record for this supplier and product
  const { data: existingActive } = await supabase
    .from('produkt_dodavatel')
    .select('*')
    .eq('produkt_id', payload.produkt_id)
    .eq('dodavatel_id', payload.dodavatel_id)
    .is('deleted_at', null)
    .maybeSingle()

  if (existingActive) {
    // If the price or currency has changed, we want to log the old one as history by soft-deleting it
    const priceChanged = 
      existingActive.nakupni_cena !== payload.nakupni_cena ||
      existingActive.mena !== payload.mena ||
      existingActive.nakupni_mj_id !== payload.nakupni_mj_id ||
      existingActive.prevodni_pomer_na_zakladni !== payload.prevodni_pomer_na_zakladni

    if (priceChanged) {
      // Soft-delete the existing active entry
      await supabase
        .from('produkt_dodavatel')
        .update({ 
          deleted_at: new Date().toISOString(),
          is_primary: false,
          upravil_id: user?.id,
          aktualizovano_at: new Date().toISOString()
        })
        .eq('id', existingActive.id)

      // Insert a new active record with the new price
      const insertPayload = {
        produkt_id: payload.produkt_id,
        dodavatel_id: payload.dodavatel_id,
        nakupni_cena: payload.nakupni_cena,
        mena: payload.mena,
        moq: payload.moq,
        lead_time_tydny: payload.lead_time_tydny,
        is_primary: payload.is_primary ?? false,
        logisticka_sablona_id: payload.logisticka_sablona_id,
        nakupni_mj_id: payload.nakupni_mj_id,
        prevodni_pomer_na_zakladni: payload.prevodni_pomer_na_zakladni ?? 1,
        vytvoril_id: user?.id,
        upravil_id: user?.id,
        vytvoreno_at: new Date().toISOString(),
        aktualizovano_at: new Date().toISOString()
      }

      const { data, error } = await supabase
        .from('produkt_dodavatel')
        .insert([insertPayload])
        .select()

      if (!error) revalidatePath(`/produkty/${payload.produkt_id}`)
      return { data, error }
    } else {
      // Just update the existing active record details (only metadata changed, not pricing)
      const updatePayload = {
        moq: payload.moq,
        lead_time_tydny: payload.lead_time_tydny,
        is_primary: payload.is_primary ?? false,
        logisticka_sablona_id: payload.logisticka_sablona_id,
        upravil_id: user?.id,
        aktualizovano_at: new Date().toISOString()
      }

      const { data, error } = await supabase
        .from('produkt_dodavatel')
        .update(updatePayload)
        .eq('id', existingActive.id)
        .select()

      if (!error) revalidatePath(`/produkty/${payload.produkt_id}`)
      return { data, error }
    }
  } else {
    // Create new supplier entry
    const insertPayload = {
      produkt_id: payload.produkt_id,
      dodavatel_id: payload.dodavatel_id,
      nakupni_cena: payload.nakupni_cena,
      mena: payload.mena,
      moq: payload.moq,
      lead_time_tydny: payload.lead_time_tydny,
      is_primary: payload.is_primary ?? false,
      logisticka_sablona_id: payload.logisticka_sablona_id,
      nakupni_mj_id: payload.nakupni_mj_id,
      prevodni_pomer_na_zakladni: payload.prevodni_pomer_na_zakladni ?? 1,
      vytvoril_id: user?.id,
      upravil_id: user?.id,
      vytvoreno_at: new Date().toISOString(),
      aktualizovano_at: new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('produkt_dodavatel')
      .insert([insertPayload])
      .select()

    if (!error) revalidatePath(`/produkty/${payload.produkt_id}`)
    return { data, error }
  }
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

export async function getSuppliersPaged({
  page = 0,
  limit = 30,
  search = '',
  countries = [],
  currencies = [],
  sortBy = 'nazev_spolecnosti',
  sortDesc = false
}: {
  page?: number
  limit?: number
  search?: string
  countries?: string[]
  currencies?: string[]
  sortBy?: string
  sortDesc?: boolean
} = {}): Promise<{ data: Supplier[] | null, error: any, totalCount?: number }> {
  const supabase = await createClient()

  let query = supabase
    .from('dodavatele')
    .select(`
      *,
      vytvoril:vytvoril_id ( jmeno ),
      upravil:upravil_id ( jmeno )
    `, { count: 'exact' })
    .is('deleted_at', null)

  if (search && search.trim()) {
    query = query.or(`nazev_spolecnosti.ilike.%${search.trim()}%,kod.ilike.%${search.trim()}%`)
  }

  if (countries && countries.length > 0) {
    query = query.in('zeme_puvodu', countries)
  }

  if (currencies && currencies.length > 0) {
    query = query.in('vychozi_mena', currencies)
  }

  if (sortBy) {
    query = query.order(sortBy, { ascending: !sortDesc })
  } else {
    query = query.order('nazev_spolecnosti', { ascending: true })
  }

  const from = page * limit
  const to = (page + 1) * limit - 1
  query = query.range(from, to)

  const { data, error, count } = await query

  return { data: data as Supplier[] | null, error, totalCount: count || undefined }
}

export async function getSupplierLookups(): Promise<{ countries: string[], currencies: string[] }> {
  const supabase = await createClient()

  const { data: countriesData } = await supabase
    .from('dodavatele')
    .select('zeme_puvodu')
    .is('deleted_at', null)

  const { data: currenciesData } = await supabase
    .from('dodavatele')
    .select('vychozi_mena')
    .is('deleted_at', null)

  const countries = Array.from(new Set((countriesData || []).map(d => d.zeme_puvodu).filter(Boolean))) as string[]
  const currencies = Array.from(new Set((currenciesData || []).map(d => d.vychozi_mena).filter(Boolean))) as string[]

  return { countries, currencies }
}


