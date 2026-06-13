"use client"

import { useState } from "react"
import { DollarSign, Info, Calculator, TrendingUp, AlertTriangle, Truck, Banknote, ShieldCheck, ArrowRightLeft, Edit2 } from "lucide-react"
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
import { updateProductMargins } from "../actions"

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
    partner: product.cilova_marze_partner_procenta || 20,
    vip: product.cilova_marze_vip_procenta || 15,
    premarketOpen: product.cilova_marze_premarket_open_procenta || 10
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
          partner: margins.partner,
          vip: margins.vip,
          premarketOpen: margins.premarketOpen
        },
        rates,
        settings,
        template
      )
    : null

  const handleSaveMargins = async () => {
    setIsSubmitting(true)
    try {
      const { error } = await updateProductMargins(product.id, margins)
      if (error) throw error
      toast.success("Cílové marže byly upraveny", { description: "Prodejní ceny byly překalkulovány." })
      setIsEditingMargins(false)
    } catch (e: any) {
      toast.error("Chyba při úpravě marží", { description: e.message })
    } finally {
      setIsSubmitting(false)
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
               Analýza ukazuje, jak se změní vaše marže při extrémních výkyvech kurzu {breakdown.currency}/CZK za posledních 5 let.
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
                      Upravit marže
                    </Button>
                  } />
                  <DialogContent className="bg-zinc-950 border-zinc-800">
                    <DialogHeader>
                      <DialogTitle>Nastavení cílových marží</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label>Retail (B2C) Marže %</Label>
                        <Input type="number" step="0.1" value={margins.retail} onChange={(e) => setMargins({...margins, retail: parseFloat(e.target.value) || 0})} className="bg-zinc-900 border-zinc-800" />
                      </div>
                      <div className="space-y-2">
                        <Label>Partner (B2B) Marže %</Label>
                        <Input type="number" step="0.1" value={margins.partner} onChange={(e) => setMargins({...margins, partner: parseFloat(e.target.value) || 0})} className="bg-zinc-900 border-zinc-800" />
                      </div>
                      <div className="space-y-2">
                        <Label>VIP / Výroba Marže %</Label>
                        <Input type="number" step="0.1" value={margins.vip} onChange={(e) => setMargins({...margins, vip: parseFloat(e.target.value) || 0})} className="bg-zinc-900 border-zinc-800" />
                      </div>
                      <div className="space-y-2">
                        <Label>Premarket Open Marže %</Label>
                        <Input type="number" step="0.1" value={margins.premarketOpen} onChange={(e) => setMargins({...margins, premarketOpen: parseFloat(e.target.value) || 0})} className="bg-zinc-900 border-zinc-800" />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsEditingMargins(false)} className="bg-zinc-900 border-zinc-800">Zrušit</Button>
                      <Button onClick={handleSaveMargins} disabled={isSubmitting}>{isSubmitting ? 'Ukládám...' : 'Překalkulovat ceny'}</Button>
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
                  <span className="text-2xl font-black text-white">{formatCzk(breakdown.retailUnitPrice)}</span>
                  <span className="text-[10px] text-green-500 font-bold">+{formatCzk(breakdown.retailUnitMarginAmount)}</span>
                </div>
              </div>

              {/* Partner */}
              <div className="space-y-2">
                <div className="flex justify-between items-end">
                  <span className="text-xs font-bold uppercase text-zinc-500 tracking-wider">Partner (B2B) / 1 MJ</span>
                  <Badge className="bg-zinc-800 text-zinc-300 hover:bg-zinc-800">{margins.partner}% marže</Badge>
                </div>
                <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-lg flex justify-between items-center">
                  <span className="text-2xl font-black text-zinc-200">{formatCzk(breakdown.partnerUnitPrice)}</span>
                  <span className="text-[10px] text-green-500 font-bold">+{formatCzk(breakdown.partnerUnitMarginAmount)}</span>
                </div>
              </div>

              {/* VIP */}
              <div className="space-y-2">
                <div className="flex justify-between items-end">
                  <span className="text-xs font-bold uppercase text-zinc-500 tracking-wider">VIP / Výroba / 1 MJ</span>
                  <Badge className="bg-zinc-800 text-zinc-300 hover:bg-zinc-800">{margins.vip}% marže</Badge>
                </div>

                <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-lg flex justify-between items-center">
                  <span className="text-2xl font-black text-zinc-400">{formatCzk(breakdown.vipUnitPrice)}</span>
                  <span className="text-[10px] text-green-500 font-bold">+{formatCzk(breakdown.vipUnitMarginAmount)}</span>
                </div>
              </div>

              {/* Premarket Open */}
              <div className="space-y-2">
                <div className="flex justify-between items-end">
                  <span className="text-xs font-bold uppercase text-zinc-500 tracking-wider">Premarket Open / 1 MJ</span>
                  <Badge className="bg-zinc-800 text-zinc-300 hover:bg-zinc-800">{margins.premarketOpen}% marže</Badge>
                </div>

                <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-lg flex justify-between items-center">
                  <span className="text-2xl font-black text-yellow-400">{formatCzk(breakdown.premarketOpenUnitPrice)}</span>
                  <span className="text-[10px] text-green-500 font-bold">+{formatCzk(breakdown.premarketOpenUnitMarginAmount)}</span>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-zinc-800">
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
    </div>
  )
}
