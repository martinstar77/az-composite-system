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
      c_kategorie ( nazev, nazev_en ),
      c_merne_jednotky_zakladni:zakladni_mj_id ( nazev, zkratka ),
      c_merne_jednotky_baleni:jednotka_baleni_id ( nazev, zkratka ),
      c_procesy_odeslani ( nazev ),
      c_typy_labelu ( nazev ),
      c_stavy_produktu ( nazev ),
      c_balici_profily ( * ),
      vytvoril:vytvoril_id ( jmeno ),
      upravil:upravil_id ( jmeno ),
      produkt_dodavatel (
        dodavatel_id,
        nakupni_cena,
        mena,
        is_primary,
        logisticka_sablona_id,
        nakupni_mj_id,
        prevodni_pomer_na_zakladni,
        moq,
        logisticke_sablony ( id, nazev, typ_vypoctu_dopravy )
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
  subcategories = [],
  specs = {},
  sortBy = 'nazev',
  sortDesc = false
}: {
  page?: number
  limit?: number
  search?: string
  categories?: string[]
  statuses?: string[]
  subcategories?: string[]
  specs?: Record<string, string[]>
  sortBy?: string
  sortDesc?: boolean
} = {}): Promise<{ data: Product[] | null, error: any, totalCount?: number }> {
  const supabase = await createClient()
  
  let query = supabase
    .from('produkty')
    .select(`
      *,
      c_kategorie ( nazev, nazev_en ),
      c_merne_jednotky_zakladni:zakladni_mj_id ( nazev, zkratka ),
      c_merne_jednotky_baleni:jednotka_baleni_id ( nazev, zkratka ),
      c_procesy_odeslani ( nazev ),
      c_typy_labelu ( nazev ),
      c_stavy_produktu ( nazev ),
      c_balici_profily ( * ),
      vytvoril:vytvoril_id ( jmeno ),
      upravil:upravil_id ( jmeno ),
      produkt_dodavatel (
        dodavatel_id,
        nakupni_cena,
        mena,
        is_primary,
        logisticka_sablona_id,
        nakupni_mj_id,
        prevodni_pomer_na_zakladni,
        moq,
        logisticke_sablony ( id, nazev, typ_vypoctu_dopravy ),
        dodavatele ( nazev_spolecnosti )
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

  const safeSearch = typeof search === 'string' ? search : ''
  const safeCategories = Array.isArray(categories) ? categories : []
  const safeStatuses = Array.isArray(statuses) ? statuses : []
  const safeSubcategories = Array.isArray(subcategories) ? subcategories : []
  const safeSpecs = (specs && typeof specs === 'object' && !Array.isArray(specs)) ? specs : {}

  if (safeSearch && safeSearch.trim()) {
    query = query.or(`nazev.ilike.%${safeSearch.trim()}%,sku.ilike.%${safeSearch.trim()}%`)
  }

  if (safeCategories.length > 0) {
    query = query.in('kategorie_id', safeCategories)
  }

  if (safeStatuses.length > 0) {
    query = query.in('stav_katalogu_id', safeStatuses)
  }

  if (safeSubcategories.length > 0) {
    query = query.in('specifikace->>podkategorie', safeSubcategories)
  }

  if (Object.keys(safeSpecs).length > 0) {
    for (const [key, values] of Object.entries(safeSpecs)) {
      if (Array.isArray(values) && values.length > 0) {
        query = query.in(`specifikace->>${key}`, values)
      }
    }
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
      c_kategorie ( nazev, nazev_en ),
      c_merne_jednotky_zakladni:zakladni_mj_id ( nazev, zkratka ),
      c_merne_jednotky_baleni:jednotka_baleni_id ( nazev, zkratka ),
      c_procesy_odeslani ( nazev ),
      c_typy_labelu ( nazev ),
      c_stavy_produktu ( nazev ),
      c_balici_profily ( * ),
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
    nazev_en: formData.nazev_en || null,
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
    moq_prodejni: formData.moq_prodejni ?? 1,
    moq_poznamka: formData.moq_poznamka || null,
    poznamka: formData.poznamka || null,
    
    // Packaging & Shipping Engine v2
    balici_profil_id: formData.balici_profil_id || null,
    balik_delka_cm_override: formData.balik_delka_cm_override || null,
    balik_sirka_cm_override: formData.balik_sirka_cm_override || null,
    balik_vyska_cm_override: formData.balik_vyska_cm_override || null,

    is_name_generated: formData.is_name_generated,
    hmotnost_zafixovana: formData.hmotnost_zafixovana,

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
    nazev_en: formData.nazev_en || null,
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
    moq_prodejni: formData.moq_prodejni ?? 1,
    moq_poznamka: formData.moq_poznamka || null,
    poznamka: formData.poznamka || null,
    
    // Packaging & Shipping Engine v2
    balici_profil_id: formData.balici_profil_id || null,
    balik_delka_cm_override: formData.balik_delka_cm_override || null,
    balik_sirka_cm_override: formData.balik_sirka_cm_override || null,
    balik_vyska_cm_override: formData.balik_vyska_cm_override || null,

    is_name_generated: formData.is_name_generated,
    hmotnost_zafixovana: formData.hmotnost_zafixovana,

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

export async function updateProductMargins(id: string, margins: { retail: number, partner: number }, simulovanaVelikostObjednavky?: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data, error } = await supabase
    .from('produkty')
    .update({
      cilova_marze_retail_procenta: margins.retail,
      cilova_marze_partner_procenta: margins.partner,
      simulovana_velikost_objednavky: simulovanaVelikostObjednavky,
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

  // 4. Fetch the full product with all relationships to return to UI
  const { data: finalProduct, error: finalError } = await supabase
    .from('produkty')
    .select(`
      *,
      c_kategorie ( nazev ),
      c_merne_jednotky_zakladni:zakladni_mj_id ( nazev, zkratka ),
      c_merne_jednotky_baleni:jednotka_baleni_id ( nazev, zkratka ),
      c_procesy_odeslani ( nazev ),
      c_typy_labelu ( nazev ),
      c_stavy_produktu ( nazev ),
      c_balici_profily ( * ),
      vytvoril:vytvoril_id ( jmeno ),
      upravil:upravil_id ( jmeno ),
      produkt_dodavatel (
        dodavatel_id,
        nakupni_cena,
        mena,
        is_primary,
        logisticka_sablona_id,
        nakupni_mj_id,
        prevodni_pomer_na_zakladni,
        moq,
        logisticke_sablony ( id, nazev, typ_vypoctu_dopravy )
      ),
      produkt_mnozstevni_slevy (
        id,
        mnozstvi_od,
        typ_zakaznika,
        sleva_procenta
      )
    `)
    .eq('id', newProduct.id)
    .single()

  if (finalError || !finalProduct) {
    return { error: finalError || new Error("Nepodařilo se načíst zkopírovaný produkt") }
  }

  revalidatePath('/produkty')
  return { data: finalProduct as any, error: null }
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

  const [categories, units, statuses, labels, processes, templates, fiberCodes, profiles, suppliers] = await Promise.all([
    supabase.from('c_kategorie').select('*').order('nazev'),
    supabase.from('c_merne_jednotky').select('*').order('nazev'),
    supabase.from('c_stavy_produktu').select('*').order('nazev'),
    supabase.from('c_typy_labelu').select('*').order('nazev'),
    supabase.from('c_procesy_odeslani').select('*').order('nazev'),
    supabase.from('logisticke_sablony').select('*').order('nazev'),
    supabase.from('c_kody_vlakna').select('*').order('id'),
    supabase.from('c_balici_profily').select('*').order('nazev'),
    supabase.from('dodavatele').select('id, kod, nazev_spolecnosti, zeme_puvodu, vychozi_mena, vychozi_lead_time_tydny').is('deleted_at', null).order('nazev_spolecnosti')
  ])

  return {
    categories: categories.data || [],
    units: units.data || [],
    statuses: statuses.data || [],
    labels: labels.data || [],
    processes: processes.data || [],
    templates: templates.data || [],
    fiberCodes: fiberCodes.data || [],
    profiles: profiles.data || [],
    suppliers: suppliers.data || []
  }
}

// ─── Bulk Sourcing ────────────────────────────────────────────────────────────

/**
 * Hromadně přiřadí dodavatele k více produktům (UPSERT).
 * Pokud produkt NEMÁ záznam pro tohoto dodavatele → INSERT.
 * Pokud produkt JIŽ MÁ aktivní záznam → UPDATE logistiky/podmínek (cenu nemění).
 * Cenu záměrně NEVKLÁDÁME — doplní se přes Speed Pricing (quickUpdateSourcingPrice).
 */
export async function bulkUpsertSupplierToProducts(
  productIds: string[],
  supplierData: {
    dodavatel_id: string
    mena?: string | null
    logisticka_sablona_id?: string | null
    nakupni_mj_id?: string | null
    prevodni_pomer_na_zakladni?: number | null
    is_primary: boolean
  }
): Promise<{ inserted: number; updated: number; error: any }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const now = new Date().toISOString()

  let inserted = 0
  let updated = 0
  let lastError: any = null

  // Pokud nastavujeme jako primárního a přiřazujeme konkrétního nového dodavatele,
  // odinstalujeme is_primary u ostatních.
  if (supplierData.is_primary && supplierData.dodavatel_id !== 'keep_primary') {
    await supabase
      .from('produkt_dodavatel')
      .update({ is_primary: false })
      .in('produkt_id', productIds)
      .is('deleted_at', null)
  }

  if (supplierData.dodavatel_id === 'keep_primary') {
    // UPDATE existujících primárních dodavatelů u produktů
    const { data: primaryRecords } = await supabase
      .from('produkt_dodavatel')
      .select('*')
      .in('produkt_id', productIds)
      .eq('is_primary', true)
      .is('deleted_at', null)

    const primaryByProduct = new Map(
      (primaryRecords || []).map(r => [r.produkt_id, r])
    )

    for (const productId of productIds) {
      const existing = primaryByProduct.get(productId)
      if (existing) {
        const updatePayload: Record<string, any> = {
          upravil_id: user?.id,
          aktualizovano_at: now
        }
        if (supplierData.mena !== undefined) updatePayload.mena = supplierData.mena
        if (supplierData.logisticka_sablona_id !== undefined) updatePayload.logisticka_sablona_id = supplierData.logisticka_sablona_id
        if (supplierData.nakupni_mj_id !== undefined) updatePayload.nakupni_mj_id = supplierData.nakupni_mj_id
        if (supplierData.prevodni_pomer_na_zakladni !== undefined) updatePayload.prevodni_pomer_na_zakladni = supplierData.prevodni_pomer_na_zakladni

        const { error } = await supabase
          .from('produkt_dodavatel')
          .update(updatePayload)
          .eq('id', existing.id)

        if (error) lastError = error
        else updated++
      }
    }
  } else {
    // Původní chování pro konkrétního dodavatele
    const { data: existingRecords } = await supabase
      .from('produkt_dodavatel')
      .select('id, produkt_id, nakupni_cena')
      .in('produkt_id', productIds)
      .eq('dodavatel_id', supplierData.dodavatel_id)
      .is('deleted_at', null)

    const existingByProduct = new Map(
      (existingRecords || []).map(r => [r.produkt_id, r])
    )

    for (const productId of productIds) {
      const existing = existingByProduct.get(productId)

      if (existing) {
        // UPDATE — pouze logistika + podmínky, cenu zachováváme
        const updatePayload: Record<string, any> = {
          is_primary: supplierData.is_primary,
          upravil_id: user?.id,
          aktualizovano_at: now
        }
        if (supplierData.mena !== undefined) updatePayload.mena = supplierData.mena
        if (supplierData.logisticka_sablona_id !== undefined) updatePayload.logisticka_sablona_id = supplierData.logisticka_sablona_id
        if (supplierData.nakupni_mj_id !== undefined) updatePayload.nakupni_mj_id = supplierData.nakupni_mj_id
        if (supplierData.prevodni_pomer_na_zakladni !== undefined) updatePayload.prevodni_pomer_na_zakladni = supplierData.prevodni_pomer_na_zakladni

        const { error } = await supabase
          .from('produkt_dodavatel')
          .update(updatePayload)
          .eq('id', existing.id)

        if (error) lastError = error
        else updated++
      } else {
        // INSERT — nový záznam bez ceny (nakupni_cena = 0, doplní Speed Pricing)
        const { error } = await supabase
          .from('produkt_dodavatel')
          .insert({
            produkt_id: productId,
            dodavatel_id: supplierData.dodavatel_id,
            nakupni_cena: 0,
            mena: supplierData.mena || 'EUR',
            moq: 1,
            is_primary: supplierData.is_primary,
            logisticka_sablona_id: supplierData.logisticka_sablona_id ?? null,
            nakupni_mj_id: supplierData.nakupni_mj_id ?? null,
            prevodni_pomer_na_zakladni: supplierData.prevodni_pomer_na_zakladni ?? 1,
            vytvoril_id: user?.id,
            upravil_id: user?.id,
            vytvoreno_at: now,
            aktualizovano_at: now
          })

        if (error) lastError = error
        else inserted++
      }
    }
  }

  if (!lastError) revalidatePath('/produkty')
  return { inserted, updated, error: lastError }
}

// ─── Speed Pricing ────────────────────────────────────────────────────────────

/**
 * Rychlá aktualizace nákupní ceny — hledá primárního dodavatele produktu automaticky.
 * Používáno Speed Pricing Drawerem.
 */
export async function quickUpdateSourcingPriceByProduct(
  productId: string,
  newPrice: number,
  mena: string,
  prevodniPomer?: number,
  nakupniMjId?: string | null
): Promise<{ data: any; error: any }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const now = new Date().toISOString()

  // Načteme primárního dodavatele (nebo prvního aktivního)
  const { data: existing, error: fetchError } = await supabase
    .from('produkt_dodavatel')
    .select('*')
    .eq('produkt_id', productId)
    .is('deleted_at', null)
    .order('is_primary', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (fetchError) return { data: null, error: fetchError }
  if (!existing) return { data: null, error: { message: 'Produkt nemá žádného dodavatele.' } }

  const hasChanges = 
    existing.nakupni_cena !== newPrice || 
    existing.mena !== mena ||
    (prevodniPomer !== undefined && existing.prevodni_pomer_na_zakladni !== prevodniPomer) ||
    (nakupniMjId !== undefined && existing.nakupni_mj_id !== nakupniMjId)

  if (!hasChanges) return { data: existing, error: null }

  // Soft-delete starého záznamu → zachování cenové historie
  await supabase
    .from('produkt_dodavatel')
    .update({ deleted_at: now, is_primary: false, upravil_id: user?.id, aktualizovano_at: now })
    .eq('id', existing.id)

  // INSERT nového záznamu s novou cenou a jednotkami
  const { id: _id, vytvoreno_at: _created, aktualizovano_at: _updated, deleted_at: _del, ...rest } = existing
  const { data, error } = await supabase
    .from('produkt_dodavatel')
    .insert({
      ...rest,
      nakupni_cena: newPrice,
      mena,
      prevodni_pomer_na_zakladni: prevodniPomer !== undefined ? prevodniPomer : existing.prevodni_pomer_na_zakladni,
      nakupni_mj_id: nakupniMjId !== undefined ? nakupniMjId : existing.nakupni_mj_id,
      is_primary: true,
      vytvoril_id: existing.vytvoril_id,
      upravil_id: user?.id,
      vytvoreno_at: now,
      aktualizovano_at: now
    })
    .select()
    .single()

  if (!error) revalidatePath('/produkty')
  return { data, error }
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

export async function getCategoryFacets(categoryId: string, search?: string): Promise<{ data: Record<string, { value: string, count: number }[]> | null, error: any }> {
  const supabase = await createClient()
  
  let query = supabase
    .from('produkty')
    .select('specifikace')
    .eq('kategorie_id', categoryId)
    .is('deleted_at', null)

  if (search && search.trim()) {
    query = query.or(`nazev.ilike.%${search.trim()}%,sku.ilike.%${search.trim()}%`)
  }

  const { data, error } = await query

  if (error) {
    return { data: null, error }
  }

  const facets: Record<string, Record<string, number>> = {}

  data?.forEach(product => {
    const specs = product.specifikace
    if (specs && typeof specs === 'object') {
      Object.entries(specs).forEach(([key, val]) => {
        if (val === null || val === undefined || val === '') return
        
        // Skip some internal/unwanted spec keys
        if (['identifikator'].includes(key)) return

        if (!facets[key]) {
          facets[key] = {}
        }
        const stringVal = String(val)
        facets[key][stringVal] = (facets[key][stringVal] || 0) + 1
      })
    }
  })

  // Format response
  const formattedData: Record<string, { value: string, count: number }[]> = {}
  Object.entries(facets).forEach(([key, valuesMap]) => {
    formattedData[key] = Object.entries(valuesMap)
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value))
  })

  return { data: formattedData, error: null }
}

export async function bulkRegenerateProductNames(): Promise<{ success: boolean, updatedCount?: number, error?: any }> {
  const supabase = await createClient()
  
  const { data: fiberCodes } = await supabase.from('c_kody_vlakna').select('id, nazev')
  const codes = fiberCodes || []

  const { data: products, error } = await supabase
    .from('produkty')
    .select('id, sku, kategorie_id, specifikace, is_name_generated')
    .is('deleted_at', null)
    .eq('is_name_generated', true)
  
  if (error) {
    return { success: false, error }
  }
  if (!products || products.length === 0) {
    return { success: true, updatedCount: 0 }
  }

  const { generateProductNames } = await import('../utils/nameGenerator')
  
  let updatedCount = 0
  
  for (const product of products) {
    const names = generateProductNames(product.specifikace, product.kategorie_id, codes)
    
    const { error: updateError } = await supabase
      .from('produkty')
      .update({
        nazev: names.cs,
        nazev_en: names.en
      })
      .eq('id', product.id)
    
    if (!updateError) {
      updatedCount++
    }
  }

  revalidatePath('/produkty')
  revalidatePath('/katalogy')
  return { success: true, updatedCount }
}

export async function bulkRecalculateProductWeights() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: products, error: fetchError } = await supabase
    .from('produkty')
    .select(`
      id, kategorie_id, specifikace, mnozstvi_v_baleni, hmotnost_zafixovana,
      produkt_dodavatel (
        is_primary,
        logisticke_sablony ( typ_vypoctu_dopravy )
      )
    `)
    .is('deleted_at', null)
    .is('produkt_dodavatel.deleted_at', null)

  if (fetchError) {
    return { success: false, error: fetchError }
  }
  if (!products || products.length === 0) {
    return { success: true, updatedCount: 0 }
  }

  const { calculateGrossWeight } = await import('../utils/logisticsCalculator')

  let updatedCount = 0
  for (const product of products) {
    // Ochrana atypických produktů: pokud produkt využívá šablonu s fixní dopravou nebo
    // je jeho hmotnost ručně zafixována uživatelem, nepřepisujeme ji.
    const primarySourcing = (product.produkt_dodavatel as any[])?.find(s => s.is_primary) || (product.produkt_dodavatel as any[])?.[0]
    const hasFixedShipping = primarySourcing?.logisticke_sablony?.typ_vypoctu_dopravy === 'fixni'
    if (product.hmotnost_zafixovana || hasFixedShipping) {
      continue
    }

    const specs = (product.specifikace as Record<string, unknown>) || {}
    const categoryId = product.kategorie_id
    const qtyInPack = product.mnozstvi_v_baleni || 1

    const weightEst = calculateGrossWeight(categoryId, specs, qtyInPack)
    if (weightEst && weightEst.weightKg !== null) {
      const { error: updateError } = await supabase
        .from('produkty')
        .update({
          hmotnost_baliku_kg: weightEst.weightKg,
          upravil_id: user?.id,
          aktualizovano_at: new Date().toISOString()
         })
        .eq('id', product.id)
      
      if (!updateError) {
        updatedCount++
      }
    }
  }

  revalidatePath('/produkty')
  revalidatePath('/katalogy')
  return { success: true, updatedCount }
}
