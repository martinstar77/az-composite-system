'use server'

import { createClient } from '@/shared/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { PrijatyDoklad, PrijatyDokladPolozka } from '../types'
import { prijatyDokladSchema } from '../types/formSchema'
import { vypocitejRadek } from '../utils/calculations'

const PRIJATY_DOKLAD_SELECT = `
  *,
  dodavatel:dodavatel_id ( * ),
  polozky:prijate_doklady_polozky ( * ),
  vytvoril:vytvoril_id ( jmeno ),
  upravil:upravil_id ( jmeno )
`

/**
 * Načte seznam přijatých dokladů (objednávky dodavatelům, přijaté faktury) s volitelným filtrem dle typu.
 */
export async function getPrijateDoklady(typ?: string): Promise<PrijatyDoklad[]> {
  const supabase = await createClient()

  let query = supabase
    .from('prijate_doklady')
    .select(PRIJATY_DOKLAD_SELECT)
    .is('deleted_at', null)
    .order('datum_vystaveni', { ascending: false })
    .order('vytvoreno_at', { ascending: false })

  if (typ) {
    query = query.eq('typ', typ)
  }

  const { data, error } = await query

  if (error) {
    console.error('[getPrijateDoklady]', error)
    return []
  }

  return (data ?? []).map(normalizePrijatyDoklad)
}

/**
 * Načte jeden přijatý doklad podle ID.
 */
export async function getPrijatyDokladById(id: string): Promise<PrijatyDoklad | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('prijate_doklady')
    .select(PRIJATY_DOKLAD_SELECT)
    .eq('id', id)
    .is('deleted_at', null)
    .single()

  if (error || !data) {
    console.error('[getPrijatyDokladById]', error)
    return null
  }

  const doklad = normalizePrijatyDoklad(data)

  // Seřadit položky
  if (doklad.polozky) {
    doklad.polozky = doklad.polozky.sort((a, b) => a.poradi - b.poradi)
  }

  return doklad
}

/**
 * Vytvoří nový přijatý doklad (např. Objednávku dodavateli).
 */
export async function createPrijatyDoklad(
  formData: Record<string, unknown>
): Promise<{ success: boolean; id?: string; cislo?: string; error?: string }> {
  const supabase = await createClient()

  const parsed = prijatyDokladSchema.safeParse(formData)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Neplatná data' }
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Nejste přihlášeni' }

  const values = parsed.data

  // 1. Vygenerovat číslo dokladu
  let cislo = values.cislo
  if (!cislo) {
    const { data: cisloData, error: cisloError } = await supabase
      .rpc('prijate_doklady_next_number', { p_typ: values.typ })
    if (cisloError) {
      return { success: false, error: 'Chyba generování čísla dokladu: ' + cisloError.message }
    }
    cislo = cisloData as string
  }

  // 2. Načíst dodavatele pro snapshot
  let dodavatelData = null
  if (values.dodavatel_id) {
    const { data } = await supabase
      .from('dodavatele')
      .select('*')
      .eq('id', values.dodavatel_id)
      .single()
    dodavatelData = data
  }

  // 3. Vložit hlavičku
  const { data: dokladData, error: dokladError } = await supabase
    .from('prijate_doklady')
    .insert({
      cislo,
      externi_cislo_faktury:   values.externi_cislo_faktury || null,
      typ:                    values.typ,
      stav:                   'koncept',
      dodavatel_id:           values.dodavatel_id || null,
      rodic_id:               values.rodic_id ?? null,
      datum_vystaveni:        values.datum_vystaveni,
      datum_prijeti:          values.datum_prijeti || null,
      datum_splatnosti:       values.datum_splatnosti || null,
      duzp:                   values.duzp || null,
      mena:                   values.mena,
      kurz_k_czk:             values.kurz_k_czk,
      platce_dph:             values.platce_dph,
      zpusob_uhrady:          values.zpusob_uhrady,
      jazyk:                  values.jazyk,
      poznamky:               values.poznamky || null,
      interni_poznamky:       values.interni_poznamky || null,
      dodavatel_udaje_snapshot: dodavatelData,
      vytvoril_id:            user.id,
      upravil_id:             user.id,
    })
    .select('id')
    .single()

  if (dokladError || !dokladData) {
    return { success: false, error: 'Chyba při vytváření nákupního dokladu: ' + dokladError?.message }
  }

  const dokladId = dokladData.id

  // 4. Vložit položky
  if (values.polozky.length > 0) {
    const polozkyPayload = values.polozky.map((p, i) => {
      const soucty = vypocitejRadek({
        mnozstvi:     p.mnozstvi,
        cena_bez_dph: p.cena_bez_dph,
        sazba_dph:    p.sazba_dph,
        sleva_procent: p.sleva_procent,
      })
      return {
        doklad_id:    dokladId,
        poradi:       i,
        typ:          p.typ,
        produkt_id:   p.produkt_id ?? null,
        nazev:        p.nazev,
        popis:        p.popis || null,
        jednotka:     p.jednotka,
        mnozstvi:     p.mnozstvi,
        cena_bez_dph: p.cena_bez_dph,
        sazba_dph:    p.sazba_dph,
        sleva_procent: p.sleva_procent,
        ...soucty,
      }
    })

    const { error: polozkyError } = await supabase
      .from('prijate_doklady_polozky')
      .insert(polozkyPayload)

    if (polozkyError) {
      console.error('[createPrijatyDoklad] Chyba při vkládání položek', polozkyError)
    }
  }

  // 5. Audit log
  await supabase.from('prijate_doklady_audit_log').insert({
    doklad_id:   dokladId,
    akce:        'vytvoreno',
    novy_stav:   { cislo, typ: values.typ, stav: 'koncept' },
    uzivatel_id: user.id,
  })

  revalidatePath('/faktury')

  return { success: true, id: dokladId, cislo }
}

