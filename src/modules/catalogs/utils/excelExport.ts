import * as XLSX from 'xlsx'
import { saveAs } from 'file-saver'
import { Product } from '@/modules/products/types'
import { PricingBreakdown } from '@/modules/finance/utils/calculations'

interface PricedProduct extends Product {
  pricing: PricingBreakdown | null
}

export function exportCatalogToExcel(
  products: PricedProduct[],
  tier: "retail" | "partner" | "vip" | "premarket_open",
  targetCurrency: "CZK" | "EUR" | "USD",
  exchangeRate: number
) {
  // Připravíme data pro Excel řádek po řádku
  const data = products.map(p => {
    const pr = p.pricing
    let price = 0
    if (pr) {
      if (tier === 'retail') price = pr.retailUnitPrice
      else if (tier === 'partner') price = pr.partnerUnitPrice
      else if (tier === 'vip') price = pr.vipUnitPrice
      else if (tier === 'premarket_open') price = pr.premarketOpenUnitPrice
      
      // Ceny v DB jsou vždy v CZK, pokud zákazník chce EUR, vydělíme to kurzem
      if (targetCurrency !== 'CZK') {
        price = price / exchangeRate
      }
    }

    return {
      'Kategorie': p.c_kategorie?.nazev || '',
      'SKU': p.sku,
      'Název produktu': p.nazev,
      'Měrná jednotka (MJ)': p.c_merne_jednotky_zakladni?.zkratka || '',
      'Dostupné balení': p.mnozstvi_v_baleni ? `${p.mnozstvi_v_baleni} ${p.c_merne_jednotky_baleni?.zkratka || ''}` : '',
      'Minimální odběr (MOQ)': p.produkt_dodavatel?.find(s => s.is_primary)?.moq || '1',
      [`Prodejní Cena za 1 MJ (${targetCurrency})`]: pr ? Number(price.toFixed(2)) : 'Na dotaz',
    }
  })

  // Vytvoření sešitu a listu
  const worksheet = XLSX.utils.json_to_sheet(data)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, "AZ-Composites Ceník")
  
  // Rozšíření šířky sloupců pro lepší čitelnost
  const colWidths = [
    { wch: 25 }, // Kategorie
    { wch: 25 }, // SKU
    { wch: 50 }, // Nazev
    { wch: 15 }, // MJ
    { wch: 20 }, // Baleni
    { wch: 25 }, // MOQ
    { wch: 25 }, // Cena
  ];
  worksheet['!cols'] = colWidths;

  // Vygenerování a stažení souboru
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
  const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8' })
  
  saveAs(blob, `AZ_Composites_Cenik_${tier.toUpperCase()}_${targetCurrency}.xlsx`)
}
