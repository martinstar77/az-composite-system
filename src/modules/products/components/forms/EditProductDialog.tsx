"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ProductForm } from "./ProductForm"
import { type ProductFormValues } from "@/modules/products/types/formSchema"
import { updateProduct } from "@/modules/products/actions"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog"
import { Product } from "../../types"

interface EditProductDialogProps {
  product: Product
  open: boolean
  onOpenChange: (open: boolean) => void
  lookups: {
    categories: any[]
    units: any[]
    statuses: any[]
    labels: any[]
    processes: any[]
  }
}

export function EditProductDialog({ product, open, onOpenChange, lookups }: EditProductDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()

  async function handleUpdate(data: ProductFormValues) {
    setIsSubmitting(true)
    try {
      const { error } = await updateProduct(product.id, data)
      if (error) {
        alert("Chyba při aktualizaci: " + error.message)
      } else {
        onOpenChange(false)
        router.refresh()
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[750px] max-h-[95vh] overflow-y-auto bg-background">
        <DialogHeader>
          <DialogTitle>Upravit Produkt: {product.nazev}</DialogTitle>
          <DialogDescription>
            Upravte logistické údaje nebo technické parametry produktu.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4">
          <ProductForm 
            initialData={product}
            lookups={lookups} 
            onSubmit={handleUpdate} 
            isSubmitting={isSubmitting} 
            onCancel={() => onOpenChange(false)} 
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
