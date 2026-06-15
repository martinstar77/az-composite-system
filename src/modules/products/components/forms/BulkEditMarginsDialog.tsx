"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { Label } from "@/shared/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/shared/components/ui/dialog"
import { bulkUpdateProductMargins } from "../../actions"

interface BulkEditMarginsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedProductIds: string[]
  onSuccess: () => void
}

export function BulkEditMarginsDialog({ open, onOpenChange, selectedProductIds, onSuccess }: BulkEditMarginsDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [margins, setMargins] = useState({
    retail: 30,
    partner: 20
  })

  const handleSubmit = async () => {
    setIsSubmitting(true)
    try {
      const { error } = await bulkUpdateProductMargins(selectedProductIds, margins)
      if (error) throw error
      toast.success(`Úspěšně aktualizováno ${selectedProductIds.length} produktů`)
      onSuccess()
      onOpenChange(false)
    } catch (e: any) {
      toast.error("Chyba při hromadné aktualizaci", { description: e.message })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-zinc-950 border-zinc-800">
        <DialogHeader>
          <DialogTitle>Hromadná úprava marží</DialogTitle>
          <DialogDescription className="text-zinc-400">
            Zadané marže budou aplikovány na všech {selectedProductIds.length} vybraných produktů. Stávající hodnoty budou přepsány.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Retail (B2C) Marže %</Label>
            <Input 
              type="number" 
              step="0.1" 
              value={margins.retail} 
              onChange={(e) => setMargins({...margins, retail: parseFloat(e.target.value) || 0})} 
              className="bg-zinc-900 border-zinc-800" 
            />
          </div>
          <div className="space-y-2">
            <Label>Partner (B2B) Marže %</Label>
            <Input 
              type="number" 
              step="0.1" 
              value={margins.partner} 
              onChange={(e) => setMargins({...margins, partner: parseFloat(e.target.value) || 0})} 
              className="bg-zinc-900 border-zinc-800" 
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="bg-zinc-900 border-zinc-800">Zrušit</Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || selectedProductIds.length === 0}>
            {isSubmitting ? 'Ukládám...' : 'Přepsat hodnoty'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
