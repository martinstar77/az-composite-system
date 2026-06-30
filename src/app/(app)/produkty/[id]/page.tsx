export const dynamic = 'force-dynamic'

import { getProduct, getUnits } from '@/modules/products/actions'
import { getProductSourcing, getSuppliers } from '@/modules/sourcing/actions'
import { getLatestRates, getGlobalFinanceSettings, getLogisticsTemplates } from '@/modules/finance/actions'
import { getProductFiles, getDocumentTypes } from '@/modules/products/actions/assets'
import { ProductSourcingTab } from '@/modules/sourcing/components/ProductSourcingTab'
import { ProductPricingTab } from '@/modules/products/components/ProductPricingTab'
import { ProductDocumentsTab } from '@/modules/products/components/ProductDocumentsTab'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs"
import { Badge } from "@/shared/components/ui/badge"
import { 
  ChevronLeft, 
  Package, 
  Truck, 
  DollarSign, 
  Users, 
  FileText,
  Scale,
  Thermometer,
  ShieldAlert,
  Clock,
  User,
  ShoppingCart,
  Calendar,
  AlertCircle,
  Settings,
  Archive,
  BarChart3,
  BookOpen
} from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"
import { resolvePackageDimensions } from "@/modules/finance/utils/packagingEngine"

export default async function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  
  const [
    { data: product, error: productError },
    { data: sourcing, error: sourcingError },
    { data: suppliers },
    { data: rates },
    { data: settings },
    { data: templates },
    { data: units },
    { data: files },
    { data: docTypes }
  ] = await Promise.all([
    getProduct(id),
    getProductSourcing(id),
    getSuppliers(),
    getLatestRates(),
    getGlobalFinanceSettings(),
    getLogisticsTemplates(),
    getUnits(),
    getProductFiles(id),
    getDocumentTypes()
  ])

  if (productError || !product) {
    notFound()
  }

  if (!settings) {
    return (
      <div className="p-8 text-center bg-red-500/10 border border-red-500/20 rounded-xl text-red-500">
        Chyba: Finanční nastavení nebylo nalezeno. Prosím nastavte globální parametry v sekci Finance.
      </div>
    )
  }

  const OBAL_TYPES: Record<string, string> = {
    role: "Role (Válec)",
    krabice_standard: "Standardní krabice",
    krabice_dlouha: "Dlouhá krabice",
    krabice_volna: "Custom rozměry",
    paleta: "Paleta",
    sacek: "Sáček / Malý karton",
  }

  const calculatedDims = resolvePackageDimensions(
    product.hmotnost_baliku_kg || 0,
    product.c_balici_profily as any || null,
    {
      delka: product.balik_delka_cm_override,
      sirka: product.balik_sirka_cm_override,
      vyska: product.balik_vyska_cm_override
    }
  )

  const formatDate = (isoString: string) => {
    if (!isoString) return '—'
    const d = new Date(isoString)
    return d.toLocaleString('cs-CZ', {
      day: 'numeric',
      month: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Parse specifications into readable items
  const formattedSpecs: { label: string; value: string }[] = []
  if (product.specifikace && typeof product.specifikace === 'object') {
    const keyMap: Record<string, string> = {
      typ: 'Typ materiálu',
      material: 'Materiál',
      materiál: 'Materiál',
      materiál_složení: 'Složení materiálu',
      gramaz: 'Gramáž',
      gramáž: 'Gramáž',
      gramaz_gm2: 'Gramáž',
      vlakno: 'Vlákno',
      vlákno: 'Vlákno',
      vlákno1: 'Vlákno 1 (Osnova)',
      vlákno2: 'Vlákno 2 (Útek)',
      vlákna_složení: 'Složení vláken',
      vazba: 'Vazba / Fixace / Orientace',
      pouziti: 'Použití',
      použití: 'Použití',
      vyrobce_vlakna: 'Výrobce vlákna',
      výrobce_vlákna: 'Výrobce vlákna',
      výrobci_složení: 'Složení výrobců vláken',
      kod_vlakna: 'Kód vlákna',
      kód_vlákna: 'Kód vlákna',
      kod_vlakna1: 'Kód vlákna 1',
      kod_vlakna2: 'Kód vlákna 2',
      kódy_vláken_složení: 'Složení kódů vláken',
      sirka_cm: 'Šířka',
      sirka_mm: 'Šířka',
      delka_m: 'Délka role',
      delka_bm: 'Délka role',
      typ_baleni: 'Typ balení',
      pocet_kusu: 'Počet kusů v balení',
      podkategorie: 'Podkategorie',
      format: 'Formát',
      tloustka_um: 'Tloušťka',
      tloustka_mm: 'Tloušťka',
      teplotni_odolnost: 'Teplotní odolnost',
      teplotni_odolnost_c: 'Teplotní odolnost',
      vhodne_do_autoklavu: 'Vhodné do autoklávu',
      perforace: 'Perforace',
      polymer: 'Polymer',
      je_teflon: 'Teflonový produkt',
      je_lepici: 'Samolepicí úprava',
      typ_vyroby: 'Typ výroby',
      barva: 'Barva',
      rychlost_proudeni: 'Rychlost proudění',
      flexibilita: 'Flexibilita',
      vnitrni_prumer_mm: 'Vnitřní průměr',
      prumer_mm: 'Průměr',
      identifikator: 'Interní identifikátor',
      open_time_min: 'Doba zpracovatelnosti',
      objem: 'Objem / Množství',
      chemie: 'Chemie',
      typ_mti: 'Typ MTI',
      technologie: 'Technologie výroby',
      cas_vytvrzeni: 'Čas vytvrzení',
      mnozstvi: 'Množství',
      značka: 'Značka',
      objem_l: 'Objem'
    }

    const formatVal = (v: any): string => {
      if (Array.isArray(v)) {
        return v.join(' / ')
      }
      return String(v)
    }

    for (const [key, val] of Object.entries(product.specifikace)) {
      if (val === null || val === undefined || val === '') continue
      const label = keyMap[key] || (key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' '))
      let formattedValue = formatVal(val)
      
      if (['gramaz', 'gramáž', 'gramaz_gm2'].includes(key)) {
        formattedValue = `${formattedValue} g/m²`
      } else if (['sirka_cm'].includes(key)) {
        formattedValue = `${formattedValue} cm`
      } else if (['sirka_mm', 'tloustka_mm', 'vnitrni_prumer_mm', 'prumer_mm'].includes(key)) {
        formattedValue = `${formattedValue} mm`
      } else if (['delka_m', 'delka_bm'].includes(key)) {
        formattedValue = `${formattedValue} m`
      } else if (['tloustka_um'].includes(key)) {
        formattedValue = `${formattedValue} µm`
      } else if (['teplotni_odolnost_c'].includes(key)) {
        formattedValue = `${formattedValue} °C`
      } else if (['open_time_min'].includes(key)) {
        formattedValue = `${formattedValue} min`
      } else if (['objem_l'].includes(key)) {
        formattedValue = `${formattedValue} l`
      } else if (['vlakno', 'vlákno', 'vlákno1', 'vlákno2'].includes(key) && formattedValue.endsWith('t')) {
        formattedValue = formattedValue.replace(/t$/, ' dtex')
      } else if (key === 'teplotni_odolnost' && (formattedValue === 'LT' || formattedValue === 'HT' || formattedValue === 'MT')) {
        const tempClassMap: Record<string, string> = { HT: 'HT (Vysokoteplotní)', MT: 'MT (Středněteplotní)', LT: 'LT (Nízkoteplotní)' }
        formattedValue = tempClassMap[formattedValue] || formattedValue
      } else if (key === 'teplotni_odolnost' && (formattedValue.startsWith('LT') || formattedValue.startsWith('HT') || formattedValue.startsWith('MT'))) {
        const tempNum = formattedValue.replace(/^[A-Z]+/, '')
        const prefix = formattedValue.startsWith('HT') ? 'HT' : formattedValue.startsWith('MT') ? 'MT' : 'LT'
        formattedValue = `${prefix} (${tempNum} °C)`
      } else if (key === 'je_teflon' || key === 'je_lepici' || key === 'vhodne_do_autoklavu') {
        formattedValue = val === true ? 'Ano' : 'Ne'
      } else if (key === 'flexibilita') {
        const flexMap: Record<string, string> = {
          velka: 'Velká',
          mala: 'Malá',
          zadna: 'Žádná',
          true: 'Ano (Velká)',
          false: 'Ne (Žádná)'
        }
        formattedValue = flexMap[String(val)] || String(val)
      } else if (key === 'rychlost_proudeni') {
        const speedMap: Record<string, string> = {
          low: 'Nízká (Low)',
          medium: 'Střední (Medium)',
          high: 'Vysoká (High)'
        }
        formattedValue = speedMap[String(val)] || String(val)
      } else if (key === 'pouziti' || key === 'použití') {
        const useMap: Record<string, string> = { E: 'Economy (E)', V: 'Visual (V)', I: 'Industry (I)', NA: 'N/A' }
        formattedValue = useMap[formattedValue] || formattedValue
      } else if (key === 'typ_baleni') {
        const packMap: Record<string, string> = { role: 'Role', krabice: 'Krabice (skládané přířezy)', metraz: 'Stříhaná metráž' }
        formattedValue = packMap[formattedValue] || formattedValue
      } else if (key === 'barva' && ['black', 'grey', 'white', 'clear', 'off-white'].includes(formattedValue)) {
        const colorCzechMap: Record<string, string> = {
          black: 'Černá',
          grey: 'Šedá',
          white: 'Bílá',
          clear: 'Čirá',
          'off-white': 'Krémová (off-white)'
        }
        formattedValue = colorCzechMap[formattedValue] || formattedValue
      } else if (key === 'chemie') {
        const chemCzechMap: Record<string, string> = {
          EP: 'Epoxid (EP)',
          PU: 'Polyuretan (PU)',
          MMA: 'Akrylát (MMA)',
          VE: 'Vinylester (VE)',
          PE: 'Polyester (PE)'
        }
        formattedValue = chemCzechMap[formattedValue] || formattedValue
      } else if (key === 'typ') {
        const typeMap: Record<string, string> = {
          RES: 'Resin (Pryskyřice)',
          HRD: 'Hardener (Tužidlo)',
          GEL: 'Gelcoat',
          COP: 'Coupling coat',
          FIL: 'Filler (Tmel)',
          PLUG: 'Vsuvka',
          SOCKET: 'Rychlospojka - samice',
          WIP: 'Ubrousky (Wipes)',
          CON: 'Koncentrát (Concentrate)',
          SPR: 'Sprej (Spray)'
        }
        formattedValue = typeMap[formattedValue] || formattedValue
      } else if (key === 'mnozstvi') {
        const unitMap: Record<string, string> = {
          WIP: 'ks',
          CON: 'l',
          SPR: 'ml'
        }
        const unit = unitMap[product.specifikace?.typ] || ''
        formattedValue = unit ? `${formattedValue} ${unit}` : formattedValue
      } else if (key === 'technologie') {
        const techMap: Record<string, string> = {
          INF: 'Infuze (Infusion)',
          WL: 'Ruční laminace (Wet layup)'
        }
        formattedValue = techMap[formattedValue] || formattedValue
      } else if (key === 'pouziti') {
        const useMap: Record<string, string> = {
          FOR: 'Formy (Molds)',
          DIL: 'Díly (Parts)'
        }
        formattedValue = useMap[formattedValue] || formattedValue
      } else if (key === 'podkategorie') {
        const subcatMap: Record<string, string> = {
          BF: 'Vakuová fólie (BF)',
          RF: 'Separační fólie (RF)',
          PP: 'Strhávací tkanina (PP)',
          'PP-PTFE': 'Teflonová strhávací tkanina (PP-PTFE)',
          BC: 'Odsávací netkaná textilie (BC)',
          ST: 'Těsnící páska (ST)',
          FT: 'Flash tape páska (FT)',
          FM: 'Distribuční síťka (FM)',
          FCH: 'Distribuční kanálek (FCH)',
          TUBE: 'Hadice (TUBE)',
          K: 'Konektory a fitinky (K)',
          MTI: 'MTI',
          KP: 'Konektor průchodný (KP)',
          CU: 'Mycí stanice (CU)',
          SU: 'Spinner unit (SU)'
        }
        formattedValue = subcatMap[formattedValue] || formattedValue
      } else if (key === 'tvar') {
        const tvarMap: Record<string, string> = {
          T: 'T-spojka / T-kus',
          I: 'I-spojka / Rovná',
          U: 'I-spojka / Rovná',
          L: 'L-spojka / Koleno',
          O: 'Kruhová'
        }
        formattedValue = tvarMap[formattedValue] || formattedValue
      } else if (key === 'perforace') {
        const perfMap: Record<string, string> = {
          NP: 'Neperforovaná (NP)',
          P3: 'Perforace P3 (P3)',
          P6: 'Perforace P6 (P6)',
          P16: 'Perforace P16 (P16)',
          P31: 'Perforace P31 (P31)'
        }
        formattedValue = perfMap[formattedValue] || formattedValue
      } else if (key === 'vazba') {
        const weaveCzechMap: Record<string, string> = {
          P: 'P (Plain / Plátno)',
          T22: 'T22 (Twill / Kepr 2/2)',
          T44: 'T44 (Twill / Kepr 4/4)',
          NP: 'NP (Needle punched / Vpichovaná)',
          EM: 'EM (Emulsion / Emulzní)',
          PB: 'PB (Powder binder / Prášková)',
          ST: 'ST (Stitched / Prošívaná)',
          '090': '0/90°',
          '45': '±45°',
          NA: 'N/A'
        }
        formattedValue = weaveCzechMap[formattedValue] || weaveCzechMap[formattedValue.toUpperCase()] || formattedValue
      }

      formattedSpecs.push({ label, value: formattedValue })
    }
  }

  return (
    <div className="w-full max-w-6xl mx-auto space-y-8 pb-20">
      {/* Navigation & Header */}
      <div className="space-y-4">
        <Link href="/produkty" className="flex items-center gap-1 text-sm text-zinc-500 hover:text-primary transition-colors group">
          <ChevronLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
          Zpět do katalogu
        </Link>
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h1 className="text-4xl font-bold tracking-tight text-white">{product.nazev}</h1>
              <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">
                {product.kategorie_id === 'spotrebni_chemie' ? 'Čističe' : product.c_kategorie?.nazev}
              </Badge>
            </div>
            <p className="text-xl font-mono text-zinc-500 uppercase tracking-widest">{product.sku}</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-right">
              <p className="text-[10px] uppercase text-zinc-500 font-bold">Stav katalogu</p>
              <p className="text-sm font-semibold">{product.c_stavy_produktu?.nazev}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Tabs Area */}
      <Tabs defaultValue="sourcing" className="w-full">
        <TabsList className="bg-zinc-900 border border-zinc-800 p-1 mb-8">
          <TabsTrigger value="info" className="gap-2 data-[state=active]:bg-zinc-800">
            <Package className="h-4 w-4" /> Základní údaje
          </TabsTrigger>
          <TabsTrigger value="sourcing" className="gap-2 data-[state=active]:bg-zinc-800">
            <Users className="h-4 w-4" /> Sourcing & Nákup
          </TabsTrigger>
          <TabsTrigger value="pricing" className="gap-2 data-[state=active]:bg-zinc-800">
            <DollarSign className="h-4 w-4" /> Kalkulace ceny (Pricing)
          </TabsTrigger>
          <TabsTrigger value="inventory" className="gap-2 data-[state=active]:bg-zinc-800">
            <Truck className="h-4 w-4" /> Skladové šarže
          </TabsTrigger>
          <TabsTrigger value="documents" className="gap-2 data-[state=active]:bg-zinc-800">
            <FileText className="h-4 w-4" /> Dokumenty a soubory
          </TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Left Column: Logistics, Storage & Stock */}
            <div className="space-y-6">
              
              {/* Card 1: Logistické parametry */}
              <div className="p-6 bg-zinc-900/40 border border-zinc-800 rounded-xl space-y-4 shadow-xl backdrop-blur-sm">
                <div className="flex items-center gap-2 border-b border-zinc-800 pb-3">
                  <Package className="h-5 w-5 text-primary" />
                  <h3 className="text-lg font-bold text-zinc-100">Logistické parametry</h3>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-5 text-sm">
                  <div>
                    <p className="text-[10px] uppercase text-zinc-500 font-bold tracking-wider">Základní jednotka</p>
                    <p className="font-semibold text-zinc-200 mt-0.5">{product.c_merne_jednotky_zakladni?.nazev || '—'} ({product.c_merne_jednotky_zakladni?.zkratka || '—'})</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase text-zinc-500 font-bold tracking-wider">Hmotnost balíku</p>
                    <p className="font-semibold text-zinc-200 mt-0.5">{product.hmotnost_baliku_kg != null ? `${product.hmotnost_baliku_kg} kg` : '—'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase text-zinc-500 font-bold tracking-wider">Množství v balení</p>
                    <p className="font-semibold text-zinc-200 mt-0.5">
                      {product.mnozstvi_v_baleni != null ? `${product.mnozstvi_v_baleni} ${product.c_merne_jednotky_zakladni?.zkratka || ''}` : '—'}
                      {(() => {
                        const qty = product.mnozstvi_v_baleni || 0
                        const specs = (product.specifikace as any) || {}
                        const podkat = specs.podkategorie
                        const uom = product.c_merne_jednotky_baleni?.zkratka || ''
                        
                        if (qty > 0 && uom) {
                          if (product.kategorie_id === "vyztuzne_materialy" || product.kategorie_id === "prepregy") {
                            const sirka_cm = Number(specs.sirka_cm ?? 0)
                            const delka_m = Number(specs.delka_m ?? 0)
                            const rollArea = (sirka_cm / 100) * delka_m
                            if (rollArea > 0) {
                              const numRolls = qty / rollArea
                              return ` (= ${numRolls.toFixed(2).replace(/\.00$/, "")} ${uom})`
                            }
                          }
                          if (podkat === "FCH" || podkat === "TUBE") {
                            const rollLen = Number(specs.delka_m ?? 0)
                            if (rollLen > 0) {
                              const numRolls = qty / rollLen
                              return ` (= ${numRolls.toFixed(2).replace(/\.00$/, "")} ${uom})`
                            }
                          }
                        }
                        return null
                      })()}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase text-zinc-500 font-bold tracking-wider">Skladovací podmínky</p>
                    <p className="font-semibold text-zinc-200 mt-0.5">
                      {product.def_typ_skladovani === "lednice" ? "Lednice (Chlazené)" : 
                       product.def_typ_skladovani === "mrazak" ? "Mrazák (Mražené -18°C)" : "Standardní sklad"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase text-zinc-500 font-bold tracking-wider">Trvanlivost (Shelf Life)</p>
                    <p className="font-semibold text-zinc-200 mt-0.5">
                      {product.shelf_life_mesice ? `${product.shelf_life_mesice} měsíců` : "Neomezená"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase text-zinc-500 font-bold tracking-wider">Typ štítku (Label)</p>
                    <p className="font-semibold text-zinc-200 mt-0.5">{product.c_typy_labelu?.nazev || 'Standardní'}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-[10px] uppercase text-zinc-500 font-bold tracking-wider">Proces odeslání ze skladu</p>
                    <p className="font-semibold text-zinc-200 mt-0.5">{product.c_procesy_odeslani?.nazev || '—'}</p>
                  </div>
                </div>
              </div>

              {/* Card 2: Skladové zásoby & Limity */}
              <div className="p-6 bg-zinc-900/40 border border-zinc-800 rounded-xl space-y-4 shadow-xl backdrop-blur-sm">
                <div className="flex items-center gap-2 border-b border-zinc-800 pb-3">
                  <BarChart3 className="h-5 w-5 text-indigo-500" />
                  <h3 className="text-lg font-bold text-zinc-100">Skladové zásoby & Limity</h3>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="p-3 bg-zinc-950/40 border border-zinc-850 rounded-lg">
                    <p className="text-[10px] uppercase text-zinc-500 font-bold tracking-wider">Minimální zásoba</p>
                    <p className="text-xl font-bold text-red-400 mt-1">
                      {product.min_skladova_zasoba ?? 0} <span className="text-xs font-normal text-zinc-400">{product.c_merne_jednotky_zakladni?.zkratka}</span>
                    </p>
                  </div>
                  <div className="p-3 bg-zinc-950/40 border border-zinc-850 rounded-lg">
                    <p className="text-[10px] uppercase text-zinc-500 font-bold tracking-wider">Optimální zásoba</p>
                    <p className="text-xl font-bold text-emerald-400 mt-1">
                      {product.opt_skladova_zasoba ?? 0} <span className="text-xs font-normal text-zinc-400">{product.c_merne_jednotky_zakladni?.zkratka}</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Card 4: Poznámka k produktu */}
              {product.poznamka && (
                <div className="p-6 bg-zinc-900/40 border border-zinc-800 rounded-xl space-y-3 shadow-xl backdrop-blur-sm border-l-4 border-l-primary">
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-primary" />
                    <h4 className="text-xs uppercase text-zinc-400 font-bold tracking-wider">Interní poznámka</h4>
                  </div>
                  <p className="text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed">{product.poznamka}</p>
                </div>
              )}
            </div>

            {/* Right Column: Specifications & Shipping Engine */}
            <div className="space-y-6">
              
              {/* Card 5: Technické specifikace */}
              <div className="p-6 bg-zinc-900/40 border border-zinc-800 rounded-xl space-y-4 shadow-xl backdrop-blur-sm h-fit">
                <div className="flex items-center gap-2 border-b border-zinc-800 pb-3">
                  <Settings className="h-5 w-5 text-primary" />
                  <h3 className="text-lg font-bold text-zinc-100">Technické specifikace</h3>
                </div>
                
                {formattedSpecs.length > 0 ? (
                  <div className="border border-zinc-800 rounded-lg overflow-hidden bg-zinc-950/20">
                    <table className="w-full text-sm text-left">
                      <tbody>
                        {formattedSpecs.map((spec, i) => (
                          <tr key={i} className="border-b border-zinc-850 last:border-0 hover:bg-zinc-900/20 transition-colors">
                            <td className="px-4 py-3 text-xs text-zinc-500 font-bold uppercase tracking-wider w-5/12">{spec.label}</td>
                            <td className="px-4 py-3 text-zinc-200 font-semibold">{spec.value}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-sm text-zinc-500 italic p-4 text-center border border-dashed border-zinc-800 rounded-lg">
                    Tento produkt nemá žádné uložené technické specifikace.
                  </p>
                )}

                {/* Collapsible raw JSON */}
                {product.specifikace && Object.keys(product.specifikace).length > 0 && (
                  <div className="pt-2">
                    <details className="group border border-zinc-800 rounded-lg overflow-hidden bg-zinc-950/40">
                      <summary className="flex justify-between items-center p-3 text-xs text-zinc-500 font-medium cursor-pointer hover:bg-zinc-900/30 select-none">
                        <span>Zobrazit surová JSON data specifikací</span>
                        <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400 group-open:hidden">Zobrazit</span>
                        <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400 hidden group-open:inline">Skrýt</span>
                      </summary>
                      <div className="p-4 border-t border-zinc-850 overflow-auto max-h-60 font-mono text-xs text-primary/80">
                        <pre>{JSON.stringify(product.specifikace, null, 2)}</pre>
                      </div>
                    </details>
                  </div>
                )}
              </div>

              {/* Card 6: Expedice a rozměry balíku */}
              <div className="p-6 bg-zinc-900/40 border border-zinc-800 rounded-xl space-y-4 shadow-xl backdrop-blur-sm">
                <div className="flex items-center gap-2 border-b border-zinc-800 pb-3">
                  <Truck className="h-5 w-5 text-sky-500" />
                  <h3 className="text-lg font-bold text-zinc-100">Expedice a balení</h3>
                </div>
                
                <div className="space-y-4 text-sm">
                  {/* Calculated Package Dimensions */}
                  {((calculatedDims.delka_cm > 0) || (calculatedDims.sirka_cm > 0) || (calculatedDims.vyska_cm > 0)) && (
                    <div className="p-4 bg-zinc-950/40 border border-zinc-850 rounded-lg space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] uppercase text-zinc-500 font-bold tracking-wider">Vypočtené rozměry zásilky</span>
                        <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-primary/5 text-primary border-primary/20">
                          {calculatedDims.resolvedBy === 'override' ? 'Manuální Override' :
                           calculatedDims.resolvedBy === 'profile_fixed' ? 'Fixní z profilu' :
                           calculatedDims.resolvedBy === 'profile_roll_calc' ? 'Kalkulace role' :
                           calculatedDims.resolvedBy === 'profile_box_lookup' ? 'Hmotnostní lookup' : 'Výchozí rozměry'}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-2 text-center py-1">
                        <div className="bg-zinc-900/60 p-2 rounded border border-zinc-850">
                          <span className="block text-[9px] text-zinc-500 uppercase">Délka</span>
                          <span className="text-sm font-semibold font-mono text-zinc-200">{calculatedDims.delka_cm} cm</span>
                        </div>
                        <div className="bg-zinc-900/60 p-2 rounded border border-zinc-850">
                          <span className="block text-[9px] text-zinc-500 uppercase">Šířka</span>
                          <span className="text-sm font-semibold font-mono text-zinc-200">{calculatedDims.sirka_cm} cm</span>
                        </div>
                        <div className="bg-zinc-900/60 p-2 rounded border border-zinc-850">
                          <span className="block text-[9px] text-zinc-500 uppercase">Výška</span>
                          <span className="text-sm font-semibold font-mono text-zinc-200">{calculatedDims.vyska_cm} cm</span>
                        </div>
                      </div>

                      <div className="border-t border-zinc-900 pt-2 space-y-1.5 text-xs">
                        <div className="flex justify-between text-zinc-400">
                          <span>Hmotnost balíku:</span>
                          <span className="font-semibold text-zinc-200">{product.hmotnost_baliku_kg || 0} kg</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>

          {/* System & Audit information */}
          <div className="p-4 bg-zinc-950/40 border border-zinc-850 rounded-xl flex flex-col md:flex-row justify-between gap-4 text-[11px] text-zinc-500 shadow-md">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-zinc-600" />
              <div className="flex flex-wrap gap-x-1.5">
                <span>Vytvořeno:</span>
                <span className="font-semibold text-zinc-400">{formatDate(product.vytvoreno_at)}</span>
                {product.vytvoril?.jmeno && (
                  <>
                    <span className="text-zinc-700">|</span>
                    <span>Uživatel:</span>
                    <span className="font-semibold text-zinc-400">{product.vytvoril.jmeno}</span>
                  </>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-zinc-600" />
              <div className="flex flex-wrap gap-x-1.5">
                <span>Poslední změna:</span>
                <span className="font-semibold text-zinc-400">{formatDate(product.aktualizovano_at)}</span>
                {product.upravil?.jmeno && (
                  <>
                    <span className="text-zinc-700">|</span>
                    <span>Upravil:</span>
                    <span className="font-semibold text-zinc-400">{product.upravil.jmeno}</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="sourcing" className="bg-zinc-900/20 p-6 rounded-xl border border-dashed border-zinc-800">
          <ProductSourcingTab 
            productId={product.id} 
            sourcingData={sourcing || []} 
            suppliers={suppliers || []} 
            templates={templates || []}
            units={units || []}
            productUnit={product.c_merne_jednotky_zakladni?.zkratka || 'ks'}
            mnozstviVBaleni={product.mnozstvi_v_baleni ?? undefined}
            jednotkaBaleniId={product.jednotka_baleni_id ?? undefined}
          />
        </TabsContent>

        <TabsContent value="pricing">
           <ProductPricingTab 
             product={product}
             sourcingData={sourcing || []}
             rates={rates || []}
             settings={settings!}
             templates={templates || []}
           />
        </TabsContent>

        <TabsContent value="inventory" className="py-20 text-center border border-dashed border-zinc-800 rounded-xl">
           <Truck className="h-12 w-12 text-zinc-700 mx-auto mb-4" />
           <h3 className="text-xl font-bold text-zinc-500">Modul Skladové šarže</h3>
           <p className="text-zinc-600 max-w-sm mx-auto">Tento modul bude implementován v rámci Fáze 4 Master Plánu.</p>
        </TabsContent>

        <TabsContent value="documents" className="bg-zinc-900/20 p-6 rounded-xl border border-dashed border-zinc-800">
          <ProductDocumentsTab 
            productId={product.id}
            initialFiles={files || []}
            documentTypes={docTypes || []}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
