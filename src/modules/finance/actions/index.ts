'use server'

import { createClient } from '@/shared/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { ExchangeRate, GlobalFinanceSettings, LogisticsTemplate, BaliciProfil, StandardBoxSize } from '../types'

/**
 * Logistics Templates Actions
 */

export async function getLogisticsTemplates(): Promise<{ data: LogisticsTemplate[] | null, error: any }> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('logisticke_sablony')
    .select(`
      *,
      vytvoril:vytvoril_id ( jmeno ),
      upravil:upravil_id ( jmeno )
    `)
    .order('nazev')
  
  return { data, error }
}

export async function createLogisticsTemplate(formData: any) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  const { data, error } = await supabase
    .from('logisticke_sablony')
    .insert([{
      ...formData,
      vytvoril_id: user?.id,
      upravil_id: user?.id
    }])
    .select()

  if (!error) revalidatePath('/finance')
  return { data, error }
}

export async function updateLogisticsTemplate(id: string, formData: any) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  const { data, error } = await supabase
    .from('logisticke_sablony')
    .update({
      ...formData,
      upravil_id: user?.id
    })
    .eq('id', id)
    .select()

  if (!error) revalidatePath('/finance')
  return { data, error }
}

export async function deleteLogisticsTemplate(id: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('logisticke_sablony')
    .delete()
    .eq('id', id)
  
  if (!error) revalidatePath('/finance')
  return { error }
}

/**
 * Category Margin Management Actions
 */

export async function getCategoriesWithDefaults() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('c_kategorie')
    .select(`
      *,
      logisticka_sablona:def_logisticka_sablona_id ( nazev )
    `)
    .order('nazev')
  
  return { data, error }
}

export async function updateCategoryDefaults(categoryId: string, updates: {
  def_marze_retail_procenta: number,
  def_marze_partner_procenta: number,
  def_marze_vip_procenta: number,
  def_marze_premarket_open_procenta: number,
  def_logisticka_sablona_id: string | null
}) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('c_kategorie')
    .update(updates)
    .eq('id', categoryId)
    .select()

  if (!error) revalidatePath('/finance')
  return { data, error }
}

export async function pushCategoryDefaultsToProducts(categoryId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // 1. Get the defaults from the category
  const { data: category, error: catError } = await supabase
    .from('c_kategorie')
    .select('*')
    .eq('id', categoryId)
    .single()

  if (catError || !category) return { error: catError || new Error("Kategorie nenalezena") }

  // 2. Update all products in this category
  const { error: prodError } = await supabase
    .from('produkty')
    .update({
      cilova_marze_retail_procenta: category.def_marze_retail_procenta,
      cilova_marze_partner_procenta: category.def_marze_partner_procenta,
      cilova_marze_vip_procenta: category.def_marze_vip_procenta,
      cilova_marze_premarket_open_procenta: category.def_marze_premarket_open_procenta,
      upravil_id: user?.id,
      aktualizovano_at: new Date().toISOString()
    })
    .eq('kategorie_id', categoryId)

  if (prodError) return { error: prodError }

  // 3. Update logistics template in sourcing entries if defined
  if (category.def_logisticka_sablona_id) {
    await supabase
      .from('produkt_dodavatel')
      .update({
        logisticka_sablona_id: category.def_logisticka_sablona_id,
        upravil_id: user?.id,
        aktualizovano_at: new Date().toISOString()
      })
      .in('produkt_id', 
        (await supabase.from('produkty').select('id').eq('kategorie_id', categoryId)).data?.map(p => p.id) || []
      )
      .is('deleted_at', null)
  }

  revalidatePath('/produkty')
  revalidatePath('/finance')
  return { success: true }
}

/**
 * Fetches latest rates from CNB API and saves them to DB
 * API format: https://www.cnb.cz/cs/financni-trhy/devizovy-trh/kurzy-devizoveho-trhu/kurzy-devizoveho-trhu/denni_kurz.txt
 */
