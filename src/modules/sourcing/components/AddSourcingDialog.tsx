"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Plus, Edit2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { Label } from "@/shared/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/shared/components/ui/dialog"
import { Switch } from "@/shared/components/ui/switch"
import { upsertProductSourcing } from "../actions"
import { Supplier } from "../types"
import { LogisticsTemplate } from "@/modules/finance/types/logistics"

interface AddSourcingDialogProps {
  productId: string
  suppliers: Supplier[]
  templates: LogisticsTemplate[]
  units: any[]
  initialData?: any
  productUnit?: string
  mnozstviVBaleni?: number
  jednotkaBaleniId?: string
}

export function AddSourcingDialog({
  productId,
  suppliers,
  templates,
  units,
  initialData,
  productUnit = "ks",
  mnozstviVBaleni,
  jednotkaBaleniId,
}: AddSourcingDialogProps) {
  const [open, setOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Form State
  const [supplierId, setSupplierId] = useState(initialData?.dodavatel_id || "")
  const [logisticsTemplateId, setLogisticsTemplateId] = useState(initialData?.logisticka_sablona_id || "")
  const [nakupniMjId, setNakupniMjId] = useState(initialData?.nakupni_mj_id || "")
  const [prevodniPomer, setPrevodniPomer] = useState(initialData?.prevodni_pomer_na_zakladni?.toString() || "1")
  const [price, setPrice] = useState(initialData?.nakupni_cena?.toString() || "")
  const [currency, setCurrency] = useState(initialData?.mena || "EUR")
  const [moq, setMoq] = useState(initialData?.moq?.toString() || "1")
  const [leadTime, setLeadTime] = useState(initialData?.lead_time_tydny?.toString() || "")
  const [isPrimary, setIsPrimary] = useState(initialData?.is_primary || false)

  // Pricing Input Mode: Package vs Unit
  const [priceInputMode, setPriceInputMode] = useState<"package" | "unit">("package")
  const [unitPrice, setUnitPrice] = useState("")

  useEffect(() => {
    if (open && initialData) {
      setSupplierId(initialData.dodavatel_id || "")
      setLogisticsTemplateId(initialData.logisticka_sablona_id || "")
      setNakupniMjId(initialData.nakupni_mj_id || "")
      const ratioStr = initialData.prevodni_pomer_na_zakladni?.toString() || "1"
      const priceStr = initialData.nakupni_cena?.toString() || ""
      setPrevodniPomer(ratioStr)
      setPrice(priceStr)
      setCurrency(initialData.mena || "EUR")
      setMoq(initialData.moq?.toString() || "1")
      setLeadTime(initialData.lead_time_tydny?.toString() || "")
      setIsPrimary(initialData.is_primary || false)
      setPriceInputMode("package")
      const ratio = parseFloat(ratioStr) || 1
      const pr = parseFloat(priceStr) || 0
      setUnitPrice((pr / ratio).toFixed(4).replace(/\.?0+$/, ""))
    } else if (open && !initialData) {
      setSupplierId("")
      setLogisticsTemplateId("")
      setNakupniMjId(jednotkaBaleniId || "")
      setPrevodniPomer(mnozstviVBaleni?.toString() || "1")
      setPrice("")
      setCurrency("EUR")
      setMoq("1")
      setLeadTime("")
      setIsPrimary(false)
      setPriceInputMode("package")
      setUnitPrice("")
    }
  }, [open, initialData, mnozstviVBaleni, jednotkaBaleniId])

  const handleToggleMode = (mode: "package" | "unit") => {
    setPriceInputMode(mode)
    const ratio = parseFloat(prevodniPomer) || 1
    if (mode === "unit") {
      const pr = parseFloat(price) || 0
      setUnitPrice((pr / ratio).toFixed(4).replace(/\.?0+$/, ""))
    } else {
      const up = parseFloat(unitPrice) || 0
      setPrice((up * ratio).toFixed(4).replace(/\.?0+$/, ""))
    }
  }

  const handlePriceChange = (val: string) => {
    setPrice(val)
    const ratio = parseFloat(prevodniPomer) || 1
    const pr = parseFloat(val) || 0
    setUnitPrice((pr / ratio).toFixed(4).replace(/\.?0+$/, ""))
  }

  const handleUnitPriceChange = (val: string) => {
    setUnitPrice(val)
    const ratio = parseFloat(prevodniPomer) || 1
    const up = parseFloat(val) || 0
    setPrice((up * ratio).toFixed(4).replace(/\.?0+$/, ""))
  }

  const handleRatioChange = (val: string) => {
    setPrevodniPomer(val)
    const ratio = parseFloat(val) || 1
    if (priceInputMode === "unit") {
      const up = parseFloat(unitPrice) || 0
      setPrice((up * ratio).toFixed(4).replace(/\.?0+$/, ""))
    } else {
      const pr = parseFloat(price) || 0
      setUnitPrice((pr / ratio).toFixed(4).replace(/\.?0+$/, ""))
    }
  }

  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!supplierId || !price) return

    setIsSubmitting(true)
    try {
      const { error } = await upsertProductSourcing({
        id: initialData?.id,
        produkt_id: productId,
        dodavatel_id: supplierId,
        nakupni_cena: parseFloat(price),
        mena: currency,
        moq: parseFloat(moq),
        lead_time_tydny: leadTime ? parseInt(leadTime) : undefined,
        is_primary: isPrimary,
        logisticka_sablona_id: logisticsTemplateId || null,
        nakupni_mj_id: nakupniMjId || null,
        prevodni_pomer_na_zakladni: parseFloat(prevodniPomer) || 1
      })

      if (error) {
        toast.error("Chyba při ukládání ceníku", { description: error.message })
      } else {
        toast.success(initialData ? "Ceník aktualizován" : "Ceník úspěšně přidán")
        setOpen(false)
        router.refresh()
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={
        initialData ? (
          <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-white hover:bg-zinc-800">
            <Edit2 className="h-4 w-4" />
          </Button>
        ) : (
          <Button size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            Přiřadit dodavatele
          </Button>
        )
      } />
      <DialogContent className="sm:max-w-[500px] bg-background border-zinc-800">
        <DialogHeader>
          <DialogTitle>{initialData ? 'Upravit nákupní ceník' : 'Nový nákupní ceník'}</DialogTitle>
          <DialogDescription className="text-zinc-400">
            Propojte produkt s dodavatelem a nastavte nákupní podmínky.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label>Vyberte dodavatele</Label>
            <Select value={supplierId} onValueChange={(val) => setSupplierId(val || "")}>
              <SelectTrigger className="bg-zinc-900 border-zinc-800 w-full text-left">
                <span className="truncate">
                  {supplierId 
                    ? suppliers.find(s => s.id === supplierId)?.nazev_spolecnosti 
                    : "— Vyberte firmu ze seznamu —"}
                </span>
              </SelectTrigger>
              <SelectContent>
                {suppliers.map(s => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.nazev_spolecnosti} ({s.kod})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Logistická šablona — přímý select */}
          <div className="space-y-2">
            <Label>Logistická šablona</Label>
            <Select value={logisticsTemplateId} onValueChange={(val) => setLogisticsTemplateId(val || "")}>
              <SelectTrigger className="bg-zinc-900 border-zinc-800 w-full text-left">
                <span className="truncate">
                  {logisticsTemplateId
                    ? templates.find(t => t.id === logisticsTemplateId)?.nazev
                    : "— Bez logistické šablony —"}
                </span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">— Bez šablony —</SelectItem>
                {templates.map(t => (
                  <SelectItem key={t.id} value={t.id!}>
                    {t.nazev}
                    <span className="text-zinc-500 ml-2 text-xs">
                      {t.typ_vypoctu_dopravy === 'procentualni'
                        ? `${(t.sazba_dopravy * 100).toFixed(0)}%`
                        : `${t.sazba_dopravy} EUR`}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-6 gap-3">
            <div className="col-span-2 space-y-2">
              <Label>Měna</Label>
              <Select value={currency} onValueChange={(val) => setCurrency(val || "EUR")}>
                <SelectTrigger className="bg-zinc-900 border-zinc-800">
                  <SelectValue>{currency}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EUR">EUR</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="CZK">CZK</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 space-y-2">
              <Label>Zadání ceny</Label>
              <Select value={priceInputMode} onValueChange={(val: any) => handleToggleMode(val)}>
                <SelectTrigger className="bg-zinc-900 border-zinc-800">
                  <SelectValue>{priceInputMode === "package" ? "Za balení" : `Za jednotku (1 ${productUnit})`}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="package">Za balení / celá MJ</SelectItem>
                  <SelectItem value="unit">Za jednotku (1 {productUnit})</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 space-y-2">
              <Label htmlFor="price_input">
                {priceInputMode === "package" ? "Cena za balení" : `Cena za 1 ${productUnit}`}
              </Label>
              {priceInputMode === "package" ? (
                <Input 
                  id="price_input" 
                  type="number" 
                  step="0.0001" 
                  placeholder="0.00" 
                  value={price}
                  onChange={(e) => handlePriceChange(e.target.value)}
                  required
                  className="bg-zinc-900 border-zinc-800"
                />
              ) : (
                <Input 
                  id="price_input" 
                  type="number" 
                  step="0.0001" 
                  placeholder="0.00" 
                  value={unitPrice}
                  onChange={(e) => handleUnitPriceChange(e.target.value)}
                  required
                  className="bg-zinc-900 border-zinc-800"
                />
              )}
            </div>
          </div>

          {/* calculated pricing preview */}
          {parseFloat(price) > 0 && parseFloat(prevodniPomer) > 0 && (
            <div className="p-2.5 bg-primary/10 border border-primary/20 rounded text-xs text-primary flex justify-between items-center font-semibold">
              <span>Vypočtený cenový přepočet:</span>
              <span className="font-mono">
                {priceInputMode === "package" ? (
                  `Jednotková: ${(parseFloat(price) / parseFloat(prevodniPomer)).toFixed(4)} ${currency} / ${productUnit}`
                ) : (
                  `Celková za balení: ${parseFloat(price).toFixed(4)} ${currency}`
                )}
              </span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nákupní měrná jednotka</Label>
              <Select value={nakupniMjId} onValueChange={(val) => setNakupniMjId(val || "")}>
                <SelectTrigger className="bg-zinc-900 border-zinc-800">
                  <SelectValue placeholder="— Vyberte MJ —">
                    {(() => {
                      const u = units.find(u => u.id === nakupniMjId);
                      return u ? `${u.nazev} (${u.zkratka})` : undefined;
                    })()}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {units.map(u => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.nazev} ({u.zkratka})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[10px] text-zinc-500">Za co je výše uvedená cena (m2, role, krabice, kg)?</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ratio">Převod na základní MJ</Label>
              <Input 
                id="ratio" 
                type="number" 
                step="0.0001" 
                value={prevodniPomer}
                onChange={(e) => handleRatioChange(e.target.value)}
                className="bg-zinc-900 border-zinc-800"
              />
              <p className="text-[10px] text-zinc-500">
                Kolik základních jednotek ({productUnit}) tvoří 1 nákupní jednotku
                {(() => {
                  const u = units.find(u => u.id === nakupniMjId);
                  return u ? ` (${u.zkratka})` : '';
                })()}? (např. 1 role = 50 m², zadáte 50)
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="moq">
                Min. množství (MOQ v nákupní jednotce
                {(() => {
                  const u = units.find(u => u.id === nakupniMjId);
                  return u ? ` - ${u.zkratka}` : '';
                })()})
              </Label>
              <Input 
                id="moq" 
                type="number" 
                step="0.01" 
                value={moq}
                onChange={(e) => setMoq(e.target.value)}
                className="bg-zinc-900 border-zinc-800"
              />
              {parseFloat(moq) > 0 && parseFloat(prevodniPomer) > 0 && (
                <p className="text-[10px] text-zinc-500 mt-1">
                  Odpovídá minimálně { (parseFloat(moq) * parseFloat(prevodniPomer)).toFixed(2).replace(/\.?0+$/, "") } {productUnit}.
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="lead-time">Lead Time (týdny)</Label>
              <Input 
                id="lead-time" 
                type="number" 
                placeholder="Dle firmy"
                value={leadTime}
                onChange={(e) => setLeadTime(e.target.value)}
                className="bg-zinc-900 border-zinc-800"
              />
            </div>
          </div>

          <div className="flex items-center justify-between p-3 bg-zinc-900/50 rounded-lg border border-zinc-800">
            <div className="space-y-0.5">
              <Label className="text-sm">Hlavní dodavatel</Label>
              <p className="text-[10px] text-zinc-500">Označit jako prioritního partnera.</p>
            </div>
            <Switch 
              checked={isPrimary} 
              onCheckedChange={setIsPrimary}
              className="data-[state=checked]:bg-primary"
            />
          </div>

          <DialogFooter className="pt-4 border-t border-zinc-800">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Zrušit</Button>
            <Button type="submit" disabled={isSubmitting || !supplierId || !price}>
              {isSubmitting ? "Ukládám..." : initialData ? "Uložit změny" : "Přidat k produktu"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
