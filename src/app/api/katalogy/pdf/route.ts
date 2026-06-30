import { getProducts } from '@/modules/products/actions'
import { getLatestRates, getGlobalFinanceSettings, getLogisticsTemplates } from '@/modules/finance/actions'
import { calculateProductPricing } from '@/modules/finance/utils/calculations'
import { createElement } from 'react'
import { NextRequest, NextResponse } from 'next/server'

function getProductSubcategory(p: any): string {
  const catId = p.kategorie_id
  if (catId === 'vyztuzne_materialy') {
    return p.specifikace?.materiál || p.specifikace?.material || 'OF'
  }
  if (catId === 'consumables') {
    return p.specifikace?.podkategorie || 'Ostatní'
  }
  if (catId === 'naradi') {
    return p.specifikace?.podkategorie || 'Ostatní'
  }
  if (catId === 'brouseni_a_lesteni') {
    return p.specifikace?.podkategorie || 'ostatni'
  }
  if (catId === 'chemie') {
    return p.specifikace?.podkategorie || 'ostatni'
  }
  if (catId === 'spotrebni_chemie') {
    return p.specifikace?.podkategorie || 'standard'
  }
  return '_default'
}

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // Force React 19 reconciler version detection override programmatically
    process.env.OVERRIDE_REACT_PDF_RECONCILER_REACT_VERSION = '19.0.0'
    
    const { renderToBuffer } = await import('@react-pdf/renderer')
    const { CatalogPDF } = await import('@/modules/catalogs/components/CatalogPDF')
    const { PriceMatrixPDF } = await import('@/modules/catalogs/components/PriceMatrixPDF')
    const { ProductCatalogPDF } = await import('@/modules/products/components/ProductCatalogPDF')

    const { searchParams } = new URL(request.url)
    const mode = searchParams.get('mode') || 'catalog' // 'catalog' | 'matrix' | 'products'
    const viewMode = (searchParams.get('viewMode') || 'sales') as 'cogs' | 'sales'
    const unitMode = (searchParams.get('unitMode') || 'basic') as 'basic' | 'packaging'
    const sortField = searchParams.get('sortField') || 'name'
    const sortDirection = searchParams.get('sortDirection') || 'asc'
    
    const tier = searchParams.get('tier') || 'partner'
    const currency = searchParams.get('currency') || 'EUR'
    const categoriesParam = searchParams.get('categories') || searchParams.get('category') || 'all'
    const subcategoriesParam = searchParams.get('subcategories') || ''
    const status = searchParams.get('status') || 'all'
    const search = searchParams.get('search') || ''
    const lang = searchParams.get('lang') || 'cs'

    const selectedCats = categoriesParam && categoriesParam !== 'all' ? categoriesParam.split(',') : []
    const selectedSubs = subcategoriesParam ? subcategoriesParam.split(',') : []

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

      const continuousUnits = ['liter', 'l', 'kg', 'm2', 'm', 'bm', 'g']
      const isContinuousUnit = product.zakladni_mj_id ? continuousUnits.some(u => product.zakladni_mj_id.toLowerCase().includes(u)) : false
      const parsedSpecMnozstvi = isContinuousUnit
        ? (parseFloat(String((product.specifikace as any)?.mnozstvi || (product.specifikace as any)?.objem_l)) || 1)
        : 1
      const actualQty = (product.mnozstvi_v_baleni || 1) * parsedSpecMnozstvi

      const isBuyingInBasicUnit = primarySourcing?.nakupni_mj_id === product.zakladni_mj_id &&
        (!primarySourcing?.prevodni_pomer_na_zakladni || primarySourcing.prevodni_pomer_na_zakladni === 1)
      const totalUnits = primarySourcing
        ? ((primarySourcing.prevodni_pomer_na_zakladni && primarySourcing.prevodni_pomer_na_zakladni !== 1)
            ? primarySourcing.prevodni_pomer_na_zakladni
            : (isBuyingInBasicUnit ? 1 : (actualQty || 1)))
        : 1

      const defaultQty = isBuyingInBasicUnit ? (actualQty || 1) : 1

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
            defaultQty,
            actualQty
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
      
      const matchesStatus = status === 'all' || p.stav_katalogu_id === status
      
      const matchesCategory = selectedCats.length === 0 || selectedCats.includes(p.kategorie_id);
      
      let matchesSubcategory = true;
      if (p.kategorie_id && selectedCats.includes(p.kategorie_id)) {
        const prodSub = getProductSubcategory(p)
        const subKey = `${p.kategorie_id}/${prodSub}`
        const hasSubsSelectedForCat = selectedSubs.some(s => s.startsWith(`${p.kategorie_id}/`))
        if (hasSubsSelectedForCat) {
          matchesSubcategory = selectedSubs.includes(subKey)
        }
      }
      
      return matchesSearch && matchesStatus && matchesCategory && matchesSubcategory
    })

    // 4. Sorting logic
    if (mode === 'matrix' && sortField !== 'name') {
      const isBasic = unitMode === 'basic'
      const getPackMultiplier = (p: any, pr: any) => {
        const primarySourcing = p.produkt_dodavatel?.find((s: any) => s.is_primary) || p.produkt_dodavatel?.[0]
        const isBuyingInBasicUnit = primarySourcing?.nakupni_mj_id === p.zakladni_mj_id &&
          (!primarySourcing?.prevodni_pomer_na_zakladni || primarySourcing.prevodni_pomer_na_zakladni === 1)
        const totalUnits = primarySourcing
          ? ((primarySourcing.prevodni_pomer_na_zakladni && primarySourcing.prevodni_pomer_na_zakladni !== 1)
              ? primarySourcing.prevodni_pomer_na_zakladni
              : (isBuyingInBasicUnit ? 1 : (p.mnozstvi_v_baleni || 1)))
          : 1
        const continuousUnits = ['liter', 'l', 'kg', 'm2', 'm', 'bm', 'g']
        const isContinuous = p.zakladni_mj_id ? continuousUnits.some(u => p.zakladni_mj_id.toLowerCase().includes(u)) : false
        return isContinuous ? totalUnits : (p.mnozstvi_v_baleni || 1)
      }

      filteredProducts.sort((a, b) => {
        const prA = a.pricing
        const prB = b.pricing
        if (!prA && !prB) return 0
        if (!prA) return 1
        if (!prB) return -1

        const multA = isBasic ? 1 : getPackMultiplier(a, prA)
        const multB = isBasic ? 1 : getPackMultiplier(b, prB)

        let valA = 0
        let valB = 0

        switch (sortField) {
          case 'purchase_price':
            valA = prA.unitPurchasePriceCzk * multA
            valB = prB.unitPurchasePriceCzk * multB
            break
          case 'shipping':
            valA = prA.unitShippingCostCzk * multA
            valB = prB.unitShippingCostCzk * multB
            break
          case 'customs':
            valA = prA.unitCustomsCostCzk * multA
            valB = prB.unitCustomsCostCzk * multB
            break
          case 'bank_fees':
            valA = prA.unitBankFeesCzk * multA
            valB = prB.unitBankFeesCzk * multB
            break
          case 'clearing':
            valA = prA.unitClearingFeesCzk * multA
            valB = prB.unitClearingFeesCzk * multB
            break
          case 'waste':
            valA = prA.unitWasteFeesCzk * multA
            valB = prB.unitWasteFeesCzk * multB
            break
          case 'packaging':
            valA = prA.unitPackagingFeesCzk * multA
            valB = prB.unitPackagingFeesCzk * multB
            break
          case 'shipping_safety':
            valA = (prA.shippingSafetyBufferCzk ? (prA.shippingSafetyBufferCzk / prA.totalUnits) : 0) * multA
            valB = (prB.shippingSafetyBufferCzk ? (prB.shippingSafetyBufferCzk / prB.totalUnits) : 0) * multB
            break
          case 'buffer':
            valA = prA.unitBufferAmount * multA
            valB = prB.unitBufferAmount * multB
            break
          case 'landed_cost':
            valA = prA.unitLandedCostWithBuffer * multA
            valB = prB.unitLandedCostWithBuffer * multB
            break
          case 'b2c':
            valA = prA.b2cUnitPrice * multA
            valB = prB.b2cUnitPrice * multB
            break
          case 'b2b':
            valA = prA.b2bUnitPrice * multA
            valB = prB.b2bUnitPrice * multB
            break
          default:
            return 0
        }

        const cmp = valA < valB ? -1 : valA > valB ? 1 : 0
        return sortDirection === 'desc' ? -cmp : cmp
      })
    } else {
      filteredProducts.sort((a, b) => {
        const valA = lang === 'en' ? (a.nazev_en || a.nazev || '') : (a.nazev || '')
        const valB = lang === 'en' ? (b.nazev_en || b.nazev || '') : (b.nazev || '')
        const cmp = valA.localeCompare(valB, lang === 'en' ? 'en' : 'cs')
        return sortDirection === 'desc' ? -cmp : cmp
      })
    }

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
    const pdfComponent = mode === 'products'
      ? createElement(ProductCatalogPDF, {
          products: filteredProducts as any,
          lang: lang as any
        })
      : (mode === 'matrix'
          ? createElement(PriceMatrixPDF, {
              products: filteredProducts as any,
              viewMode,
              unitMode,
              targetCurrency: currency,
              exchangeRate,
              lang: lang as any
            })
          : createElement(CatalogPDF, {
              products: filteredProducts as any,
              tier: tier as any,
              targetCurrency: currency as any,
              exchangeRate,
              lang: lang as any
            })
        )

    const buffer = await renderToBuffer(pdfComponent as any)

    // 7. Stream response as PDF
    const filename = mode === 'products'
      ? `AZ_Composite_Katalog_Produktu.pdf`
      : (mode === 'matrix'
          ? `AZ_Composite_Price_Matrix_${viewMode.toUpperCase()}_${unitMode}.pdf`
          : (lang === 'cs' ? `AZ_Composite_Katalog_${tier.toUpperCase()}_${currency}.pdf` : `AZ_Composite_Catalog_${tier.toUpperCase()}_${currency}.pdf`)
        )

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
