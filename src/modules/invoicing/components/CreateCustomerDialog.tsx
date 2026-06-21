'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/shared/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/shared/components/ui/dialog'
import { CustomerForm } from './CustomerForm'
import { createZakaznik, generateZakaznikKod } from '../actions/customers'
import type { ZakaznikFormValues } from '../types/formSchema'

export function CreateCustomerDialog() {
  const [open, setOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()

  async function handleOpenChange(isOpen: boolean) {
    setOpen(isOpen)
  }

  async function handleCreate(data: ZakaznikFormValues) {
    setIsSubmitting(true)
    const result = await createZakaznik(data)
    setIsSubmitting(false)

    if (result.success) {
      toast.success('Zákazník byl úspěšně vytvořen')
      setOpen(false)
      router.refresh()
    } else {
      toast.error(result.error ?? 'Chyba při vytváření zákazníka')
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button className="gap-2" />}>
        <Plus className="h-4 w-4" />
        Přidat zákazníka
      </DialogTrigger>
      <DialogContent className="sm:max-w-[700px] bg-background border-zinc-800 overflow-y-auto max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Nový Zákazník</DialogTitle>
          <DialogDescription>
            Založte v systému nového zákazníka pro vystavování faktur, nabídek a objednávek.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4">
          <CustomerForm
            onSubmit={handleCreate}
            isSubmitting={isSubmitting}
            onCancel={() => setOpen(false)}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
