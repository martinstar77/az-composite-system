import React, { createElement } from 'react'
import { renderToBuffer } from '@react-pdf/renderer'
import { CatalogPDF } from '../src/modules/catalogs/components/CatalogPDF'

const mockProducts = [
  {
    id: '1',
    sku: 'CF-WF-96-1K-T22-P11-E',
    nazev: 'Carbon Fibre Fabric 200g/m2',
    kategorie_id: 'vyztuzne_materialy',
    c_kategorie: { nazev: 'Tkaniny (Fabrics)' },
    zakladni_mj_id: 'm2',
    c_merne_jednotky_zakladni: { nazev: 'Metr čtvereční', zkratka: 'm2' },
    mnozstvi_v_baleni: 100,
    jednotka_baleni_id: 'role',
    c_merne_jednotky_baleni: { nazev: 'Role', zkratka: 'role' },
    hmotnost_baliku_kg: 20,
    specifikace: { materiál: 'CF', typ: 'WF' },
    pricing: {
      b2cUnitPrice: 250,
      b2bUnitPrice: 200,
      b2bDiscountedPrices: { 5: 190, 10: 180, 15: 170, 20: 160 }
    }
  }
]

async function test() {
  try {
    console.log('Rendering PDF...')
    const buffer = await renderToBuffer(
      createElement(CatalogPDF, {
        products: mockProducts as any,
        tier: 'partner',
        targetCurrency: 'EUR',
        exchangeRate: 25
      }) as any
    )
    console.log('Rendered successfully! Buffer size:', buffer.length)
  } catch (err: any) {
    console.error('CRASH DETECTED:')
    console.error(err)
  }
}

test()
