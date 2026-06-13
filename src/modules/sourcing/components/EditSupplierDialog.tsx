"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog"
import { SupplierForm } from "./SupplierForm"
import { updateSupplier } from "../actions"
import { type SupplierFormValues } from "@/modules/sourcing/types/formSchema"
import { Supplier } from "@/modules/sourcing/types"

interface EditSupplierDialogProps {
  supplier: Supplier
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EditSupplierDialog({ supplier, open, onOpenChange }: EditSupplierDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()

  async function handleUpdate(data: SupplierFormValues) {
    setIsSubmitting(true)
    try {
      const { error } = await updateSupplier(supplier.id, data)
      if (error) {
        toast.error("Chyba při aktualizaci", { description: error.message })
      } else {
        toast.success("Údaje dodavatele aktualizovány")
        onOpenChange(false)
        router.refresh()
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] bg-background border-zinc-800 overflow-y-auto max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Upravit: {supplier.nazev_spolecnosti}</DialogTitle>
          <DialogDescription>
            Upravte identifikační údaje nebo obchodní podmínky dodavatele.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4">
          <SupplierForm 
            initialData={supplier}
            onSubmit={handleUpdate} 
            isSubmitting={isSubmitting} 
            onCancel={() => onOpenChange(false)} 
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
