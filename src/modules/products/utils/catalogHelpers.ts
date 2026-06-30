import { Product } from "@/modules/products/types"

export function getProductSubcategory(p: Product): string {
  const catId = p.kategorie_id
  if (catId === 'vyztuzne_materialy') {
    return (p.specifikace as any)?.materiál || (p.specifikace as any)?.material || 'OF'
  }
  if (catId === 'consumables') {
    return (p.specifikace as any)?.podkategorie || 'Ostatní'
  }
  if (catId === 'naradi') {
    return (p.specifikace as any)?.podkategorie || 'Ostatní'
  }
  if (catId === 'brouseni_a_lesteni') {
    return (p.specifikace as any)?.podkategorie || 'ostatni'
  }
  if (catId === 'chemie') {
    return (p.specifikace as any)?.podkategorie || 'ostatni'
  }
  if (catId === 'spotrebni_chemie') {
    return (p.specifikace as any)?.podkategorie || 'standard'
  }
  return '_default'
}

export const CATEGORY_TO_SUBCATS: Record<string, string[]> = {
  vyztuzne_materialy: ["CF", "GF", "AF", "BIOF", "BIOH", "PAN", "PET", "HF", "OF"],
  consumables: ["BF", "RF", "PP", "PP-PTFE", "BC", "ST", "FT", "FM", "FCH", "K", "TUBE", "MTI", "KP", "Ostatní"],
  naradi: ["BU", "QR", "SQ", "V", "CU", "SU"],
  brouseni_a_lesteni: ["vosk", "pasty", "brusne_kotouce", "prislusenstvi", "ostatni"],
  chemie: ["lepidlo_ve_spreji", "blinder", "plnic_poru_sealer", "separatory_release_agent", "ostatni"],
  spotrebni_chemie: ["pmp", "standard"]
}

export const SUBCATEGORY_NAMES_CS: Record<string, string> = {
  // vyztuzne_materialy
  CF: "Uhlíková vlákna (Carbon)",
  GF: "Skleněná vlákna (Glass)",
  AF: "Aramidová vlákna (Aramid)",
  BIOF: "Lněná vlákna (Bio Flax)",
  BIOH: "Konopná vlákna (Bio Hemp)",
  PAN: "Polyakrylonitrilová vlákna (PAN)",
  PET: "Polyesterová vlákna (PET)",
  HF: "Hybridní materiály",
  OF: "Ostatní výztuže",
  
  // consumables
  BF: "Vakuové fólie (Bagging Film)",
  RF: "Separační fólie (Release Film)",
  PP: "Strhávací tkaniny (Peel Ply)",
  "PP-PTFE": "Teflonové strhávací tkaniny (PTFE Peel Ply)",
  BC: "Odsávací netkané textilie (Breather / Bleeder)",
  ST: "Těsnicí pásky (Sealant Tape)",
  FT: "Lepicí pásky (Flash Tape)",
  FM: "Distribuční síťky (Flow Mesh)",
  FCH: "Distribuční kanálky (Flow Channel)",
  K: "Vakuové konektory a příslušenství",
  TUBE: "Hadice (Hoses)",
  MTI: "MTI systémy (MTI Systems)",
  KP: "Průchodné konektory (Through Connectors)",
  Ostatní: "Ostatní spotřební materiál",
  
  // naradi
  BU: "Vakuové průchodky (Hose Connectors)",
  QR: "Rychlospojky (Quick Releases)",
  SQ: "Škrtící svorky (Hose Clamps)",
  V: "Vakuometry (Vacuum Gauges)",
  CU: "Mycí stanice RST5",
  SU: "Spinner units Spin RST5",
  
  // brouseni_a_lesteni
  vosk: "Vosky a ochrana",
  pasty: "Brusné a lešticí pasty",
  brusne_kotouce: "Brusné a lešticí kotouče",
  prislusenstvi: "Příslušenství",
  ostatni: "Ostatní broušení a leštění",
  
  // chemie
  lepidlo_ve_spreji: "Lepidla ve spreji",
  blinder: "Bindery",
  plnic_poru_sealer: "Plniče pórů (Sealer)",
  separatory_release_agent: "Separátory (Release Agent)",
  
  // spotrebni_chemie
  pmp: "PMP tekuté čističe",
  standard: "Čisticí prostředky"
}

export function translateCategory(id: string, name: string, lang: 'cs' | 'en'): string {
  if (lang === 'cs') {
    const csMap: Record<string, string> = {
      vyztuzne_materialy: "Výztužné materiály",
      prepregy: "Prepregy",
      pryskyrice: "Pryskyřice a Gelcoaty",
      brouseni_a_lesteni: "Broušení a leštění",
      lepidla: "Lepidla",
      spotrebni_chemie: "Spotřební chemie a čističe",
      cores_standard: "Jádrové materiály",
      cores_active: "Active Core Technology",
      consumables: "Spotřební materiál",
      naradi: "Nářadí",
      chemie: "Chemie"
    };
    return csMap[id] || name;
  } else {
    const enMap: Record<string, string> = {
      vyztuzne_materialy: "Reinforcement Materials",
      prepregy: "Prepregs",
      pryskyrice: "Resins and Gelcoats",
      brouseni_a_lesteni: "Sanding and Polishing",
      lepidla: "Adhesives",
      spotrebni_chemie: "Consumable Chemicals & Cleaners",
      cores_standard: "Core Materials",
      cores_active: "Active Core Technology",
      consumables: "Consumables",
      naradi: "Tools",
      chemie: "Chemicals"
    };
    return enMap[id] || name;
  }
}

export function translateUnit(abbr: string, lang: 'cs' | 'en'): string {
  if (lang === 'cs') return abbr;
  const unitMap: Record<string, string> = {
    'ks': 'pcs',
    'bm': 'm',
    'm2': 'm²',
    'kg': 'kg',
    'l': 'l',
    'bal.': 'pack',
    'bal': 'pack'
  };
  return unitMap[abbr.toLowerCase()] || abbr;
}

export const formatCurrency = (val: number | undefined | null, currency: string = "CZK") => {
  if (val === undefined || val === null || isNaN(val)) return "—"
  return new Intl.NumberFormat('cs-CZ', { style: 'currency', currency }).format(val)
}

export const formatPercent = (val: number | undefined | null) => {
  if (val === undefined || val === null || isNaN(val)) return "—"
  return new Intl.NumberFormat('cs-CZ', { style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(val / 100)
}
