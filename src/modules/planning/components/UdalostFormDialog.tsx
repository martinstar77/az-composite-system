'use client'

import * as React from 'react'
import { useState, useTransition, useEffect } from 'react'
import { toast } from 'sonner'
import { Calendar, MapPin, Users, Info } from 'lucide-react'
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
import { upsertUdalost, deleteUdalost } from '../actions/udalosti'
import { getAllMilnikyActive } from '../actions/milniky'
import { UdalostPlanovani, StavUdalosti } from '../types'

interface UdalostFormDialogProps {
  milnikId?: string
  udalost?: UdalostPlanovani
  userProfiles: { id: string; jmeno: string }[]
  trigger?: React.ReactNode
  onSuccess?: () => void
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function UdalostFormDialog({
  milnikId,
  udalost,
  userProfiles,
  trigger,
  onSuccess,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: UdalostFormDialogProps) {
  const [localOpen, setLocalOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  const open = controlledOpen !== undefined ? controlledOpen : localOpen
  const setOpen = controlledOnOpenChange !== undefined ? controlledOnOpenChange : setLocalOpen

  const [selectedMilnikId, setSelectedMilnikId] = useState(milnikId ?? udalost?.milnik_id ?? '')
  const [activeMilniky, setActiveMilniky] = useState<{ id: string; nazev: string; projekt_nazev?: string }[]>([])

  const isEdit = !!udalost

  // Load active milestones
  useEffect(() => {
    if (open) {
      getAllMilnikyActive().then(res => {
        if (res.success && res.data) {
          let list = [...res.data]
          const targetMilnikId = udalost?.milnik_id ?? milnikId
          if (targetMilnikId) {
            const exists = list.some(m => m.id === targetMilnikId)
            if (!exists) {
              list.push({
                id: targetMilnikId,
                nazev: udalost?.milnik?.nazev ?? 'Aktuální milník',
                projekt_id: udalost?.milnik?.projekt_id ?? '',
                projekt_nazev: 'Původní projekt'
              })
            }
          }
          setActiveMilniky(list)
        }
      })
    }
  }, [open, udalost, milnikId])

  // Helper to format ISO string to local input format (YYYY-MM-DDTHH:mm)
  const formatDateTimeLocal = (isoStr?: string) => {
    if (!isoStr) return ''
    const d = new Date(isoStr)
    const yyyy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    const hh = String(d.getHours()).padStart(2, '0')
    const min = String(d.getMinutes()).padStart(2, '0')
    return `${yyyy}-${mm}-${dd}T${hh}:${min}`
  }

  const [form, setForm] = useState({
    nazev: udalost?.nazev ?? '',
    popis: udalost?.popis ?? '',
    stav: (udalost?.stav ?? 'scheduled') as StavUdalosti,
    datum_zahajeni: formatDateTimeLocal(udalost?.datum_zahajeni) || formatDateTimeLocal(new Date().toISOString()),
    datum_ukonceni: formatDateTimeLocal(udalost?.datum_ukonceni || undefined) || '',
    lokalita: udalost?.lokalita ?? '',
    organizator_id: udalost?.organizator_id ?? '',
  })

  const [selectedUcastnici, setSelectedUcastnici] = useState<string[]>(udalost?.ucastnici_ids ?? [])

  // Sync state when dialog opens or event changes
  useEffect(() => {
    if (open) {
      setForm({
        nazev: udalost?.nazev ?? '',
        popis: udalost?.popis ?? '',
        stav: (udalost?.stav ?? 'scheduled') as StavUdalosti,
        datum_zahajeni: formatDateTimeLocal(udalost?.datum_zahajeni) || formatDateTimeLocal(new Date().toISOString()),
        datum_ukonceni: formatDateTimeLocal(udalost?.datum_ukonceni || undefined) || '',
        lokalita: udalost?.lokalita ?? '',
        organizator_id: udalost?.organizator_id ?? '',
      })
      setSelectedUcastnici(udalost?.ucastnici_ids ?? [])
      setSelectedMilnikId(udalost?.milnik_id ?? milnikId ?? '')
    }
  }, [open, udalost, milnikId])

  function handleChange(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  function handleUcastnikToggle(userId: string) {
    setSelectedUcastnici(prev => 
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    )
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!form.nazev.trim()) {
      toast.error('Musíte zadat název schůzky.')
      return
    }

    startTransition(async () => {
      const result = await upsertUdalost(
        {
          milnik_id: selectedMilnikId || null,
          nazev: form.nazev.trim(),
          popis: form.popis || null,
          datum_zahajeni: new Date(form.datum_zahajeni).toISOString(),
          datum_ukonceni: form.datum_ukonceni ? new Date(form.datum_ukonceni).toISOString() : null,
          lokalita: form.lokalita || null,
          organizator_id: form.organizator_id || null,
          ucastnici_ids: selectedUcastnici,
          agenda: udalost?.agenda ?? [],
          zapis: udalost?.zapis ?? null,
          stav: form.stav,
        },
        udalost?.id
      )

      if (result.success) {
        toast.success(isEdit ? 'Schůzka byla upravena.' : 'Schůzka byla naplánována.')
        setOpen(false)
        if (!isEdit) {
          setForm({
            nazev: '',
            popis: '',
            stav: 'scheduled',
            datum_zahajeni: formatDateTimeLocal(new Date().toISOString()),
            datum_ukonceni: '',
            lokalita: '',
            organizator_id: '',
          })
          setSelectedUcastnici([])
        }
        onSuccess?.()
      } else {
        toast.error(result.error ?? 'Chyba při ukládání schůzky.')
      }
    })
  }

  function handleDelete() {
    if (!udalost?.id || !confirm(`Smazat schůzku „${udalost.nazev}“?`)) return
    startTransition(async () => {
      const res = await deleteUdalost(udalost.id)
      if (res.success) {
        toast.success('Schůzka smazána.')
        setOpen(false)
        onSuccess?.()
      } else {
        toast.error(res.error ?? 'Chyba při mazání schůzky.')
      }
    })
  }

  const hasTrigger = trigger !== null
  const triggerElement = trigger ?? (
    <Button size="sm" className="bg-purple-600 hover:bg-purple-700 text-white font-semibold">
      {isEdit ? 'Upravit schůzku' : '+ Naplánovat schůzku'}
    </Button>
  )

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {hasTrigger && <DialogTrigger render={triggerElement as React.ReactElement} />}
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Upravit schůzku' : 'Naplánovat schůzku'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          
          {/* Název schůzky */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="udalost-nazev">Název schůzky *</Label>
            <Input
              id="udalost-nazev"
              value={form.nazev}
              onChange={e => handleChange('nazev', e.target.value)}
              placeholder="např. Týdenní sync, Kickoff projektu..."
              required
            />
          </div>

          {/* Popis / Agenda info */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="udalost-popis">Popis / Cíl</Label>
            <Textarea
              id="udalost-popis"
              value={form.popis}
              onChange={e => handleChange('popis', e.target.value)}
              placeholder="Stručný popis nebo hlavní body k projednání..."
              rows={2}
            />
          </div>

          {/* Milník */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="udalost-milnik">Přiřadit k projektu / milníku</Label>
            <Select value={selectedMilnikId} onValueChange={val => setSelectedMilnikId(val ?? '')}>
              <SelectTrigger id="udalost-milnik">
                <SelectValue placeholder="Bez milníku (obecná schůzka)...">
                  {activeMilniky.find(m => m.id === selectedMilnikId)
                    ? `${activeMilniky.find(m => m.id === selectedMilnikId)?.projekt_nazev} — ${activeMilniky.find(m => m.id === selectedMilnikId)?.nazev}`
                    : undefined}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">-- Bez milníku (obecná schůzka) --</SelectItem>
                {activeMilniky.map(m => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.projekt_nazev} — {m.nazev}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Zahájení a Konec */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="udalost-zahajeni">Datum a čas začátku *</Label>
              <Input
                id="udalost-zahajeni"
                type="datetime-local"
                value={form.datum_zahajeni}
                onChange={e => handleChange('datum_zahajeni', e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="udalost-ukonceni">Datum a čas konce</Label>
              <Input
                id="udalost-ukonceni"
                type="datetime-local"
                value={form.datum_ukonceni}
                onChange={e => handleChange('datum_ukonceni', e.target.value)}
              />
            </div>
          </div>

          {/* Lokalita */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="udalost-lokalita">Lokalita / Odkaz na hovor</Label>
            <Input
              id="udalost-lokalita"
              value={form.lokalita}
              onChange={e => handleChange('lokalita', e.target.value)}
              placeholder="např. Zasedačka A, Google Meet link, Teams..."
            />
          </div>

          {/* Organizátor */}
          <div className="flex flex-col gap-1.5">
            <Label>Organizátor / Moderátor</Label>
            <Select value={form.organizator_id} onValueChange={v => handleChange('organizator_id', v ?? '')}>
              <SelectTrigger id="udalost-organizator">
                <SelectValue placeholder="Vyberte organizátora...">
                  {form.organizator_id === ''
                    ? '-- Nevybráno --'
                    : userProfiles.find(u => u.id === form.organizator_id)?.jmeno}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">-- Nevybráno --</SelectItem>
                {userProfiles.map(u => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.jmeno}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Účastníci */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Účastníci</Label>
            <div className="grid grid-cols-2 gap-2 border p-3 rounded-lg max-h-[150px] overflow-y-auto">
              {userProfiles.map(u => {
                const isChecked = selectedUcastnici.includes(u.id)
                return (
                  <button
                    type="button"
                    key={u.id}
                    onClick={() => handleUcastnikToggle(u.id)}
                    className={`flex items-center gap-2 p-1.5 rounded text-xs text-left cursor-pointer transition-colors ${
                      isChecked 
                        ? 'bg-purple-500/10 text-purple-400 font-semibold border border-purple-500/20' 
                        : 'hover:bg-muted border border-transparent'
                    }`}
                  >
                    <span>{isChecked ? '✓' : '○'}</span>
                    <span className="truncate">{u.jmeno}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Stav (Jen při editaci) */}
          {isEdit && (
            <div className="flex flex-col gap-1.5">
              <Label>Stav schůzky</Label>
              <Select value={form.stav} onValueChange={v => handleChange('stav', v ?? 'scheduled')}>
                <SelectTrigger id="udalost-stav">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="scheduled">Naplánováno</SelectItem>
                  <SelectItem value="active">Právě probíhá</SelectItem>
                  <SelectItem value="completed">Dokončeno</SelectItem>
                  <SelectItem value="cancelled">Zrušeno</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <DialogFooter className="pt-2 border-t flex items-center justify-between gap-2">
            {isEdit && (
              <Button
                type="button"
                variant="ghost"
                onClick={handleDelete}
                disabled={isPending}
                className="text-destructive hover:bg-destructive/10 hover:text-destructive w-full sm:w-auto shrink-0"
              >
                Smazat schůzku
              </Button>
            )}
            <div className="flex items-center gap-2 w-full sm:w-auto sm:ml-auto">
              <Button type="submit" disabled={isPending} className="w-full sm:w-auto bg-purple-600 hover:bg-purple-700 text-white font-semibold">
                {isPending ? 'Ukládám…' : isEdit ? 'Uložit změny' : 'Naplánovat schůzku'}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
