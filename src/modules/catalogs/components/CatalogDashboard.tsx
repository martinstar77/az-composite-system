"use client"

import { useState, useMemo } from "react"
import { Product } from "@/modules/products/types"
import { ExchangeRate, GlobalFinanceSettings } from "@/modules/finance/types"
import { LogisticsTemplate } from "@/modules/finance/types/logistics"
import { calculateProductPricing, PricingBreakdown } from "@/modules/finance/utils/calculations"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table"
import { Badge } from "@/shared/components/ui/badge"
import { Calculator, FileDown, Eye, FileText, Download } from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select"
import { Input } from "@/shared/components/ui/input"
import { Label } from "@/shared/components/ui/label"
import { toast } from "sonner"
import { exportCatalogToExcel } from "../utils/excelExport"
import { pdf } from '@react-pdf/renderer'
import { CatalogPDF } from "./CatalogPDF"
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
  const [exportTier, setExportTier] = useState<"retail" | "partner" | "vip" | "premarket_open">("partner")
  const [exportCurrency, setExportCurrency] = useState<"CZK" | "EUR" | "USD">("EUR")
  const [exportCategory, setExportCategory] = useState<string>("all")
  
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false)
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
              retail: product.cilova_marze_retail_procenta,
              partner: product.cilova_marze_partner_procenta,
              vip: product.cilova_marze_vip_procenta,
              premarketOpen: product.cilova_marze_premarket_open_procenta
            },
            rates,
            settings,
            template
          )
        : null

      return { ...product, pricing }
    })
  }, [products, rates, settings, templates])

  // Filtrace pro tabulku a exporty
  const filteredProducts = useMemo(() => {
    return pricedProducts.filter(p => {
      const matchesSearch = p.nazev.toLowerCase().includes(searchTerm.toLowerCase()) || p.sku.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesCategory = exportCategory === "all" || p.kategorie_id === exportCategory
      return matchesSearch && matchesCategory
    })
  }, [pricedProducts, searchTerm, exportCategory])

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

  const handleGeneratePDF = async () => {
    setIsGeneratingPdf(true);
    try {
      const exchangeRate = getTargetExchangeRate();
      const blob = await pdf(
        <CatalogPDF 
          products={filteredProducts} 
          tier={exportTier} 
          targetCurrency={exportCurrency} 
          exchangeRate={exchangeRate} 
        />
      ).toBlob();
      saveAs(blob, `AZ_Composites_Katalog_${exportTier.toUpperCase()}_${exportCurrency}.pdf`);
      toast.success("PDF katalog vygenerován");
    } catch (e: any) {
      toast.error("Chyba při generování PDF", { description: e.message });
    } finally {
      setIsGeneratingPdf(false);
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

  // Unikátní kategorie pro filtr
  const categories = Array.from(new Set(products.map(p => p.c_kategorie?.nazev).filter(Boolean))) as string[]

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
        <div className="flex gap-4 items-center bg-zinc-900/50 p-3 rounded-lg border border-zinc-800">
          <Input 
            placeholder="Hledat produkt..." 
            value={searchTerm} 
            onChange={e => setSearchTerm(e.target.value)}
            className="max-w-sm bg-zinc-950 border-zinc-800"
          />
          <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">
            Zobrazeno {filteredProducts.length} položek
          </div>
        </div>

        {/* Tabulka Price Matrix */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 overflow-hidden shadow-2xl overflow-x-auto">
          <Table className="whitespace-nowrap">
            <TableHeader className="bg-zinc-900/80">
              <TableRow className="hover:bg-transparent border-zinc-800">
                <TableHead className="text-zinc-400 font-bold text-[10px] uppercase">Produkt & SKU</TableHead>
                <TableHead className="text-zinc-400 font-bold text-[10px] uppercase">Sourcing (1 MJ)</TableHead>
                <TableHead className="text-zinc-400 font-bold text-[10px] uppercase text-right">Landed Cost (CZK)</TableHead>
                <TableHead className="text-zinc-400 font-bold text-[10px] uppercase text-right">Retail Cena</TableHead>
                <TableHead className="text-zinc-400 font-bold text-[10px] uppercase text-right border-x border-zinc-800 bg-blue-500/5">Partner (B2B)</TableHead>
                <TableHead className="text-zinc-400 font-bold text-[10px] uppercase text-right">VIP Cena</TableHead>
                <TableHead className="text-zinc-400 font-bold text-[10px] uppercase text-right border-x border-zinc-800 bg-yellow-500/5">Premarket Open</TableHead>
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
                          <span className="font-bold">{formatCurrency(pr.retailUnitPrice)}</span>
                          <span className="text-[9px] text-green-500">{p.cilova_marze_retail_procenta}% marže</span>
                        </div>
                      ) : "—"}
                    </TableCell>

                    <TableCell className="text-right border-x border-zinc-800 bg-blue-500/5">
                      {hasPricing ? (
                        <div className="flex flex-col items-end">
                          <span className="font-bold text-blue-400">{formatCurrency(pr.partnerUnitPrice)}</span>
                          <span className="text-[9px] text-blue-500">{p.cilova_marze_partner_procenta}% marže</span>
                        </div>
                      ) : "—"}
                    </TableCell>

                    <TableCell className="text-right">
                      {hasPricing ? (
                        <div className="flex flex-col items-end">
                          <span className="font-bold">{formatCurrency(pr.vipUnitPrice)}</span>
                          <span className="text-[9px] text-green-500">{p.cilova_marze_vip_procenta}% marže</span>
                        </div>
                      ) : "—"}
                    </TableCell>

                    <TableCell className="text-right border-x border-zinc-800 bg-yellow-500/5">
                      {hasPricing ? (
                        <div className="flex flex-col items-end">
                          <span className="font-bold text-yellow-500">{formatCurrency(pr.premarketOpenUnitPrice)}</span>
                          <span className="text-[9px] text-yellow-600">{p.cilova_marze_premarket_open_procenta}% marže</span>
                        </div>
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
                  <TableCell colSpan={8} className="text-center h-24 text-zinc-500">Žádné produkty k zobrazení.</TableCell>
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
                  <SelectItem value="retail">B2C (Retail) - Nejvyšší ceny</SelectItem>
                  <SelectItem value="partner">B2B (Partner) - Střední ceny</SelectItem>
                  <SelectItem value="vip">VIP (Výroba) - Ceny pro výrobu</SelectItem>
                  <SelectItem value="premarket_open">Premarket Open - Speciální ceny</SelectItem>
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
              <Select value={exportCategory} onValueChange={(val) => setExportCategory(val || "")}>
                <SelectTrigger className="bg-zinc-900 border-zinc-800">
                  <SelectValue placeholder="Všechny kategorie" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Celé portfolio (Všechny kategorie)</SelectItem>
                  {products.reduce((acc, p) => {
                    if (p.kategorie_id && !acc.some(x => x.id === p.kategorie_id)) {
                      acc.push({ id: p.kategorie_id, name: p.c_kategorie?.nazev || p.kategorie_id })
                    }
                    return acc
                  }, [] as {id: string, name: string}[]).map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="pt-6 border-t border-zinc-800 flex gap-4">
             <Button 
                onClick={handleGeneratePDF}
                disabled={isGeneratingPdf || filteredProducts.length === 0}
                className="flex-1 gap-2 bg-red-600 hover:bg-red-700 text-white"
             >
                <FileText className="h-4 w-4" /> 
                {isGeneratingPdf ? 'Generuji PDF...' : 'Vygenerovat PDF Katalog (Branded)'}
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

