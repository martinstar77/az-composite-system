'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog'
import { CustomerForm } from './CustomerForm'
import { updateZakaznik } from '../actions/customers'
import type { ZakaznikFormValues } from '../types/formSchema'
import type { Zakaznik } from '../types'

interface EditCustomerDialogProps {
  customer: Zakaznik
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EditCustomerDialog({ customer, open, onOpenChange }: EditCustomerDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()

  async function handleUpdate(data: ZakaznikFormValues) {
    setIsSubmitting(true)
    const result = await updateZakaznik(customer.id, data)
    setIsSubmitting(false)

    if (result.success) {
      toast.success('Údaje zákazníka byly aktualizovány')
      onOpenChange(false)
      router.refresh()
    } else {
      toast.error(result.error ?? 'Chyba při aktualizaci')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] bg-background border-zinc-800 overflow-y-auto max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Upravit: {customer.nazev_spolecnosti}</DialogTitle>
          <DialogDescription>
            Upravte identifikační údaje, adresu nebo obchodní podmínky zákazníka.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4">
          <CustomerForm
            initialData={customer}
            onSubmit={handleUpdate}
            isSubmitting={isSubmitting}
            onCancel={() => onOpenChange(false)}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
