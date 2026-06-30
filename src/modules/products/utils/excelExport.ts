import * as XLSX from 'xlsx'
import { saveAs } from 'file-saver'
import { Product } from '@/modules/products/types'
import { PricingBreakdown } from '@/modules/finance/utils/calculations'

interface PricedProduct extends Product {
  pricing: PricingBreakdown | null
}

import { translateCategory, translateUnit } from './catalogHelpers'
export function exportCatalogToExcel(
  products: PricedProduct[],
  tier: "retail" | "partner" | "partner_5" | "partner_10" | "partner_15" | "partner_20",
  targetCurrency: "CZK" | "EUR" | "USD",
  exchangeRate: number,
  lang: 'cs' | 'en' = 'cs'
) {
  const isCs = lang === 'cs';
  
  // Připravíme data pro Excel řádek po řádku
  const data = products.map(p => {
    const pr = p.pricing
    let price = 0
    if (pr) {
      if (tier === 'retail') price = pr.b2cUnitPrice
      else if (tier === 'partner') price = pr.b2bUnitPrice
      else if (tier === 'partner_5') price = pr.b2bDiscountedPrices[5]
      else if (tier === 'partner_10') price = pr.b2bDiscountedPrices[10]
      else if (tier === 'partner_15') price = pr.b2bDiscountedPrices[15]
      else if (tier === 'partner_20') price = pr.b2bDiscountedPrices[20]
      
      // Ceny v DB jsou vždy v CZK, pokud zákazník chce EUR, vydělíme to kurzem
      if (targetCurrency !== 'CZK') {
        price = price / exchangeRate
      }
    }

    const qtyInPack = p.mnozstvi_v_baleni || 1
    const rawUnitAbbr = p.c_merne_jednotky_zakladni?.zkratka || ''
    const rawPackAbbr = p.c_merne_jednotky_baleni?.zkratka || 'bal.'
    
    const unitAbbr = translateUnit(rawUnitAbbr, lang)
    const packAbbr = translateUnit(rawPackAbbr, lang)
    
    const onRequestText = isCs ? 'Na dotaz' : 'On request';
    const categoryName = translateCategory(p.kategorie_id, p.c_kategorie?.nazev || '', lang);
    const productName = isCs ? p.nazev : (p.nazev_en || p.nazev);

    if (isCs) {
      return {
        'Kategorie': categoryName,
        'Číslo produktu': p.sku,
        'Název': productName,
        'Cena za jednotku': price > 0 ? `${price.toFixed(2)} ${targetCurrency} / ${unitAbbr}` : onRequestText,
        'Počet jednotek': `${qtyInPack} ${unitAbbr}`,
        'Celková cena': price > 0 ? `${(price * qtyInPack).toFixed(2)} ${targetCurrency}` : onRequestText,
        'Velikost balení': `1 ${packAbbr}`
      }
    } else {
      return {
        'Category': categoryName,
        'Product Code': p.sku,
        'Product Name': productName,
        'Unit Price': price > 0 ? `${price.toFixed(2)} ${targetCurrency} / ${unitAbbr}` : onRequestText,
        'Pack Quantity': `${qtyInPack} ${unitAbbr}`,
        'Pack Price': price > 0 ? `${(price * qtyInPack).toFixed(2)} ${targetCurrency}` : onRequestText,
        'Packaging Unit': `1 ${packAbbr}`
      }
    }
  })

  // Vytvoření sešitu a listu
  const worksheet = XLSX.utils.json_to_sheet(data)
  const workbook = XLSX.utils.book_new()
  const sheetName = isCs ? "AZ-Composites Ceník" : "AZ-Composites Pricelist"
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)
  
  // Rozšíření šířky sloupců pro lepší čitelnost
  const colWidths = [
    { wch: 20 }, // Kategorie / Category
    { wch: 20 }, // Číslo produktu / Product Code
    { wch: 45 }, // Název / Product Name
    { wch: 25 }, // Cena za jednotku / Unit Price
    { wch: 18 }, // Počet jednotek / Pack Quantity
    { wch: 22 }, // Celková cena / Pack Price
    { wch: 18 }, // Velikost balení / Packaging Unit
  ];
  worksheet['!cols'] = colWidths;

  // Vygenerování a stažení souboru
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
  const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8' })
  
  const filePrefix = isCs ? 'AZ_Composites_Cenik' : 'AZ_Composites_Pricelist'
  saveAs(blob, `${filePrefix}_${tier.toUpperCase()}_${targetCurrency}.xlsx`)
}
