'use client'

import * as React from 'react'
import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/shared/components/ui/dialog'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { Textarea } from '@/shared/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select'
import { upsertProjekt } from '../actions/projekty'
import { Projekt, StavProjektu, STAV_PROJEKTU_CONFIG } from '../types'

const PRESET_COLORS = [
  '#8A0485', // Brand Purple
  '#2563eb', // Blue
  '#16a34a', // Green
  '#d97706', // Amber
  '#dc2626', // Red
  '#7c3aed', // Violet
  '#0891b2', // Cyan
  '#db2777', // Pink
  '#4D4D4D', // Brand Gray
]

interface ProjektFormDialogProps {
  projekt?: Projekt
  trigger?: React.ReactNode
  onSuccess?: (id: string) => void
}

export function ProjektFormDialog({ projekt, trigger, onSuccess }: ProjektFormDialogProps) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  const [form, setForm] = useState({
    nazev: projekt?.nazev ?? '',
    popis: projekt?.popis ?? '',
    stav: (projekt?.stav ?? 'planned') as StavProjektu,
    barva: projekt?.barva ?? '#8A0485',
    datum_zahajeni: projekt?.datum_zahajeni ?? '',
    datum_ukonceni: projekt?.datum_ukonceni ?? '',
  })

  const isEdit = !!projekt

  function handleChange(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      const result = await upsertProjekt(
        {
          ...form,
          datum_zahajeni: form.datum_zahajeni || null,
          datum_ukonceni: form.datum_ukonceni || null,
          popis: form.popis || null,
        },
        projekt?.id
      )
      if (result.success) {
        toast.success(isEdit ? 'Projekt byl upraven.' : 'Projekt byl vytvořen.')
        setOpen(false)
        if (!isEdit) {
          setForm({ nazev: '', popis: '', stav: 'planned', barva: '#8A0485', datum_zahajeni: '', datum_ukonceni: '' })
        }
        if (result.data?.id) onSuccess?.(result.data.id)
      } else {
        toast.error(result.error ?? 'Chyba při ukládání projektu.')
      }
    })
  }

  const triggerElement = trigger ?? (
    <Button size="sm">
      {isEdit ? 'Upravit projekt' : '+ Nový projekt'}
    </Button>
  )

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={triggerElement as React.ReactElement} />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Upravit projekt' : 'Nový projekt'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Název */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="projekt-nazev">Název projektu *</Label>
            <Input
              id="projekt-nazev"
              value={form.nazev}
              onChange={e => handleChange('nazev', e.target.value)}
              placeholder="např. Zavedení WMS modulu"
              required
            />
          </div>

          {/* Popis */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="projekt-popis">Popis</Label>
            <Textarea
              id="projekt-popis"
              value={form.popis}
              onChange={e => handleChange('popis', e.target.value)}
              placeholder="Stručný popis cíle projektu..."
              rows={3}
            />
          </div>

          {/* Stav + Barva */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Stav</Label>
              <Select value={form.stav} onValueChange={v => handleChange('stav', v ?? 'planned')}>
                <SelectTrigger id="projekt-stav">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.entries(STAV_PROJEKTU_CONFIG) as [StavProjektu, typeof STAV_PROJEKTU_CONFIG[StavProjektu]][]).map(([key, cfg]) => (
                    <SelectItem key={key} value={key}>
                      {cfg.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Barva projektu</Label>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {PRESET_COLORS.map(color => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => handleChange('barva', color)}
                    className="h-6 w-6 rounded-full border-2 transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
                    style={{
                      backgroundColor: color,
                      borderColor: form.barva === color ? 'white' : 'transparent',
                      boxShadow: form.barva === color ? `0 0 0 2px ${color}` : 'none',
                    }}
                    aria-label={`Barva ${color}`}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Datumy */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="projekt-datum-zahajeni">Zahájení</Label>
              <Input
                id="projekt-datum-zahajeni"
                type="date"
                value={form.datum_zahajeni ?? ''}
                onChange={e => handleChange('datum_zahajeni', e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="projekt-datum-ukonceni">Ukončení</Label>
              <Input
                id="projekt-datum-ukonceni"
                type="date"
                value={form.datum_ukonceni ?? ''}
                onChange={e => handleChange('datum_ukonceni', e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Ukládám…' : isEdit ? 'Uložit změny' : 'Vytvořit projekt'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
