'use server'

import { createClient } from '@/shared/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { Product } from '../types'
import { ProductFormValues } from '../types/formSchema'

export async function getProducts(): Promise<{ data: Product[] | null, error: any }> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('produkty')
    .select(`
      *,
      c_kategorie ( nazev ),
      c_merne_jednotky_zakladni:zakladni_mj_id ( nazev, zkratka ),
      c_merne_jednotky_baleni:jednotka_baleni_id ( nazev, zkratka ),
      c_procesy_odeslani ( nazev ),
      c_typy_labelu ( nazev ),
      c_stavy_produktu ( nazev ),
      vytvoril:vytvoril_id ( jmeno ),
      upravil:upravil_id ( jmeno ),
      produkt_dodavatel (
        nakupni_cena,
        mena,
        is_primary,
        logisticka_sablona_id,
        prevodni_pomer_na_zakladni,
        moq,
        logisticke_sablony ( nazev )
      ),
      produkt_mnozstevni_slevy (
        id,
        mnozstvi_od,
        typ_zakaznika,
        sleva_procenta
      )
    `)
    .is('deleted_at', null)
    .is('produkt_dodavatel.deleted_at', null)
  
  return { data, error }
}

export async function getProductsPaged({
  page = 0,
  limit = 30,
  search = '',
  categories = [],
  statuses = [],
  sortBy = 'nazev',
  sortDesc = false
}: {
  page?: number
  limit?: number
  search?: string
  categories?: string[]
  statuses?: string[]
  sortBy?: string
  sortDesc?: boolean
} = {}): Promise<{ data: Product[] | null, error: any, totalCount?: number }> {
  const supabase = await createClient()
  
  let query = supabase
    .from('produkty')
    .select(`
      *,
      c_kategorie ( nazev ),
      c_merne_jednotky_zakladni:zakladni_mj_id ( nazev, zkratka ),
      c_merne_jednotky_baleni:jednotka_baleni_id ( nazev, zkratka ),
      c_procesy_odeslani ( nazev ),
      c_typy_labelu ( nazev ),
      c_stavy_produktu ( nazev ),
      vytvoril:vytvoril_id ( jmeno ),
      upravil:upravil_id ( jmeno ),
      produkt_dodavatel (
        nakupni_cena,
        mena,
        is_primary,
        logisticka_sablona_id,
        prevodni_pomer_na_zakladni,
        moq,
        logisticke_sablony ( nazev )
      ),
      produkt_mnozstevni_slevy (
        id,
        mnozstvi_od,
        typ_zakaznika,
        sleva_procenta
      )
    `, { count: 'exact' })
    .is('deleted_at', null)
    .is('produkt_dodavatel.deleted_at', null)

  if (search && search.trim()) {
    query = query.or(`nazev.ilike.%${search.trim()}%,sku.ilike.%${search.trim()}%`)
  }

  if (categories && categories.length > 0) {
    query = query.in('kategorie_id', categories)
  }

  if (statuses && statuses.length > 0) {
    query = query.in('stav_katalogu_id', statuses)
  }

  if (sortBy) {
    query = query.order(sortBy, { ascending: !sortDesc })
  } else {
    query = query.order('nazev', { ascending: true })
  }

  const from = page * limit
  const to = (page + 1) * limit - 1
  query = query.range(from, to)

  const { data, error, count } = await query
  
  return { data: data as Product[] | null, error, totalCount: count || undefined }
}


export async function getProduct(id: string): Promise<{ data: Product | null, error: any }> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('produkty')
    .select(`
      *,
      c_kategorie ( nazev ),
      c_merne_jednotky_zakladni:zakladni_mj_id ( nazev, zkratka ),
      c_merne_jednotky_baleni:jednotka_baleni_id ( nazev, zkratka ),
      c_procesy_odeslani ( nazev ),
      c_typy_labelu ( nazev ),
      c_stavy_produktu ( nazev ),
      vytvoril:vytvoril_id ( jmeno ),
      upravil:upravil_id ( jmeno )
    `)
    .eq('id', id)
    .single()
  
  return { data, error }
}

