"use client"

import { useState, useMemo } from "react"
import { ExchangeRate, GlobalFinanceSettings } from "@/modules/finance/types"
import { SortingState } from "@tanstack/react-table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/shared/components/ui/dialog"
import { Label } from "@/shared/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select"
import { Button } from "@/shared/components/ui/button"
import { Calculator, Download, FileText } from "lucide-react"
import { toast } from "sonner"
import { getProductSubcategory, SUBCATEGORY_NAMES_CS, CATEGORY_TO_SUBCATS } from "../utils/catalogHelpers"
import { exportCatalogToExcel } from "../utils/excelExport"
import { bulkRegenerateProductNames } from "../actions"
import { RefreshCw } from "lucide-react"

interface ExportPricingDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  products: any[] // Očekává seznam produktů, ideálně PricedProduct včetně `pricing`
  globalFilter: string
  rates: ExchangeRate[]
  settings: GlobalFinanceSettings
  viewMode: "products" | "cogs" | "sales"
  unitMode: "basic" | "packaging"
  sorting?: SortingState
  selectedStatuses?: string[]
  categories: any[]
}

export function ExportPricingDialog({ open, onOpenChange, products, globalFilter, rates, settings, viewMode, unitMode, sorting, selectedStatuses, categories }: ExportPricingDialogProps) {
  const [exportTier, setExportTier] = useState<"retail" | "partner" | "partner_5" | "partner_10" | "partner_15" | "partner_20">("partner")
  const [exportCurrency, setExportCurrency] = useState<"CZK" | "EUR" | "USD">("EUR")
  const [exportLang, setExportLang] = useState<"cs" | "en">("cs")
  
  const [selectedCats, setSelectedCats] = useState<string[]>([])
  const [selectedSubs, setSelectedSubs] = useState<string[]>([])
  
  const [isGeneratingExcel, setIsGeneratingExcel] = useState(false)
  const [isRegenerating, setIsRegenerating] = useState(false)

  // Hierarchy of categories and subcategories
  const categoriesTree = useMemo(() => {
    return categories
      .filter(c => !['prepregy', 'cores_standard', 'cores_active'].includes(c.id))
      .map(c => {
        const subs = CATEGORY_TO_SUBCATS[c.id] || []
        return {
          id: c.id,
          name: c.nazev || c.id,
          subs: [...subs].sort()
        }
      })
      .sort((a, b) => a.name.localeCompare(b.name, 'cs'))
  }, [categories])

  const exportFilteredProducts = useMemo(() => {
    let filtered = products.filter(p => {
      const matchesSearch = 
        (p.nazev || '').toLowerCase().includes((globalFilter || '').toLowerCase()) || 
        (p.sku || '').toLowerCase().includes((globalFilter || '').toLowerCase());
      
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
      
      const matchesStatus = (!selectedStatuses || selectedStatuses.length === 0) ? true : selectedStatuses.includes(p.stav_katalogu_id);

      return matchesSearch && matchesCategory && matchesSubcategory && matchesStatus;
    });

    if (sorting && sorting.length > 0) {
      const sortField = sorting[0].id;
      const desc = sorting[0].desc;
      
      filtered.sort((a, b) => {
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
        } else if (sortField === "landed_cost") {
          valA = a.pricing?.landedCost || 0;
          valB = b.pricing?.landedCost || 0;
        } else if (sortField === "cogs") {
          valA = a.pricing?.cogs || 0;
          valB = b.pricing?.cogs || 0;
        } else if (sortField === "prodejni_cena_1") {
          valA = a.pricing?.retailPrice || 0;
          valB = b.pricing?.retailPrice || 0;
        } else if (sortField === "hruba_marze_1") {
          valA = a.pricing?.retailMargin || 0;
          valB = b.pricing?.retailMargin || 0;
        } else if (sortField === "stav_katalogu_id") {
          valA = a.stav_katalogu_id || "";
          valB = b.stav_katalogu_id || "";
        }

        if (valA < valB) return desc ? 1 : -1;
        if (valA > valB) return desc ? -1 : 1;
        return 0;
      });
    }

    return filtered;
  }, [products, globalFilter, selectedCats, selectedSubs, selectedStatuses, sorting])

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
      const statusParam = selectedStatuses && selectedStatuses.length > 0 ? selectedStatuses.join(',') : 'all'
      const url = `/api/katalogy/pdf?tier=${exportTier}&currency=${exportCurrency}&categories=${encodeURIComponent(catsParam)}&subcategories=${encodeURIComponent(subsParam)}&status=${encodeURIComponent(statusParam)}&lang=${exportLang}&search=${encodeURIComponent(globalFilter)}`
      window.open(url, '_blank')
      toast.success("PDF katalog se otevírá v nové záložce.")
    } catch (e: any) {
      toast.error("Chyba při otevírání PDF", { description: e.message })
    }
  }

  const handleGenerateMatrixPDF = () => {
    try {
      const catsParam = selectedCats.join(',')
      const subsParam = selectedSubs.join(',')
      const actualViewMode = viewMode === "products" ? "sales" : viewMode
      const statusParam = selectedStatuses && selectedStatuses.length > 0 ? selectedStatuses.join(',') : 'all'

      let sortFieldParam = 'name'
      let sortDirectionParam = 'asc'
      if (sorting && sorting.length > 0) {
        sortFieldParam = sorting[0].id
        sortDirectionParam = sorting[0].desc ? 'desc' : 'asc'
      }

      const url = `/api/katalogy/pdf?mode=matrix&viewMode=${actualViewMode}&unitMode=${unitMode}&tier=${exportTier}&currency=${exportCurrency}&categories=${encodeURIComponent(catsParam)}&subcategories=${encodeURIComponent(subsParam)}&status=${encodeURIComponent(statusParam)}&lang=${exportLang}&search=${encodeURIComponent(globalFilter)}&sortField=${sortFieldParam}&sortDirection=${sortDirectionParam}`
      window.open(url, '_blank')
      toast.success("PDF Price Matrix se otevírá v nové záložce.")
    } catch (e: any) {
      toast.error("Chyba při otevírání PDF Matrix", { description: e.message })
    }
  }

  const handleBulkRegenerate = async () => {
    if (!window.confirm("Opravdu chcete hromadně přegenerovat názvy u všech produktů s automatickým generováním? Všechny české názvy budou přeloženy do češtiny (např. Carbon -> Uhlíková) a anglické názvy budou vygenerovány v EN.")) {
      return
    }
    setIsRegenerating(true)
    try {
      toast.loading("Hromadně přegenerovávám názvy produktů...", { id: "regenerate" })
      const result = await bulkRegenerateProductNames()
      if (result.success) {
        toast.success(`Názvy úspěšně přegenerovány. Aktualizováno: ${result.updatedCount}`, { id: "regenerate" })
        // You might want to trigger a refresh here if possible. Since we're in a drawer, 
        // the parent component handles data fetching, so we just show the success toast.
      } else {
        throw new Error(result.error || "Neznámá chyba")
      }
    } catch (e: any) {
      toast.error("Chyba při přegenerování názvů", { description: e.message, id: "regenerate" })
    } finally {
      setIsRegenerating(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full sm:max-w-4xl bg-zinc-950 border border-zinc-800 overflow-y-auto max-h-[90vh]">
        <DialogHeader className="mb-6 border-b border-zinc-800 pb-4">
          <DialogTitle className="flex items-center gap-2 text-xl text-white">
            <Calculator className="h-5 w-5 text-primary" />
            Generátor Exportů (PDF / Excel)
          </DialogTitle>
          <DialogDescription className="text-zinc-400 text-xs">
            Vygenerujte si klientský katalog pro specifickou cenovou hladinu a jazyk.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Cílová skupina (Hladina cen)</Label>
              <Select value={exportTier} onValueChange={(val: any) => setExportTier(val)}>
                <SelectTrigger className="bg-zinc-900 border-zinc-800 text-zinc-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-950 border-zinc-800 text-zinc-200">
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
                <SelectTrigger className="bg-zinc-900 border-zinc-800 text-zinc-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-950 border-zinc-800 text-zinc-200">
                  <SelectItem value="CZK">CZK (Česká koruna)</SelectItem>
                  <SelectItem value="EUR">EUR (Euro)</SelectItem>
                  <SelectItem value="USD">USD (Americký dolar)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[10px] text-zinc-500 italic">Vypočtená cena bude přepočtena aktuálním kurzem.</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-zinc-200 text-sm font-semibold">Výběr kategorií a podkategorií pro export</Label>
            <div className="border border-zinc-800 rounded-lg bg-zinc-900/50 p-4 space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                <span className="text-[11px] text-zinc-400 font-mono">
                  {selectedCats.length === 0 
                    ? "Vybráno celé portfolio" 
                    : `Vybráno ${selectedCats.length} kategorií, ${selectedSubs.length} podkategorií (${exportFilteredProducts.length} produktů)`}
                </span>
                <Button 
                  variant="ghost" 
                  onClick={() => { setSelectedCats([]); setSelectedSubs([]) }}
                  className="text-[10px] text-zinc-500 hover:text-zinc-350 h-6 px-2 hover:bg-zinc-800"
                >
                  Reset (Celé portfolio)
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[300px] overflow-y-auto pr-2">
                {categoriesTree.map(cat => {
                  const isCatSelected = selectedCats.includes(cat.id)
                  const catSubs = cat.subs
                  
                  const handleCatChange = (checked: boolean) => {
                    if (checked) {
                      setSelectedCats(prev => [...prev, cat.id])
                    } else {
                      setSelectedCats(prev => prev.filter(c => c !== cat.id))
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
                          className="rounded border-zinc-700 bg-zinc-900 text-primary h-4 w-4 accent-purple-600"
                        />
                        <Label htmlFor={`cat-${cat.id}`} className="text-xs font-bold text-zinc-200 cursor-pointer">
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
                              className="text-[9px] text-zinc-500 hover:text-zinc-300 font-medium"
                            >
                              Vybrat vše
                            </button>
                            <span className="text-[9px] text-zinc-700">|</span>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedSubs(prev => prev.filter(s => !s.startsWith(`${cat.id}/`)))
                              }}
                              className="text-[9px] text-zinc-500 hover:text-zinc-300 font-medium"
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
                                  className="rounded border-zinc-750 bg-zinc-900 text-primary h-3.5 w-3.5 accent-purple-600"
                                />
                                <label htmlFor={`sub-${cat.id}-${sub}`} className="text-[11px] text-zinc-400 hover:text-zinc-200 cursor-pointer">
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

          <div className="space-y-2">
            <Label>Jazyk katalogu</Label>
            <Select value={exportLang} onValueChange={(val: any) => setExportLang(val)}>
              <SelectTrigger className="bg-zinc-900 border-zinc-800 text-zinc-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-950 border-zinc-800 text-zinc-200">
                <SelectItem value="cs">Čeština (CS)</SelectItem>
                <SelectItem value="en">English (EN)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="pt-6 border-t border-zinc-800 flex flex-col gap-4">
             <div className="flex flex-col gap-2">
               <div className="flex gap-4">
                 <Button 
                    onClick={handleGeneratePDF}
                    disabled={exportFilteredProducts.length === 0}
                    className="flex-1 gap-2 bg-red-600 hover:bg-red-700 text-white"
                 >
                    <FileText className="h-4 w-4" /> 
                    Vygenerovat PDF Katalog (Branded)
                 </Button>
                 <Button 
                    onClick={handleGenerateMatrixPDF}
                    disabled={exportFilteredProducts.length === 0}
                    className="flex-1 gap-2 bg-blue-600 hover:bg-blue-700 text-white"
                 >
                    <FileText className="h-4 w-4" /> 
                    Exportovat Price Matrix (PDF)
                 </Button>
               </div>
               <Button 
                  onClick={handleDownloadExcel}
                  disabled={isGeneratingExcel || exportFilteredProducts.length === 0}
                  className="w-full gap-2 bg-green-600 hover:bg-green-700 text-white"
               >
                  <Download className="h-4 w-4" /> 
                  {isGeneratingExcel ? 'Generuji Excel...' : 'Stáhnout jako Excel (XLSX)'}
               </Button>
             </div>
             
             <div className="border-t border-zinc-800 pt-4 mt-2">
                <Button 
                   onClick={handleBulkRegenerate}
                   disabled={isRegenerating}
                   variant="outline"
                   className="w-full gap-2 border-zinc-700 text-zinc-300 hover:text-white hover:bg-zinc-800"
                >
                   <RefreshCw className={`h-4 w-4 ${isRegenerating ? "animate-spin" : ""}`} /> 
                   {isRegenerating ? "Přegenerovávám..." : "Administrace: Hromadně přegenerovat názvy všech produktů"}
                </Button>
                <p className="text-[10px] text-zinc-500 text-center mt-2">
                  Tato akce přepíše vygenerované názvy u všech produktů v systému na základě jejich aktuálních specifikací.
                </p>
             </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
