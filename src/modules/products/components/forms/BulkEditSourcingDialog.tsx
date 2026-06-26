"use client"

import { useState, useEffect } from "react"
import { toast } from "sonner"
import { Building2, Truck, Star } from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import { Label } from "@/shared/components/ui/label"
import { Switch } from "@/shared/components/ui/switch"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/shared/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select"
import { Input } from "@/shared/components/ui/input"
import { bulkUpsertSupplierToProducts } from "../../actions"
import { LogisticsTemplate } from "@/modules/finance/types/logistics"

interface BulkEditSourcingDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedProductIds: string[]
  onSuccess: (openSpeedPricing?: boolean) => void
  suppliers: { id: string; kod: string; nazev_spolecnosti: string; vychozi_mena: string }[]
  templates: LogisticsTemplate[]
  units: any[]
}

export function BulkEditSourcingDialog({
  open,
  onOpenChange,
  selectedProductIds,
  onSuccess,
  suppliers,
  templates,
  units,
}: BulkEditSourcingDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [supplierId, setSupplierId] = useState("")
  const [mena, setMena] = useState("EUR")
  const [nakupniMjId, setNakupniMjId] = useState("")
  const [prevodniPomer, setPrevodniPomer] = useState("1")
  const [isPrimary, setIsPrimary] = useState(true)
  const [logisticsTemplateId, setLogisticsTemplateId] = useState("")

  // Reset při otevření
  useEffect(() => {
    if (open) {
      setSupplierId("")
      setMena("EUR")
      setNakupniMjId("")
      setPrevodniPomer("1")
      setIsPrimary(true)
      setLogisticsTemplateId("")
    }
  }, [open])

  // Auto-fill měna z výchozí měny dodavatele
  useEffect(() => {
    const s = suppliers.find(s => s.id === supplierId)
    if (s?.vychozi_mena) setMena(s.vychozi_mena)
  }, [supplierId, suppliers])

  const resolvedTemplate = templates.find(t => t.id === logisticsTemplateId)
  const selectedSupplierName = suppliers.find(s => s.id === supplierId)?.nazev_spolecnosti

  const handleSubmit = async () => {
    if (!supplierId) {
      toast.error("Vyberte dodavatele")
      return
    }
    setIsSubmitting(true)
    try {
      const { inserted, updated, error } = await bulkUpsertSupplierToProducts(
        selectedProductIds,
        {
          dodavatel_id: supplierId,
          mena,
          logisticka_sablona_id: logisticsTemplateId || null,
          nakupni_mj_id: nakupniMjId || null,
          prevodni_pomer_na_zakladni: parseFloat(prevodniPomer) || 1,
          is_primary: isPrimary,
        }
      )
      if (error) throw error

      const parts: string[] = []
      if (inserted > 0) parts.push(`${inserted} nových`)
      if (updated > 0) parts.push(`${updated} aktualizováno`)
      toast.success(`Dodavatel přiřazen: ${parts.join(", ")}`, {
        description: "Nyní zadejte nákupní ceny přes ⚡ Zadat ceny.",
      })
      onOpenChange(false)
      onSuccess(true)
    } catch (e: any) {
      toast.error("Chyba při hromadném přiřazení dodavatele", { description: e.message })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[460px] bg-zinc-950 border-zinc-800">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            Hromadné přiřazení dodavatele
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            Dodavatel a šablona budou přiřazeny k{" "}
            <span className="font-semibold text-white">{selectedProductIds.length} produktům</span>.
            Ceny zadáte v dalším kroku přes ⚡ Zadat ceny.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">

          {/* Dodavatel */}
          <div className="space-y-2">
            <Label>Dodavatel <span className="text-red-500">*</span></Label>
            <Select value={supplierId} onValueChange={val => setSupplierId(val || "")}>
              <SelectTrigger className="bg-zinc-900 border-zinc-800 w-full">
                <span className="truncate">
                  {supplierId
                    ? `${selectedSupplierName} (${suppliers.find(s => s.id === supplierId)?.kod})`
                    : "— Vyberte firmu ze seznamu —"}
                </span>
              </SelectTrigger>
              <SelectContent>
                {suppliers.map(s => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.nazev_spolecnosti}
                    <span className="text-zinc-500 ml-2 text-xs">({s.kod})</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Měna + Nákupní MJ + Konverzní poměr */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label>Měna</Label>
              <Select value={mena} onValueChange={val => setMena(val || "EUR")}>
                <SelectTrigger className="bg-zinc-900 border-zinc-800">
                  <SelectValue>{mena}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EUR">EUR</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="CZK">CZK</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Nákupní MJ</Label>
              <Select value={nakupniMjId} onValueChange={val => setNakupniMjId(val || "")}>
                <SelectTrigger className="bg-zinc-900 border-zinc-800">
                  <SelectValue placeholder="—">
                    {nakupniMjId ? units.find((u: any) => u.id === nakupniMjId)?.zkratka : "—"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {units.map((u: any) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.nazev} ({u.zkratka})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Konv. poměr</Label>
              <Input
                type="number"
                step="0.0001"
                value={prevodniPomer}
                onChange={e => setPrevodniPomer(e.target.value)}
                className="bg-zinc-900 border-zinc-800"
                placeholder="1"
              />
            </div>
          </div>

          {/* Logistická šablona — přímý select */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Truck className="h-4 w-4 text-zinc-500" />
              <Label>Logistická šablona</Label>
              <span className="text-[10px] text-zinc-600">(volitelné)</span>
            </div>
            <Select value={logisticsTemplateId} onValueChange={val => setLogisticsTemplateId(val || "")}>
              <SelectTrigger className="bg-zinc-900 border-zinc-800 w-full">
                <span className="truncate">
                  {resolvedTemplate ? resolvedTemplate.nazev : "— Bez logistické šablony —"}
                </span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">— Bez šablony —</SelectItem>
                {templates.map(t => (
                  <SelectItem key={t.id} value={t.id!}>
                    {t.nazev}
                    <span className="text-zinc-500 ml-2 text-xs">
                      {t.typ_vypoctu_dopravy === "procentualni"
                        ? `${(t.sazba_dopravy * 100).toFixed(0)}%`
                        : `${t.sazba_dopravy} EUR`}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Primární dodavatel */}
          <div className="flex items-center justify-between p-3 bg-zinc-900/50 rounded-lg border border-zinc-800">
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4 text-yellow-500" />
              <div>
                <p className="text-sm font-medium">Nastavit jako primárního</p>
                <p className="text-[10px] text-zinc-500">Přepíše primárního dodavatele u všech vybraných produktů.</p>
              </div>
            </div>
            <Switch
              checked={isPrimary}
              onCheckedChange={setIsPrimary}
              className="data-[state=checked]:bg-primary"
            />
          </div>

          {/* Souhrn */}
          {supplierId && (
            <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg text-xs space-y-1">
              <p className="font-semibold text-primary">Souhrn akce:</p>
              <p className="text-zinc-300">
                → <span className="font-bold">{selectedSupplierName}</span> → {selectedProductIds.length} produktů
              </p>
              {resolvedTemplate && (
                <p className="text-zinc-300">
                  → Logistika: <span className="font-bold">{resolvedTemplate.nazev}</span>
                </p>
              )}
              <p className="text-zinc-500 italic">Ceny zadáte přes ⚡ Zadat ceny</p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="bg-zinc-900 border-zinc-800">
            Zrušit
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !supplierId || selectedProductIds.length === 0}
            className="gap-2"
          >
            {isSubmitting ? "Ukládám..." : (
              <>
                <Building2 className="h-4 w-4" />
                Přiřadit dodavatele
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