export async function createProduct(formData: ProductFormValues) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  let parsedSpecifikace = {}
  if (formData.specifikace_json) {
    try {
      parsedSpecifikace = JSON.parse(formData.specifikace_json)
    } catch (e) {
      return { error: { message: "Neplatný formát JSON u specifikace." } }
    }
  }

  const dbPayload = {
    sku: formData.sku,
    nazev: formData.nazev,
    kategorie_id: formData.kategorie_id,
    zakladni_mj_id: formData.zakladni_mj_id,
    mnozstvi_v_baleni: formData.mnozstvi_v_baleni,
    jednotka_baleni_id: formData.jednotka_baleni_id,
    hmotnost_baliku_kg: formData.hmotnost_baliku_kg,
    shelf_life_mesice: formData.shelf_life_mesice,
    def_typ_skladovani: formData.def_typ_skladovani,
    def_proces_odeslani_id: formData.def_proces_odeslani_id,
    def_typ_labelu_id: formData.def_typ_labelu_id,
    stav_katalogu_id: formData.stav_katalogu_id,
    specifikace: parsedSpecifikace,
    min_skladova_zasoba: formData.min_skladova_zasoba,
    opt_skladova_zasoba: formData.opt_skladova_zasoba,
    cilova_marze_retail_procenta: formData.cilova_marze_retail_procenta,
    cilova_marze_partner_procenta: formData.cilova_marze_partner_procenta,
    clo_procenta: formData.clo_procenta,
    vytvoril_id: user?.id,
    upravil_id: user?.id
  }

  const { data, error } = await supabase
    .from('produkty')
    .insert([dbPayload])
    .select()

  return { data, error }
}

export async function updateProduct(id: string, formData: ProductFormValues) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  let parsedSpecifikace = {}
  if (formData.specifikace_json) {
    try {
      parsedSpecifikace = JSON.parse(formData.specifikace_json)
    } catch (e) {
      return { error: { message: "Neplatný formát JSON u specifikace." } }
    }
  }

  const dbPayload = {
    sku: formData.sku,
    nazev: formData.nazev,
    kategorie_id: formData.kategorie_id,
    zakladni_mj_id: formData.zakladni_mj_id,
    mnozstvi_v_baleni: formData.mnozstvi_v_baleni,
    jednotka_baleni_id: formData.jednotka_baleni_id,
    hmotnost_baliku_kg: formData.hmotnost_baliku_kg,
    shelf_life_mesice: formData.shelf_life_mesice,
    def_typ_skladovani: formData.def_typ_skladovani,
    def_proces_odeslani_id: formData.def_proces_odeslani_id,
    def_typ_labelu_id: formData.def_typ_labelu_id,
    stav_katalogu_id: formData.stav_katalogu_id,
    specifikace: parsedSpecifikace,
    min_skladova_zasoba: formData.min_skladova_zasoba,
    opt_skladova_zasoba: formData.opt_skladova_zasoba,
    cilova_marze_retail_procenta: formData.cilova_marze_retail_procenta,
    cilova_marze_partner_procenta: formData.cilova_marze_partner_procenta,
    clo_procenta: formData.clo_procenta,
    upravil_id: user?.id,
    aktualizovano_at: new Date().toISOString()
  }

  const { data, error } = await supabase
    .from('produkty')
    .update(dbPayload)
    .eq('id', id)
    .select()

  return { data, error }
}

export async function updateProductMargins(id: string, margins: { retail: number, partner: number }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data, error } = await supabase
    .from('produkty')
    .update({
      cilova_marze_retail_procenta: margins.retail,
      cilova_marze_partner_procenta: margins.partner,
      upravil_id: user?.id,
      aktualizovano_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()

  if (!error) revalidatePath(`/produkty/${id}`)
  return { data, error }
}

export async function deleteProduct(id: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('produkty')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
  
  if (!error) revalidatePath('/produkty')
  return { data, error }
}

export async function getUnits(): Promise<{ data: any[] | null, error: any }> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('c_merne_jednotky')
    .select('*')
    .order('nazev')
  return { data, error }
}

