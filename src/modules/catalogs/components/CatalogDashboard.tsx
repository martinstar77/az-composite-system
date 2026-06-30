"use client"

import { useState, useMemo, useEffect, useCallback } from "react"
import { Product } from "@/modules/products/types"
import { ExchangeRate, GlobalFinanceSettings } from "@/modules/finance/types"
import { LogisticsTemplate } from "@/modules/finance/types/logistics"
import { calculateProductPricing, PricingBreakdown } from "@/modules/finance/utils/calculations"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table"
import { Badge } from "@/shared/components/ui/badge"
import { Calculator, FileDown, Eye, FileText, Download, Search, FilterX, ArrowUpDown, PlusCircle, Check, Settings2 } from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select"
import { Input } from "@/shared/components/ui/input"
import { Label } from "@/shared/components/ui/label"
import { toast } from "sonner"
import { exportCatalogToExcel } from "../utils/excelExport"
import { saveAs } from 'file-saver'
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/components/ui/popover"
import { Separator } from "@/shared/components/ui/separator"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from "@/shared/components/ui/command"
import { cn } from "@/shared/lib/utils"
import { Checkbox } from "@/shared/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu"

// Zde definujeme rozšířený typ produktu pro naši tabulku
interface PricedProduct extends Product {
  pricing: PricingBreakdown | null
}

interface LocalFacetedFilterProps {
  title: string
  selectedValues: string[]
  onChange: (values: string[]) => void
  options: { label: string; value: string }[]
}

