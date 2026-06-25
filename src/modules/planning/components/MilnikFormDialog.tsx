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
import { upsertMilnik } from '../actions/milniky'
import {
  Milnik,
  StavMilniku,
  PrioritaMilniku,
  STAV_MILNIKU_CONFIG,
  PRIORITA_CONFIG,
} from '../types'

interface MilnikFormDialogProps {
  projektId: string
  milnik?: Milnik
  trigger?: React.ReactNode
  onSuccess?: (milnik: Milnik) => void
}

export function MilnikFormDialog({ projektId, milnik, trigger, onSuccess }: MilnikFormDialogProps) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  const [form, setForm] = useState({
    nazev: milnik?.nazev ?? '',
    popis: milnik?.popis ?? '',
    stav: (milnik?.stav ?? 'planned') as StavMilniku,
    priorita: (milnik?.priorita ?? 'medium') as PrioritaMilniku,
    datum_zahajeni: milnik?.datum_zahajeni ?? '',
    datum_splatnosti: milnik?.datum_splatnosti ?? '',
    progres_procenta: milnik?.progres_procenta ?? 0,
  })

  const isEdit = !!milnik

  function handleChange(field: string, value: string | number) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      const result = await upsertMilnik(
        {
          projekt_id: projektId,
          nazev: form.nazev,
          popis: form.popis || null,
          stav: form.stav,
          priorita: form.priorita,
          datum_zahajeni: form.datum_zahajeni || null,
          datum_splatnosti: form.datum_splatnosti || null,
          progres_procenta: form.progres_procenta,
        },
        milnik?.id
      )
      if (result.success) {
        toast.success(isEdit ? 'Milník byl upraven.' : 'Milník byl přidán.')
        setOpen(false)
        if (!isEdit) {
          setForm({
            nazev: '', popis: '', stav: 'planned', priorita: 'medium',
            datum_zahajeni: '', datum_splatnosti: '', progres_procenta: 0,
          })
        }
        if (result.data) onSuccess?.(result.data)
      } else {
        toast.error(result.error ?? 'Chyba při ukládání milníku.')
      }
    })
  }

  const triggerElement = trigger ?? (
    <Button size="sm" variant="outline">
      {isEdit ? 'Upravit' : '+ Přidat milník'}
    </Button>
  )

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={triggerElement as React.ReactElement} />
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Upravit milník' : 'Nový milník'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Název */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="milnik-nazev">Název fáze / milníku *</Label>
            <Input
              id="milnik-nazev"
              value={form.nazev}
              onChange={e => handleChange('nazev', e.target.value)}
              placeholder="např. Analýza požadavků"
              required
            />
          </div>

          {/* Popis */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="milnik-popis">Popis</Label>
            <Textarea
              id="milnik-popis"
              value={form.popis}
              onChange={e => handleChange('popis', e.target.value)}
              placeholder="Co je obsahem této fáze?"
              rows={2}
            />
          </div>

          {/* Stav + Priorita */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Stav</Label>
              <Select value={form.stav} onValueChange={v => handleChange('stav', v ?? 'planned')}>
                <SelectTrigger id="milnik-stav">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.entries(STAV_MILNIKU_CONFIG) as [StavMilniku, typeof STAV_MILNIKU_CONFIG[StavMilniku]][]).map(([key, cfg]) => (
                    <SelectItem key={key} value={key}>
                      <span className={`inline-flex items-center gap-1.5 ${cfg.color}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
                        {cfg.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Priorita</Label>
              <Select value={form.priorita} onValueChange={v => handleChange('priorita', v ?? 'medium')}>
                <SelectTrigger id="milnik-priorita">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.entries(PRIORITA_CONFIG) as [PrioritaMilniku, typeof PRIORITA_CONFIG[PrioritaMilniku]][]).map(([key, cfg]) => (
                    <SelectItem key={key} value={key}>
                      <span className={`${cfg.color} font-medium`}>
                        {cfg.icon} {cfg.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Datumy */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="milnik-zahajeni">Zahájení</Label>
              <Input
                id="milnik-zahajeni"
                type="date"
                value={form.datum_zahajeni ?? ''}
                onChange={e => handleChange('datum_zahajeni', e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="milnik-deadline">Deadline</Label>
              <Input
                id="milnik-deadline"
                type="date"
                value={form.datum_splatnosti ?? ''}
                onChange={e => handleChange('datum_splatnosti', e.target.value)}
              />
            </div>
          </div>

          {/* Progress */}
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between items-center">
              <Label htmlFor="milnik-progres">Progress</Label>
              <span className="text-sm font-medium text-primary tabular-nums">{form.progres_procenta}%</span>
            </div>
            <input
              id="milnik-progres"
              type="range"
              min={0}
              max={100}
              step={5}
              value={form.progres_procenta}
              onChange={e => handleChange('progres_procenta', Number(e.target.value))}
              className="h-2 w-full cursor-pointer appearance-none rounded-full bg-muted accent-primary"
            />
          </div>

          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Ukládám…' : isEdit ? 'Uložit změny' : 'Přidat milník'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
