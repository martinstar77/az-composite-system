"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/shared/components/ui/button"
import { Label } from "@/shared/components/ui/label"
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
import { bulkUpdateLogisticsTemplate } from "../../actions"
import { LogisticsTemplate } from "@/modules/finance/types/logistics"

interface BulkEditLogisticsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedProductIds: string[]
  onSuccess: () => void
  templates: LogisticsTemplate[]
}

export function BulkEditLogisticsDialog({ open, onOpenChange, selectedProductIds, onSuccess, templates }: BulkEditLogisticsDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [templateId, setTemplateId] = useState<string>("")

  const handleSubmit = async () => {
    if (!templateId) return
    setIsSubmitting(true)
    try {
      const { error } = await bulkUpdateLogisticsTemplate(selectedProductIds, templateId)
      if (error) throw error
      toast.success(`Logistická trasa aktualizována u nákupních ceníků pro ${selectedProductIds.length} produktů.`)
      onSuccess()
      onOpenChange(false)
    } catch (e: any) {
      toast.error("Chyba při hromadné aktualizaci logistiky", { description: e.message })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-zinc-950 border-zinc-800">
        <DialogHeader>
          <DialogTitle>Hromadná úprava logistické trasy</DialogTitle>
          <DialogDescription className="text-zinc-400">
            Zvolená logistická šablona bude přiřazena ke všem existujícím nákupním ceníkům u {selectedProductIds.length} vybraných produktů.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Logistická trasa (Šablona pro dopravu a clo)</Label>
            <Select value={templateId} onValueChange={(val) => setTemplateId(val || "")}>
              <SelectTrigger className="bg-zinc-900 border-zinc-800">
                <SelectValue placeholder="— Vyberte trasu —" />
              </SelectTrigger>
              <SelectContent>
                {templates.map(t => (
                  <SelectItem key={t.id} value={t.id!}>
                    {t.nazev} ({t.typ_vypoctu_dopravy === 'procentualni' ? `${(t.sazba_dopravy * 100).toFixed(0)}%` : t.sazba_dopravy + ' EUR'})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="bg-zinc-900 border-zinc-800">Zrušit</Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || selectedProductIds.length === 0 || !templateId}>
            {isSubmitting ? 'Ukládám...' : 'Přepsat trasu'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