export async function cloneProduct(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // 1. Get original product
  const { data: original, error: fetchError } = await supabase
    .from('produkty')
    .select('*')
    .eq('id', id)
    .single()

  if (fetchError || !original) {
    return { error: fetchError || new Error("Produkt nenalezen") }
  }

  // 2. Insert new product (with unique -COPY sku)
  const randomSuffix = Math.floor(1000 + Math.random() * 9000) // 4-digit random number
  const newSku = `${original.sku}-COPY-${randomSuffix}`
  const { id: _, vytvoreno_at: __, aktualizovano_at: ___, ...originalData } = original
  const { data: newProduct, error: insertError } = await supabase
    .from('produkty')
    .insert([{
      ...originalData,
      sku: newSku,
      nazev: `${original.nazev} (Kopie)`,
      vytvoril_id: user?.id,
      upravil_id: user?.id
    }])
    .select()
    .single()

  if (insertError || !newProduct) {
    return { error: insertError }
  }

  // 3. Clone sourcing entries
  const { data: sourcingEntries } = await supabase
    .from('produkt_dodavatel')
    .select('*')
    .eq('produkt_id', original.id)
    .is('deleted_at', null)

  if (sourcingEntries && sourcingEntries.length > 0) {
    const newSourcingEntries = sourcingEntries.map(entry => {
      const { id: _, vytvoreno_at: __, aktualizovano_at: ___, ...entryData } = entry
      return {
        ...entryData,
        produkt_id: newProduct.id,
        vytvoril_id: user?.id,
        upravil_id: user?.id
      }
    })

    await supabase.from('produkt_dodavatel').insert(newSourcingEntries)
  }

  revalidatePath('/produkty')
  return { data: newProduct, error: null }
}

export async function bulkUpdateProductMargins(ids: string[], margins: { retail: number, partner: number }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data, error } = await supabase
    .from('produkty')
    .update({
      cilova_marze_retail_procenta: margins.retail,
      cilova_marze_partner_procenta: margins.partner,
      upravil_id: user?.id,
      aktualizovano_at: new Date().toISOString()
    })
    .in('id', ids)
    .select()

  if (!error) {
    revalidatePath('/produkty')
  }
  
  return { data, error }
}

export async function checkSkuExists(sku: string, excludeId?: string) {
  const supabase = await createClient()
  let query = supabase
    .from('produkty')
    .select('id')
    .eq('sku', sku)
    .is('deleted_at', null)
  
  if (excludeId) {
    query = query.neq('id', excludeId)
  }

  const { data } = await query.maybeSingle()
  return !!data
}

export async function bulkUpdateLogisticsTemplate(productIds: string[], templateId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data, error } = await supabase
    .from('produkt_dodavatel')
    .update({
      logisticka_sablona_id: templateId,
      upravil_id: user?.id,
      aktualizovano_at: new Date().toISOString()
    })
    .in('produkt_id', productIds)
    .is('deleted_at', null)
    .select()

  if (!error) {
    revalidatePath('/produkty')
  }
  
  return { data, error }
}

export async function getProductLookups() {
  const supabase = await createClient()

  const [categories, units, statuses, labels, processes, templates, fiberCodes] = await Promise.all([
    supabase.from('c_kategorie').select('*').order('nazev'),
    supabase.from('c_merne_jednotky').select('*').order('nazev'),
    supabase.from('c_stavy_produktu').select('*').order('nazev'),
    supabase.from('c_typy_labelu').select('*').order('nazev'),
    supabase.from('c_procesy_odeslani').select('*').order('nazev'),
    supabase.from('logisticke_sablony').select('*').order('nazev'),
    supabase.from('c_kody_vlakna').select('*').order('id')
  ])

  return {
    categories: categories.data || [],
    units: units.data || [],
    statuses: statuses.data || [],
    labels: labels.data || [],
    processes: processes.data || [],
    templates: templates.data || [],
    fiberCodes: fiberCodes.data || []
  }
}

export async function getProductQuantityBreaks(productId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('produkt_mnozstevni_slevy')
    .select('*')
    .eq('produkt_id', productId)
    .order('mnozstvi_od', { ascending: true })
  return { data, error }
}

export async function saveProductQuantityBreaks(
  productId: string, 
  breaks: Array<{ mnozstvi_od: number, typ_zakaznika: 'B2C' | 'B2B', sleva_procenta: number }>
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // 1. Delete all existing breaks for this product
  const { error: deleteError } = await supabase
    .from('produkt_mnozstevni_slevy')
    .delete()
    .eq('produkt_id', productId)

  if (deleteError) return { error: deleteError }

  if (breaks.length === 0) {
    revalidatePath(`/produkty/${productId}`)
    return { data: [], error: null }
  }

  // 2. Insert new breaks
  const payload = breaks.map(b => ({
    produkt_id: productId,
    mnozstvi_od: b.mnozstvi_od,
    typ_zakaznika: b.typ_zakaznika,
    sleva_procenta: b.sleva_procenta,
    vytvoril_id: user?.id,
    upravil_id: user?.id
  }))

  const { data, error } = await supabase
    .from('produkt_mnozstevni_slevy')
    .insert(payload)
    .select()

  if (!error) revalidatePath(`/produkty/${productId}`)
  return { data, error }
}