/**
 * Změní stav přijatého dokladu.
 */
export async function changePrijatyDokladStav(
  id: string,
  novyStav: string,
  poznamka?: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Nejste přihlášeni' }

  const { data: current } = await supabase
    .from('prijate_doklady')
    .select('stav')
    .eq('id', id)
    .single()

  const { error } = await supabase
    .from('prijate_doklady')
    .update({
      stav:            novyStav,
      upravil_id:      user.id,
      aktualizovano_at: new Date().toISOString(),
    })
    .eq('id', id)
    .is('deleted_at', null)

  if (error) {
    return { success: false, error: 'Chyba změny stavu: ' + error.message }
  }

  await supabase.from('prijate_doklady_audit_log').insert({
    doklad_id:   id,
    akce:        'stav_zmeneno',
    stary_stav:  { stav: current?.stav },
    novy_stav:   { stav: novyStav },
    poznamka:    poznamka ?? null,
    uzivatel_id: user.id,
  })

  revalidatePath('/faktury')
  revalidatePath(`/faktury/${id}`)

  return { success: true }
}

/**
 * Soft delete nákupního dokladu.
 */
export async function deletePrijatyDoklad(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Nejste přihlášeni' }

  const { error } = await supabase
    .from('prijate_doklady')
    .update({
      deleted_at:      new Date().toISOString(),
      stav:            'stornovano',
      upravil_id:      user.id,
    })
    .eq('id', id)

  if (error) {
    return { success: false, error: 'Chyba mazání: ' + error.message }
  }

  await supabase.from('prijate_doklady_audit_log').insert({
    doklad_id:   id,
    akce:        'stornovano',
    uzivatel_id: user.id,
  })

  revalidatePath('/faktury')

  return { success: true }
}

/**
 * Aktualizuje nákupní doklad.
 */
export async function updatePrijatyDoklad(
  id: string,
  formData: Record<string, unknown>
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  const parsed = prijatyDokladSchema.safeParse(formData)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Neplatná data' }
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Nejste přihlášeni' }

  const values = parsed.data

  const { data: oldDoklad } = await supabase
    .from('prijate_doklady')
    .select('stav')
    .eq('id', id)
    .single()

  if (oldDoklad && oldDoklad.stav !== 'koncept') {
    return { success: false, error: 'Lze upravovat pouze nákupní doklady ve stavu koncept' }
  }

  let dodavatelData = null
  if (values.dodavatel_id) {
    const { data } = await supabase
      .from('dodavatele')
      .select('*')
      .eq('id', values.dodavatel_id)
      .single()
    dodavatelData = data
  }

  const { error: dokladError } = await supabase
    .from('prijate_doklady')
    .update({
      externi_cislo_faktury:   values.externi_cislo_faktury || null,
      dodavatel_id:           values.dodavatel_id || null,
      datum_vystaveni:        values.datum_vystaveni,
      datum_prijeti:          values.datum_prijeti || null,
      datum_splatnosti:       values.datum_splatnosti || null,
      duzp:                   values.duzp || null,
      mena:                   values.mena,
      kurz_k_czk:             values.kurz_k_czk,
      platce_dph:             values.platce_dph,
      zpusob_uhrady:          values.zpusob_uhrady,
      jazyk:                  values.jazyk,
      poznamky:               values.poznamky || null,
      interni_poznamky:       values.interni_poznamky || null,
      dodavatel_udaje_snapshot: dodavatelData,
      upravil_id:             user.id,
      aktualizovano_at:       new Date().toISOString(),
    })
    .eq('id', id)

  if (dokladError) {
    return { success: false, error: 'Chyba aktualizace hlavičky: ' + dokladError.message }
  }

  // Smazat staré položky
  await supabase.from('prijate_doklady_polozky').delete().eq('doklad_id', id)

  // Vložit nové položky
  if (values.polozky.length > 0) {
    const polozkyPayload = values.polozky.map((p, i) => {
      const soucty = vypocitejRadek({
        mnozstvi:     p.mnozstvi,
        cena_bez_dph: p.cena_bez_dph,
        sazba_dph:    p.sazba_dph,
        sleva_procent: p.sleva_procent,
      })
      return {
        doklad_id:    id,
        poradi:       i,
        typ:          p.typ,
        produkt_id:   p.produkt_id ?? null,
        nazev:        p.nazev,
        popis:        p.popis || null,
        jednotka:     p.jednotka,
        mnozstvi:     p.mnozstvi,
        cena_bez_dph: p.cena_bez_dph,
        sazba_dph:    p.sazba_dph,
        sleva_procent: p.sleva_procent,
        ...soucty,
      }
    })

    const { error: polozkyError } = await supabase
      .from('prijate_doklady_polozky')
      .insert(polozkyPayload)

    if (polozkyError) {
      console.error('[updatePrijatyDoklad] Chyba vkládání položek', polozkyError)
      return { success: false, error: 'Hlavička uložena, ale nepodařilo se uložit položky.' }
    }
  }

  await supabase.from('prijate_doklady_audit_log').insert({
    doklad_id:   id,
    akce:        'upraveno',
    novy_stav:   { stav: 'koncept' },
    uzivatel_id: user.id,
  })

  revalidatePath('/faktury')
  revalidatePath(`/faktury/${id}`)

  return { success: true }
}

function normalizePrijatyDoklad(raw: Record<string, unknown>): PrijatyDoklad {
  return raw as unknown as PrijatyDoklad
}
