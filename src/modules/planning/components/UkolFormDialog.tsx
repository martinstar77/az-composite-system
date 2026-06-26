'use client'

import * as React from 'react'
import { useState, useTransition, useEffect } from 'react'
import { toast } from 'sonner'
import { Plus, Trash2, X } from 'lucide-react'
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
import { upsertUkol } from '../actions/ukoly'
import { getAllMilnikyActive } from '../actions/milniky'
import { getCileByMilnik } from '../actions/goals'
import {
  UkolPlanovani,
  StavUkolu,
  PrioritaUkolu,
  OddeleniType,
  TypUdalostiType,
  ChecklistItem,
  ODDELENI_CONFIG,
  STAV_UKOLU_CONFIG,
  TYP_UDALOSTI_CONFIG,
  PRIORITA_CONFIG,
  CilOddeleniMilniku,
} from '../types'

interface UkolFormDialogProps {
  milnikId?: string
  ukol?: UkolPlanovani
  userProfiles: { id: string; jmeno: string }[]
  trigger?: React.ReactNode
  onSuccess?: () => void
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function UkolFormDialog({
  milnikId,
  ukol,
  userProfiles,
  trigger,
  onSuccess,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: UkolFormDialogProps) {
  const [localOpen, setLocalOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  const open = controlledOpen !== undefined ? controlledOpen : localOpen
  const setOpen = controlledOnOpenChange !== undefined ? controlledOnOpenChange : setLocalOpen

  const [selectedMilnikId, setSelectedMilnikId] = useState(milnikId ?? ukol?.milnik_id ?? '')
  const [activeMilniky, setActiveMilniky] = useState<{ id: string; nazev: string; projekt_nazev?: string }[]>([])

  const isEdit = !!ukol

  // Load active milestones and ensure the current milestone is in the list
  useEffect(() => {
    if (open) {
      getAllMilnikyActive().then(res => {
        if (res.success && res.data) {
          let list = [...res.data]
          const targetMilnikId = ukol?.milnik_id ?? milnikId
          if (targetMilnikId) {
            const exists = list.some(m => m.id === targetMilnikId)
            if (!exists) {
              list.push({
                id: targetMilnikId,
                nazev: ukol?.milnik?.nazev ?? 'Aktuální milník',
                projekt_id: ukol?.milnik?.projekt_id ?? '',
                projekt_nazev: 'Původní projekt'
              })
            }
          }
          setActiveMilniky(list)
        }
      })
    }
  }, [open, ukol, milnikId])

  const [form, setForm] = useState({
    nazev: ukol?.nazev ?? '',
    popis: ukol?.popis ?? '',
    stav: (ukol?.stav ?? 'todo') as StavUkolu,
    priorita: (ukol?.priorita ?? 'medium') as PrioritaUkolu,
    oddeleni: (ukol?.oddeleni ?? 'management') as OddeleniType,
    typ_udalosti: (ukol?.typ_udalosti ?? 'task') as TypUdalostiType,
    vlastnik_id: ukol?.vlastnik_id ?? '',
    datum_zahajeni: ukol?.datum_zahajeni ?? '',
    datum_splatnosti: ukol?.datum_splatnosti ?? '',
    lokalita: ukol?.lokalita ?? '',
    barva: ukol?.barva ?? '',
    cil_id: ukol?.cil_id ?? '',
  })

  const [checklist, setChecklist] = useState<ChecklistItem[]>(ukol?.checklist ?? [])
  const [milestoneGoals, setMilestoneGoals] = useState<CilOddeleniMilniku[]>([])

  // Sync state when dialog opens or task changes
  useEffect(() => {
    if (open) {
      setForm({
        nazev: ukol?.nazev ?? '',
        popis: ukol?.popis ?? '',
        stav: (ukol?.stav ?? 'todo') as StavUkolu,
        priorita: (ukol?.priorita ?? 'medium') as PrioritaUkolu,
        oddeleni: (ukol?.oddeleni ?? 'management') as OddeleniType,
        typ_udalosti: (ukol?.typ_udalosti ?? 'task') as TypUdalostiType,
        vlastnik_id: ukol?.vlastnik_id ?? '',
        datum_zahajeni: ukol?.datum_zahajeni ?? '',
        datum_splatnosti: ukol?.datum_splatnosti ?? '',
        lokalita: ukol?.lokalita ?? '',
        barva: ukol?.barva ?? '',
        cil_id: ukol?.cil_id ?? '',
      })
      setChecklist(ukol?.checklist ?? [])
      setSelectedMilnikId(ukol?.milnik_id ?? milnikId ?? '')
    }
  }, [open, ukol, milnikId])

  // Load goals for selected milestone
  useEffect(() => {
    if (open && selectedMilnikId) {
      getCileByMilnik(selectedMilnikId).then(res => {
        if (res.success && res.data) {
          setMilestoneGoals(res.data)
          // If editing or form already has a cil_id, make sure it's valid for this milestone
          if (form.cil_id && !res.data.some(g => g.id === form.cil_id)) {
            setForm(prev => ({ ...prev, cil_id: '' }))
          }
        } else {
          setMilestoneGoals([])
          setForm(prev => ({ ...prev, cil_id: '' }))
        }
      })
    } else {
      setMilestoneGoals([])
      setForm(prev => ({ ...prev, cil_id: '' }))
    }
  }, [open, selectedMilnikId])

  function handleChange(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  function handleAddChecklistItem() {
    setChecklist(prev => [...prev, { text: '', done: false }])
  }

  function handleChecklistTextChange(index: number, text: string) {
    setChecklist(prev => prev.map((item, idx) => idx === index ? { ...item, text } : item))
  }

  function handleRemoveChecklistItem(index: number) {
    setChecklist(prev => prev.filter((_, idx) => idx !== index))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!selectedMilnikId) {
      toast.error('Musíte vybrat milník.')
      return
    }

    // Očistit prázdné položky checklistu
    const cleanChecklist = checklist.filter(item => item.text.trim().length > 0)

    startTransition(async () => {
      const result = await upsertUkol(
        {
          milnik_id: selectedMilnikId,
          nazev: form.nazev,
          popis: form.popis || null,
          stav: form.stav,
          priorita: form.priorita,
          oddeleni: form.oddeleni,
          typ_udalosti: form.typ_udalosti,
          vlastnik_id: form.vlastnik_id || null,
          datum_zahajeni: form.datum_zahajeni || null,
          datum_splatnosti: form.datum_splatnosti || null,
          checklist: cleanChecklist,
          lokalita: form.lokalita || null,
          barva: form.barva || null,
          cil_id: form.cil_id || null,
        },
        ukol?.id
      )

      if (result.success) {
        toast.success(isEdit ? 'Úkol byl upraven.' : 'Úkol byl přidán.')
        setOpen(false)
        if (!isEdit) {
          setForm({
            nazev: '',
            popis: '',
            stav: 'todo',
            priorita: 'medium',
            oddeleni: 'management',
            typ_udalosti: 'task',
            vlastnik_id: '',
            datum_zahajeni: '',
            datum_splatnosti: '',
            lokalita: '',
            barva: '',
            cil_id: '',
          })
          setChecklist([])
        }
        onSuccess?.()
      } else {
        toast.error(result.error ?? 'Chyba při ukládání úkolu.')
      }
    })
  }

  const hasTrigger = trigger !== null
  const triggerElement = trigger ?? (
    <Button size="sm" variant="outline">
      {isEdit ? 'Upravit úkol' : '+ Nový úkol'}
    </Button>
  )

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {hasTrigger && <DialogTrigger render={triggerElement as React.ReactElement} />}
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Upravit úkol' : 'Nový úkol'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Milestone Selection (when creating without milestone, or when editing) */}
          {(!milnikId || isEdit) && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ukol-milnik">Přiřadit k projektu / milníku *</Label>
              <Select value={selectedMilnikId} onValueChange={val => setSelectedMilnikId(val ?? '')}>
                <SelectTrigger id="ukol-milnik">
                  <SelectValue placeholder="Vyberte projekt a milník...">
                    {activeMilniky.find(m => m.id === selectedMilnikId)
                      ? `${activeMilniky.find(m => m.id === selectedMilnikId)?.projekt_nazev} — ${activeMilniky.find(m => m.id === selectedMilnikId)?.nazev}`
                      : undefined}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {activeMilniky.map(m => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.projekt_nazev} — {m.nazev}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Název */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ukol-nazev">Název úkolu *</Label>
            <Input
              id="ukol-nazev"
              value={form.nazev}
              onChange={e => handleChange('nazev', e.target.value)}
              placeholder="např. Připravit podklady pro audit"
              required
            />
          </div>

          {/* Popis */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ukol-popis">Popis</Label>
            <Textarea
              id="ukol-popis"
              value={form.popis}
              onChange={e => handleChange('popis', e.target.value)}
              placeholder="Podrobnější informace k úkolu..."
              rows={2}
            />
          </div>

          {/* Oddělení + Typ události */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Oddělení *</Label>
              <Select value={form.oddeleni} onValueChange={v => handleChange('oddeleni', v ?? 'management')}>
                <SelectTrigger id="ukol-oddeleni">
                  <SelectValue>
                    {ODDELENI_CONFIG[form.oddeleni]?.label}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {(Object.entries(ODDELENI_CONFIG) as [OddeleniType, typeof ODDELENI_CONFIG[OddeleniType]][]).map(([key, cfg]) => (
                    <SelectItem key={key} value={key}>
                      <span className={`inline-flex items-center gap-1.5 ${cfg.color}`}>
                        {cfg.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Typ události</Label>
              <Select value={form.typ_udalosti} onValueChange={v => handleChange('typ_udalosti', v ?? 'task')}>
                <SelectTrigger id="ukol-typ-udalosti">
                  <SelectValue>
                    {TYP_UDALOSTI_CONFIG[form.typ_udalosti]?.icon} {TYP_UDALOSTI_CONFIG[form.typ_udalosti]?.label}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {(Object.entries(TYP_UDALOSTI_CONFIG) as [TypUdalostiType, typeof TYP_UDALOSTI_CONFIG[TypUdalostiType]][]).map(([key, cfg]) => (
                    <SelectItem key={key} value={key}>
                      <span>{cfg.icon} {cfg.label}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Stav + Priorita */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Stav</Label>
              <Select value={form.stav} onValueChange={v => handleChange('stav', v ?? 'todo')}>
                <SelectTrigger id="ukol-stav">
                  <SelectValue>
                    {STAV_UKOLU_CONFIG[form.stav]?.label}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {(Object.entries(STAV_UKOLU_CONFIG) as [StavUkolu, typeof STAV_UKOLU_CONFIG[StavUkolu]][]).map(([key, cfg]) => (
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
                <SelectTrigger id="ukol-priorita">
                  <SelectValue>
                    {PRIORITA_CONFIG[form.priorita]?.icon} {PRIORITA_CONFIG[form.priorita]?.label}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {(Object.entries(PRIORITA_CONFIG) as [PrioritaUkolu, typeof PRIORITA_CONFIG[PrioritaUkolu]][]).map(([key, cfg]) => (
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

          {/* Vlastník */}
          <div className="flex flex-col gap-1.5">
            <Label>Odpovědný (Vlastník)</Label>
            <Select value={form.vlastnik_id} onValueChange={v => handleChange('vlastnik_id', v ?? '')}>
              <SelectTrigger id="ukol-vlastnik">
                <SelectValue placeholder="Přiřadit osobu...">
                  {form.vlastnik_id === '' || form.vlastnik_id === '-'
                    ? '-- Nepřiřazeno --'
                    : userProfiles.find(u => u.id === form.vlastnik_id)?.jmeno}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">-- Nepřiřazeno --</SelectItem>
                {userProfiles.map(u => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.jmeno}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Taktický cíl */}
          {milestoneGoals.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <Label>Taktický cíl oddělení</Label>
              <Select value={form.cil_id} onValueChange={v => handleChange('cil_id', v ?? '')}>
                <SelectTrigger id="ukol-cil">
                  <SelectValue placeholder="Přiřadit k cíli...">
                    {form.cil_id === ''
                      ? '-- Bez cíle --'
                      : milestoneGoals.find(g => g.id === form.cil_id)?.nazev}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">-- Bez cíle --</SelectItem>
                  {milestoneGoals.map(g => {
                    const dept = ODDELENI_CONFIG[g.oddeleni_id]
                    return (
                      <SelectItem key={g.id} value={g.id}>
                        <span className="inline-flex items-center gap-1.5">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded border shrink-0 font-medium ${dept?.bg} ${dept?.color}`}>
                            {dept?.label || g.oddeleni_id}
                          </span>
                          <span className="truncate max-w-[280px]">{g.nazev}</span>
                        </span>
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Termíny */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ukol-zahajeni">Datum zahájení</Label>
              <Input
                id="ukol-zahajeni"
                type="date"
                value={form.datum_zahajeni}
                onChange={e => handleChange('datum_zahajeni', e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ukol-splatnost">Deadline / Splatnost</Label>
              <Input
                id="ukol-splatnost"
                type="date"
                value={form.datum_splatnosti}
                onChange={e => handleChange('datum_splatnosti', e.target.value)}
              />
            </div>
          </div>

          {/* Lokalita */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ukol-lokalita">Lokalita (Místo konání / Odkaz)</Label>
            <Input
              id="ukol-lokalita"
              value={form.lokalita}
              onChange={e => handleChange('lokalita', e.target.value)}
              placeholder="Místo konání..."
            />
          </div>

          {/* Barva */}
          <div className="flex flex-col gap-1.5">
            <Label>Barva události v kalendáři</Label>
            <div className="flex flex-wrap items-center gap-2">
              {[
                { name: 'Výchozí', value: '' },
                { name: 'Fialová', value: '#8b5cf6' },
                { name: 'Modrá', value: '#3b82f6' },
                { name: 'Indigo', value: '#6366f1' },
                { name: 'Zelená', value: '#10b981' },
                { name: 'Oranžová', value: '#f59e0b' },
                { name: 'Červená', value: '#ef4444' },
                { name: 'Růžová', value: '#ec4899' },
              ].map(preset => {
                const isSelected = form.barva === preset.value
                return (
                  <button
                    key={preset.value}
                    type="button"
                    onClick={() => handleChange('barva', preset.value)}
                    className={`h-7 px-2.5 rounded-lg text-[10px] font-medium border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      isSelected
                        ? 'border-foreground bg-foreground text-background shadow-sm font-semibold'
                        : 'border-border bg-background text-foreground hover:bg-muted'
                    }`}
                  >
                    {preset.value ? (
                      <span 
                        className="h-2.5 w-2.5 rounded-full border border-black/10 dark:border-white/10 shrink-0" 
                        style={{ backgroundColor: preset.value }}
                      />
                    ) : (
                      <span className="text-[9px] opacity-70">🎨</span>
                    )}
                    {preset.name}
                  </button>
                )
              })}
              
              {/* Custom hex color input */}
              <div className="flex items-center gap-1 border rounded-lg h-7 px-1.5 bg-background shrink-0 select-none">
                <span className="text-[10px] text-muted-foreground font-medium">Custom:</span>
                <input
                  type="color"
                  value={form.barva && form.barva.startsWith('#') ? form.barva : '#8b5cf6'}
                  onChange={e => handleChange('barva', e.target.value)}
                  className="h-4.5 w-4.5 cursor-pointer border-0 bg-transparent p-0 rounded shrink-0"
                  title="Vybrat vlastní barvu"
                />
              </div>
            </div>
          </div>

          {/* Checklist */}
          <div className="flex flex-col gap-2 pt-2 border-t">
            <div className="flex justify-between items-center">
              <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Checklist (Podúkoly)</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddChecklistItem}
                className="h-7 px-2 text-[10px]"
              >
                <Plus className="h-3 w-3 mr-1" />
                Přidat položku
              </Button>
            </div>

            <div className="flex flex-col gap-2 max-h-[150px] overflow-y-auto pr-1">
              {checklist.length === 0 ? (
                <span className="text-xs text-muted-foreground italic py-1 text-center">Žádné položky checklistu</span>
              ) : (
                checklist.map((item, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      value={item.text}
                      onChange={e => handleChecklistTextChange(index, e.target.value)}
                      placeholder="Název položky..."
                      className="h-8 text-xs flex-1"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => handleRemoveChecklistItem(index)}
                      className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>

          <DialogFooter className="pt-2 border-t">
            <Button type="submit" disabled={isPending} className="w-full sm:w-auto">
              {isPending ? 'Ukládám…' : isEdit ? 'Uložit změny' : 'Vytvořit úkol'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
