import { Product } from "@/modules/products/types"
import { calculateProductPricing, PricingBreakdown } from "@/modules/finance/utils/calculations"
import { ExchangeRate, GlobalFinanceSettings, LogisticsTemplate } from "@/modules/finance/types"

export interface PricedProduct extends Product {
  pricing: PricingBreakdown | null;
}

export function getPackMultiplier(product: any, pricing: any): number {
  const primarySourcing = product.produkt_dodavatel?.find((s: any) => s.is_primary) || product.produkt_dodavatel?.[0];
  const isBuyingInBasicUnit = primarySourcing?.nakupni_mj_id === product.zakladni_mj_id &&
    (!primarySourcing?.prevodni_pomer_na_zakladni || primarySourcing.prevodni_pomer_na_zakladni === 1);
  
  const totalUnits = primarySourcing
    ? ((primarySourcing.prevodni_pomer_na_zakladni && primarySourcing.prevodni_pomer_na_zakladni !== 1)
        ? primarySourcing.prevodni_pomer_na_zakladni
        : (isBuyingInBasicUnit ? 1 : (product.mnozstvi_v_baleni || 1)))
    : 1;

  const continuousUnits = ['liter', 'l', 'kg', 'm2', 'm', 'bm', 'g'];
  const isContinuous = product.zakladni_mj_id ? continuousUnits.some((u: string) => product.zakladni_mj_id.toLowerCase().includes(u)) : false;
  
  const parsedSpecMnozstvi = isContinuous
    ? (parseFloat(String((product.specifikace as any)?.mnozstvi || (product.specifikace as any)?.objem_l)) || 1)
    : 1;

  // For continuous units, actual qty inside package might be based on spec
  return isContinuous ? (totalUnits * parsedSpecMnozstvi) : (product.mnozstvi_v_baleni || 1);
}

export function calculatePricedProducts(
  products: Product[],
  rates: ExchangeRate[],
  settings: GlobalFinanceSettings | null,
  templates: LogisticsTemplate[]
): PricedProduct[] {
  if (!settings || !rates || rates.length === 0) return products.map(p => ({ ...p, pricing: null }));

  return products.map(product => {
    const primarySourcing = product.produkt_dodavatel?.find((s: any) => s.is_primary) || product.produkt_dodavatel?.[0];
    const template = primarySourcing?.logisticka_sablona_id 
      ? templates.find(t => t.id === primarySourcing.logisticka_sablona_id)
      : null;

    const continuousUnits = ['liter', 'l', 'kg', 'm2', 'm', 'bm', 'g'];
    const isContinuousUnit = product.zakladni_mj_id ? continuousUnits.some(u => product.zakladni_mj_id.toLowerCase().includes(u)) : false;
    
    const parsedSpecMnozstvi = isContinuousUnit
      ? (parseFloat(String((product.specifikace as any)?.mnozstvi || (product.specifikace as any)?.objem_l)) || 1)
      : 1;
      
    const actualQty = (product.mnozstvi_v_baleni || 1) * parsedSpecMnozstvi;

    const isBuyingInBasicUnit = primarySourcing?.nakupni_mj_id === product.zakladni_mj_id &&
      (!primarySourcing?.prevodni_pomer_na_zakladni || primarySourcing.prevodni_pomer_na_zakladni === 1);
      
    const totalUnits = primarySourcing
      ? ((primarySourcing.prevodni_pomer_na_zakladni && primarySourcing.prevodni_pomer_na_zakladni !== 1)
          ? primarySourcing.prevodni_pomer_na_zakladni
          : (isBuyingInBasicUnit ? 1 : (actualQty || 1)))
      : 1;

    const defaultQty = isBuyingInBasicUnit ? (actualQty || 1) : 1;

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
          rates,
          settings,
          template || null,
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
      : null;

    return { ...product, pricing };
  });
}
