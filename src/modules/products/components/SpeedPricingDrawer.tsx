"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { toast } from "sonner"
import { Zap, ChevronRight, SkipForward, CheckCircle2, X, ArrowLeft, ArrowRight } from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { Label } from "@/shared/components/ui/label"
import { Badge } from "@/shared/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/shared/components/ui/sheet"
import { Product } from "../types"
import { quickUpdateSourcingPriceByProduct } from "../actions"

interface SpeedPricingDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Produkty ve frontě pro zadání cen */
  products: Product[]
  onComplete: () => void
  units: any[]
}

export function SpeedPricingDrawer({ open, onOpenChange, products, onComplete, units }: SpeedPricingDrawerProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [price, setPrice] = useState("")
  const [mena, setMena] = useState("EUR")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [completed, setCompleted] = useState<Set<string>>(new Set())
  const [skipped, setSkipped] = useState<Set<string>>(new Set())
  const priceInputRef = useRef<HTMLInputElement>(null)

  // Pricing Input Mode: Package vs Unit
  const [priceInputMode, setPriceInputMode] = useState<"package" | "unit">("package")
  const [unitPrice, setUnitPrice] = useState("")
  const [nakupniMjId, setNakupniMjId] = useState("")
  const [prevodniPomer, setPrevodniPomer] = useState("1")

  const currentProduct = products[currentIndex]
  const total = products.length
  const doneCount = completed.size + skipped.size
  const isLastProduct = currentIndex >= products.length - 1

  // Reset vždy při otevření
  useEffect(() => {
    if (open) {
      setCurrentIndex(0)
      setCompleted(new Set())
      setSkipped(new Set())
    }
  }, [open])

  // Prefill ceny a měny z aktuálního produktu s fallbackem z balení
  useEffect(() => {
    if (!currentProduct) return
    const primarySourcing =
      currentProduct.produkt_dodavatel?.find(s => s.is_primary) ||
      currentProduct.produkt_dodavatel?.[0]

    if (primarySourcing) {
      const existingPrice = primarySourcing.nakupni_cena
      
      // Fallback z fyzického balení produktu
      const isBuyingInBasicUnit = primarySourcing.nakupni_mj_id === currentProduct.zakladni_mj_id
      const fallbackUnitId = primarySourcing.nakupni_mj_id || currentProduct.jednotka_baleni_id || ""
      
      const hasExplicitRatio = primarySourcing.prevodni_pomer_na_zakladni && primarySourcing.prevodni_pomer_na_zakladni !== 1
      const fallbackRatio = (hasExplicitRatio
        ? primarySourcing.prevodni_pomer_na_zakladni
        : (isBuyingInBasicUnit ? 1 : (currentProduct.mnozstvi_v_baleni || 1))) ?? 1

      const ratioStr = fallbackRatio.toString()
      const priceStr = existingPrice > 0 ? existingPrice.toString() : ""

      setPrice(priceStr)
      setMena(primarySourcing.mena || "EUR")
      setNakupniMjId(fallbackUnitId)
      setPrevodniPomer(ratioStr)
      setPriceInputMode("package")

      const ratio = parseFloat(ratioStr) || 1
      const pr = parseFloat(priceStr) || 0
      setUnitPrice((pr / ratio).toFixed(4).replace(/\.?0+$/, ""))
    } else {
      // Fallback pro produkt bez sourcingu (pokud by nastal)
      setPrice("")
      setMena("EUR")
      setNakupniMjId(currentProduct.jednotka_baleni_id || "")
      setPrevodniPomer((currentProduct.mnozstvi_v_baleni || 1).toString())
      setPriceInputMode("package")
      setUnitPrice("")
    }

    // Auto-focus na input ceny
    setTimeout(() => priceInputRef.current?.focus(), 50)
  }, [currentIndex, currentProduct])

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

  const goToNext = useCallback(() => {
    if (currentIndex < products.length - 1) {
      setCurrentIndex(prev => prev + 1)
    } else {
      // Všechny produkty dokončeny
      toast.success(`Hotovo! Zadáno ${completed.size} cen.`, {
        description: skipped.size > 0 ? `${skipped.size} produktů přeskočeno.` : undefined,
      })
      onOpenChange(false)
      onComplete()
    }
  }, [currentIndex, products.length, completed.size, skipped.size, onOpenChange, onComplete])

  const handleSaveAndNext = async () => {
    if (!currentProduct) return
    const parsedPrice = parseFloat(price)

    if (!price || isNaN(parsedPrice) || parsedPrice <= 0) {
      toast.error("Zadejte platnou cenu větší než 0")
      priceInputRef.current?.focus()
      return
    }

    const primarySourcing =
      currentProduct.produkt_dodavatel?.find(s => s.is_primary) ||
      currentProduct.produkt_dodavatel?.[0]

    if (!primarySourcing) {
      toast.error("Produkt nemá přiřazeného dodavatele — přeskočte nebo přiřaďte dodavatele.")
      return
    }

    setIsSubmitting(true)
    try {
      const { error } = await quickUpdateSourcingPriceByProduct(
        currentProduct.id,
        parsedPrice,
        mena,
        parseFloat(prevodniPomer) || 1,
        nakupniMjId || null
      )
      if (error) throw error

      setCompleted(prev => new Set([...prev, currentProduct.id]))
      goToNext()
    } catch (e: any) {
      toast.error("Chyba při ukládání ceny", { description: e.message })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSkip = () => {
    if (!currentProduct) return
    setSkipped(prev => new Set([...prev, currentProduct.id]))
    goToNext()
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !isSubmitting) {
      e.preventDefault()
      handleSaveAndNext()
    }
    if (e.key === "Escape") {
      e.preventDefault()
      handleSkip()
    }
  }

  const goToPrev = () => {
    if (currentIndex > 0) setCurrentIndex(prev => prev - 1)
  }

  if (!currentProduct && open) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="bg-zinc-950 border-zinc-800 w-[400px]">
          <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
            <CheckCircle2 className="h-16 w-16 text-green-500" />
            <h3 className="text-xl font-bold text-white">Všechny ceny zadány!</h3>
            <p className="text-zinc-400 text-sm">
              Dokončeno {completed.size} z {total} produktů.
            </p>
            <Button onClick={() => { onOpenChange(false); onComplete() }}>
              Zavřít
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    )
  }

  const primarySourcing =
    currentProduct?.produkt_dodavatel?.find(s => s.is_primary) ||
    currentProduct?.produkt_dodavatel?.[0]

  const isBuyingInBasicUnit = primarySourcing?.nakupni_mj_id === currentProduct?.zakladni_mj_id
  const isMatchingProductPackaging = !!(currentProduct &&
    nakupniMjId === currentProduct.jednotka_baleni_id &&
    parseFloat(prevodniPomer) === (currentProduct.mnozstvi_v_baleni || 1))
  const isFallbackUsedInSourcing = !!(primarySourcing &&
    (!primarySourcing.nakupni_mj_id || !primarySourcing.prevodni_pomer_na_zakladni || primarySourcing.prevodni_pomer_na_zakladni === 1) &&
    !isBuyingInBasicUnit)

  // Orientační kalkulace B2C / B2B (bez dopravy/cla — to je na detailu)
  const parsedPrice = parseFloat(price) || 0
  const retail = currentProduct?.cilova_marze_retail_procenta || 30
  const partner = currentProduct?.cilova_marze_partner_procenta || 20
  const EXCHANGE_RATE_EUR_CZK = 25.0 // Hrubý odhad pro preview — přesný na detailu
  const priceCzk = mena === "EUR" ? parsedPrice * EXCHANGE_RATE_EUR_CZK
    : mena === "USD" ? parsedPrice * 23
    : parsedPrice
  const previewB2C = retail < 100 ? priceCzk / (1 - retail / 100) : 0
  const previewB2B = partner < 100 ? priceCzk / (1 - partner / 100) : 0

  const progressPercent = total > 0 ? (doneCount / total) * 100 : 0
  const isCompleted = completed.has(currentProduct?.id || "")
  const isSkippedCurrent = skipped.has(currentProduct?.id || "")

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        className="bg-zinc-950 border-zinc-800 w-[400px] sm:w-[420px] flex flex-col p-0"
        side="right"
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-zinc-800 flex-shrink-0">
          <SheetHeader className="space-y-0">
            <div className="flex items-center justify-between">
              <SheetTitle className="flex items-center gap-2 text-base font-bold">
                <Zap className="h-5 w-5 text-yellow-400" />
                Rychlé zadávání cen
              </SheetTitle>
              <span className="text-xs text-zinc-500 font-mono">
                {currentIndex + 1} / {total}
              </span>
            </div>
          </SheetHeader>

          {/* Progress bar */}
          <div className="mt-3 space-y-1">
            <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-yellow-500 to-primary rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-zinc-600">
              <span>{completed.size} uloženo</span>
              {skipped.size > 0 && <span>{skipped.size} přeskočeno</span>}
              <span>{total - doneCount} zbývá</span>
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Produkt info */}
          <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl space-y-1">
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-0.5 min-w-0">
                <p className="font-mono text-xs text-zinc-500 truncate">{currentProduct?.sku}</p>
                <p className="font-semibold text-sm text-white leading-tight">
                  {currentProduct?.nazev}
                </p>
              </div>
              {(isCompleted || isSkippedCurrent) && (
                <Badge
                  variant="outline"
                  className={isCompleted
                    ? "border-green-500/50 text-green-400 bg-green-500/5 shrink-0"
                    : "border-zinc-500/50 text-zinc-400 shrink-0"
                  }
                >
                  {isCompleted ? "✓ Uloženo" : "Přeskočeno"}
                </Badge>
              )}
            </div>

            {primarySourcing ? (
              <p className="text-[11px] text-zinc-400 flex items-center gap-1 pt-1">
                <span className="text-zinc-600">Dodavatel:</span>
                <span className="font-medium">
                  {(primarySourcing as any).dodavatele?.nazev_spolecnosti || "Primární dodavatel"}
                </span>
                {primarySourcing.is_primary && (
                  <Badge variant="outline" className="h-4 px-1 text-[9px] border-primary/30 text-primary">
                    Primární
                  </Badge>
                )}
              </p>
            ) : (
              <p className="text-[11px] text-amber-500 flex items-center gap-1 pt-1">
                ⚠ Žádný dodavatel — nejprve přiřaďte dodavatele.
              </p>
            )}
          </div>

          {/* Fyzické balení produktu */}
          {currentProduct && (
            <div className="p-3.5 bg-zinc-900 border border-zinc-850 rounded-xl text-xs space-y-1.5 shadow-sm">
              <span className="text-zinc-500 uppercase font-bold text-[9px] tracking-wider block">
                Fyzické balení v katalogu
              </span>
              <div className="flex justify-between text-zinc-400">
                <span>Základní prodejní jednotka:</span>
                <span className="text-zinc-200 font-medium">
                  {currentProduct.c_merne_jednotky_zakladni?.nazev || "Kus"} ({currentProduct.c_merne_jednotky_zakladni?.zkratka || "ks"})
                </span>
              </div>
              {currentProduct.mnozstvi_v_baleni && (
                <div className="flex justify-between text-zinc-400">
                  <span>Množství v balení:</span>
                  <span className="text-zinc-200 font-medium">
                    {currentProduct.mnozstvi_v_baleni} {currentProduct.c_merne_jednotky_zakladni?.zkratka || "ks"} / {currentProduct.c_merne_jednotky_baleni?.zkratka || units.find(u => u.id === currentProduct.jednotka_baleni_id)?.zkratka || "bal"}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Cenový input */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Měna</Label>
                <Select value={mena} onValueChange={(val) => setMena(val || "EUR")}>
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
                <Label>Zadání ceny</Label>
                <Select value={priceInputMode} onValueChange={(val: any) => handleToggleMode(val)}>
                  <SelectTrigger className="bg-zinc-900 border-zinc-800">
                    <SelectValue>
                      {priceInputMode === "package"
                        ? "Za balení"
                        : `Za jednotku (1 ${currentProduct?.c_merne_jednotky_zakladni?.zkratka || "ks"})`}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="package">Za balení / celá MJ</SelectItem>
                    <SelectItem value="unit">
                      Za jednotku (1 {currentProduct?.c_merne_jednotky_zakladni?.zkratka || "ks"})
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="price_input" className="text-sm font-semibold">
                {priceInputMode === "package" ? "Cena za balení" : `Cena za 1 ${currentProduct?.c_merne_jednotky_zakladni?.zkratka || "ks"}`}
                {primarySourcing?.nakupni_cena && primarySourcing.nakupni_cena > 0 && (
                  <span className="text-zinc-500 font-normal text-xs ml-2">
                    (aktuálně: {primarySourcing.nakupni_cena} {primarySourcing.mena} / {units.find(u => u.id === primarySourcing.nakupni_mj_id)?.zkratka || "bal"})
                  </span>
                )}
              </Label>
              <div className="flex gap-2">
                {priceInputMode === "package" ? (
                  <Input
                    ref={priceInputRef}
                    id="price_input"
                    type="number"
                    step="0.0001"
                    placeholder="0.00"
                    value={price}
                    onChange={(e) => handlePriceChange(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={!primarySourcing || isSubmitting}
                    className="bg-zinc-900 border-zinc-800 text-lg font-mono h-12 flex-1 focus:border-primary focus:ring-primary"
                    autoComplete="off"
                  />
                ) : (
                  <Input
                    ref={priceInputRef}
                    id="price_input"
                    type="number"
                    step="0.0001"
                    placeholder="0.00"
                    value={unitPrice}
                    onChange={(e) => handleUnitPriceChange(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={!primarySourcing || isSubmitting}
                    className="bg-zinc-900 border-zinc-800 text-lg font-mono h-12 flex-1 focus:border-primary focus:ring-primary"
                    autoComplete="off"
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
                    `Jednotková: ${(parseFloat(price) / parseFloat(prevodniPomer)).toFixed(4)} ${mena} / ${currentProduct?.c_merne_jednotky_zakladni?.zkratka || "ks"}`
                  ) : (
                    `Celková za balení: ${parseFloat(price).toFixed(4)} ${mena}`
                  )}
                </span>
              </div>
            )}

            {/* Buying unit and conversion ratio */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs">Nákupní jednotka</Label>
                <Select value={nakupniMjId} onValueChange={(val) => setNakupniMjId(val || "")}>
                  <SelectTrigger className="bg-zinc-900 border-zinc-800 h-9 text-xs">
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
              </div>

              <div className="space-y-2">
                <Label htmlFor="ratio" className="text-xs">Převod na základní MJ</Label>
                <Input
                  id="ratio"
                  type="number"
                  step="0.0001"
                  value={prevodniPomer}
                  onChange={(e) => handleRatioChange(e.target.value)}
                  className="bg-zinc-900 border-zinc-800 h-9 text-xs font-mono"
                />
              </div>
            </div>
            {nakupniMjId && parseFloat(prevodniPomer) > 0 && (
              <div className="flex items-center justify-between text-[10px] text-zinc-500 italic">
                <span>
                  * 1 {units.find(u => u.id === nakupniMjId)?.zkratka || "bal"} = {prevodniPomer} {currentProduct?.c_merne_jednotky_zakladni?.zkratka || "ks"}
                </span>
                {isMatchingProductPackaging ? (
                  <span className="text-emerald-500 flex items-center gap-0.5 font-semibold not-italic">
                    ✓ Shoduje se s balením
                  </span>
                ) : isFallbackUsedInSourcing ? (
                  <span className="text-amber-500 flex items-center gap-0.5 font-semibold not-italic">
                    ⚠️ Použit fallback z balení
                  </span>
                ) : null}
              </div>
            )}

            <p className="text-[10px] text-zinc-600 flex items-center gap-1 pt-1">
              <span>↩ Enter = uložit & další</span>
              <span className="mx-2 text-zinc-800">·</span>
              <span>Esc = přeskočit</span>
            </p>
          </div>

          {/* Preview kalkulace */}
          {parsedPrice > 0 && (
            <div className="p-3 bg-zinc-900/50 border border-zinc-800 rounded-lg space-y-2">
              <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
                Orientační prodejní ceny (preview)
              </p>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-0.5">
                  <p className="text-[10px] text-zinc-500">B2C Retail ({retail}% marže)</p>
                  <p className="font-mono text-sm font-bold text-green-400">
                    {previewB2C > 0
                      ? new Intl.NumberFormat("cs-CZ", { style: "currency", currency: "CZK", maximumFractionDigits: 0 }).format(previewB2C)
                      : "—"
                    }
                  </p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-[10px] text-zinc-500">B2B Partner ({partner}% marže)</p>
                  <p className="font-mono text-sm font-bold text-blue-400">
                    {previewB2B > 0
                      ? new Intl.NumberFormat("cs-CZ", { style: "currency", currency: "CZK", maximumFractionDigits: 0 }).format(previewB2B)
                      : "—"
                    }
                  </p>
                </div>
              </div>
              <p className="text-[9px] text-zinc-700 italic">
                * Orientační. Přesný výpočet (doprava, clo) na záložce Ceník v detailu produktu.
              </p>
            </div>
          )}

          {/* Navigace Prev / Next bez ukládání */}
          <div className="flex items-center justify-between pt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={goToPrev}
              disabled={currentIndex === 0}
              className="text-zinc-500 hover:text-white gap-1 text-xs"
            >
              <ArrowLeft className="h-3 w-3" /> Předchozí
            </Button>
            <span className="text-[10px] text-zinc-700">bez uložení</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentIndex(prev => Math.min(prev + 1, products.length - 1))}
              disabled={currentIndex >= products.length - 1}
              className="text-zinc-500 hover:text-white gap-1 text-xs"
            >
              Další <ArrowRight className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* Footer — akce */}
        <div className="px-6 pb-6 pt-4 border-t border-zinc-800 space-y-3 flex-shrink-0">
          <Button
            onClick={handleSaveAndNext}
            disabled={isSubmitting || !primarySourcing || !price}
            className="w-full h-11 gap-2 font-semibold text-base"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Ukládám...
              </span>
            ) : isLastProduct ? (
              <>
                <CheckCircle2 className="h-5 w-5" />
                Uložit & Dokončit
              </>
            ) : (
              <>
                <Zap className="h-5 w-5" />
                Uložit & Další
                <ChevronRight className="h-4 w-4 ml-auto" />
              </>
            )}
          </Button>

          <Button
            variant="ghost"
            onClick={handleSkip}
            disabled={isSubmitting}
            className="w-full text-zinc-500 hover:text-white gap-2"
          >
            <SkipForward className="h-4 w-4" />
            {isLastProduct ? "Přeskočit & Dokončit" : "Přeskočit"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}