function LocalFacetedFilter({ title, selectedValues, onChange, options }: LocalFacetedFilterProps) {
  const selectedSet = useMemo(() => new Set(selectedValues), [selectedValues])
  
  return (
    <Popover>
      <PopoverTrigger render={<Button variant="outline" size="sm" className="h-9 border-zinc-800 bg-zinc-950/50 hover:bg-zinc-900 border-dashed text-zinc-300 text-xs font-normal" />}>
        <PlusCircle className="mr-2 h-4 w-4 text-zinc-550" />
        {title}
        {selectedValues.length > 0 && (
          <>
            <Separator orientation="vertical" className="mx-2 h-4 bg-zinc-800" />
            <Badge variant="secondary" className="rounded-sm px-1 font-normal lg:hidden bg-zinc-800 text-zinc-300">
              {selectedValues.length}
            </Badge>
            <div className="hidden space-x-1 lg:flex">
              {selectedValues.length > 2 ? (
                <Badge variant="secondary" className="rounded-sm px-1 font-normal bg-zinc-800 text-zinc-300">
                  {selectedValues.length} vybráno
                </Badge>
              ) : (
                options
                  .filter((option) => selectedSet.has(option.value))
                  .map((option) => (
                    <Badge variant="secondary" key={option.value} className="rounded-sm px-1 font-normal bg-zinc-800 text-zinc-300">
                      {option.label}
                    </Badge>
                  ))
              )}
            </div>
          </>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0 border-zinc-800 bg-zinc-950 text-zinc-200" align="start">
        <Command className="bg-zinc-950 text-zinc-200">
          <CommandInput placeholder={title} className="border-none focus:ring-0 text-zinc-200 placeholder:text-zinc-500 bg-transparent h-9 text-xs" />
          <CommandList className="border-zinc-800 max-h-[300px] overflow-y-auto">
            <CommandEmpty className="py-2 text-center text-xs text-zinc-500">Žádné výsledky.</CommandEmpty>
            <CommandGroup>
              {options.map((option) => {
                const isSelected = selectedSet.has(option.value)
                return (
                  <CommandItem
                    key={option.value}
                    onSelect={() => {
                      const next = new Set(selectedValues)
                      if (isSelected) {
                        next.delete(option.value)
                      } else {
                        next.add(option.value)
                      }
                      onChange(Array.from(next))
                    }}
                    className="cursor-pointer text-xs hover:bg-zinc-900 flex items-center px-2 py-1.5 rounded transition-colors text-zinc-300 data-[selected=true]:bg-zinc-900 data-[selected=true]:text-white"
                  >
                    <div
                      className={cn(
                        "mr-2 flex h-3.5 w-3.5 items-center justify-center rounded-sm border border-zinc-700",
                        isSelected
                          ? "bg-primary border-primary text-primary-foreground"
                          : "opacity-50 [&_svg]:invisible"
                      )}
                    >
                      <Check className="h-3 w-3 text-white font-bold" />
                    </div>
                    <span className="truncate">{option.label}</span>
                  </CommandItem>
                )
              })}
            </CommandGroup>
            {selectedValues.length > 0 && (
              <>
                <CommandSeparator className="bg-zinc-800" />
                <CommandGroup>
                  <CommandItem
                    onSelect={() => onChange([])}
                    className="justify-center text-center cursor-pointer text-xs text-zinc-450 hover:text-white py-1.5 data-[selected=true]:bg-zinc-900"
                  >
                    Zrušit filtry
                  </CommandItem>
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

function getProductSubcategory(p: Product): string {
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

const SUBCATEGORY_NAMES_CS: Record<string, string> = {
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

interface CatalogDashboardProps {
  products: Product[]
  rates: ExchangeRate[]
  settings: GlobalFinanceSettings
  templates: LogisticsTemplate[]
}

export function CatalogDashboard({ products, rates, settings, templates }: CatalogDashboardProps) {
  const [globalFilter, setGlobalFilter] = useState("")
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([])
  const [specFilters, setSpecFilters] = useState<Record<string, string[]>>({})
  const [sorting, setSorting] = useState<any[]>([{ id: "nazev", desc: false }])
  const [isRestoring, setIsRestoring] = useState(true)

  const [viewMode, setViewMode] = useState<"sales" | "cogs">("sales")
  const [unitMode, setUnitMode] = useState<"basic" | "packaging">("basic")

  const [exportTier, setExportTier] = useState<"retail" | "partner" | "partner_5" | "partner_10" | "partner_15" | "partner_20">("partner")
  const [exportCurrency, setExportCurrency] = useState<"CZK" | "EUR" | "USD">("EUR")
  const [exportLang, setExportLang] = useState<"cs" | "en">("cs")
  
  // Multi-selection states for export tab
  const [selectedCats, setSelectedCats] = useState<string[]>([])
  const [selectedSubs, setSelectedSubs] = useState<string[]>([])
  
  const [isGeneratingExcel, setIsGeneratingExcel] = useState(false)
  const [isRegenerating, setIsRegenerating] = useState(false)

  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>({
    logistics_supplier: true,
    purchase_price: true,
    shipping: true,
    customs: true,
    bank_fees: true,
    clearing: true,
    waste: true,
    packaging: true,
    shipping_safety: true,
    buffer: true,
    landed_cost: true,
    b2c: true,
    b2b: true,
    b2b_5: true,
    b2b_10: true,
    b2b_15: true,
    b2b_20: true,
    risk_margin: true,
    safe_margin: true,
  })

  const renderVisibilityToggle = (colId: string, label: string) => {
    return (
      <div 
        className="flex items-center gap-2 cursor-pointer hover:bg-zinc-900 px-2 py-1.5 rounded text-xs select-none"
        onClick={() => setVisibleColumns(prev => ({ ...prev, [colId]: !prev[colId] }))}
      >
        <Checkbox
          checked={visibleColumns[colId] ?? true}
          onCheckedChange={() => setVisibleColumns(prev => ({ ...prev, [colId]: !prev[colId] }))}
          id={`col-show-${colId}`}
        />
        <span className="text-zinc-300">{label}</span>
      </div>
    )
  }

  // Restore filters from sessionStorage on mount
  useEffect(() => {
    try {
      const storedFilters = sessionStorage.getItem("product_catalog_filters")
      const storedSearch = sessionStorage.getItem("product_catalog_search")
      const storedSpecs = sessionStorage.getItem("product_catalog_specs")
      const storedSorting = sessionStorage.getItem("product_catalog_sorting")

      if (storedFilters) {
        const parsed = JSON.parse(storedFilters)
        if (Array.isArray(parsed)) {
          const cats = parsed.find(f => f.id === 'kategorie_id')?.value || []
          const stats = parsed.find(f => f.id === 'stav_katalogu_id')?.value || []
          setSelectedCategories(Array.isArray(cats) ? cats : [])
          setSelectedStatuses(Array.isArray(stats) ? stats : [])
        }
      }
      if (storedSearch && typeof storedSearch === "string" && storedSearch !== "undefined" && storedSearch !== "null") {
        setGlobalFilter(storedSearch)
      }
      if (storedSpecs) {
        const parsed = JSON.parse(storedSpecs)
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          setSpecFilters(parsed)
        }
      }
      if (storedSorting) {
        const parsed = JSON.parse(storedSorting)
        if (Array.isArray(parsed)) {
          setSorting(parsed)
        }
      }
    } catch (e) {
      console.error("Error restoring filters from sessionStorage:", e)
    } finally {
      setIsRestoring(false)
    }
  }, [])

  // Save filters to sessionStorage when they change
  useEffect(() => {
    if (isRestoring) return
    try {
      const filtersArr = []
      if (selectedCategories.length > 0) {
        filtersArr.push({ id: 'kategorie_id', value: selectedCategories })
      }
      if (selectedStatuses.length > 0) {
        filtersArr.push({ id: 'stav_katalogu_id', value: selectedStatuses })
      }
      sessionStorage.setItem("product_catalog_filters", JSON.stringify(filtersArr))
      sessionStorage.setItem("product_catalog_search", globalFilter)
      sessionStorage.setItem("product_catalog_specs", JSON.stringify(specFilters))
      sessionStorage.setItem("product_catalog_sorting", JSON.stringify(sorting))
    } catch (e) {
      console.error("Error saving filters to sessionStorage:", e)
    }
  }, [selectedCategories, selectedStatuses, globalFilter, specFilters, sorting, isRestoring])

  // Zpracování dat a výpočet všech cen v reálném čase
  const pricedProducts = useMemo<PricedProduct[]>(() => {
    return products.map(product => {
      const primarySourcing = product.produkt_dodavatel?.find(s => s.is_primary) || product.produkt_dodavatel?.[0]
      const template = primarySourcing?.logisticka_sablona_id 
        ? templates.find(t => t.id === primarySourcing.logisticka_sablona_id)
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
            rates,
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
  }, [products, rates, settings, templates])

  // Získání unikátních kategorií z produktů
  const availableCategories = useMemo(() => {
    const list: { id: string; name: string }[] = [];
    products.forEach(p => {
      if (
        p.kategorie_id &&
        !list.some(item => item.id === p.kategorie_id) &&
        !['prepregy', 'cores_standard', 'cores_active'].includes(p.kategorie_id)
      ) {
        list.push({ id: p.kategorie_id, name: p.c_kategorie?.nazev || p.kategorie_id });
      }
    });
    return list.sort((a, b) => a.name.localeCompare(b.name, 'cs'));
  }, [products]);

  // Získání unikátních stavů z produktů
  const availableStatuses = useMemo(() => {
    const list: { id: string; name: string }[] = [];
    products.forEach(p => {
      if (p.stav_katalogu_id && !list.some(item => item.id === p.stav_katalogu_id)) {
        list.push({ id: p.stav_katalogu_id, name: p.c_stavy_produktu?.nazev || p.stav_katalogu_id });
      }
    });
    return list.sort((a, b) => a.name.localeCompare(b.name, 'cs'));
  }, [products]);

  // Hierarchy of categories and subcategories
  const categoriesTree = useMemo(() => {
    const tree: Record<string, { name: string; subs: Set<string> }> = {}
    
    products.forEach(p => {
      if (!p.kategorie_id) return
      if (['prepregy', 'cores_standard', 'cores_active'].includes(p.kategorie_id)) return
      
      if (!tree[p.kategorie_id]) {
        tree[p.kategorie_id] = {
          name: p.c_kategorie?.nazev || p.kategorie_id,
          subs: new Set<string>()
        }
      }
      
      const sub = getProductSubcategory(p)
      if (sub && sub !== '_default') {
        tree[p.kategorie_id].subs.add(sub)
      }
    })
    
    return Object.entries(tree).map(([id, data]) => ({
      id,
      name: data.name,
      subs: Array.from(data.subs).sort()
    })).sort((a, b) => a.name.localeCompare(b.name, 'cs'))
  }, [products])

  // Filtrace a řazení pro tabulku Matrix (využívá synchronizované filtry z Katalogu)
  const filteredProducts = useMemo(() => {
    let result = pricedProducts.filter(p => {
      // Hledání
      if (globalFilter && globalFilter.trim()) {
        const s = globalFilter.trim().toLowerCase()
        const nameMatch = p.nazev?.toLowerCase().includes(s)
        const skuMatch = p.sku?.toLowerCase().includes(s)
        if (!nameMatch && !skuMatch) return false
      }
      
      // Kategorie
      if (selectedCategories && selectedCategories.length > 0) {
        if (!p.kategorie_id || !selectedCategories.includes(p.kategorie_id)) return false
      }
      
      // Stavy
      if (selectedStatuses && selectedStatuses.length > 0) {
        if (!p.stav_katalogu_id || !selectedStatuses.includes(p.stav_katalogu_id)) return false
      }
      
      // Specifikace (např. materiál, vazba)
      if (specFilters && Object.keys(specFilters).length > 0) {
        for (const [key, values] of Object.entries(specFilters)) {
          if (values && values.length > 0) {
            const pVal = p.specifikace?.[key]
            if (!pVal || !values.includes(String(pVal))) return false
          }
        }
      }
      
      return true
    });

    const activeSort = sorting[0]
    if (activeSort) {
      const { id: sortField, desc: sortDesc } = activeSort
      result = [...result].sort((a, b) => {
        let valA: any = "";
        let valB: any = "";

        if (sortField === "nazev") {
          valA = a.nazev || "";
          valB = b.nazev || "";
        } else if (sortField === "sku") {
          valA = a.sku || "";
          valB = b.sku || "";
        } else if (sortField === "kategorie") {
          valA = a.c_kategorie?.nazev || "";
          valB = b.c_kategorie?.nazev || "";
        } else {
          // Pricing-based sorting
          const prA = a.pricing
          const prB = b.pricing
          if (!prA && !prB) return 0
          if (!prA) return 1
          if (!prB) return -1

          const isBasic = unitMode === "basic"

          switch (sortField) {
            case "purchase_price":
              valA = isBasic ? prA.unitPurchasePriceCzk : prA.totalPurchasePriceCzk
              valB = isBasic ? prB.unitPurchasePriceCzk : prB.totalPurchasePriceCzk
              break
            case "shipping":
              valA = isBasic ? prA.unitShippingCostCzk : prA.totalShippingCostCzk
              valB = isBasic ? prB.unitShippingCostCzk : prB.totalShippingCostCzk
              break
            case "customs":
              valA = isBasic ? prA.unitCustomsCostCzk : prA.totalCustomsCostCzk
              valB = isBasic ? prB.unitCustomsCostCzk : prB.totalCustomsCostCzk
              break
            case "bank_fees":
              valA = isBasic ? prA.unitBankFeesCzk : prA.totalBankFeesCzk
              valB = isBasic ? prB.unitBankFeesCzk : prB.totalBankFeesCzk
              break
            case "clearing":
              valA = isBasic ? prA.unitClearingFeesCzk : prA.totalClearingFeesCzk
              valB = isBasic ? prB.unitClearingFeesCzk : prB.totalClearingFeesCzk
              break
            case "waste":
              valA = isBasic ? prA.unitWasteFeesCzk : prA.totalWasteFeesCzk
              valB = isBasic ? prB.unitWasteFeesCzk : prB.totalWasteFeesCzk
              break
            case "packaging":
              valA = isBasic ? prA.unitPackagingFeesCzk : prA.totalPackagingFeesCzk
              valB = isBasic ? prB.unitPackagingFeesCzk : prB.totalPackagingFeesCzk
              break
            case "shipping_safety":
              valA = prA.shippingSafetyBufferCzk ? (isBasic ? prA.shippingSafetyBufferCzk / prA.totalUnits : prA.shippingSafetyBufferCzk) : 0
              valB = prB.shippingSafetyBufferCzk ? (isBasic ? prB.shippingSafetyBufferCzk / prB.totalUnits : prB.shippingSafetyBufferCzk) : 0
              break
            case "buffer":
              valA = isBasic ? prA.unitBufferAmount : prA.totalBufferAmount
              valB = isBasic ? prB.unitBufferAmount : prB.totalBufferAmount
              break
            case "landed_cost":
              valA = isBasic ? prA.unitLandedCostWithBuffer : prA.totalLandedCostWithBuffer
              valB = isBasic ? prB.unitLandedCostWithBuffer : prB.totalLandedCostWithBuffer
              break
            case "b2c":
              valA = isBasic ? prA.b2cUnitPrice : prA.b2cUnitPrice * prA.totalUnits
              valB = isBasic ? prB.b2cUnitPrice : prB.b2cUnitPrice * prB.totalUnits
              break
            case "b2b":
              valA = isBasic ? prA.b2bUnitPrice : prA.b2bUnitPrice * prA.totalUnits
              valB = isBasic ? prB.b2bUnitPrice : prB.b2bUnitPrice * prB.totalUnits
              break
            case "risk_margin":
              valA = prA.lowMargin || 0
              valB = prB.lowMargin || 0
              break
            case "safe_margin":
              valA = prA.highMargin || 0
              valB = prB.highMargin || 0
              break
            case "logistics_supplier": {
              const primarySourcingA = a.produkt_dodavatel?.find(s => s.is_primary) || a.produkt_dodavatel?.[0]
              const primarySourcingB = b.produkt_dodavatel?.find(s => s.is_primary) || b.produkt_dodavatel?.[0]
              const templateA = primarySourcingA?.logisticka_sablona_id 
                ? templates.find(t => t.id === primarySourcingA.logisticka_sablona_id)
                : null
              const templateB = primarySourcingB?.logisticka_sablona_id 
                ? templates.find(t => t.id === primarySourcingB.logisticka_sablona_id)
                : null
              valA = `${templateA?.nazev || primarySourcingA?.logisticke_sablony?.nazev || ""} - ${primarySourcingA?.dodavatele?.nazev_spolecnosti || ""}`.trim()
              valB = `${templateB?.nazev || primarySourcingB?.logisticke_sablony?.nazev || ""} - ${primarySourcingB?.dodavatele?.nazev_spolecnosti || ""}`.trim()
              break
            }
            default:
              return 0
          }
        }

        if (typeof valA === "string") {
          return !sortDesc 
            ? valA.localeCompare(valB, 'cs') 
            : valB.localeCompare(valA, 'cs');
        } else {
          return !sortDesc 
            ? valA - valB 
            : valB - valA;
        }
      });
    }

    return result;
  }, [pricedProducts, globalFilter, selectedCategories, selectedStatuses, specFilters, sorting, unitMode])

  // Filtrace pro exporty (využívá komplexní strom check-boxů - zachováno nezávislé)
  const exportFilteredProducts = useMemo(() => {
    return pricedProducts.filter(p => {
      const matchesSearch = 
        p.nazev.toLowerCase().includes(globalFilter.toLowerCase()) || 
        p.sku.toLowerCase().includes(globalFilter.toLowerCase());
      
      const matchesStatus = selectedStatuses.length === 0 || (p.stav_katalogu_id !== null && selectedStatuses.includes(p.stav_katalogu_id));
      
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
      
      return matchesSearch && matchesStatus && matchesCategory && matchesSubcategory;
    });
  }, [pricedProducts, globalFilter, selectedCats, selectedSubs, selectedStatuses])

  const handleSort = (field: string) => {
    setSorting(prev => {
      const current = prev.find(s => s.id === field)
      if (current) {
        return [{ id: field, desc: !current.desc }]
      } else {
        return [{ id: field, desc: false }]
      }
    })
  }

  // Získání kurzu pro cílovou měnu
  const getTargetExchangeRate = () => {
    if (exportCurrency === 'CZK') return 1;
    if (settings.pouzivat_manualni_kurzy) {
      if (exportCurrency === 'EUR') return settings.manualni_kurz_eur || 25;
      if (exportCurrency === 'USD') return settings.manualni_kurz_usd || 23;
    }
    const rateObj = rates.find(r => r.mena === exportCurrency);
    return rateObj ? rateObj.kurz_czk / rateObj.mnozstvi : 1;
  }

  const handleDownloadExcel = async () => {
    setIsGeneratingExcel(true);
    try {
      const exchangeRate = getTargetExchangeRate();
      exportCatalogToExcel(exportFilteredProducts, exportTier, exportCurrency, exchangeRate, exportLang);
      toast.success("Excel ceník byl úspěšně vygenerován.");
    } catch (e: any) {
      toast.error("Chyba při generování Excelu", { description: e.message });
    } finally {
      setIsGeneratingExcel(false);
    }
  }

  const handleGeneratePDF = () => {
    try {
      const catsParam = selectedCats.join(',')
      const subsParam = selectedSubs.join(',')
      const statusParam = selectedStatuses.length > 0 ? selectedStatuses.join(',') : 'all'
      const url = `/api/katalogy/pdf?tier=${exportTier}&currency=${exportCurrency}&categories=${encodeURIComponent(catsParam)}&subcategories=${encodeURIComponent(subsParam)}&status=${encodeURIComponent(statusParam)}&lang=${exportLang}&search=${encodeURIComponent(globalFilter)}`
      window.open(url, '_blank')
      toast.success("PDF katalog se otevírá v nové záložce.")
    } catch (e: any) {
      toast.error("Chyba při otevírání PDF", { description: e.message })
    }
  }

  const handleBulkRegenerate = async () => {
    if (!window.confirm("Opravdu chcete hromadně přegenerovat názvy u všech produktů s automatickým generováním? Všechny české názvy budou přeloženy do češtiny (např. Carbon -> Uhlíková) a anglické názvy budou vygenerovány v EN.")) {
      return
    }
    setIsRegenerating(true)
    try {
      const { bulkRegenerateProductNames } = await import("@/modules/products/actions")
      const res = await bulkRegenerateProductNames()
      if (res.success) {
        toast.success(`Úspěšně aktualizováno ${res.updatedCount} produktů.`)
        window.location.reload()
      } else {
        toast.error("Chyba při přegenerování názvů", { description: res.error?.message })
      }
    } catch (e: any) {
      toast.error("Chyba při volání akce", { description: e.message })
    } finally {
      setIsRegenerating(false)
    }
  }

  // Pomocné funkce pro formátování
  const formatCurrency = (val: number | undefined, currency: string = "CZK") => {
    if (val === undefined || isNaN(val)) return "—"
    return new Intl.NumberFormat('cs-CZ', { style: 'currency', currency }).format(val)
  }

  const formatPercent = (val: number | undefined) => {
    if (val === undefined || isNaN(val)) return "—"
    return new Intl.NumberFormat('cs-CZ', { style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(val / 100)
  }

  const handleResetFilters = () => {
    setGlobalFilter("")
    setSelectedCategories([])
    setSelectedStatuses([])
    setSpecFilters({})
    sessionStorage.removeItem("product_catalog_filters")
    sessionStorage.removeItem("product_catalog_search")
    sessionStorage.removeItem("product_catalog_specs")
  }

  const renderSortableHeader = (field: string, label: string, alignment: "left" | "right" = "left", className?: string) => {
    const activeSort = sorting.find(s => s.id === field)
    const isSorted = !!activeSort
    
    return (
      <TableHead className={cn("text-zinc-400 font-bold text-[9px] uppercase tracking-tight py-1 px-1.5", className)}>
        <Button 
          variant="ghost" 
          onClick={() => handleSort(field)} 
          className={cn(
            "text-zinc-400 hover:text-zinc-200 font-bold text-[9px] uppercase tracking-tight h-7 p-0.5 hover:bg-transparent flex items-center gap-0.5",
            alignment === "right" ? "ml-auto" : "-ml-0.5"
          )}
        >
          {label}
          <ArrowUpDown className={cn("ml-0.5 h-2.5 w-2.5 inline-block", isSorted ? "text-primary font-bold opacity-100" : "text-zinc-650 opacity-40")} />
        </Button>
      </TableHead>
    )
  }

  const visibleColCount = 1 + (viewMode === "cogs" 
    ? Object.keys(visibleColumns).filter(k => ["purchase_price", "shipping", "customs", "bank_fees", "clearing", "waste", "packaging", "shipping_safety", "buffer", "landed_cost"].includes(k) && visibleColumns[k]).length
    : Object.keys(visibleColumns).filter(k => ["purchase_price", "landed_cost", "b2c", "b2b", "b2b_5", "b2b_10", "b2b_15", "b2b_20", "risk_margin", "safe_margin"].includes(k) && visibleColumns[k]).length
  );

  return (
    <Tabs defaultValue="matrix" className="w-full">
      <TabsList className="bg-zinc-900 border border-zinc-800 p-1 mb-8">
        <TabsTrigger value="matrix" className="gap-2 data-[state=active]:bg-zinc-800">
          <Eye className="h-4 w-4" /> Interní Price Matrix
        </TabsTrigger>
        <TabsTrigger value="export" className="gap-2 data-[state=active]:bg-zinc-800">
          <FileDown className="h-4 w-4" /> Generátor Exportů (PDF / Excel)
        </TabsTrigger>
      </TabsList>
      <TabsContent value="matrix" className="space-y-4">
        {/* Nastavení zobrazení matice (lokální) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-zinc-900/30 p-3.5 rounded-xl border border-zinc-800/60 shadow-lg">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mr-1">Konfigurace zobrazení:</span>
            
            <div className="w-[155px]">
              <Select value={viewMode} onValueChange={(val: any) => setViewMode(val)}>
                <SelectTrigger className="bg-zinc-950 border-zinc-850 h-9 text-xs font-bold text-zinc-300">
                  <SelectValue placeholder="Pohled" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-950 border-zinc-800 text-zinc-200">
                  <SelectItem value="sales" className="text-xs hover:bg-zinc-900 cursor-pointer">📊 Prodejní ceny</SelectItem>
                  <SelectItem value="cogs" className="text-xs hover:bg-zinc-900 cursor-pointer">💰 Náklady (COGS)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="w-[185px]">
              <Select value={unitMode} onValueChange={(val: any) => setUnitMode(val)}>
                <SelectTrigger className="bg-zinc-950 border-zinc-850 h-9 text-xs font-bold text-zinc-300">
                  <SelectValue placeholder="Jednotka" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-950 border-zinc-800 text-zinc-200">
                  <SelectItem value="basic" className="text-xs hover:bg-zinc-900 cursor-pointer">📏 1 základní MJ (m², ks)</SelectItem>
                  <SelectItem value="packaging" className="text-xs hover:bg-zinc-900 cursor-pointer">📦 Celé balení / role</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="text-[10px] text-zinc-500 font-bold italic tracking-wide">
            *Nastavení je lokální pouze pro Price Matrix
          </div>
        </div>

        {/* Filtry pro Matrix (sdílené s Katalogem) */}
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between bg-zinc-900/50 p-3 rounded-lg border border-zinc-800">
          <div className="flex flex-1 flex-wrap items-center gap-3 w-full">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-500" />
              <Input 
                placeholder="Hledat podle názvu nebo SKU..." 
                value={globalFilter} 
                onChange={e => setGlobalFilter(e.target.value)}
                className="pl-9 bg-zinc-950 border-zinc-800 h-9 text-sm"
              />
            </div>

            <LocalFacetedFilter
              title="Kategorie"
              selectedValues={selectedCategories}
              onChange={setSelectedCategories}
              options={availableCategories.map(c => ({ label: c.name, value: c.id }))}
            />

            <LocalFacetedFilter
              title="Stavy"
              selectedValues={selectedStatuses}
              onChange={setSelectedStatuses}
              options={availableStatuses.map(s => ({ label: s.name, value: s.id }))}
            />

            <DropdownMenu>
              <DropdownMenuTrigger render={<Button variant="outline" size="sm" className="h-9 gap-2 border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-white text-xs font-normal">
                <Settings2 className="h-4 w-4 text-zinc-500" /> Sloupce
              </Button>}>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56 bg-zinc-950 border-zinc-800 text-zinc-200">
                <DropdownMenuLabel className="text-xs font-bold text-zinc-450 px-2 py-1.5">Zobrazit sloupce</DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-zinc-800" />
                <div className="max-h-[300px] overflow-y-auto p-1.5 space-y-1">
                  {viewMode === "cogs" ? (
                    <>
                      {renderVisibilityToggle("logistics_supplier", "Logistika a dodavatel")}
                      {renderVisibilityToggle("purchase_price", "Nákupní cena")}
                      {renderVisibilityToggle("shipping", "Doprava")}
                      {renderVisibilityToggle("customs", "Clo")}
                      {renderVisibilityToggle("bank_fees", "Banka & SWIFT")}
                      {renderVisibilityToggle("clearing", "Proclení")}
                      {renderVisibilityToggle("waste", "Odpady")}
                      {renderVisibilityToggle("packaging", "Balné")}
                      {renderVisibilityToggle("shipping_safety", "Rezerva dopravy")}
                      {renderVisibilityToggle("buffer", "Rezerva marže")}
                      {renderVisibilityToggle("landed_cost", "Pořizovací cena")}
                    </>
                  ) : (
                    <>
                      {renderVisibilityToggle("logistics_supplier", "Logistika a dodavatel")}
                      {renderVisibilityToggle("purchase_price", "Nákupní cena")}
                      {renderVisibilityToggle("landed_cost", "Pořizovací cena")}
                      {renderVisibilityToggle("b2c", "B2C Retail")}
                      {renderVisibilityToggle("b2b", "B2B Partner")}
                      {renderVisibilityToggle("b2b_5", "B2B Sleva 5%")}
                      {renderVisibilityToggle("b2b_10", "B2B Sleva 10%")}
                      {renderVisibilityToggle("b2b_15", "B2B Sleva 15%")}
                      {renderVisibilityToggle("b2b_20", "B2B Sleva 20%")}
                      {renderVisibilityToggle("risk_margin", "Risk Marže")}
                      {renderVisibilityToggle("safe_margin", "Safe Marže")}
                    </>
                  )}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>

            {(globalFilter || selectedCategories.length > 0 || selectedStatuses.length > 0 || Object.values(specFilters).some(v => v.length > 0)) && (
              <Button 
                variant="ghost" 
                onClick={handleResetFilters}
                className="h-9 px-2 text-zinc-500 hover:text-zinc-200 text-xs"
              >
                <FilterX className="h-4 w-4 mr-2" /> Reset
              </Button>
            )}
          </div>

          <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest min-w-[130px] text-right md:ml-2">
            Zobrazeno {filteredProducts.length} z {products.length} položek
          </div>
        </div>

        {/* Tabulka Price Matrix */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 overflow-hidden shadow-2xl overflow-x-auto">
          <Table className="whitespace-nowrap">
            <TableHeader className="bg-zinc-900/80">
              <TableRow className="hover:bg-transparent border-zinc-800">
                {renderSortableHeader("nazev", "Produkt & SKU")}
                {visibleColumns.logistics_supplier && renderSortableHeader("logistics_supplier", "Logistika a dodavatel", "left")}
                
                {viewMode === "cogs" ? (
                  <>
                    {visibleColumns.purchase_price && renderSortableHeader("purchase_price", "Nákupní cena", "right", "bg-amber-500/5")}
                    {visibleColumns.shipping && renderSortableHeader("shipping", "Doprava", "right", "bg-cyan-500/5")}
                    {visibleColumns.customs && renderSortableHeader("customs", "Clo", "right", "bg-cyan-500/5")}
                    {visibleColumns.bank_fees && renderSortableHeader("bank_fees", "Banka & SWIFT", "right", "bg-cyan-500/5")}
                    {visibleColumns.clearing && renderSortableHeader("clearing", "Proclení", "right", "bg-cyan-500/5")}
                    {visibleColumns.waste && renderSortableHeader("waste", "Odpady", "right", "bg-purple-500/5")}
                    {visibleColumns.packaging && renderSortableHeader("packaging", "Balné", "right", "bg-purple-500/5")}
                    {visibleColumns.shipping_safety && renderSortableHeader("shipping_safety", "Rezerva dopr.", "right", "bg-purple-500/5")}
                    {visibleColumns.buffer && renderSortableHeader("buffer", `Rezerva (${settings.marze_rezerva_procenta}%)`, "right", "bg-red-500/5")}
                    {visibleColumns.landed_cost && renderSortableHeader("landed_cost", "Pořizovací cena", "right", "bg-primary/10 border-l border-zinc-800 font-bold")}
                  </>
                ) : (
                  <>
                    {visibleColumns.purchase_price && renderSortableHeader("purchase_price", unitMode === "basic" ? "Nákup (1 MJ)" : "Nákup (Balení)", "right")}
                    {visibleColumns.landed_cost && renderSortableHeader("landed_cost", "Pořizovací cena", "right")}
                    {visibleColumns.b2c && renderSortableHeader("b2c", "B2C Retail", "right")}
                    {visibleColumns.b2b && renderSortableHeader("b2b", "B2B Partner", "right", "border-l border-zinc-800 bg-blue-500/5")}
                    {visibleColumns.b2b_5 && <TableHead className="text-zinc-400 font-bold text-[9px] uppercase text-right bg-blue-500/5 py-1 px-1.5">B2B -5 %</TableHead>}
                    {visibleColumns.b2b_10 && <TableHead className="text-zinc-400 font-bold text-[9px] uppercase text-right bg-blue-500/5 py-1 px-1.5">B2B -10 %</TableHead>}
                    {visibleColumns.b2b_15 && <TableHead className="text-zinc-400 font-bold text-[9px] uppercase text-right bg-blue-500/5 py-1 px-1.5">B2B -15 %</TableHead>}
                    {visibleColumns.b2b_20 && <TableHead className="text-zinc-400 font-bold text-[9px] uppercase text-right border-r border-zinc-800 bg-blue-500/5 py-1 px-1.5">B2B -20 %</TableHead>}
                    {visibleColumns.risk_margin && renderSortableHeader("risk_margin", "Risk Marže", "right", "bg-red-500/5")}
                    {visibleColumns.safe_margin && renderSortableHeader("safe_margin", "Safe Marže", "right", "bg-green-500/5")}
                  </>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.map(p => {
                const pr = p.pricing
                const hasPricing = !!pr
                
                const primarySourcing = p.produkt_dodavatel?.find(s => s.is_primary) || p.produkt_dodavatel?.[0]
                const template = primarySourcing?.logisticka_sablona_id 
                  ? templates.find(t => t.id === primarySourcing.logisticka_sablona_id)
                  : null

                const isBuyingInBasicUnit = primarySourcing?.nakupni_mj_id === p.zakladni_mj_id &&
                  (!primarySourcing?.prevodni_pomer_na_zakladni || primarySourcing.prevodni_pomer_na_zakladni === 1)
                const totalUnits = primarySourcing
                  ? ((primarySourcing.prevodni_pomer_na_zakladni && primarySourcing.prevodni_pomer_na_zakladni !== 1)
                      ? primarySourcing.prevodni_pomer_na_zakladni
                      : (isBuyingInBasicUnit ? 1 : (p.mnozstvi_v_baleni || 1)))
                  : 1

                const isBasic = unitMode === "basic"
                const sourcingUnitZkratka = p.kategorie_id === 'vyztuzne_materialy' ? 'rol.' : 'bal.'

                return (
                  <TableRow key={p.id} className="hover:bg-zinc-900/50 border-zinc-800">
                    <TableCell className="py-3 px-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-sm text-zinc-200">{p.nazev}</span>
                        <span className="text-[10px] font-mono text-zinc-500">{p.sku}</span>
                        
                        {/* MJ detail indicator */}
                        {isBasic ? (
                          <span className="text-[10px] text-zinc-500 italic mt-0.5">
                            Jednotka: 1 {p.c_merne_jednotky_zakladni?.zkratka || 'ks'}
                          </span>
                        ) : (
                          totalUnits > 1 ? (
                            <span className="text-[10px] text-zinc-400 font-medium mt-0.5">
                              Balení: 1 {sourcingUnitZkratka} = {totalUnits} {p.c_merne_jednotky_zakladni?.zkratka || 'ks'}
                            </span>
                          ) : (
                            <span className="text-[10px] text-zinc-500 italic mt-0.5">
                              Jednotka: 1 {p.c_merne_jednotky_zakladni?.zkratka || 'ks'}
                            </span>
                          )
                        )}

                        {p.produkt_mnozstevni_slevy && p.produkt_mnozstevni_slevy.length > 0 && (
                          <Badge variant="outline" className="border-primary/50 text-primary bg-primary/5 text-[9px] py-0 px-1 mt-1.5 w-fit">
                            Množstevní slevy ({p.produkt_mnozstevni_slevy.length})
                          </Badge>
                        )}
                      </div>
                    </TableCell>

                    {visibleColumns.logistics_supplier && (
                      <TableCell className="py-1.5 px-2">
                        <div className="flex flex-col">
                          <span className="font-bold text-xs text-zinc-300">
                            {template?.nazev || primarySourcing?.logisticke_sablony?.nazev || "—"}
                          </span>
                          <span className="text-[10px] text-zinc-500 font-mono">
                            {primarySourcing?.dodavatele?.nazev_spolecnosti || "—"}
                          </span>
                        </div>
                      </TableCell>
                    )}

                    {viewMode === "cogs" ? (
                      // --- COGS VIEW CELLS ---
                      <>
                        {visibleColumns.purchase_price && (
                          <TableCell className="text-right py-1.5 px-2 bg-amber-500/5">
                            {hasPricing && primarySourcing ? (
                              <div className="flex flex-col items-end">
                                <span className="font-mono text-xs font-bold text-zinc-200">
                                  {formatCurrency(isBasic ? pr.unitPurchasePriceCzk : pr.totalPurchasePriceCzk)}
                                </span>
                                <span className="text-[9px] text-zinc-500 font-mono">
                                  {isBasic 
                                    ? `${(primarySourcing.nakupni_cena / totalUnits).toFixed(2)} ${primarySourcing.mena}`
                                    : `${primarySourcing.nakupni_cena.toFixed(2)} ${primarySourcing.mena}`
                                  }
                                </span>
                              </div>
                            ) : (
                              <span className="text-xs italic text-zinc-650">Chybí nákup</span>
                            )}
                          </TableCell>
                        )}

                        {visibleColumns.shipping && (
                          <TableCell className="text-right font-mono text-xs text-zinc-300 py-1.5 px-2 bg-cyan-500/5">
                            {hasPricing ? formatCurrency(isBasic ? pr.unitShippingCostCzk : pr.totalShippingCostCzk) : "—"}
                          </TableCell>
                        )}

                        {visibleColumns.customs && (
                          <TableCell className="text-right font-mono text-xs text-zinc-300 py-1.5 px-2 bg-cyan-500/5">
                            {hasPricing ? formatCurrency(isBasic ? pr.unitCustomsCostCzk : pr.totalCustomsCostCzk) : "—"}
                          </TableCell>
                        )}

                        {visibleColumns.bank_fees && (
                          <TableCell className="text-right font-mono text-xs text-zinc-300 py-1.5 px-2 bg-cyan-500/5">
                            {hasPricing ? formatCurrency(isBasic ? pr.unitBankFeesCzk : pr.totalBankFeesCzk) : "—"}
                          </TableCell>
                        )}

                        {visibleColumns.clearing && (
                          <TableCell className="text-right font-mono text-xs text-zinc-300 py-1.5 px-2 bg-cyan-500/5">
                            {hasPricing ? formatCurrency(isBasic ? pr.unitClearingFeesCzk : pr.totalClearingFeesCzk) : "—"}
                          </TableCell>
                        )}

                        {visibleColumns.waste && (
                          <TableCell className="text-right font-mono text-xs text-zinc-300 py-1.5 px-2 bg-purple-500/5">
                            {hasPricing ? formatCurrency(isBasic ? pr.unitWasteFeesCzk : pr.totalWasteFeesCzk) : "—"}
                          </TableCell>
                        )}

                        {visibleColumns.packaging && (
                          <TableCell className="text-right font-mono text-xs text-zinc-300 py-1.5 px-2 bg-purple-500/5">
                            {hasPricing ? formatCurrency(isBasic ? pr.unitPackagingFeesCzk : pr.totalPackagingFeesCzk) : "—"}
                          </TableCell>
                        )}

                        {visibleColumns.shipping_safety && (
                          <TableCell className="text-right font-mono text-xs text-zinc-300 py-1.5 px-2 bg-purple-500/5">
                            {hasPricing && pr.shippingSafetyBufferCzk ? (
                              formatCurrency(isBasic ? pr.shippingSafetyBufferCzk / totalUnits : pr.shippingSafetyBufferCzk)
                            ) : "—"}
                          </TableCell>
                        )}

                        {visibleColumns.buffer && (
                          <TableCell className="text-right font-mono text-xs text-zinc-300 py-1.5 px-2 bg-red-500/5">
                            {hasPricing ? formatCurrency(isBasic ? pr.unitBufferAmount : pr.totalBufferAmount) : "—"}
                          </TableCell>
                        )}

                        {visibleColumns.landed_cost && (
                          <TableCell className="text-right py-1.5 px-2 bg-primary/10 border-l border-zinc-800">
                            {hasPricing ? (
                              <span className="font-mono text-xs font-black text-primary">
                                {formatCurrency(isBasic ? pr.unitLandedCostWithBuffer : pr.totalLandedCostWithBuffer)}
                              </span>
                            ) : "—"}
                          </TableCell>
                        )}
                      </>
                    ) : (
                      // --- SALES VIEW CELLS ---
                      <>
                        {visibleColumns.purchase_price && (
                          <TableCell className="text-right py-1.5 px-2">
                            {hasPricing && primarySourcing ? (
                              <div className="flex flex-col items-end">
                                <span className="font-mono text-xs text-zinc-350">
                                  {formatCurrency(isBasic ? pr.unitPurchasePriceCzk : pr.totalPurchasePriceCzk)}
                                </span>
                                <span className="text-[9px] text-zinc-500 font-mono">
                                  {isBasic 
                                    ? `${(primarySourcing.nakupni_cena / totalUnits).toFixed(2)} ${primarySourcing.mena}`
                                    : `${primarySourcing.nakupni_cena.toFixed(2)} ${primarySourcing.mena}`
                                  }
                                </span>
                              </div>
                            ) : (
                              <span className="text-xs italic text-zinc-650">Chybí nákup</span>
                            )}
                          </TableCell>
                        )}

                        {visibleColumns.landed_cost && (
                          <TableCell className="text-right py-1.5 px-2">
                            {hasPricing ? (
                              <div className="flex flex-col items-end">
                                <span className="font-bold text-zinc-300 font-mono text-xs">
                                  {formatCurrency(isBasic ? pr.unitLandedCostWithBuffer : pr.totalLandedCostWithBuffer)}
                                </span>
                                <span className="text-[9px] text-zinc-500">
                                  + rezerva {formatCurrency(isBasic ? pr.unitBufferAmount : pr.totalBufferAmount)}
                                </span>
                              </div>
                            ) : "—"}
                          </TableCell>
                        )}

                        {visibleColumns.b2c && (
                          <TableCell className="text-right py-1.5 px-2">
                            {hasPricing ? (
                              <div className="flex flex-col items-end">
                                <span className="font-bold text-zinc-200 font-mono text-xs">
                                  {formatCurrency(isBasic ? pr.b2cUnitPrice : pr.b2cUnitPrice * totalUnits)}
                                </span>
                                <span className="text-[9px] text-green-500 font-semibold">
                                  {p.cilova_marze_retail_procenta || 30}% marže
                                </span>
                              </div>
                            ) : "—"}
                          </TableCell>
                        )}

                        {visibleColumns.b2b && (
                          <TableCell className="text-right border-l border-zinc-800 bg-blue-500/5 py-1.5 px-2">
                            {hasPricing ? (
                              <div className="flex flex-col items-end">
                                <span className="font-bold text-blue-400 font-mono text-xs">
                                  {formatCurrency(isBasic ? pr.b2bUnitPrice : pr.b2bUnitPrice * totalUnits)}
                                </span>
                                <span className="text-[9px] text-blue-500 font-semibold">
                                  {p.cilova_marze_partner_procenta || 20}% marže
                                </span>
                              </div>
                            ) : "—"}
                          </TableCell>
                        )}

                        {visibleColumns.b2b_5 && (
                          <TableCell className="text-right bg-blue-500/5 font-mono text-xs text-zinc-300 py-1.5 px-2">
                            {hasPricing ? formatCurrency(isBasic ? pr.b2bDiscountedPrices[5] : pr.b2bDiscountedPrices[5] * totalUnits) : "—"}
                          </TableCell>
                        )}

                        {visibleColumns.b2b_10 && (
                          <TableCell className="text-right bg-blue-500/5 font-mono text-xs text-zinc-300 py-1.5 px-2">
                            {hasPricing ? formatCurrency(isBasic ? pr.b2bDiscountedPrices[10] : pr.b2bDiscountedPrices[10] * totalUnits) : "—"}
                          </TableCell>
                        )}

                        {visibleColumns.b2b_15 && (
                          <TableCell className="text-right bg-blue-500/5 font-mono text-xs text-zinc-300 py-1.5 px-2">
                            {hasPricing ? formatCurrency(isBasic ? pr.b2bDiscountedPrices[15] : pr.b2bDiscountedPrices[15] * totalUnits) : "—"}
                          </TableCell>
                        )}

                        {visibleColumns.b2b_20 && (
                          <TableCell className="text-right border-r border-zinc-800 bg-blue-500/5 font-mono text-xs text-zinc-300 py-1.5 px-2">
                            {hasPricing ? formatCurrency(isBasic ? pr.b2bDiscountedPrices[20] : pr.b2bDiscountedPrices[20] * totalUnits) : "—"}
                          </TableCell>
                        )}

                        {visibleColumns.risk_margin && (
                          <TableCell className="text-right bg-red-500/5 py-1.5 px-2">
                            {hasPricing ? (
                              <div className="flex flex-col items-end">
                                <span className={cn("font-black text-xs font-mono", (pr.lowMargin || 0) < 15 ? 'text-red-500' : 'text-zinc-400')}>
                                  {formatPercent(pr.lowMargin)}
                                </span>
                                <span className="text-[9px] text-red-550/70">Při slabé CZK</span>
                              </div>
                            ) : "—"}
                          </TableCell>
                        )}

                        {visibleColumns.safe_margin && (
                          <TableCell className="text-right bg-green-500/5 py-1.5 px-2">
                            {hasPricing ? (
                              <div className="flex flex-col items-end">
                                <span className="font-black text-green-500 text-xs font-mono">
                                  {formatPercent(pr.highMargin)}
                                </span>
                                <span className="text-[9px] text-green-550/70">Při silné CZK</span>
                              </div>
                            ) : "—"}
                          </TableCell>
                        )}
                      </>
                    )}
                  </TableRow>
                )
              })}
              {filteredProducts.length === 0 && (
                <TableRow>
                  <TableCell colSpan={visibleColCount} className="text-center h-24 text-zinc-500">Žádné produkty k zobrazení.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </TabsContent>

      <TabsContent value="export" className="space-y-6 max-w-3xl">
        <div className="p-6 bg-zinc-950 border border-zinc-800 rounded-xl space-y-6 shadow-xl">
          <div className="flex items-center gap-2 border-b border-zinc-800 pb-4">
            <Calculator className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-bold text-white tracking-tight">Konfigurátor Klientského Katalogu</h3>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Cílová skupina (Hladina cen)</Label>
              <Select value={exportTier} onValueChange={(val: any) => setExportTier(val)}>
                <SelectTrigger className="bg-zinc-900 border-zinc-800">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-950 border-zinc-800">
                  <SelectItem value="retail">B2C (Retail) - Maloobchod</SelectItem>
                  <SelectItem value="partner">B2B (Partner) - Základní B2B</SelectItem>
                  <SelectItem value="partner_5">B2B (Partner) - Sleva 5%</SelectItem>
                  <SelectItem value="partner_10">B2B (Partner) - Sleva 10%</SelectItem>
                  <SelectItem value="partner_15">B2B (Partner) - Sleva 15%</SelectItem>
                  <SelectItem value="partner_20">B2B (Partner) - Sleva 20%</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Výstupní Měna</Label>
              <Select value={exportCurrency} onValueChange={(val: any) => setExportCurrency(val)}>
                <SelectTrigger className="bg-zinc-900 border-zinc-800">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CZK">CZK (Česká koruna)</SelectItem>
                  <SelectItem value="EUR">EUR (Euro)</SelectItem>
                  <SelectItem value="USD">USD (Americký dolar)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[10px] text-zinc-500 italic">Vypočtená cena bude přepočtena aktuálním kurzem do vybrané měny.</p>
            </div>
            <div className="space-y-2 col-span-2">
              <Label className="text-zinc-200 text-sm font-semibold">Výběr kategorií a podkategorií pro export</Label>
              <div className="border border-zinc-800 rounded-lg bg-zinc-900/50 p-4 space-y-4">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                  <span className="text-[11px] text-zinc-400 font-mono">
                    {selectedCats.length === 0 
                      ? "Vybráno celé portfolio (všechny kategorie)" 
                      : `Vybráno ${selectedCats.length} kategorií, ${selectedSubs.length} podkategorií (${exportFilteredProducts.length} produktů)`}
                  </span>
                  <Button 
                    variant="ghost" 
                    onClick={() => { setSelectedCats([]); setSelectedSubs([]) }}
                    className="text-[10px] text-zinc-500 hover:text-zinc-355 h-6 px-2 hover:bg-zinc-800"
                  >
                    Reset (Celé portfolio)
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[220px] overflow-y-auto pr-2">
                  {categoriesTree.map(cat => {
                    const isCatSelected = selectedCats.includes(cat.id)
                    const catSubs = cat.subs
                    
                    const handleCatChange = (checked: boolean) => {
                      if (checked) {
                        setSelectedCats(prev => [...prev, cat.id])
                      } else {
                        setSelectedCats(prev => prev.filter(c => c !== cat.id))
                        // Remove all subs for this category
                        setSelectedSubs(prev => prev.filter(s => !s.startsWith(`${cat.id}/`)))
                      }
                    }

                    return (
                      <div key={cat.id} className="space-y-2 p-2.5 rounded bg-zinc-950/60 border border-zinc-850">
                        <div className="flex items-center space-x-2">
                          <input 
                            type="checkbox" 
                            id={`cat-${cat.id}`}
                            checked={isCatSelected}
                            onChange={(e) => handleCatChange(e.target.checked)}
                            className="rounded border-zinc-700 bg-zinc-900 text-primary focus:ring-primary h-4 w-4 accent-purple-600"
                          />
                          <Label htmlFor={`cat-${cat.id}`} className="text-xs font-bold text-zinc-200 cursor-pointer select-none">
                            {cat.name}
                          </Label>
                        </div>

                        {catSubs.length > 0 && isCatSelected && (
                          <div className="pl-6 space-y-1.5 border-l border-zinc-800 ml-2 pt-1">
                            <div className="flex items-center gap-2 pb-1 mb-1 border-b border-zinc-900/40">
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedSubs(prev => [
                                    ...prev.filter(s => !s.startsWith(`${cat.id}/`)),
                                    ...catSubs.map(s => `${cat.id}/${s}`)
                                  ])
                                }}
                                className="text-[9px] text-zinc-500 hover:text-zinc-300 font-medium cursor-pointer"
                              >
                                Vybrat vše
                              </button>
                              <span className="text-[9px] text-zinc-700">|</span>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedSubs(prev => prev.filter(s => !s.startsWith(`${cat.id}/`)))
                                }}
                                className="text-[9px] text-zinc-500 hover:text-zinc-300 font-medium cursor-pointer"
                              >
                                Odebrat vše
                              </button>
                            </div>
                            {catSubs.map(sub => {
                              const subKey = `${cat.id}/${sub}`
                              const isSubSelected = selectedSubs.includes(subKey)
                              
                              const handleSubChange = (checked: boolean) => {
                                if (checked) {
                                  setSelectedSubs(prev => [...prev, subKey])
                                } else {
                                  setSelectedSubs(prev => prev.filter(s => s !== subKey))
                                }
                              }

                              return (
                                <div key={sub} className="flex items-center space-x-2">
                                  <input 
                                    type="checkbox" 
                                    id={`sub-${cat.id}-${sub}`}
                                    checked={isSubSelected}
                                    onChange={(e) => handleSubChange(e.target.checked)}
                                    className="rounded border-zinc-750 bg-zinc-900 text-primary focus:ring-primary h-3.5 w-3.5 accent-purple-600"
                                  />
                                  <label htmlFor={`sub-${cat.id}-${sub}`} className="text-[11px] text-zinc-400 hover:text-zinc-250 cursor-pointer select-none">
                                    {SUBCATEGORY_NAMES_CS[sub] || sub}
                                  </label>
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            <div className="space-y-2 col-span-2">
              <Label>Jazyk katalogu</Label>
              <Select value={exportLang} onValueChange={(val: any) => setExportLang(val)}>
                <SelectTrigger className="bg-zinc-900 border-zinc-800">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-950 border-zinc-800">
                  <SelectItem value="cs">Čeština (CS)</SelectItem>
                  <SelectItem value="en">English (EN)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="pt-6 border-t border-zinc-800 flex gap-4">
             <Button 
                onClick={handleGeneratePDF}
                disabled={exportFilteredProducts.length === 0}
                className="flex-1 gap-2 bg-red-600 hover:bg-red-700 text-white"
             >
                <FileText className="h-4 w-4" /> 
                Vygenerovat PDF Katalog (Branded)
             </Button>
             <Button 
                onClick={handleDownloadExcel}
                disabled={isGeneratingExcel || exportFilteredProducts.length === 0}
                className="flex-1 gap-2 bg-green-600 hover:bg-green-700 text-white"
             >
                <Download className="h-4 w-4" /> 
                {isGeneratingExcel ? 'Generuji Excel...' : 'Stáhnout jako Excel (XLSX)'}
             </Button>
          </div>
          <p className="text-center text-[10px] text-zinc-500">
            Export obsahuje pouze položky vybrané ve stromovém filtru výše.
          </p>
          
          <div className="pt-6 border-t border-zinc-900 flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={handleBulkRegenerate}
              disabled={isRegenerating}
              className="text-[10px] text-zinc-500 hover:text-zinc-200 border-zinc-800"
            >
              {isRegenerating ? "Přegeneruji názvy..." : "Administrace: Hromadně přegenerovat názvy produktů (CS/EN)"}
            </Button>
          </div>
        </div>
      </TabsContent>
    </Tabs>
  )
}
