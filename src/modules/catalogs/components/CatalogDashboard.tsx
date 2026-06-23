"use client"

import { useState, useMemo } from "react"
import { Product } from "@/modules/products/types"
import { ExchangeRate, GlobalFinanceSettings } from "@/modules/finance/types"
import { LogisticsTemplate } from "@/modules/finance/types/logistics"
import { calculateProductPricing, PricingBreakdown } from "@/modules/finance/utils/calculations"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table"
import { Badge } from "@/shared/components/ui/badge"
import { Calculator, FileDown, Eye, FileText, Download, Search, FilterX, ArrowUpDown } from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select"
import { Input } from "@/shared/components/ui/input"
import { Label } from "@/shared/components/ui/label"
import { toast } from "sonner"
import { exportCatalogToExcel } from "../utils/excelExport"
import { saveAs } from 'file-saver'

// Zde definujeme rozšířený typ produktu pro naši tabulku
interface PricedProduct extends Product {
  pricing: PricingBreakdown | null
}

interface CatalogDashboardProps {
  products: Product[]
  rates: ExchangeRate[]
  settings: GlobalFinanceSettings
  templates: LogisticsTemplate[]
}

export function CatalogDashboard({ products, rates, settings, templates }: CatalogDashboardProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [exportTier, setExportTier] = useState<"retail" | "partner" | "partner_5" | "partner_10" | "partner_15" | "partner_20">("partner")
  const [exportCurrency, setExportCurrency] = useState<"CZK" | "EUR" | "USD">("EUR")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [sortField, setSortField] = useState<"nazev" | "sku" | "kategorie" | "landed_cost" | null>("nazev")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")
  
  const [isGeneratingExcel, setIsGeneratingExcel] = useState(false)

  // Zpracování dat a výpočet všech cen v reálném čase
  const pricedProducts = useMemo<PricedProduct[]>(() => {
    return products.map(product => {
      const primarySourcing = product.produkt_dodavatel?.find(s => s.is_primary) || product.produkt_dodavatel?.[0]
      const template = primarySourcing?.logisticka_sablona_id 
        ? templates.find(t => t.id === primarySourcing.logisticka_sablona_id)
        : null

      const pricing = primarySourcing 
        ? calculateProductPricing(
            primarySourcing.nakupni_cena,
            primarySourcing.mena,
            primarySourcing.prevodni_pomer_na_zakladni || 1,
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
            }
          )
        : null

      return { ...product, pricing }
    })
  }, [products, rates, settings, templates])

  // Získání unikátních kategorií z produktů
  const availableCategories = useMemo(() => {
    const list: { id: string; name: string }[] = [];
    products.forEach(p => {
      if (p.kategorie_id && !list.some(item => item.id === p.kategorie_id)) {
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

  // Filtrace a řazení pro tabulku a exporty
  const filteredProducts = useMemo(() => {
    let result = pricedProducts.filter(p => {
      const matchesSearch = 
        p.nazev.toLowerCase().includes(searchTerm.toLowerCase()) || 
        p.sku.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCategory = categoryFilter === "all" || p.kategorie_id === categoryFilter;
      const matchesStatus = statusFilter === "all" || p.stav_katalogu_id === statusFilter;
      
      return matchesSearch && matchesCategory && matchesStatus;
    });

    if (sortField) {
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
        } else if (sortField === "landed_cost") {
          valA = a.pricing?.unitLandedCostWithBuffer || 0;
          valB = b.pricing?.unitLandedCostWithBuffer || 0;
        }

        if (typeof valA === "string") {
          return sortDirection === "asc" 
            ? valA.localeCompare(valB, 'cs') 
            : valB.localeCompare(valA, 'cs');
        } else {
          return sortDirection === "asc" 
            ? valA - valB 
            : valB - valA;
        }
      });
    }

    return result;
  }, [pricedProducts, searchTerm, categoryFilter, statusFilter, sortField, sortDirection])

  const handleSort = (field: "nazev" | "sku" | "kategorie" | "landed_cost") => {
    if (sortField === field) {
      setSortDirection(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

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
      exportCatalogToExcel(filteredProducts, exportTier, exportCurrency, exchangeRate);
      toast.success("Excel ceník byl úspěšně vygenerován.");
    } catch (e: any) {
      toast.error("Chyba při generování Excelu", { description: e.message });
    } finally {
      setIsGeneratingExcel(false);
    }
  }

  const handleGeneratePDF = () => {
    try {
      const url = `/api/katalogy/pdf?tier=${exportTier}&currency=${exportCurrency}&category=${categoryFilter}&status=${statusFilter}&search=${encodeURIComponent(searchTerm)}`
      window.open(url, '_blank')
      toast.success("PDF katalog se otevírá v nové záložce.")
    } catch (e: any) {
      toast.error("Chyba při otevírání PDF", { description: e.message })
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
        {/* Filtry pro Matrix */}
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between bg-zinc-900/50 p-3 rounded-lg border border-zinc-800">
          <div className="flex flex-1 flex-wrap items-center gap-3 w-full">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-500" />
              <Input 
                placeholder="Hledat podle názvu nebo SKU..." 
                value={searchTerm} 
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-9 bg-zinc-950 border-zinc-800 h-9 text-sm"
              />
            </div>

            <div className="w-[180px]">
              <Select value={categoryFilter} onValueChange={(val) => setCategoryFilter(val || "all")}>
                <SelectTrigger className="bg-zinc-950 border-zinc-800 h-9 text-xs">
                  <SelectValue placeholder="Všechny kategorie" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-950 border-zinc-800">
                  <SelectItem value="all">Všechny kategorie</SelectItem>
                  {availableCategories.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="w-[150px]">
              <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val || "all")}>
                <SelectTrigger className="bg-zinc-950 border-zinc-800 h-9 text-xs">
                  <SelectValue placeholder="Všechny stavy" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-950 border-zinc-800">
                  <SelectItem value="all">Všechny stavy</SelectItem>
                  {availableStatuses.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {(searchTerm || categoryFilter !== "all" || statusFilter !== "all") && (
              <Button 
                variant="ghost" 
                onClick={() => {
                  setSearchTerm("");
                  setCategoryFilter("all");
                  setStatusFilter("all");
                }}
                className="h-9 px-2 text-zinc-500 hover:text-zinc-200 text-xs"
              >
                <FilterX className="h-4 w-4 mr-2" /> Reset
              </Button>
            )}
          </div>

          <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">
            Zobrazeno {filteredProducts.length} z {products.length} položek
          </div>
        </div>

        {/* Tabulka Price Matrix */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 overflow-hidden shadow-2xl overflow-x-auto">
          <Table className="whitespace-nowrap">
            <TableHeader className="bg-zinc-900/80">
              <TableRow className="hover:bg-transparent border-zinc-800">
                <TableHead className="text-zinc-400 font-bold text-[10px] uppercase">
                  <Button 
                    variant="ghost" 
                    onClick={() => handleSort("nazev")} 
                    className="text-zinc-400 hover:text-zinc-200 font-bold text-[10px] uppercase tracking-wider h-8 p-1 -ml-1 hover:bg-transparent"
                  >
                    Produkt & SKU
                    <ArrowUpDown className="ml-1 h-3 w-3 inline-block" />
                  </Button>
                </TableHead>
                <TableHead className="text-zinc-400 font-bold text-[10px] uppercase">Sourcing (1 MJ)</TableHead>
                <TableHead className="text-zinc-400 font-bold text-[10px] uppercase text-right">
                  <Button 
                    variant="ghost" 
                    onClick={() => handleSort("landed_cost")} 
                    className="text-zinc-400 hover:text-zinc-200 font-bold text-[10px] uppercase tracking-wider h-8 p-1 ml-auto hover:bg-transparent"
                  >
                    Landed Cost (CZK)
                    <ArrowUpDown className="ml-1 h-3 w-3 inline-block" />
                  </Button>
                </TableHead>
                <TableHead className="text-zinc-400 font-bold text-[10px] uppercase text-right">B2C Retail</TableHead>
                <TableHead className="text-zinc-400 font-bold text-[10px] uppercase text-right border-l border-zinc-800 bg-blue-500/5">B2B Partner</TableHead>
                <TableHead className="text-zinc-400 font-bold text-[10px] uppercase text-right bg-blue-500/5">B2B -5 %</TableHead>
                <TableHead className="text-zinc-400 font-bold text-[10px] uppercase text-right bg-blue-500/5">B2B -10 %</TableHead>
                <TableHead className="text-zinc-400 font-bold text-[10px] uppercase text-right bg-blue-500/5">B2B -15 %</TableHead>
                <TableHead className="text-zinc-400 font-bold text-[10px] uppercase text-right border-r border-zinc-800 bg-blue-500/5">B2B -20 %</TableHead>
                <TableHead className="text-zinc-400 font-bold text-[10px] uppercase text-right bg-red-500/5">Risk Marže</TableHead>
                <TableHead className="text-zinc-400 font-bold text-[10px] uppercase text-right bg-green-500/5">Safe Marže</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.map(p => {
                const pr = p.pricing
                const hasPricing = !!pr
                return (
                  <TableRow key={p.id} className="hover:bg-zinc-900/50 border-zinc-800">
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-bold text-sm text-zinc-200">{p.nazev}</span>
                        <span className="text-[10px] font-mono text-zinc-500">{p.sku}</span>
                        {p.produkt_mnozstevni_slevy && p.produkt_mnozstevni_slevy.length > 0 && (
                          <Badge variant="outline" className="border-primary/50 text-primary bg-primary/5 text-[9px] py-0 px-1 mt-1 w-fit">
                            Množstevní slevy ({p.produkt_mnozstevni_slevy.length})
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      {hasPricing ? (
                        <div className="flex flex-col">
                          <span className="text-xs font-mono">{pr.unitPurchasePriceCzk.toFixed(2)} CZK</span>
                          <span className="text-[10px] text-zinc-500">Měna: {pr.currency}</span>
                        </div>
                      ) : (
                        <span className="text-xs italic text-zinc-600">Chybí nákup</span>
                      )}
                    </TableCell>

                    <TableCell className="text-right">
                      {hasPricing ? (
                        <div className="flex flex-col items-end">
                          <span className="font-bold text-zinc-300">{formatCurrency(pr.unitLandedCostWithBuffer)}</span>
                          <span className="text-[9px] text-zinc-500">+ rezerva {formatCurrency(pr.unitBufferAmount)}</span>
                        </div>
                      ) : "—"}
                    </TableCell>

                    <TableCell className="text-right">
                      {hasPricing ? (
                        <div className="flex flex-col items-end">
                          <span className="font-bold">{formatCurrency(pr.b2cUnitPrice)}</span>
                          <span className="text-[9px] text-green-500">{p.cilova_marze_retail_procenta}% marže</span>
                        </div>
                      ) : "—"}
                    </TableCell>

                    <TableCell className="text-right border-l border-zinc-800 bg-blue-500/5">
                      {hasPricing ? (
                        <div className="flex flex-col items-end">
                          <span className="font-bold text-blue-400">{formatCurrency(pr.b2bUnitPrice)}</span>
                          <span className="text-[9px] text-blue-500">{p.cilova_marze_partner_procenta}% marže</span>
                        </div>
                      ) : "—"}
                    </TableCell>

                    <TableCell className="text-right bg-blue-500/5">
                      {hasPricing ? (
                        <span className="font-mono text-xs text-zinc-300">{formatCurrency(pr.b2bDiscountedPrices[5])}</span>
                      ) : "—"}
                    </TableCell>

                    <TableCell className="text-right bg-blue-500/5">
                      {hasPricing ? (
                        <span className="font-mono text-xs text-zinc-300">{formatCurrency(pr.b2bDiscountedPrices[10])}</span>
                      ) : "—"}
                    </TableCell>

                    <TableCell className="text-right bg-blue-500/5">
                      {hasPricing ? (
                        <span className="font-mono text-xs text-zinc-300">{formatCurrency(pr.b2bDiscountedPrices[15])}</span>
                      ) : "—"}
                    </TableCell>

                    <TableCell className="text-right border-r border-zinc-800 bg-blue-500/5">
                      {hasPricing ? (
                        <span className="font-mono text-xs text-zinc-300">{formatCurrency(pr.b2bDiscountedPrices[20])}</span>
                      ) : "—"}
                    </TableCell>

                    <TableCell className="text-right bg-red-500/5">
                      {hasPricing ? (
                        <div className="flex flex-col items-end">
                          <span className={`font-black ${pr.lowMargin < 15 ? 'text-red-500' : 'text-zinc-400'}`}>
                            {formatPercent(pr.lowMargin)}
                          </span>
                          <span className="text-[9px] text-red-500/70">Při slabé CZK</span>
                        </div>
                      ) : "—"}
                    </TableCell>

                    <TableCell className="text-right bg-green-500/5">
                      {hasPricing ? (
                        <div className="flex flex-col items-end">
                          <span className="font-black text-green-500">
                            {formatPercent(pr.highMargin)}
                          </span>
                          <span className="text-[9px] text-green-500/70">Při silné CZK</span>
                        </div>
                      ) : "—"}
                    </TableCell>
                  </TableRow>
                )
              })}
              {filteredProducts.length === 0 && (
                <TableRow>
                  <TableCell colSpan={11} className="text-center h-24 text-zinc-500">Žádné produkty k zobrazení.</TableCell>
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
              <Label>Filtr Kategorie (Volitelné)</Label>
              <Select value={categoryFilter} onValueChange={(val) => setCategoryFilter(val || "all")}>
                <SelectTrigger className="bg-zinc-900 border-zinc-800">
                  <SelectValue placeholder="Všechny kategorie" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Celé portfolio (Všechny kategorie)</SelectItem>
                  {availableCategories.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="pt-6 border-t border-zinc-800 flex gap-4">
             <Button 
                onClick={handleGeneratePDF}
                disabled={filteredProducts.length === 0}
                className="flex-1 gap-2 bg-red-600 hover:bg-red-700 text-white"
             >
                <FileText className="h-4 w-4" /> 
                Vygenerovat PDF Katalog (Branded)
             </Button>
             <Button 
                onClick={handleDownloadExcel}
                disabled={isGeneratingExcel || filteredProducts.length === 0}
                className="flex-1 gap-2 bg-green-600 hover:bg-green-700 text-white"
             >
                <Download className="h-4 w-4" /> 
                {isGeneratingExcel ? 'Generuji Excel...' : 'Stáhnout jako Excel (XLSX)'}
             </Button>
          </div>
          <p className="text-center text-[10px] text-zinc-500">
            Export obsahuje pouze viditelná (vyfiltrovaná) data z tabulky. Vyfiltrujte kategorii výše pro specifický ceník.
          </p>
        </div>
      </TabsContent>
    </Tabs>
  )
}
