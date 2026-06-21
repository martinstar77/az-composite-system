'use server'

import { createClient } from '@/shared/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { Doklad, DokladPolozka, FiremniProfil } from '../types'
import { dokladSchema } from '../types/formSchema'
import { vypocitejRadek } from '../utils/calculations'
import { getFiremniProfil } from './settings'

const DOKLAD_SELECT = `
  *,
  zakaznik:zakaznik_id ( * ),
  dodavatel:dodavatel_id ( * ),
  polozky:doklady_polozky ( * ),
  vytvoril:vytvoril_id ( jmeno ),
  upravil:upravil_id ( jmeno )
`

/**
 * Načte seznam dokladů s volitelným filtrem dle typu.
 */
export async function getDoklady(typ?: string): Promise<Doklad[]> {
  const supabase = await createClient()

  let query = supabase
    .from('doklady')
    .select(DOKLAD_SELECT)
    .is('deleted_at', null)
    .order('datum_vystaveni', { ascending: false })
    .order('vytvoreno_at', { ascending: false })

  if (typ) {
    query = query.eq('typ', typ)
  }

  const { data, error } = await query

  if (error) {
    console.error('[getDoklady]', error)
    return []
  }

  return (data ?? []).map(normalizeDoklad)
}

/**
 * Načte jeden doklad podle ID (včetně položek a zákazníka).
 */
export async function getDokladById(id: string): Promise<Doklad | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('doklady')
    .select(DOKLAD_SELECT)
    .eq('id', id)
    .is('deleted_at', null)
    .single()

  if (error || !data) {
    console.error('[getDokladById]', error)
    return null
  }

  const doklad = normalizeDoklad(data)

  // Seřadit položky dle pořadí
  if (doklad.polozky) {
    doklad.polozky = doklad.polozky.sort((a, b) => a.poradi - b.poradi)
  }

  return doklad
}

/**
 * Vytvoří nový doklad.
 * Automaticky:
 * - vygeneruje číslo dokladu (atomická SQL funkce)
 * - uloží snapshot firemních a zákaznických údajů
 * - přepočítá a uloží součty každé položky
 * - zapíše do audit logu
 */
export async function createDoklad(
  formData: Record<string, unknown>
): Promise<{ success: boolean; id?: string; cislo?: string; error?: string }> {
  const supabase = await createClient()

  const parsed = dokladSchema.safeParse(formData)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Neplatná data' }
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Nejste přihlášeni' }

  const values = parsed.data

  // 1. Vygenerovat číslo dokladu (atomicky přes DB funkci)
  const { data: cisloData, error: cisloError } = await supabase
    .rpc('next_document_number', { p_typ: values.typ })
  if (cisloError) {
    return { success: false, error: 'Chyba generování čísla dokladu: ' + cisloError.message }
  }
  const cislo = cisloData as string

  // 2. Načíst snapshoty
  const firemniProfil = await getFiremniProfil()
  let partnerData = null
  if (values.zakaznik_id) {
    const { data } = await supabase
      .from('zakaznici')
      .select('*')
      .eq('id', values.zakaznik_id)
      .single()
    partnerData = data
  } else if (values.dodavatel_id) {
    const { data } = await supabase
      .from('dodavatele')
      .select('*')
      .eq('id', values.dodavatel_id)
      .single()
    if (data) {
      partnerData = {
        id: data.id,
        kod: data.kod,
        nazev_spolecnosti: data.nazev_spolecnosti,
        ico: data.ico,
        dic: data.dic,
        email_fakturace: data.kontakty?.email_objednavky ?? null,
        telefon: data.kontakty?.telefonni_cislo ?? null,
        adresa: data.adresa ?? {},
        je_platce_dph: true,
        je_zahranicni: data.zeme_puvodu !== 'CZ',
      }
    }
  }

  // 3. Vložit hlavičku dokladu
  const { data: dokladData, error: dokladError } = await supabase
    .from('doklady')
    .insert({
      cislo,
      typ:                    values.typ,
      stav:                   'koncept',
      zakaznik_id:            values.zakaznik_id || null,
      dodavatel_id:           values.dodavatel_id || null,
      rodic_id:               values.rodic_id ?? null,
      datum_vystaveni:        values.datum_vystaveni,
      datum_splatnosti:       values.datum_splatnosti || null,
      duzp:                   values.duzp || null,
      datum_platnosti:        values.datum_platnosti || null,
      mena:                   values.mena,
      kurz_k_czk:             values.kurz_k_czk,
      platce_dph:             values.platce_dph,
      reverse_charge:         values.reverse_charge,
      zpusob_uhrady:          values.zpusob_uhrady,
      jazyk:                  values.jazyk,
      tisk_podpisu:           values.tisk_podpisu,
      zalohova_castka:        values.zalohova_castka ?? null,
      zalohova_procento:      values.zalohova_procento ?? null,
      poznamky:               values.poznamky || null,
      interni_poznamky:       values.interni_poznamky || null,
      firemni_udaje_snapshot: firemniProfil,
      zakaznik_udaje_snapshot: partnerData,
      vytvoril_id:            user.id,
      upravil_id:             user.id,
    })
    .select('id')
    .single()

  if (dokladError || !dokladData) {
    return { success: false, error: 'Chyba při vytváření dokladu: ' + dokladError?.message }
  }

  const dokladId = dokladData.id

  // 4. Vložit položky s přepočítanými součty
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
      .from('doklady_polozky')
      .insert(polozkyPayload)

    if (polozkyError) {
      // Rollback nelze (žádné transakce v Supabase JS klientu — čistit ručně nebo přes DB funkci)
      // TODO: Zvážit PG funkci pro atomické vytvoření v budoucnu
      console.error('[createDoklad] Chyba při vkládání položek', polozkyError)
    }
  }

  // 5. Audit log
  await supabase.from('doklady_audit_log').insert({
    doklad_id:   dokladId,
    akce:        'vytvoreno',
    novy_stav:   { cislo, typ: values.typ, stav: 'koncept' },
    uzivatel_id: user.id,
  })

  revalidatePath('/faktury')

  return { success: true, id: dokladId, cislo }
}

