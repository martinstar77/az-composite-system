'use client'

import * as React from 'react'
import { useState, useTransition, useEffect } from 'react'
import { toast } from 'sonner'
import { Plus, X } from 'lucide-react'
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
import { upsertOddeleni } from '../actions/oddeleni'
import type { FirmaOddeleni } from '../types'

interface OddeleniFormDialogProps {
  oddeleni?: FirmaOddeleni
  userProfiles: { id: string; jmeno: string }[]
  trigger?: React.ReactNode
  onSuccess?: () => void
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function OddeleniFormDialog({
  oddeleni,
  userProfiles,
  trigger,
  onSuccess,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: OddeleniFormDialogProps) {
  const [localOpen, setLocalOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  const open = controlledOpen !== undefined ? controlledOpen : localOpen
  const setOpen = controlledOnOpenChange !== undefined ? controlledOnOpenChange : setLocalOpen

  const isEdit = !!oddeleni

  const [form, setForm] = useState({
    id: oddeleni?.id ?? '',
    nazev: oddeleni?.nazev ?? '',
    vlastnik_id: oddeleni?.vlastnik_id ?? '',
    barva: oddeleni?.barva ?? '#4d4d4d',
    popis: oddeleni?.popis ?? '',
    kpi: oddeleni?.kpi ?? '',
  })

  // Sync state when dialog opens or edited department changes
  useEffect(() => {
    if (open) {
      setForm({
        id: oddeleni?.id ?? '',
        nazev: oddeleni?.nazev ?? '',
        vlastnik_id: oddeleni?.vlastnik_id ?? '',
        barva: oddeleni?.barva ?? '#4d4d4d',
        popis: oddeleni?.popis ?? '',
        kpi: oddeleni?.kpi ?? '',
      })
    }
  }, [open, oddeleni])

  function handleChange(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!form.id.trim()) {
      toast.error('Kód oddělení je povinný.')
      return
    }

    startTransition(async () => {
      const result = await upsertOddeleni(
        {
          id: form.id.toLowerCase().trim(),
          nazev: form.nazev,
          vlastnik_id: form.vlastnik_id || null,
          barva: form.barva,
          popis: form.popis || null,
          kpi: form.kpi || null,
        },
        isEdit
      )

      if (result.success) {
        toast.success(isEdit ? 'Oddělení bylo upraveno.' : 'Oddělení bylo vytvořeno.')
        setOpen(false)
        if (!isEdit) {
          setForm({
            id: '',
            nazev: '',
            vlastnik_id: '',
            barva: '#4d4d4d',
            popis: '',
            kpi: '',
          })
        }
        onSuccess?.()
      } else {
        toast.error(result.error ?? 'Chyba při ukládání oddělení.')
      }
    })
  }

  const hasTrigger = trigger !== null
  const triggerElement = trigger ?? (
    <Button size="sm" variant="outline">
      {isEdit ? 'Upravit' : '+ Nové oddělení'}
    </Button>
  )

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {hasTrigger && <DialogTrigger render={triggerElement as React.ReactElement} />}
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Upravit oddělení' : 'Nové oddělení'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          
          {/* ID / Kód */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="dept-id">Kód oddělení (slouží jako ID v URL, nelze změnit) *</Label>
            <Input
              id="dept-id"
              value={form.id}
              onChange={e => handleChange('id', e.target.value)}
              placeholder="např. sales, finance, sklad"
              required
              disabled={isEdit}
              className="font-mono text-xs"
            />
          </div>

          {/* Název */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="dept-nazev">Název oddělení *</Label>
            <Input
              id="dept-nazev"
              value={form.nazev}
              onChange={e => handleChange('nazev', e.target.value)}
              placeholder="např. Obchod a akvizice"
              required
            />
          </div>

          {/* Vlastník (STO) */}
          <div className="flex flex-col gap-1.5">
            <Label>Odpovědný vlastník (STO)</Label>
            <Select value={form.vlastnik_id} onValueChange={v => handleChange('vlastnik_id', v ?? '')}>
              <SelectTrigger id="dept-vlastnik">
                <SelectValue placeholder="Vyberte odpovědnou osobu...">
                  {form.vlastnik_id === ''
                    ? '-- Nepřiřazeno (Společné) --'
                    : userProfiles.find(u => u.id === form.vlastnik_id)?.jmeno}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">-- Nepřiřazeno (Společné) --</SelectItem>
                {userProfiles.map(u => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.jmeno}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Barva */}
          <div className="flex flex-col gap-1.5">
            <Label>Barva oddělení (štítky a grafy)</Label>
            <div className="flex flex-wrap items-center gap-2">
              {[
                '#8A0485', '#4D4D4D', '#2563eb', '#0ea5e9', 
                '#7c3aed', '#0d9488', '#16a34a', '#22c55e', 
                '#ea580c', '#db2777'
              ].map(color => {
                const isSelected = form.barva.toLowerCase() === color.toLowerCase()
                return (
                  <button
                    key={color}
                    type="button"
                    onClick={() => handleChange('barva', color)}
                    className={`h-7 w-7 rounded-full border transition-all flex items-center justify-center cursor-pointer ${
                      isSelected
                        ? 'border-foreground ring-2 ring-offset-2 ring-foreground/60'
                        : 'border-border hover:scale-105'
                    }`}
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                )
              })}
              
              {/* Custom input color */}
              <div className="flex items-center gap-1 border rounded-lg h-7 px-1.5 bg-background shrink-0 select-none">
                <span className="text-[10px] text-muted-foreground font-medium">Custom:</span>
                <input
                  type="color"
                  value={form.barva}
                  onChange={e => handleChange('barva', e.target.value)}
                  className="h-4.5 w-4.5 cursor-pointer border-0 bg-transparent p-0 rounded shrink-0"
                  title="Vybrat vlastní barvu"
                />
              </div>
            </div>
          </div>

          {/* Popis činností */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="dept-popis">Popis / Klíčové činnosti</Label>
            <Textarea
              id="dept-popis"
              value={form.popis}
              onChange={e => handleChange('popis', e.target.value)}
              placeholder="Jaké procesy a činnosti toto oddělení zaštiťuje..."
              rows={3}
            />
          </div>

          {/* KPIs */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="dept-kpi">Klíčové metriky (KPIs)</Label>
            <Textarea
              id="dept-kpi"
              value={form.kpi}
              onChange={e => handleChange('kpi', e.target.value)}
              placeholder="Jak se měří úspěšnost (např. Uptime, marže, OTIF)..."
              rows={2}
            />
          </div>

          <DialogFooter className="pt-2 border-t">
            <Button type="submit" disabled={isPending} className="w-full">
              {isPending ? 'Ukládám…' : isEdit ? 'Uložit změny' : 'Vytvořit oddělení'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
