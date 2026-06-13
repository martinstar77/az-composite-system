"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ProductForm } from "./ProductForm"
import { type ProductFormValues } from "@/modules/products/types/formSchema"
import { createProduct } from "@/modules/products/actions"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/components/ui/dialog"
import { Button } from "@/shared/components/ui/button"
import { Plus } from "lucide-react"

interface CreateProductDialogProps {
  lookups: {
    categories: any[]
    units: any[]
    statuses: any[]
    labels: any[]
    processes: any[]
  }
}

export function CreateProductDialog({ lookups }: CreateProductDialogProps) {
  const [open, setOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()

  async function handleCreate(data: ProductFormValues) {
    setIsSubmitting(true)
    try {
      const { error } = await createProduct(data)
      if (error) {
        alert("Chyba při ukládání: " + error.message)
      } else {
        setOpen(false)
        router.refresh()
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button className="gap-2" />}>
        <Plus className="h-4 w-4" />
        Přidat produkt
      </DialogTrigger>
      <DialogContent className="sm:max-w-[750px] max-h-[95vh] overflow-y-auto bg-background">
        <DialogHeader>
          <DialogTitle>Nový Produkt (PIM)</DialogTitle>
          <DialogDescription>
            Zadejte základní logistické a identifikační údaje o novém materiálu.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4">
          <ProductForm 
            lookups={lookups} 
            onSubmit={handleCreate} 
            isSubmitting={isSubmitting} 
            onCancel={() => setOpen(false)} 
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
