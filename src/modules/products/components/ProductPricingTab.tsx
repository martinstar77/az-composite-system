"use client"

import { useState, useEffect } from "react"
import { DollarSign, Info, Calculator, TrendingUp, AlertTriangle, Truck, Banknote, ShieldCheck, ArrowRightLeft, Edit2, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { Label } from "@/shared/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/shared/components/ui/dialog"
import { Badge } from "@/shared/components/ui/badge"
import { Product } from "@/modules/products/types"
import { ExchangeRate, GlobalFinanceSettings } from "@/modules/finance/types"
import { calculateProductPricing, PricingBreakdown } from "@/modules/finance/utils/calculations"
import { LogisticsTemplate } from "@/modules/finance/types/logistics"
import { updateProductMargins, getProductQuantityBreaks, saveProductQuantityBreaks } from "../actions"

interface ProductPricingTabProps {
  product: Product
  sourcingData: any[]
  rates: ExchangeRate[]
  settings: GlobalFinanceSettings
  templates: LogisticsTemplate[]
}

export function ProductPricingTab({ product, sourcingData, rates, settings, templates }: ProductPricingTabProps) {
  const [isEditingMargins, setIsEditingMargins] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [margins, setMargins] = useState({
    retail: product.cilova_marze_retail_procenta || 30,
    partner: product.cilova_marze_partner_procenta || 20
  })
  const primarySourcing = sourcingData.find(s => s.is_primary) || sourcingData[0]
  const hasPrimary = sourcingData.some(s => s.is_primary)
  
  const template = primarySourcing?.logisticka_sablona_id 
    ? templates.find(t => t.id === primarySourcing.logisticka_sablona_id)
    : null

  const breakdown = primarySourcing 
    ? calculateProductPricing(
        primarySourcing.nakupni_cena,
        primarySourcing.mena,
        primarySourcing.prevodni_pomer_na_zakladni || 1, // totalUnits
        product.hmotnost_baliku_kg || 0,
        product.clo_procenta,
        {
          retail: margins.retail,
          partner: margins.partner
        },
        rates,
        settings,
        template
      )
    : null

  const cost = breakdown?.unitLandedCostWithBuffer || 0

  // Bidirectional pricing state
  const [tempMargins, setTempMargins] = useState({
    retail: product.cilova_marze_retail_procenta || 30,
    partner: product.cilova_marze_partner_procenta || 20
  })
  const [tempPrices, setTempPrices] = useState({
    retail: 0,
    partner: 0
  })

  // Quantity Breaks State
  const [quantityBreaks, setQuantityBreaks] = useState<Array<{ id?: string, mnozstvi_od: number, typ_zakaznika: 'B2C' | 'B2B', sleva_procenta: number }>>([])
  const [loadingBreaks, setLoadingBreaks] = useState(true)
  const [isSavingBreaks, setIsSavingBreaks] = useState(false)

  useEffect(() => {
    if (isEditingMargins && cost > 0) {
      setTempMargins({
        retail: margins.retail,
        partner: margins.partner
      })
      setTempPrices({
        retail: Number((cost / (1 - margins.retail / 100)).toFixed(2)),
        partner: Number((cost / (1 - margins.partner / 100)).toFixed(2))
      })
    }
  }, [isEditingMargins, margins, cost])

  const handleRetailMarginChange = (val: string) => {
    const margin = parseFloat(val) || 0
    setTempMargins(prev => ({ ...prev, retail: margin }))
    if (margin < 100) {
      const price = cost / (1 - margin / 100)
      setTempPrices(prev => ({ ...prev, retail: Number(price.toFixed(2)) }))
    }
  }

  const handleRetailPriceChange = (val: string) => {
    const price = parseFloat(val) || 0
    setTempPrices(prev => ({ ...prev, retail: price }))
    if (price > 0 && cost > 0) {
      const margin = (1 - cost / price) * 100
      setTempMargins(prev => ({ ...prev, retail: Number(margin.toFixed(2)) }))
    } else {
      setTempMargins(prev => ({ ...prev, retail: 0 }))
    }
  }

  const handlePartnerMarginChange = (val: string) => {
    const margin = parseFloat(val) || 0
    setTempMargins(prev => ({ ...prev, partner: margin }))
    if (margin < 100) {
      const price = cost / (1 - margin / 100)
      setTempPrices(prev => ({ ...prev, partner: Number(price.toFixed(2)) }))
    }
  }

  const handlePartnerPriceChange = (val: string) => {
    const price = parseFloat(val) || 0
    setTempPrices(prev => ({ ...prev, partner: price }))
    if (price > 0 && cost > 0) {
      const margin = (1 - cost / price) * 100
      setTempMargins(prev => ({ ...prev, partner: Number(margin.toFixed(2)) }))
    } else {
      setTempMargins(prev => ({ ...prev, partner: 0 }))
    }
  }

  useEffect(() => {
    async function loadBreaks() {
      try {
        const { data, error } = await getProductQuantityBreaks(product.id)
        if (!error && data) {
          setQuantityBreaks(data)
        }
      } catch (err) {
        console.error("Error loading quantity breaks", err)
      } finally {
        setLoadingBreaks(false)
      }
    }
    loadBreaks()
  }, [product.id])

  const handleSaveMargins = async () => {
    setIsSubmitting(true)
    try {
      const { error } = await updateProductMargins(product.id, tempMargins)
      if (error) throw error
      toast.success("Cílové marže a prodejní ceny byly upraveny", { description: "Změny byly uloženy a ceny překalkulovány." })
      setMargins(tempMargins)
      setIsEditingMargins(false)
    } catch (e: any) {
      toast.error("Chyba při úpravě marží", { description: e.message })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSaveBreaks = async () => {
    setIsSavingBreaks(true)
    try {
      const invalid = quantityBreaks.some(b => b.mnozstvi_od <= 0 || b.sleva_procenta < 0 || b.sleva_procenta > 100)
      if (invalid) {
        toast.error("Neplatné hodnoty", { description: "Množství musí být větší než 0 a sleva mezi 0% a 100%." })
        setIsSavingBreaks(false)
        return
      }

      const { error } = await saveProductQuantityBreaks(product.id, quantityBreaks.map(b => ({
        mnozstvi_od: b.mnozstvi_od,
        typ_zakaznika: b.typ_zakaznika,
        sleva_procenta: b.sleva_procenta
      })))

      if (error) throw error
      toast.success("Množstevní slevy byly uloženy")
    } catch (e: any) {
      toast.error("Chyba při ukládání slev", { description: e.message })
    } finally {
      setIsSavingBreaks(false)
    }
  }

  if (!breakdown) {
    return (
      <div className="py-20 text-center border border-dashed border-zinc-800 rounded-xl bg-zinc-950/30">
        <AlertTriangle className="h-12 w-12 text-zinc-700 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-zinc-500">Chybí nákupní data</h3>
        <p className="text-zinc-600 max-w-sm mx-auto">
          Pro výpočet ceny musíte nejprve přiřadit alespoň jednoho dodavatele v záložce "Sourcing & Nákup".
        </p>
      </div>
    )
  }

  const formatCzk = (val: number) => 
    new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: 'CZK' }).format(val)

  const formatPercent = (val: number) => 
    new Intl.NumberFormat('cs-CZ', { style: 'percent', minimumFractionDigits: 2 }).format(val / 100)

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
      
      {/* Sourcing Source Info */}
      <div className="flex items-center justify-between p-4 bg-zinc-900 border border-zinc-800 rounded-xl shadow-lg">
        <div className="flex items-center gap-4">
          <div className="p-2 bg-primary/10 rounded-lg">
            <TrendingUp className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold text-zinc-500 tracking-widest">Výpočet založen na dodavateli</p>
            <p className="text-sm font-bold text-white">
              {primarySourcing.dodavatele?.nazev_spolecnosti} ({primarySourcing.nakupni_cena} {primarySourcing.mena})
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
           {template && (
            <Badge variant="outline" className="border-primary/50 text-primary bg-primary/5 gap-2">
              <Truck className="h-3 w-3" />
              Trasa: {template.nazev}
            </Badge>
          )}
          {!hasPrimary && (
            <Badge variant="outline" className="border-yellow-500/50 text-yellow-500 bg-yellow-500/5 gap-1">
              <AlertTriangle className="h-3 w-3" />
              Není vybrán primární zdroj
            </Badge>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Landed Cost Breakdown (Excel Style) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="p-6 bg-zinc-900/50 border border-zinc-800 rounded-xl space-y-6 shadow-xl relative overflow-hidden">
             <div className="absolute top-0 right-0 p-4 opacity-5">
                <Calculator className="h-24 w-24" />
             </div>
             
             <div className="flex items-center gap-2 border-b border-zinc-800 pb-4">
                <Calculator className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-bold text-white uppercase tracking-tight">Detailní rozpad nákladů (COGS)</h3>
             </div>

             <div className="space-y-3">
                <div className="grid grid-cols-3 gap-2 pb-2 border-b border-zinc-800">
                  <div className="col-span-1"></div>
                  {breakdown.totalUnits > 1 ? (
                    <>
                      <div className="text-right text-[10px] font-bold text-zinc-500 uppercase">
                        Za {breakdown.totalUnits} {breakdown.totalUnits >= 5 ? 'jednotek' : 'jednotky'}
                      </div>
                      <div className="text-right text-[10px] font-bold text-primary uppercase">Za 1 jednotku</div>
                    </>
                  ) : (
                    <div className="col-span-2 text-right text-[10px] font-bold text-primary uppercase">Za 1 jednotku (Základní MJ)</div>
                  )}
                </div>

                <div className="grid grid-cols-3 items-center text-sm group p-1 hover:bg-zinc-800/30 rounded transition-colors">
                  <span className="text-zinc-500 col-span-1">Nákupní cena</span>
                  {breakdown.totalUnits > 1 && (
                    <span className="font-mono text-zinc-400 text-right">{formatCzk(breakdown.totalPurchasePriceCzk)}</span>
                  )}
                  <span className={`font-mono text-white font-bold text-right ${breakdown.totalUnits === 1 ? 'col-span-2' : ''}`}>{formatCzk(breakdown.unitPurchasePriceCzk)}</span>
                </div>
                
                <div className="grid grid-cols-3 items-center text-sm group p-1 hover:bg-zinc-800/30 rounded transition-colors">
                  <div className="flex items-center gap-2 col-span-1">
                    <Truck className="h-3 w-3 text-zinc-600" />
                    <span className="text-zinc-500">Doprava</span>
                  </div>
                  {breakdown.totalUnits > 1 && (
                    <span className="font-mono text-zinc-400 text-right">{formatCzk(breakdown.totalShippingCostCzk)}</span>
                  )}
                  <span className={`font-mono text-zinc-300 text-right ${breakdown.totalUnits === 1 ? 'col-span-2' : ''}`}>{formatCzk(breakdown.unitShippingCostCzk)}</span>
                </div>

                <div className="grid grid-cols-3 items-center text-sm group p-1 hover:bg-zinc-800/30 rounded transition-colors">
                  <div className="flex items-center gap-2 col-span-1">
                    <ShieldCheck className="h-3 w-3 text-zinc-600" />
                    <span className="text-zinc-500">Clo</span>
                  </div>
                  {breakdown.totalUnits > 1 && (
                    <span className="font-mono text-zinc-400 text-right">{formatCzk(breakdown.totalCustomsCostCzk)}</span>
                  )}
                  <span className={`font-mono text-zinc-300 text-right ${breakdown.totalUnits === 1 ? 'col-span-2' : ''}`}>{formatCzk(breakdown.unitCustomsCostCzk)}</span>
                </div>

                <div className="pt-2 mt-2 border-t border-zinc-800/50 space-y-2">
                  <div className="grid grid-cols-3 items-center text-[11px] text-zinc-500 italic px-1">
                    <span className="col-span-1">SWIFT & Banka</span>
                    {breakdown.totalUnits > 1 && (
                      <span className="text-right">{formatCzk(breakdown.totalBankFeesCzk)}</span>
                    )}
                    <span className={`text-right ${breakdown.totalUnits === 1 ? 'col-span-2' : ''}`}>{formatCzk(breakdown.unitBankFeesCzk)}</span>
                  </div>
                  <div className="grid grid-cols-3 items-center text-[11px] text-zinc-500 italic px-1">
                    <span className="col-span-1">Proclení & Dokumenty</span>
                    {breakdown.totalUnits > 1 && (
                      <span className="text-right">{formatCzk(breakdown.totalClearingFeesCzk)}</span>
                    )}
                    <span className={`text-right ${breakdown.totalUnits === 1 ? 'col-span-2' : ''}`}>{formatCzk(breakdown.unitClearingFeesCzk)}</span>
                  </div>
                  <div className="grid grid-cols-3 items-center text-[11px] text-zinc-500 italic px-1">
                    <span className="col-span-1">Odpady</span>
                    {breakdown.totalUnits > 1 && (
                      <span className="text-right">{formatCzk(breakdown.totalWasteFeesCzk)}</span>
                    )}
                    <span className={`text-right ${breakdown.totalUnits === 1 ? 'col-span-2' : ''}`}>{formatCzk(breakdown.unitWasteFeesCzk)}</span>
                  </div>
                  <div className="grid grid-cols-3 items-center text-[11px] text-zinc-500 italic px-1">
                    <span className="col-span-1">Balné</span>
                    {breakdown.totalUnits > 1 && (
                      <span className="text-right">{formatCzk(breakdown.totalPackagingFeesCzk)}</span>
                    )}
                    <span className={`text-right ${breakdown.totalUnits === 1 ? 'col-span-2' : ''}`}>{formatCzk(breakdown.unitPackagingFeesCzk)}</span>
                  </div>
                </div>
                
                <div className="pt-4 border-t border-zinc-800 grid grid-cols-3 items-center">
                  <div className="flex flex-col col-span-1">
                    <span className="text-zinc-400 font-bold">Základní Pořizovací cena</span>
                    <span className="text-[10px] text-zinc-500 italic">Landed Cost bez rezervy</span>
                  </div>
                  {breakdown.totalUnits > 1 && (
                    <span className="text-lg font-mono text-zinc-500 text-right">{formatCzk(breakdown.totalLandedCostBase)}</span>
                  )}
                  <span className={`text-xl font-mono text-zinc-300 text-right ${breakdown.totalUnits === 1 ? 'col-span-2' : ''}`}>{formatCzk(breakdown.unitLandedCostBase)}</span>
                </div>

                <div className="grid grid-cols-3 items-center text-xs italic text-zinc-500 px-1 mt-2">
                  <div className="flex items-center gap-1 col-span-1">
                    <Info className="h-3 w-3" />
                    <span>Rezerva marže ({settings.marze_rezerva_procenta}%)</span>
                  </div>
                  {breakdown.totalUnits > 1 && (
                    <span className="text-right">+{formatCzk(breakdown.totalBufferAmount)}</span>
                  )}
                  <span className={`text-right ${breakdown.totalUnits === 1 ? 'col-span-2' : ''}`}>+{formatCzk(breakdown.unitBufferAmount)}</span>
                </div>

                <div className="mt-4 p-4 bg-primary/10 border border-primary/20 rounded-lg flex justify-between items-center shadow-inner">
                  <div>
                    <p className="text-[10px] uppercase font-bold text-primary tracking-widest">Finální nákladová cena za 1 jednotku</p>
                    <p className="text-xs text-zinc-500 italic">Základ pro výpočet prodejních cen</p>
                  </div>
                  <div className="text-right">
                    <span className="text-3xl font-black text-primary">{formatCzk(breakdown.unitLandedCostWithBuffer)}</span>
                    <p className="text-[10px] font-mono text-primary/60">
                      ~ {(breakdown.unitLandedCostWithBuffer / breakdown.exchangeRateUsed).toFixed(2)} {breakdown.currency}
                    </p>
                  </div>
                </div>
             </div>
          </div>

          {/* Hedging & Risk Analysis */}
          <div className="p-6 bg-zinc-950 border border-zinc-800 rounded-xl space-y-4 shadow-xl">
             <div className="flex items-center gap-2 border-b border-zinc-800 pb-3">
                <ArrowRightLeft className="h-4 w-4 text-zinc-400" />
                <h3 className="text-sm font-bold text-zinc-300 uppercase">Měnový Stress-Test (Hedging Analysis)</h3>
             </div>
             
             <div className="grid grid-cols-3 gap-4">
                <div className="p-3 bg-zinc-900/50 rounded-lg border border-zinc-800">
                  <p className="text-[10px] uppercase font-bold text-zinc-500 mb-1">Marže Aktuální</p>
                  <p className="text-lg font-black text-white">{formatPercent(breakdown.currentMargin)}</p>
                  <p className="text-[10px] text-zinc-600 italic">Kurz: {breakdown.exchangeRateUsed.toFixed(2)}</p>
                </div>
                <div className="p-3 bg-red-500/5 rounded-lg border border-red-500/20">
                  <p className="text-[10px] uppercase font-bold text-red-400 mb-1">Marže Low (Risk)</p>
                  <p className={`text-lg font-black ${breakdown.lowMargin < 10 ? 'text-red-500' : 'text-red-400'}`}>
                    {formatPercent(breakdown.lowMargin)}
                  </p>
                  <p className="text-[10px] text-zinc-600 italic">Slabá koruna</p>
                </div>
                <div className="p-3 bg-green-500/5 rounded-lg border border-green-500/20">
                  <p className="text-[10px] uppercase font-bold text-green-400 mb-1">Marže High (Safe)</p>
                  <p className="text-lg font-black text-green-400">{formatPercent(breakdown.highMargin)}</p>
                  <p className="text-[10px] text-zinc-600 italic">Silná koruna</p>
                </div>
             </div>
             <p className="text-[10px] text-zinc-600 italic leading-relaxed">
               Analýza ukazuje, jak se změní vaše retailová marže při extrémních výkyvech kurzu {breakdown.currency}/CZK (stress-test pro min/max za posledních 5 let).
             </p>
          </div>
        </div>

        {/* Tiered Selling Prices */}
        <div className="space-y-6">
          <div className="p-6 bg-zinc-900/50 border border-zinc-800 rounded-xl space-y-6 shadow-xl border-l-4 border-l-primary">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-primary" />
                  <h3 className="text-lg font-bold text-white uppercase tracking-tight">Prodejní hladiny</h3>
                </div>
                <Dialog open={isEditingMargins} onOpenChange={setIsEditingMargins}>
                  <DialogTrigger render={
                    <Button variant="ghost" size="sm" className="h-8 gap-2 text-zinc-400 hover:text-white hover:bg-zinc-800">
                      <Edit2 className="h-3 w-3" />
                      Upravit marže a ceny
                    </Button>
                  } />
                  <DialogContent className="bg-zinc-950 border-zinc-800 text-white max-w-lg">
                    <DialogHeader>
                      <DialogTitle className="text-lg font-bold uppercase tracking-tight text-white">Nastavení prodejní ceny a marže</DialogTitle>
                    </DialogHeader>
                    <div className="py-4 space-y-6">
                      {/* Cost baseline info */}
                      <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-lg flex justify-between items-center text-xs">
                        <div>
                          <span className="text-zinc-500 block uppercase font-bold text-[9px] tracking-wider">Pořizovací cena (Landed Cost)</span>
                          <span className="text-zinc-400 italic">Včetně logistiky, cla a rezervy</span>
                        </div>
                        <span className="font-mono font-bold text-zinc-200 text-sm">{formatCzk(cost)}</span>
                      </div>

                      {/* Retail (B2C) Row */}
                      <div className="space-y-3 p-4 bg-zinc-900/40 border border-zinc-900 rounded-lg">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-green-400">Maloobchodní prodej (B2C)</h4>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <Label className="text-zinc-500 text-[10px] uppercase font-bold">Marže %</Label>
                            <Input 
                              type="number" 
                              step="0.1" 
                              value={tempMargins.retail} 
                              onChange={(e) => handleRetailMarginChange(e.target.value)} 
                              className="bg-zinc-950 border-zinc-800 text-xs h-9 font-mono" 
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-zinc-500 text-[10px] uppercase font-bold">Prodejní cena (CZK)</Label>
                            <Input 
                              type="number" 
                              step="0.01" 
                              value={tempPrices.retail} 
                              onChange={(e) => handleRetailPriceChange(e.target.value)} 
                              className="bg-zinc-950 border-zinc-800 text-xs h-9 font-mono text-green-400 font-bold" 
                            />
                          </div>
                        </div>
                      </div>

                      {/* Partner (B2B) Row */}
                      <div className="space-y-3 p-4 bg-zinc-900/40 border border-zinc-900 rounded-lg">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-blue-400">Partnerský prodej (B2B)</h4>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <Label className="text-zinc-500 text-[10px] uppercase font-bold">Marže %</Label>
                            <Input 
                              type="number" 
                              step="0.1" 
                              value={tempMargins.partner} 
                              onChange={(e) => handlePartnerMarginChange(e.target.value)} 
                              className="bg-zinc-950 border-zinc-800 text-xs h-9 font-mono" 
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-zinc-500 text-[10px] uppercase font-bold">Prodejní cena (CZK)</Label>
                            <Input 
                              type="number" 
                              step="0.01" 
                              value={tempPrices.partner} 
                              onChange={(e) => handlePartnerPriceChange(e.target.value)} 
                              className="bg-zinc-950 border-zinc-800 text-xs h-9 font-mono text-blue-400 font-bold" 
                            />
                          </div>
                        </div>
                        
                        {/* Live B2B discounts preview */}
                        {tempPrices.partner > 0 && (
                          <div className="pt-2 border-t border-zinc-900/60 mt-1 space-y-1 text-[10px]">
                            <span className="text-zinc-500 uppercase font-bold block mb-1">Náhled partnerských slev:</span>
                            <div className="grid grid-cols-4 gap-2 text-zinc-400">
                              <div>
                                <span className="block text-zinc-600">B2B -5 %</span>
                                <span className="font-mono">{formatCzk(tempPrices.partner * 0.95)}</span>
                              </div>
                              <div>
                                <span className="block text-zinc-600">B2B -10 %</span>
                                <span className="font-mono">{formatCzk(tempPrices.partner * 0.90)}</span>
                              </div>
                              <div>
                                <span className="block text-zinc-600">B2B -15 %</span>
                                <span className="font-mono">{formatCzk(tempPrices.partner * 0.85)}</span>
                              </div>
                              <div>
                                <span className="block text-zinc-600">B2B -20 %</span>
                                <span className="font-mono">{formatCzk(tempPrices.partner * 0.80)}</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    <DialogFooter className="border-t border-zinc-900 pt-4 mt-2">
                      <Button variant="outline" onClick={() => setIsEditingMargins(false)} className="bg-zinc-900 border-zinc-800 text-xs text-zinc-400 hover:text-white">Zrušit</Button>
                      <Button onClick={handleSaveMargins} disabled={isSubmitting} className="text-xs bg-primary hover:bg-primary/90 text-white font-bold">{isSubmitting ? 'Ukládám...' : 'Potvrdit a uložit'}</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
            </div>

            <div className="space-y-6">
              {/* Retail */}
              <div className="space-y-2">
                <div className="flex justify-between items-end">
                  <span className="text-xs font-bold uppercase text-zinc-500 tracking-wider">Retail (B2C) / 1 MJ</span>
                  <Badge className="bg-zinc-800 text-zinc-300 hover:bg-zinc-800">{margins.retail}% marže</Badge>
                </div>
                <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-lg flex justify-between items-center">
                  <span className="text-2xl font-black text-white">{formatCzk(breakdown.b2cUnitPrice)}</span>
                  <span className="text-[10px] text-green-500 font-bold">+{formatCzk(breakdown.b2cUnitMarginAmount)}</span>
                </div>
              </div>

              {/* Partner */}
              <div className="space-y-2">
                <div className="flex justify-between items-end">
                  <span className="text-xs font-bold uppercase text-zinc-500 tracking-wider">Partner (B2B) / 1 MJ</span>
                  <Badge className="bg-zinc-800 text-zinc-300 hover:bg-zinc-800">{margins.partner}% marže</Badge>
                </div>
                <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-lg flex justify-between items-center mb-2">
                  <span className="text-2xl font-black text-zinc-200">{formatCzk(breakdown.b2bUnitPrice)}</span>
                  <span className="text-[10px] text-green-500 font-bold">+{formatCzk(breakdown.b2bUnitMarginAmount)}</span>
                </div>
              </div>

              {/* Standard B2B slevové hladiny preview */}
              <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-lg space-y-3">
                <div className="flex justify-between items-center text-[10px] text-zinc-500 font-bold uppercase tracking-wider border-b border-zinc-800 pb-1.5">
                  <span>Standardní B2B slevy</span>
                  <span>Cena za 1 MJ</span>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between text-zinc-400">
                    <span>Základní B2B</span>
                    <span className="font-mono font-bold text-white">{formatCzk(breakdown.b2bUnitPrice)}</span>
                  </div>
                  <div className="flex justify-between text-zinc-400">
                    <span>B2B -5 %</span>
                    <span className="font-mono text-zinc-300">{formatCzk(breakdown.b2bDiscountedPrices[5])}</span>
                  </div>
                  <div className="flex justify-between text-zinc-400">
                    <span>B2B -10 %</span>
                    <span className="font-mono text-zinc-300">{formatCzk(breakdown.b2bDiscountedPrices[10])}</span>
                  </div>
                  <div className="flex justify-between text-zinc-400">
                    <span>B2B -15 %</span>
                    <span className="font-mono text-zinc-300">{formatCzk(breakdown.b2bDiscountedPrices[15])}</span>
                  </div>
                  <div className="flex justify-between text-zinc-400">
                    <span>B2B -20 %</span>
                    <span className="font-mono text-zinc-300">{formatCzk(breakdown.b2bDiscountedPrices[20])}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-zinc-800">
               <div className="p-3 bg-blue-500/5 border border-blue-500/20 rounded-lg flex gap-3">
                  <Info className="h-5 w-5 text-blue-500 shrink-0" />
                  <p className="text-[10px] text-zinc-400 leading-relaxed">
                    Ceny jsou vypočteny metodou marže (Cost / (1 - Margin)). Neobsahují DPH.
                  </p>
               </div>
            </div>
          </div>

          <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-xl space-y-4">
             <div className="flex items-center gap-2">
                <Banknote className="h-4 w-4 text-zinc-500" />
                <h4 className="text-xs font-bold text-zinc-400">Logistická efektivita</h4>
             </div>
             <div className="space-y-1">
                <p className="text-[10px] text-zinc-500">Měrná jednotka: {product.c_merne_jednotky_zakladni?.zkratka}</p>
                <p className="text-[10px] text-zinc-500">Hmotnost MJ: {( (product.hmotnost_baliku_kg || 0) / (product.mnozstvi_v_baleni || 1) ).toFixed(3)} kg</p>
             </div>
          </div>
        </div>

      </div>

      {/* Množstevní slevy (Quantity Breaks) */}
      <div className="p-6 bg-zinc-900/50 border border-zinc-800 rounded-xl space-y-6 shadow-xl">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
          <div className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-primary" />
            <div>
              <h3 className="text-lg font-bold text-white uppercase tracking-tight">Množstevní slevy (Quantity Breaks)</h3>
              <p className="text-xs text-zinc-500 italic">Vlastní slevy uplatňované při odběru většího počtu jednotek.</p>
            </div>
          </div>
          <Button 
            onClick={handleSaveBreaks} 
            disabled={isSavingBreaks || loadingBreaks} 
            size="sm"
            className="gap-2"
          >
            {isSavingBreaks ? 'Ukládám...' : 'Uložit slevy'}
          </Button>
        </div>

        {loadingBreaks ? (
          <div className="text-center py-6 text-zinc-500 text-xs">Načítám množstevní slevy...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* B2B Breaks */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-blue-400">B2B (Partner) slevové breaks</h4>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm"
                  className="h-7 text-[10px] bg-zinc-950 border-zinc-800"
                  onClick={() => setQuantityBreaks([...quantityBreaks, { mnozstvi_od: 1, typ_zakaznika: 'B2B', sleva_procenta: 0 }])}
                >
                  + Přidat break
                </Button>
              </div>

              <div className="space-y-2">
                {quantityBreaks.filter(b => b.typ_zakaznika === 'B2B').length === 0 ? (
                  <p className="text-xs italic text-zinc-600 py-3 text-center border border-dashed border-zinc-800 rounded-lg">Bez množstevních slev pro B2B.</p>
                ) : (
                  quantityBreaks
                    .filter(b => b.typ_zakaznika === 'B2B')
                    .map((b, idx) => {
                      const absoluteIdx = quantityBreaks.indexOf(b)
                      const discPrice = breakdown.b2bUnitPrice * (1 - b.sleva_procenta / 100)
                      return (
                        <div key={idx} className="flex gap-2 items-center bg-zinc-950 p-2.5 border border-zinc-800 rounded-lg">
                          <div className="flex-1 space-y-1">
                            <Label className="text-[10px] text-zinc-500">Množství od ({product.c_merne_jednotky_zakladni?.zkratka || 'MJ'})</Label>
                            <Input 
                              type="number" 
                              step="0.01" 
                              value={b.mnozstvi_od} 
                              onChange={(e) => {
                                const copy = [...quantityBreaks]
                                copy[absoluteIdx].mnozstvi_od = parseFloat(e.target.value) || 0
                                setQuantityBreaks(copy)
                              }}
                              className="h-8 bg-zinc-900 border-zinc-800 text-xs" 
                            />
                          </div>
                          <div className="w-24 space-y-1">
                            <Label className="text-[10px] text-zinc-500">Sleva %</Label>
                            <Input 
                              type="number" 
                              step="0.1" 
                              value={b.sleva_procenta} 
                              onChange={(e) => {
                                const copy = [...quantityBreaks]
                                copy[absoluteIdx].sleva_procenta = parseFloat(e.target.value) || 0
                                setQuantityBreaks(copy)
                              }}
                              className="h-8 bg-zinc-900 border-zinc-800 text-xs" 
                            />
                          </div>
                          <div className="w-28 text-right pr-2">
                            <p className="text-[10px] text-zinc-500">Konečná cena</p>
                            <p className="text-xs font-mono font-bold text-blue-400">{formatCzk(discPrice)}</p>
                          </div>
                          <Button 
                            type="button" 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-red-500 hover:text-red-400 hover:bg-red-500/10 self-end"
                            onClick={() => {
                              const copy = [...quantityBreaks]
                              copy.splice(absoluteIdx, 1)
                              setQuantityBreaks(copy)
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )
                    })
                )}
              </div>
            </div>

            {/* B2C Breaks */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-green-400">B2C (Retail) slevové breaks</h4>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm"
                  className="h-7 text-[10px] bg-zinc-950 border-zinc-800"
                  onClick={() => setQuantityBreaks([...quantityBreaks, { mnozstvi_od: 1, typ_zakaznika: 'B2C', sleva_procenta: 0 }])}
                >
                  + Přidat break
                </Button>
              </div>

              <div className="space-y-2">
                {quantityBreaks.filter(b => b.typ_zakaznika === 'B2C').length === 0 ? (
                  <p className="text-xs italic text-zinc-600 py-3 text-center border border-dashed border-zinc-800 rounded-lg">Bez množstevních slev pro B2C.</p>
                ) : (
                  quantityBreaks
                    .filter(b => b.typ_zakaznika === 'B2C')
                    .map((b, idx) => {
                      const absoluteIdx = quantityBreaks.indexOf(b)
                      const discPrice = breakdown.b2cUnitPrice * (1 - b.sleva_procenta / 100)
                      return (
                        <div key={idx} className="flex gap-2 items-center bg-zinc-950 p-2.5 border border-zinc-800 rounded-lg">
                          <div className="flex-1 space-y-1">
                            <Label className="text-[10px] text-zinc-500">Množství od ({product.c_merne_jednotky_zakladni?.zkratka || 'MJ'})</Label>
                            <Input 
                              type="number" 
                              step="0.01" 
                              value={b.mnozstvi_od} 
                              onChange={(e) => {
                                const copy = [...quantityBreaks]
                                copy[absoluteIdx].mnozstvi_od = parseFloat(e.target.value) || 0
                                setQuantityBreaks(copy)
                              }}
                              className="h-8 bg-zinc-900 border-zinc-800 text-xs" 
                            />
                          </div>
                          <div className="w-24 space-y-1">
                            <Label className="text-[10px] text-zinc-500">Sleva %</Label>
                            <Input 
                              type="number" 
                              step="0.1" 
                              value={b.sleva_procenta} 
                              onChange={(e) => {
                                const copy = [...quantityBreaks]
                                copy[absoluteIdx].sleva_procenta = parseFloat(e.target.value) || 0
                                setQuantityBreaks(copy)
                              }}
                              className="h-8 bg-zinc-900 border-zinc-800 text-xs" 
                            />
                          </div>
                          <div className="w-28 text-right pr-2">
                            <p className="text-[10px] text-zinc-500">Konečná cena</p>
                            <p className="text-xs font-mono font-bold text-green-400">{formatCzk(discPrice)}</p>
                          </div>
                          <Button 
                            type="button" 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-red-500 hover:text-red-400 hover:bg-red-500/10 self-end"
                            onClick={() => {
                              const copy = [...quantityBreaks]
                              copy.splice(absoluteIdx, 1)
                              setQuantityBreaks(copy)
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )
                    })
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