/**
 * Změní stav dokladu (odeslat, označit jako uhrazeno, stornovat...).
 */
export async function changeDokladStav(
  id: string,
  novyStav: string,
  poznamka?: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Nejste přihlášeni' }

  // Načíst aktuální stav pro audit
  const { data: current } = await supabase
    .from('doklady')
    .select('stav, cislo')
    .eq('id', id)
    .single()

  const { error } = await supabase
    .from('doklady')
    .update({
      stav:            novyStav,
      upravil_id:      user.id,
      aktualizovano_at: new Date().toISOString(),
    })
    .eq('id', id)
    .is('deleted_at', null)

  if (error) {
    return { success: false, error: 'Chyba při změně stavu: ' + error.message }
  }

  // Audit
  await supabase.from('doklady_audit_log').insert({
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
 * Soft-delete dokladu.
 */
export async function deleteDoklad(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Nejste přihlášeni' }

  const { error } = await supabase
    .from('doklady')
    .update({
      deleted_at:      new Date().toISOString(),
      stav:            'stornovano',
      upravil_id:      user.id,
    })
    .eq('id', id)

  if (error) {
    return { success: false, error: 'Chyba při mazání: ' + error.message }
  }

  await supabase.from('doklady_audit_log').insert({
    doklad_id:   id,
    akce:        'stornovano',
    uzivatel_id: user.id,
  })

  revalidatePath('/faktury')

  return { success: true }
}

/**
 * Aktualizuje existující doklad.
 * Vymaže staré položky a vloží nově přepočítané položky.
 */
export async function updateDoklad(
  id: string,
  formData: Record<string, unknown>
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  const parsed = dokladSchema.safeParse(formData)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Neplatná data' }
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Nejste přihlášeni' }

  const values = parsed.data

  // Načíst starý stav pro audit
  const { data: oldDoklad } = await supabase
    .from('doklady')
    .select('stav, cislo')
    .eq('id', id)
    .single()

  if (oldDoklad && oldDoklad.stav !== 'koncept') {
    return { success: false, error: 'Lze upravovat pouze doklady ve stavu koncept' }
  }

  // 1. Získat profil a partnera pro případnou aktualizaci snapshotů
  const firemniProfil = await getFiremniProfil()
  let partnerData = null
  if (values.zakaznik_id) {
    const { data } = await supabase
      .from('zakaznici')
      .select('*')
      .eq('id', values.zakaznik_id)
      .single()
    partnerData = data
  } else if (values.dodavatel_id) {
    const { data } = await supabase
      .from('dodavatele')
      .select('*')
      .eq('id', values.dodavatel_id)
      .single()
    if (data) {
      partnerData = {
        id: data.id,
        kod: data.kod,
        nazev_spolecnosti: data.nazev_spolecnosti,
        ico: data.ico,
        dic: data.dic,
        email_fakturace: data.kontakty?.email_objednavky ?? null,
        telefon: data.kontakty?.telefonni_cislo ?? null,
        adresa: data.adresa ?? {},
        je_platce_dph: true,
        je_zahranicni: data.zeme_puvodu !== 'CZ',
      }
    }
  }

  // 2. Aktualizovat hlavičku
  const { error: dokladError } = await supabase
    .from('doklady')
    .update({
      zakaznik_id:            values.zakaznik_id || null,
      dodavatel_id:           values.dodavatel_id || null,
      datum_vystaveni:        values.datum_vystaveni,
      datum_splatnosti:       values.datum_splatnosti || null,
      duzp:                   values.duzp || null,
      datum_platnosti:        values.datum_platnosti || null,
      mena:                   values.mena,
      kurz_k_czk:             values.kurz_k_czk,
      platce_dph:             values.platce_dph,
      reverse_charge:         values.reverse_charge,
      zpusob_uhrady:          values.zpusob_uhrady,
      jazyk:                  values.jazyk,
      tisk_podpisu:           values.tisk_podpisu,
      zalohova_castka:        values.zalohova_castka ?? null,
      zalohova_procento:      values.zalohova_procento ?? null,
      poznamky:               values.poznamky || null,
      interni_poznamky:       values.interni_poznamky || null,
      firemni_udaje_snapshot: firemniProfil,
      zakaznik_udaje_snapshot: partnerData,
      upravil_id:             user.id,
      aktualizovano_at:       new Date().toISOString(),
    })
    .eq('id', id)

  if (dokladError) {
    return { success: false, error: 'Chyba při ukládání hlavičky dokladu: ' + dokladError.message }
  }

  // 3. Smazat původní položky
  const { error: deleteError } = await supabase
    .from('doklady_polozky')
    .delete()
    .eq('doklad_id', id)

  if (deleteError) {
    return { success: false, error: 'Chyba při čištění položek dokladu: ' + deleteError.message }
  }

  // 4. Vložit nové položky
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
      .from('doklady_polozky')
      .insert(polozkyPayload)

    if (polozkyError) {
      console.error('[updateDoklad] Chyba při vkládání položek', polozkyError)
      return { success: false, error: 'Doklad byl uložen, ale nepodařilo se uložit položky.' }
    }
  }

  // 5. Audit log
  await supabase.from('doklady_audit_log').insert({
    doklad_id:   id,
    akce:        'upraveno',
    novy_stav:   { stav: 'koncept' },
    uzivatel_id: user.id,
  })

  revalidatePath('/faktury')
  revalidatePath(`/faktury/${id}`)

  return { success: true }
}

function normalizeDoklad(raw: Record<string, unknown>): Doklad {
  return raw as unknown as Doklad
}

/**
 * Získá kurz pro danou měnu a datum (vystavení dokladu).
 * Pokud pro dané datum neexistuje, zkusí nejnovější dostupný nebo globální manuální nastavení z Cenotvorby.
 */
export async function getRateForCurrencyAndDate(mena: string, datum: string): Promise<number> {
  if (mena === 'CZK') return 1

  const supabase = await createClient()

  // 1. Zkontrolovat globální nastavení financí (zajišťovací / ruční kurzy)
  const { data: settings } = await supabase
    .from('globalni_nastaveni_financi')
    .select('*')
    .eq('id', 'default')
    .maybeSingle()

  if (settings?.pouzivat_manualni_kurzy) {
    if (mena === 'EUR' && settings.manualni_kurz_eur) return settings.manualni_kurz_eur
    if (mena === 'USD' && settings.manualni_kurz_usd) return settings.manualni_kurz_usd
  }

  // 2. Zkusit najít přesný kurz pro dané datum v historii_kurzu
  const { data: exactRate } = await supabase
    .from('historie_kurzu')
    .select('kurz_czk, mnozstvi')
    .eq('mena', mena)
    .eq('datum', datum)
    .maybeSingle()

  if (exactRate) {
    return exactRate.kurz_czk / exactRate.mnozstvi
  }

  // 3. Fallback: najít nejnovější dostupný kurz
  const { data: latestRate } = await supabase
    .from('historie_kurzu')
    .select('kurz_czk, mnozstvi')
    .eq('mena', mena)
    .order('datum', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (latestRate) {
    return latestRate.kurz_czk / latestRate.mnozstvi
  }

  // Výchozí nouzové kurzy
  if (mena === 'EUR') return 25
  if (mena === 'USD') return 23
  if (mena === 'GBP') return 29
  return 1
}
