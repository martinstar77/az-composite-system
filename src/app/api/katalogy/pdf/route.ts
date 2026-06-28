import { getProducts } from '@/modules/products/actions'
import { getLatestRates, getGlobalFinanceSettings, getLogisticsTemplates } from '@/modules/finance/actions'
import { calculateProductPricing } from '@/modules/finance/utils/calculations'
import { createElement } from 'react'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // Force React 19 reconciler version detection override programmatically
    process.env.OVERRIDE_REACT_PDF_RECONCILER_REACT_VERSION = '19.0.0'
    
    const { renderToBuffer } = await import('@react-pdf/renderer')
    const { CatalogPDF } = await import('@/modules/catalogs/components/CatalogPDF')

    const { searchParams } = new URL(request.url)
    const tier = searchParams.get('tier') || 'partner'
    const currency = searchParams.get('currency') || 'EUR'
    const category = searchParams.get('category') || 'all'
    const status = searchParams.get('status') || 'all'
    const search = searchParams.get('search') || ''
    const lang = searchParams.get('lang') || 'cs'

    // 1. Fetch all necessary data on the server
    const [
      { data: products },
      { data: rates },
      { data: settings },
      { data: templates }
    ] = await Promise.all([
      getProducts(),
      getLatestRates(),
      getGlobalFinanceSettings(),
      getLogisticsTemplates()
    ])

    if (!settings || !products) {
      return new NextResponse('Nastavení nebo produkty nebyly nalezeny.', { status: 404 })
    }

    const ratesList = rates || []
    const templatesList = templates || []

    // 2. Pricing calculations (exact mirror of CatalogDashboard client-side calculation)
    const pricedProducts = products.map(product => {
      const primarySourcing = product.produkt_dodavatel?.find(s => s.is_primary) || product.produkt_dodavatel?.[0]
      const template = primarySourcing?.logisticka_sablona_id 
        ? templatesList.find(t => t.id === primarySourcing.logisticka_sablona_id)
        : null

      const isBuyingInBasicUnit = primarySourcing?.nakupni_mj_id === product.zakladni_mj_id
      const totalUnits = primarySourcing
        ? ((primarySourcing.prevodni_pomer_na_zakladni && primarySourcing.prevodni_pomer_na_zakladni !== 1)
            ? primarySourcing.prevodni_pomer_na_zakladni
            : (isBuyingInBasicUnit ? 1 : (product.mnozstvi_v_baleni || 1)))
        : 1

      const pricing = primarySourcing 
        ? calculateProductPricing(
            primarySourcing.nakupni_cena,
            primarySourcing.mena,
            totalUnits,
            product.hmotnost_baliku_kg || 0,
            product.clo_procenta,
            {
              retail: product.cilova_marze_retail_procenta || 30,
              partner: product.cilova_marze_partner_procenta || 20
            },
            ratesList,
            settings,
            template,
            (product.c_balici_profily as any) || null,
            {
              delka: product.balik_delka_cm_override,
              sirka: product.balik_sirka_cm_override,
              vyska: product.balik_vyska_cm_override
            },
            undefined,
            product.simulovana_velikost_objednavky || 1,
            product.mnozstvi_v_baleni || 1
          )
        : null

      return { ...product, pricing }
    })

    // 3. Filtering
    let filteredProducts = pricedProducts.filter(p => {
      const matchesSearch = 
        p.nazev.toLowerCase().includes(search.toLowerCase()) || 
        (p.nazev_en && p.nazev_en.toLowerCase().includes(search.toLowerCase())) ||
        p.sku.toLowerCase().includes(search.toLowerCase())
      
      const matchesCategory = category === 'all' || p.kategorie_id === category
      const matchesStatus = status === 'all' || p.stav_katalogu_id === status
      
      return matchesSearch && matchesCategory && matchesStatus
    })

    // 4. Sorting by name (locale dependent)
    filteredProducts.sort((a, b) => {
      const valA = lang === 'en' ? (a.nazev_en || a.nazev || '') : (a.nazev || '')
      const valB = lang === 'en' ? (b.nazev_en || b.nazev || '') : (b.nazev || '')
      return valA.localeCompare(valB, lang === 'en' ? 'en' : 'cs')
    })

    // 5. Target exchange rate calculation
    let exchangeRate = 1
    if (currency !== 'CZK') {
      if (settings.pouzivat_manualni_kurzy) {
        if (currency === 'EUR') exchangeRate = settings.manualni_kurz_eur || 25
        else if (currency === 'USD') exchangeRate = settings.manualni_kurz_usd || 23
      } else {
        const rateObj = ratesList.find(r => r.mena === currency)
        exchangeRate = rateObj ? rateObj.kurz_czk / rateObj.mnozstvi : 1
      }
    }

    // 6. Render PDF
    const buffer = await renderToBuffer(
      createElement(CatalogPDF, {
        products: filteredProducts as any,
        tier: tier as any,
        targetCurrency: currency as any,
        exchangeRate,
        lang: lang as any
      }) as any
    )

    // 7. Stream response as PDF
    const filename = lang === 'cs'
      ? `AZ_Composites_Katalog_${tier.toUpperCase()}_${currency}.pdf`
      : `AZ_Composites_Catalog_${tier.toUpperCase()}_${currency}.pdf`

    return new Response(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${filename}"`,
        'Cache-Control': 'no-store, max-age=0',
      },
    })
  } catch (error: any) {
    console.error('[API KATALOG PDF GET]', error)
    return new NextResponse('Interní chyba serveru: ' + error.message, { status: 500 })
  }
}
