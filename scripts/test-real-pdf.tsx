import React, { createElement } from 'react'
import { renderToBuffer } from '@react-pdf/renderer'
import { createClient } from '@supabase/supabase-js'
import { CatalogPDF } from '../src/modules/catalogs/components/CatalogPDF'
import { calculateProductPricing } from '../src/modules/finance/utils/calculations'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const supabase = createClient(supabaseUrl, supabaseKey)

async function getProducts() {
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
      c_balici_profily ( * ),
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

async function getLatestRates() {
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
    .in('mena', ['EUR', 'USD', 'GBP', 'CNY']) // Main currencies for AZ Composite
  
  return { data, error }
}

async function getGlobalFinanceSettings() {
  const { data, error } = await supabase
    .from('globalni_nastaveni_financi')
    .select('*')
    .limit(1)
  return { data: data?.[0] || null, error }
}

async function getLogisticsTemplates() {
  const { data, error } = await supabase
    .from('logisticke_sablony')
    .select('*')
  return { data, error }
}

async function test() {
  try {
    console.log('Fetching real data from Supabase (direct)...')
    const [
      { data: products, error: productsError },
      { data: rates, error: ratesError },
      { data: settings, error: settingsError },
      { data: templates, error: templatesError }
    ] = await Promise.all([
      getProducts(),
      getLatestRates(),
      getGlobalFinanceSettings(),
      getLogisticsTemplates()
    ])

    if (productsError) console.error('productsError:', productsError)
    if (ratesError) console.error('ratesError:', ratesError)
    if (settingsError) console.error('settingsError:', settingsError)
    if (templatesError) console.error('templatesError:', templatesError)

    const realSettings = settings || {
      id: 'default',
      doprava_eur_za_kg: 0.5,
      marze_rezerva_procenta: 5,
      poplatek_zahranicni_platba_czk: 190,
      pouzivat_manualni_kurzy: false,
      manualni_kurz_eur: 25,
      manualni_kurz_usd: 23,
      clo_default_procenta: 4.7
    }

    if (!products) {
      throw new Error('Data not fetched properly: products is null')
    }
    console.log(`Fetched ${products.length} products. Calculating pricing...`)

    const pricedProducts = products.map((product: any) => {
      const primarySourcing = product.produkt_dodavatel?.find((s: any) => s.is_primary) || product.produkt_dodavatel?.[0]
      const template = primarySourcing?.logisticka_sablona_id 
        ? templates?.find(t => t.id === primarySourcing.logisticka_sablona_id)
        : null

      const pricing = primarySourcing 
        ? calculateProductPricing(
            primarySourcing.nakupni_cena,
            primarySourcing.mena,
            primarySourcing.prevodni_pomer_na_zakladni || 1,
            product.hmotnost_baliku_kg || 0,
            product.clo_procenta,
            {
              retail: product.cilova_marze_retail_procenta || 30,
              partner: product.cilova_marze_partner_procenta || 20
            },
            rates || [],
            realSettings,
            template,
            product.c_balici_profily || null,
            {
              delka: product.balik_delka_cm_override,
              sirka: product.balik_sirka_cm_override,
              vyska: product.balik_vyska_cm_override
            }
          )
        : null

      return { ...product, pricing }
    })

    let exchangeRate = 1
    if (realSettings.pouzivat_manualni_kurzy) {
      exchangeRate = realSettings.manualni_kurz_eur || 25
    } else {
      const rateObj = rates?.find(r => r.mena === 'EUR')
      exchangeRate = rateObj ? rateObj.kurz_czk / rateObj.mnozstvi : 25
    }

    console.log('Rendering CatalogPDF with all tier and currency combinations...')
    const tiers = ['retail', 'partner', 'partner_5', 'partner_10', 'partner_15', 'partner_20']
    const currencies = ['CZK', 'EUR', 'USD']

    for (const t of tiers) {
      for (const cur of currencies) {
        console.log(`Testing tier: ${t}, currency: ${cur}...`)
        const buffer = await renderToBuffer(
          createElement(CatalogPDF, {
            products: pricedProducts as any,
            tier: t as any,
            targetCurrency: cur as any,
            exchangeRate
          }) as any
        )
        console.log(`- Success! Rendered ${t} / ${cur}, buffer size: ${buffer.length}`)
      }
    }
    console.log('All combinations rendered successfully!')
  } catch (err: any) {
    console.error('CRASH DETECTED:')
    console.error(err)
  }
}

test()
