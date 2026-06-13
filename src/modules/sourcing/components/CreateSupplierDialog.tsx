"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Plus } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/shared/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/components/ui/dialog"
import { SupplierForm } from "./SupplierForm"
import { createSupplier } from "../actions"
import { type SupplierFormValues } from "@/modules/sourcing/types/formSchema"

export function CreateSupplierDialog() {
  const [open, setOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()

  async function handleCreate(data: SupplierFormValues) {
    setIsSubmitting(true)
    try {
      const { error } = await createSupplier(data)
      if (error) {
        toast.error("Chyba při ukládání", { description: error.message })
      } else {
        toast.success("Dodavatel úspěšně vytvořen")
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
        Přidat dodavatele
      </DialogTrigger>
      <DialogContent className="sm:max-w-[700px] bg-background border-zinc-800 overflow-y-auto max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Nový Dodavatel</DialogTitle>
          <DialogDescription>
            Založte v systému nového obchodního partnera a definujte jeho platební podmínky.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4">
          <SupplierForm 
            onSubmit={handleCreate} 
            isSubmitting={isSubmitting} 
            onCancel={() => setOpen(false)} 
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