export async function fetchLatestCnbRates() {
  try {
    const response = await fetch('https://www.cnb.cz/cs/financni-trhy/devizovy-trh/kurzy-devizoveho-trhu/kurzy-devizoveho-trhu/denni_kurz.txt')
    const text = await response.text()
    
    // Parse CNB text format
    // Line 1: Date and order number
    // Line 2: Headers
    // Line 3+: Data (země|měna|množství|kód|kurz)
    const lines = text.split('\n')
    const dateLine = lines[0].split(' ')[0] // DD.MM.YYYY
    const [day, month, year] = dateLine.split('.')
    const dbDate = `${year}-${month}-${day}`

    const supabase = await createClient()
    const ratesToInsert = []

    for (let i = 2; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line) continue

      const [země, měna, množství, kód, kurzStr] = line.split('|')
      if (!kód || !kurzStr) continue

      const kurz = parseFloat(kurzStr.replace(',', '.'))
      const mnozstvi = parseInt(množství)

      ratesToInsert.push({
        datum: dbDate,
        mena: kód,
        kurz_czk: kurz,
        mnozstvi: mnozstvi
      })
    }

    const { error } = await supabase
      .from('historie_kurzu')
      .upsert(ratesToInsert, { onConflict: 'datum, mena' })

    if (error) throw error

    revalidatePath('/finance')
    return { success: true, date: dbDate }
  } catch (error: any) {
    console.error('CNB Fetch Error:', error)
    return { success: false, error: error.message }
  }
}

export async function getLatestRates(): Promise<{ data: ExchangeRate[] | null, error: any }> {
  const supabase = await createClient()
  
  // Get the most recent date available in DB
  const { data: recentDate } = await supabase
    .from('historie_kurzu')
    .select('datum')
    .order('datum', { ascending: false })
    .limit(1)
    .single()

  if (!recentDate) return { data: [], error: null }

  const { data, error } = await supabase
    .from('historie_kurzu')
    .select('*')
    .eq('datum', recentDate.datum)
    .in('mena', ['EUR', 'USD', 'GBP', 'CNY', 'PLN']) // Main currencies for AZ Composite
  
  return { data, error }
}

export async function getGlobalFinanceSettings(): Promise<{ data: GlobalFinanceSettings | null, error: any }> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('globalni_nastaveni_financi')
    .select('*, upravil:upravil_id ( jmeno )')
    .eq('id', 'default')
    .single()
    
  return { data, error }
}

export async function updateFinanceSettings(updates: Partial<GlobalFinanceSettings>) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data, error } = await supabase
    .from('globalni_nastaveni_financi')
    .update({
      ...updates,
      upravil_id: user?.id,
      aktualizovano_at: new Date().toISOString()
    })
    .eq('id', 'default')
    .select()

  if (!error) revalidatePath('/finance')
  return { data, error }
}

/**
 * Packaging Profiles Actions
 */

export async function getPackagingProfiles(): Promise<{ data: BaliciProfil[] | null, error: any }> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('c_balici_profily')
    .select(`
      *,
      vytvoril:vytvoril_id ( jmeno ),
      upravil:upravil_id ( jmeno )
    `)
    .order('nazev')
  
  return { data, error }
}

export async function createPackagingProfile(formData: any) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  const { data, error } = await supabase
    .from('c_balici_profily')
    .insert([{
      ...formData,
      vytvoril_id: user?.id,
      upravil_id: user?.id
    }])
    .select()

  if (!error) revalidatePath('/finance')
  return { data, error }
}

export async function updatePackagingProfile(id: string, formData: any) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  const { data, error } = await supabase
    .from('c_balici_profily')
    .update({
      ...formData,
      upravil_id: user?.id,
      aktualizovano_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()

  if (!error) revalidatePath('/finance')
  return { data, error }
}

export async function deletePackagingProfile(id: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('c_balici_profily')
    .delete()
    .eq('id', id)
  
  if (!error) revalidatePath('/finance')
  return { error }
}

/**
 * Standard Box Sizes Actions
 */

export async function getStandardBoxSizes(): Promise<{ data: StandardBoxSize[] | null, error: any }> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('c_standard_box_sizes')
    .select('*')
    .order('poradi')
  
  return { data, error }
}

export async function createStandardBoxSize(formData: any) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  const { data, error } = await supabase
    .from('c_standard_box_sizes')
    .insert([{
      ...formData,
      vytvoril_id: user?.id,
      upravil_id: user?.id
    }])
    .select()

  if (!error) revalidatePath('/finance')
  return { data, error }
}

export async function updateStandardBoxSize(id: string, formData: any) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  const { data, error } = await supabase
    .from('c_standard_box_sizes')
    .update({
      ...formData,
      upravil_id: user?.id,
      aktualizovano_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()

  if (!error) revalidatePath('/finance')
  return { data, error }
}

export async function deleteStandardBoxSize(id: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('c_standard_box_sizes')
    .delete()
    .eq('id', id)
  
  if (!error) revalidatePath('/finance')
  return { error }
}

