"use client"

import { Button } from "@/shared/components/ui/button"
import { FileText } from "lucide-react"
import { toast } from "sonner"

export function ExportCatalogPdfButton() {
  const handleGenerate = () => {
    try {
      const url = `/api/katalogy/pdf?mode=products&lang=cs`
      window.open(url, "_blank")
      toast.success("PDF katalog produktů se otevírá v nové záložce.")
    } catch (e: any) {
      toast.error("Chyba při otevírání PDF", { description: e.message })
    }
  }

  return (
    <Button
      variant="outline"
      onClick={handleGenerate}
      className="gap-2 border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-850"
    >
      <FileText className="h-4 w-4" />
      Exportovat Katalog (PDF)
    </Button>
  )
}
