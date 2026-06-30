"use client"

import { useState } from "react"
import { Button } from "@/shared/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select"
import { Label } from "@/shared/components/ui/label"
import { FileText } from "lucide-react"
import { toast } from "sonner"

export function ExportCatalogPdfButton() {
  const [tier, setTier] = useState("partner")
  const [currency, setCurrency] = useState("EUR")
  const [lang, setLang] = useState("cs")
  const [isOpen, setIsOpen] = useState(false)

  const handleGenerate = () => {
    try {
      const url = `/api/katalogy/pdf?tier=${tier}&currency=${currency}&lang=${lang}&categories=all&status=all`
      window.open(url, "_blank")
      toast.success("PDF katalog se otevírá v nové záložce.")
      setIsOpen(false)
    } catch (e: any) {
      toast.error("Chyba při otevírání PDF", { description: e.message })
    }
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger render={
        <Button
          variant="outline"
          className="gap-2 border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-850"
        >
          <FileText className="h-4 w-4" />
          Exportovat Katalog (PDF)
        </Button>
      } />
      <PopoverContent className="w-80 bg-zinc-950 border-zinc-850 text-zinc-200 p-4 shadow-xl">
        <div className="space-y-4">
          <div className="border-b border-zinc-800 pb-2">
            <h3 className="font-bold text-sm text-white">Generátor PDF Katalogu</h3>
            <p className="text-[10px] text-zinc-400">Vyberte parametry pro exportovaný ceník.</p>
          </div>

          <div className="space-y-3">
            {/* Ceníková úroveň */}
            <div className="space-y-1">
              <Label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide">Ceníková úroveň</Label>
              <Select value={tier} onValueChange={(val) => setTier(val || "partner")}>
                <SelectTrigger className="bg-zinc-900 border-zinc-800 text-xs h-8 text-zinc-300">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-200">
                  <SelectItem value="retail" className="text-xs hover:bg-zinc-850 cursor-pointer">Maloobchodní (B2C)</SelectItem>
                  <SelectItem value="partner" className="text-xs hover:bg-zinc-850 cursor-pointer">Velkoobchodní (B2B)</SelectItem>
                  <SelectItem value="partner_5" className="text-xs hover:bg-zinc-850 cursor-pointer">B2B partner -5 %</SelectItem>
                  <SelectItem value="partner_10" className="text-xs hover:bg-zinc-850 cursor-pointer">B2B partner -10 %</SelectItem>
                  <SelectItem value="partner_15" className="text-xs hover:bg-zinc-850 cursor-pointer">B2B partner -15 %</SelectItem>
                  <SelectItem value="partner_20" className="text-xs hover:bg-zinc-850 cursor-pointer">B2B partner -20 %</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Měna */}
            <div className="space-y-1">
              <Label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide">Měna</Label>
              <Select value={currency} onValueChange={(val) => setCurrency(val || "EUR")}>
                <SelectTrigger className="bg-zinc-900 border-zinc-800 text-xs h-8 text-zinc-300">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-200">
                  <SelectItem value="EUR" className="text-xs hover:bg-zinc-850 cursor-pointer">EUR (€)</SelectItem>
                  <SelectItem value="CZK" className="text-xs hover:bg-zinc-850 cursor-pointer">CZK (Kč)</SelectItem>
                  <SelectItem value="USD" className="text-xs hover:bg-zinc-850 cursor-pointer">USD ($)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Jazyk */}
            <div className="space-y-1">
              <Label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide">Jazyk</Label>
              <Select value={lang} onValueChange={(val) => setLang(val || "cs")}>
                <SelectTrigger className="bg-zinc-900 border-zinc-800 text-xs h-8 text-zinc-300">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-200">
                  <SelectItem value="cs" className="text-xs hover:bg-zinc-850 cursor-pointer">Čeština (CS)</SelectItem>
                  <SelectItem value="en" className="text-xs hover:bg-zinc-850 cursor-pointer">English (EN)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button
            onClick={handleGenerate}
            className="w-full bg-primary hover:bg-primary-hover text-white text-xs font-bold h-9 mt-2"
          >
            Vygenerovat PDF Katalog
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
