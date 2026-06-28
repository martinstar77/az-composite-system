"use client"

import { useState, useEffect, useRef } from "react"
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
import { Product } from "../../types"

interface BulkEditSourcingDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedProductIds: string[]
  selectedProducts?: Product[]
  onSuccess: (openSpeedPricing?: boolean) => void
  suppliers: { id: string; kod: string; nazev_spolecnosti: string; vychozi_mena: string }[]
  templates: LogisticsTemplate[]
  units: any[]
}

export function BulkEditSourcingDialog({
  open,
  onOpenChange,
  selectedProductIds,
  selectedProducts,
  suppliers,
  templates,
  units,
  onSuccess,
}: BulkEditSourcingDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [supplierId, setSupplierId] = useState("")
  const [mena, setMena] = useState("EUR")
  const [nakupniMjId, setNakupniMjId] = useState("")
  const [prevodniPomer, setPrevodniPomer] = useState("1")
  const [isPrimary, setIsPrimary] = useState(true)
  const [logisticsTemplateId, setLogisticsTemplateId] = useState("")

  const isInitializing = useRef(false)

  // Prefill / Reset při otevření dialogu
  useEffect(() => {
    if (open) {
      isInitializing.current = true

      if (selectedProducts && selectedProducts.length > 0) {
        // Získat primární sourcing pro každý vybraný produkt
        const primarySourcings = selectedProducts.map(p => 
          p.produkt_dodavatel?.find(s => s.is_primary) || p.produkt_dodavatel?.[0]
        ).filter(Boolean)

        const allHaveSourcing = primarySourcings.length === selectedProducts.length

        // Zjistit, zda mají všechny vybrané produkty stejného primárního dodavatele
        const firstSupplierId = primarySourcings[0]?.dodavatel_id
        const allSameSupplier = !!(firstSupplierId && primarySourcings.every(s => s?.dodavatel_id === firstSupplierId))

        if (allSameSupplier) {
          // Všichni mají stejného dodavatele (nebo je vybrán pouze 1 produkt)
          const primary = primarySourcings[0]
          setSupplierId(firstSupplierId || "")
          setMena(primary?.mena || "EUR")
          setNakupniMjId(primary?.nakupni_mj_id || "")
          setPrevodniPomer(primary?.prevodni_pomer_na_zakladni?.toString() || "1")
          setLogisticsTemplateId(primary?.logisticka_sablona_id || "")
          setIsPrimary(primary?.is_primary ?? true)
        } else {
          // Různí dodavatelé nebo některé produkty nemají dodavatele
          setSupplierId(allHaveSourcing ? "keep_primary" : "")
          
          // U ostatních polí zjistíme, zda jsou stejné u všech primárních dodavatelů
          const firstMena = primarySourcings[0]?.mena
          const allSameMena = !!(firstMena && primarySourcings.every(s => s?.mena === firstMena))
          setMena(allSameMena ? (firstMena || "EUR") : "no_change")

          const firstMj = primarySourcings[0]?.nakupni_mj_id
          const allSameMj = !!(firstMj !== undefined && primarySourcings.every(s => s?.nakupni_mj_id === firstMj))
          setNakupniMjId(allSameMj ? (firstMj || "") : "no_change")

          const firstRatio = primarySourcings[0]?.prevodni_pomer_na_zakladni
          const allSameRatio = !!(firstRatio !== undefined && primarySourcings.every(s => s?.prevodni_pomer_na_zakladni === firstRatio))
          setPrevodniPomer(allSameRatio ? (firstRatio?.toString() || "1") : "")

          const firstTemplate = primarySourcings[0]?.logisticka_sablona_id
          const allSameTemplate = !!(firstTemplate !== undefined && primarySourcings.every(s => s?.logisticka_sablona_id === firstTemplate))
          setLogisticsTemplateId(allSameTemplate ? (firstTemplate || "") : "no_change")

          setIsPrimary(true)
        }
      } else {
        // Fallback reset
        setSupplierId("")
        setMena("EUR")
        setNakupniMjId("")
        setPrevodniPomer("1")
        setIsPrimary(true)
        setLogisticsTemplateId("")
      }

      // Ukončíme inicializaci po renderu
      setTimeout(() => {
        isInitializing.current = false
      }, 50)
    }
  }, [open, selectedProducts])

  // Auto-fill pouze při ZMĚNĚ dodavatele uživatelem (mimo inicializaci)
  useEffect(() => {
    if (isInitializing.current) return

    if (supplierId === "keep_primary") {
      setMena("no_change")
      setNakupniMjId("no_change")
      setPrevodniPomer("")
      setLogisticsTemplateId("no_change")
    } else if (supplierId) {
      const s = suppliers.find(s => s.id === supplierId)
      if (s?.vychozi_mena) setMena(s.vychozi_mena)
      else setMena("EUR")
      setNakupniMjId("")
      setPrevodniPomer("1")
      setLogisticsTemplateId("")
    }
  }, [supplierId, suppliers])

  const resolvedTemplate = logisticsTemplateId !== "no_change" ? templates.find(t => t.id === logisticsTemplateId) : null
  const selectedSupplierName = supplierId === "keep_primary"
    ? "Stávající primární dodavatel"
    : suppliers.find(s => s.id === supplierId)?.nazev_spolecnosti

  const handleSubmit = async () => {
    if (!supplierId) {
      toast.error("Vyberte dodavatele nebo úpravu")
      return
    }
    setIsSubmitting(true)
    try {
      const payload: any = {
        dodavatel_id: supplierId,
        is_primary: supplierId === "keep_primary" ? true : isPrimary,
      }

      if (supplierId === "keep_primary") {
        if (mena !== "no_change") payload.mena = mena || null
        if (logisticsTemplateId !== "no_change") payload.logisticka_sablona_id = logisticsTemplateId || null
        if (nakupniMjId !== "no_change") payload.nakupni_mj_id = nakupniMjId || null
        if (prevodniPomer !== "") payload.prevodni_pomer_na_zakladni = parseFloat(prevodniPomer) || 1
      } else {
        payload.mena = mena
        payload.logisticka_sablona_id = logisticsTemplateId || null
        payload.nakupni_mj_id = nakupniMjId || null
        payload.prevodni_pomer_na_zakladni = parseFloat(prevodniPomer) || 1
      }

      const { inserted, updated, error } = await bulkUpsertSupplierToProducts(
        selectedProductIds,
        payload
      )
      if (error) throw error

      const parts: string[] = []
      if (inserted > 0) parts.push(`${inserted} nových`)
      if (updated > 0) parts.push(`${updated} aktualizováno`)
      toast.success(`Změny uloženy: ${parts.join(", ")}`, {
        description: supplierId === "keep_primary" 
          ? "Podmínky primárního dodavatele byly úspěšně upraveny."
          : "Nyní zadejte nákupní ceny přes ⚡ Zadat ceny.",
      })
      onOpenChange(false)
      onSuccess(supplierId !== "keep_primary") // Speed pricing drawer open only when setting a specific supplier
    } catch (e: any) {
      toast.error("Chyba při hromadné úpravě dodavatele", { description: e.message })
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
            Hromadné přiřazení / úprava dodavatele
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            Přiřaďte nového dodavatele, nebo upravte nákupní podmínky u stávajících primárních dodavatelů u{" "}
            <span className="font-semibold text-white">{selectedProductIds.length} produktů</span>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">

          {/* Dodavatel */}
          <div className="space-y-2">
            <Label>Akce / Dodavatel <span className="text-red-500">*</span></Label>
            <Select value={supplierId} onValueChange={val => setSupplierId(val || "")}>
              <SelectTrigger className="bg-zinc-900 border-zinc-800 w-full">
                <span className="truncate">
                  {supplierId
                    ? supplierId === "keep_primary"
                      ? "— Ponechat stávajícího primárního dodavatele —"
                      : `${selectedSupplierName} (${suppliers.find(s => s.id === supplierId)?.kod})`
                    : "— Vyberte firmu nebo úpravu ze seznamu —"}
                </span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="keep_primary">
                  <span className="text-primary font-semibold">— Ponechat stávajícího primárního dodavatele —</span>
                </SelectItem>
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
                  <SelectValue>{mena === "no_change" ? "— Ponechat původní —" : mena}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {supplierId === "keep_primary" && (
                    <SelectItem value="no_change">— Ponechat původní —</SelectItem>
                  )}
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
                    {nakupniMjId === "no_change"
                      ? "— Ponechat původní —"
                      : nakupniMjId
                        ? units.find((u: any) => u.id === nakupniMjId)?.zkratka
                        : "—"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {supplierId === "keep_primary" && (
                    <SelectItem value="no_change">— Ponechat původní —</SelectItem>
                  )}
                  <SelectItem value="">— Bez jednotky —</SelectItem>
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
                type="text"
                value={prevodniPomer}
                onChange={e => setPrevodniPomer(e.target.value)}
                className="bg-zinc-900 border-zinc-800"
                placeholder={supplierId === "keep_primary" ? "— Ponechat původní —" : "1"}
              />
            </div>
          </div>

          <p className="text-[10px] text-zinc-500 italic leading-normal">
            💡 <strong>Tip k jednotkám:</strong> Pokud nákupní MJ a poměr nevyplníte (nebo ponecháte 1), systém u každého produktu automaticky použije jeho <strong>fyzické balení z katalogu</strong> (např. 50 m2 / role). Vyplňte pouze tehdy, pokud tento dodavatel prodává v odlišných jednotkách než je standardní balení produktu.
          </p>

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
                  {logisticsTemplateId === "no_change"
                    ? "— Ponechat původní —"
                    : resolvedTemplate 
                      ? resolvedTemplate.nazev 
                      : "— Bez logistické šablony —"}
                </span>
              </SelectTrigger>
              <SelectContent>
                {supplierId === "keep_primary" && (
                  <SelectItem value="no_change">— Ponechat původní —</SelectItem>
                )}
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
          {supplierId !== "keep_primary" && (
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
          )}

          {/* Souhrn */}
          {supplierId && (
            <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg text-xs space-y-1">
              <p className="font-semibold text-primary">Souhrn akce:</p>
              <p className="text-zinc-300">
                → <span className="font-bold">{selectedSupplierName}</span> → {selectedProductIds.length} produktů
              </p>
              {supplierId === "keep_primary" ? (
                <div className="text-zinc-400 space-y-0.5 mt-1 border-t border-zinc-800 pt-1">
                  <p>• Měna: <span className="text-zinc-300 font-semibold">{mena === "no_change" ? "Ponechat původní" : mena}</span></p>
                  <p>• Nákupní MJ: <span className="text-zinc-300 font-semibold">{nakupniMjId === "no_change" ? "Ponechat původní" : (units.find((u: any) => u.id === nakupniMjId)?.zkratka || "Bez jednotky")}</span></p>
                  <p>• Konverzní poměr: <span className="text-zinc-300 font-semibold">{prevodniPomer === "" ? "Ponechat původní" : prevodniPomer}</span></p>
                  <p>• Logistická šablona: <span className="text-zinc-300 font-semibold">{logisticsTemplateId === "no_change" ? "Ponechat původní" : (resolvedTemplate?.nazev || "Bez šablony")}</span></p>
                </div>
              ) : (
                <>
                  {resolvedTemplate && (
                    <p className="text-zinc-300">
                      → Logistika: <span className="font-bold">{resolvedTemplate.nazev}</span>
                    </p>
                  )}
                  <p className="text-zinc-500 italic mt-0.5">Ceny zadáte v dalším kroku přes ⚡ Zadat ceny</p>
                </>
              )}
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
                {supplierId === "keep_primary" ? "Uložit změny dodavatele" : "Přiřadit dodavatele"}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
