"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/shared/components/ui/button"
import { RefreshCw } from "lucide-react"
import { toast } from "sonner"
import { bulkRecalculateProductWeights } from "@/modules/products/actions"

export function BulkRecalculateWeightsButton() {
  const [isPending, setIsPending] = useState(false)
  const router = useRouter()

  async function handleRecalculate() {
    setIsPending(true)
    toast.loading("Přepočítávám hmotnosti všech produktů...", { id: "bulk-weight" })
    try {
      const res = await bulkRecalculateProductWeights()
      if (res.success) {
        toast.success(`Hmotnosti úspěšně přepočítány pro ${res.updatedCount} produktů.`, { id: "bulk-weight" })
        router.refresh()
      } else {
        toast.error("Chyba při přepočtu: " + (res.error?.message || "Neznámá chyba"), { id: "bulk-weight" })
      }
    } catch (e: any) {
      toast.error("Neočekávaná chyba při přepočtu", { description: e.message, id: "bulk-weight" })
    } finally {
      setIsPending(false)
    }
  }

  return (
    <Button
      variant="outline"
      onClick={handleRecalculate}
      disabled={isPending}
      className="gap-2 border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-850"
    >
      <RefreshCw className={`h-4 w-4 ${isPending ? "animate-spin" : ""}`} />
      Hromadně aktualizovat hmotnost
    </Button>
  )
}
