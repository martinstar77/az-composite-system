"use client"

import { useState } from "react"
import { RefreshCcw, Landmark, Clock, Coins, Save } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { Label } from "@/shared/components/ui/label"
import { Switch } from "@/shared/components/ui/switch"
import { Badge } from "@/shared/components/ui/badge"
import { fetchLatestCnbRates, updateFinanceSettings } from "../actions"
import { ExchangeRate, GlobalFinanceSettings } from "../types"

interface FinanceDashboardProps {
  rates: ExchangeRate[]
  settings: GlobalFinanceSettings
}

export function FinanceDashboard({ rates, settings }: FinanceDashboardProps) {
  const [isSyncing, setIsSyncing] = useState(false)
  const [isSaving, setIsSubmitting] = useState(false)
  
  // Local state for settings form
  const [useManual, setUseManual] = useState(settings.pouzivat_manualni_kurzy)
  const [eurManual, setEurManual] = useState(settings.manualni_kurz_eur?.toString() || "")
  const [usdManual, setUsdManual] = useState(settings.manualni_kurz_usd?.toString() || "")
  const [swiftFee, setSwiftFee] = useState(settings.poplatek_zahranicni_platba_czk.toString())
  const [marginBuffer, setMarginBuffer] = useState(settings.marze_rezerva_procenta.toString())
  const [shippingEur, setShippingEur] = useState(settings.doprava_eur_za_kg?.toString() || "2.50")
  const [defaultClo, setDefaultClo] = useState(settings.clo_default_procenta?.toString() || "0")

  const handleSync = async () => {
    setIsSyncing(true)
    try {
      const result = await fetchLatestCnbRates()
      if (result.success) {
        toast.success("Kurzy ČNB aktualizovány", { description: `Nahrány kurzy pro datum: ${result.date}` })
      } else {
        toast.error("Synchronizace selhala", { description: result.error })
      }
    } finally {
      setIsSyncing(false)
    }
  }

  const handleSaveSettings = async () => {
    setIsSubmitting(true)
    try {
      const { error } = await updateFinanceSettings({
        pouzivat_manualni_kurzy: useManual,
        manualni_kurz_eur: parseFloat(eurManual) || null,
        manualni_kurz_usd: parseFloat(usdManual) || null,
        poplatek_zahranicni_platba_czk: parseFloat(swiftFee) || 0,
        marze_rezerva_procenta: parseFloat(marginBuffer) || 0,
        doprava_eur_za_kg: parseFloat(shippingEur) || 0,
        clo_default_procenta: parseFloat(defaultClo) || 0
      })

      if (error) {
        toast.error("Chyba při ukládání", { description: error.message })
      } else {
        toast.success("Finanční nastavení uloženo")
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-8">
      {/* Exchange Rates Section */}
      <section className="space-y-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Landmark className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-bold uppercase tracking-tight text-zinc-100">Aktuální kurzy ČNB (Měnový Engine)</h2>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleSync} 
            disabled={isSyncing}
            className="gap-2 border-zinc-800 bg-zinc-900/50"
          >
            <RefreshCcw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Synchronizuji...' : 'Aktualizovat z ČNB'}
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {rates.length > 0 ? rates.map((rate) => (
            <div key={rate.id} className="p-4 bg-zinc-950 border border-zinc-800 rounded-xl shadow-lg relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-2 opacity-5 group-hover:opacity-10 transition-opacity">
                <Coins className="h-12 w-12" />
              </div>
              <p className="text-[10px] font-bold uppercase text-zinc-500 mb-1">1 {rate.mena} =</p>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-black text-white">{rate.kurz_czk.toFixed(2)}</span>
                <span className="text-sm font-bold text-zinc-500">CZK</span>
              </div>
              <div className="mt-3 flex items-center gap-1.5 text-[10px] text-zinc-500">
                <Clock className="h-3 w-3" />
                <span>Platnost: {new Date(rate.datum).toLocaleDateString('cs-CZ')}</span>
              </div>
            </div>
          )) : (
            <div className="col-span-full p-8 text-center bg-zinc-900/30 border border-dashed border-zinc-800 rounded-xl">
              <p className="text-zinc-500 italic">Zatím nejsou staženy žádné kurzy. Klikněte na tlačítko aktualizace.</p>
            </div>
          )}
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Global Fees & Buffers */}
        <section className="p-6 bg-zinc-950 border border-zinc-800 rounded-xl space-y-6">
          <div className="flex items-center gap-2 border-b border-zinc-800 pb-3">
             <Save className="h-4 w-4 text-primary" />
             <h3 className="font-bold text-zinc-200">Fixní poplatky a Smluvní marže</h3>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="swift-fee">Zahraniční platba (SWIFT)</Label>
                <div className="relative">
                  <Input 
                    id="swift-fee" 
                    type="number" 
                    value={swiftFee} 
                    onChange={(e) => setSwiftFee(e.target.value)}
                    className="bg-zinc-900 border-zinc-800 pr-12"
                  />
                  <span className="absolute right-3 top-2 text-xs font-bold text-zinc-600">CZK</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="margin-buffer">Bezpečnostní rezerva</Label>
                <div className="relative">
                  <Input 
                    id="margin-buffer" 
                    type="number" 
                    value={marginBuffer} 
                    onChange={(e) => setMarginBuffer(e.target.value)}
                    className="bg-zinc-900 border-zinc-800 pr-12"
                  />
                  <span className="absolute right-3 top-2 text-xs font-bold text-zinc-600">%</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="shipping-eur">Doprava (globální tarif)</Label>
                <div className="relative">
                  <Input 
                    id="shipping-eur" 
                    type="number" 
                    step="0.01"
                    value={shippingEur} 
                    onChange={(e) => setShippingEur(e.target.value)}
                    className="bg-zinc-900 border-zinc-800 pr-12"
                  />
                  <span className="absolute right-3 top-2 text-xs font-bold text-zinc-600">EUR/kg</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="default-clo">Výchozí clo (Import)</Label>
                <div className="relative">
                  <Input 
                    id="default-clo" 
                    type="number" 
                    step="0.1"
                    value={defaultClo} 
                    onChange={(e) => setDefaultClo(e.target.value)}
                    className="bg-zinc-900 border-zinc-800 pr-12"
                  />
                  <span className="absolute right-3 top-2 text-xs font-bold text-zinc-600">%</span>
                </div>
              </div>
            </div>

            <p className="text-[10px] text-zinc-500 italic">Tyto hodnoty se používají jako výchozí pro výpočet Landed Cost u všech produktů.</p>
          </div>
        </section>

        {/* Manual Overrides (Hedging) */}
        <section className="p-6 bg-zinc-950 border border-zinc-800 rounded-xl space-y-6">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
             <h3 className="font-bold text-zinc-200">Zajišťovací kurzy (Interní)</h3>
             <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-bold text-zinc-500">Používat ruční kurzy</span>
                <Switch checked={useManual} onCheckedChange={setUseManual} className="data-[state=checked]:bg-primary" />
             </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Vlastní EUR kurz</Label>
              <Input 
                type="number" 
                step="0.01" 
                value={eurManual} 
                onChange={(e) => setEurManual(e.target.value)}
                disabled={!useManual}
                className="bg-zinc-900 border-zinc-800"
                placeholder="např. 25.50"
              />
            </div>
            <div className="space-y-2">
              <Label>Vlastní USD kurz</Label>
              <Input 
                type="number" 
                step="0.01" 
                value={usdManual} 
                onChange={(e) => setUsdManual(e.target.value)}
                disabled={!useManual}
                className="bg-zinc-900 border-zinc-800"
                placeholder="např. 23.80"
              />
            </div>
          </div>
          <p className="text-[10px] text-zinc-500 italic">Pokud zapnete, systém bude pro veškeré výpočty (Landed Cost) používat tyto hodnoty místo aktuálního kurzu ČNB.</p>
        </section>
      </div>

      <div className="flex justify-end pt-4">
          <Button onClick={handleSaveSettings} disabled={isSaving} className="w-full md:w-auto px-12">
            {isSaving ? 'Ukládám...' : 'Uložit finanční nastavení'}
          </Button>
      </div>
      
      {settings.upravil && (
        <p className="text-center text-[10px] text-zinc-600">
          Naposledy upravil: {settings.upravil.jmeno}
        </p>
      )}
    </div>
  )
}
