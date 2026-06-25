'use client'

import * as React from 'react'
import { useState, useEffect, useTransition } from 'react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { Pencil, Trash2, Plus, Target, X } from 'lucide-react'
import { getCileByMilnik, upsertCil, deleteCil } from '../actions/goals'
import { CilOddeleniMilniku, ODDELENI_CONFIG, OddeleniType } from '../types'

interface CilFormDialogProps {
  milnikId: string
  milnikNazev: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
  defaultOddeleniId?: string
  editingGoal?: CilOddeleniMilniku | null
}

export function CilFormDialog({
  milnikId,
  milnikNazev,
  open,
  onOpenChange,
  onSuccess,
  defaultOddeleniId,
  editingGoal,
}: CilFormDialogProps) {
  const [goals, setGoals] = useState<CilOddeleniMilniku[]>([])
  const [loading, setLoading] = useState(true)
  const [isPending, startTransition] = useTransition()
  const [editingId, setEditingId] = useState<string | null>(null)

  const [form, setForm] = useState({
    oddeleni_id: '',
    nazev: '',
    popis: '',
    stav: 'planned' as CilOddeleniMilniku['stav'],
  })

  const loadGoals = React.useCallback(async () => {
    setLoading(true)
    const res = await getCileByMilnik(milnikId)
    if (res.success && res.data) {
      setGoals(res.data)
    }
    setLoading(false)
  }, [milnikId])

  useEffect(() => {
    if (open) {
      loadGoals()
      if (editingGoal) {
        setEditingId(editingGoal.id)
        setForm({
          oddeleni_id: editingGoal.oddeleni_id,
          nazev: editingGoal.nazev,
          popis: editingGoal.popis ?? '',
          stav: editingGoal.stav,
        })
      } else {
        setForm({
          oddeleni_id: defaultOddeleniId ?? '',
          nazev: '',
          popis: '',
          stav: 'planned',
        })
        setEditingId(null)
      }
    }
  }, [open, loadGoals, defaultOddeleniId, editingGoal])

  function resetForm() {
    setForm({
      oddeleni_id: defaultOddeleniId ?? '',
      nazev: '',
      popis: '',
      stav: 'planned',
    })
    setEditingId(null)
  }

  function handleEditClick(goal: CilOddeleniMilniku) {
    setEditingId(goal.id)
    setForm({
      oddeleni_id: goal.oddeleni_id,
      nazev: goal.nazev,
      popis: goal.popis ?? '',
      stav: goal.stav,
    })
  }

  function handleDeleteClick(id: string) {
    if (!confirm('Opravdu chcete smazat tento taktický cíl? Propojeným úkolům bude cíl odebrán.')) return
    startTransition(async () => {
      const res = await deleteCil(id)
      if (res.success) {
        toast.success('Cíl byl smazán.')
        loadGoals()
        onSuccess?.()
      } else {
        toast.error(res.error ?? 'Chyba při mazání cíle.')
      }
    })
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.oddeleni_id) {
      toast.error('Vyberte oddělení.')
      return
    }

    startTransition(async () => {
      const res = await upsertCil(
        {
          milnik_id: milnikId,
          oddeleni_id: form.oddeleni_id,
          nazev: form.nazev,
          popis: form.popis || null,
          stav: form.stav,
        },
        editingId ?? undefined
      )

      if (res.success) {
        toast.success(editingId ? 'Cíl byl upraven.' : 'Cíl byl přidán.')
        resetForm()
        loadGoals()
        onSuccess?.()
      } else {
        toast.error(res.error ?? 'Chyba při ukládání cíle.')
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Cíle oddělení pro: {milnikNazev}
          </DialogTitle>
        </DialogHeader>

        {/* Seznam existujících cílů */}
        <div className="flex flex-col gap-3 my-2">
          <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Aktuální cíle oddělení</h4>
          {loading ? (
            <span className="text-xs text-muted-foreground italic">Načítám cíle...</span>
          ) : goals.length === 0 ? (
            <span className="text-xs text-muted-foreground/60 italic border border-dashed rounded-lg p-4 text-center">
              Zatím nebyly zapsány žádné taktické cíle. Zadejte první níže.
            </span>
          ) : (
            <div className="flex flex-col gap-2">
              {goals.map(goal => {
                const cfg = ODDELENI_CONFIG[goal.oddeleni_id as OddeleniType] || { label: goal.oddeleni_id, bg: 'bg-zinc-100', color: 'text-zinc-700' }
                return (
                  <div key={goal.id} className="flex items-start justify-between gap-3 border p-3 rounded-lg bg-card/50">
                    <div className="flex flex-col gap-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${cfg.bg} ${cfg.color}`}>
                          {cfg.label}
                        </span>
                        <span className="text-xs font-bold text-foreground">
                          {goal.nazev}
                        </span>
                      </div>
                      {goal.popis && (
                        <p className="text-[11px] text-muted-foreground leading-normal mt-0.5">
                          {goal.popis}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        onClick={() => handleEditClick(goal)}
                        disabled={isPending}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleDeleteClick(goal.id)}
                        disabled={isPending}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Formulář pro přidání/úpravu */}
        <form onSubmit={handleSubmit} className="border-t pt-4 flex flex-col gap-4 mt-2">
          <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
            <span>{editingId ? 'Upravit taktický cíl' : 'Přidat taktický cíl'}</span>
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="text-[10px] font-bold text-destructive flex items-center gap-0.5 hover:underline lowercase"
              >
                <X className="h-3 w-3" /> zrušit editaci
              </button>
            )}
          </h4>

          {/* Výběr oddělení */}
          <div className="flex flex-col gap-1.5">
            <Label>Oddělení *</Label>
            <Select
              value={form.oddeleni_id}
              onValueChange={v => setForm(prev => ({ ...prev, oddeleni_id: v ?? '' }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Vyberte oddělení" />
              </SelectTrigger>
              <SelectContent>
                {(Object.entries(ODDELENI_CONFIG) as [OddeleniType, typeof ODDELENI_CONFIG[OddeleniType]][]).map(([key, cfg]) => (
                  <SelectItem key={key} value={key}>
                    {cfg.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Název cíle */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="goal-nazev">Taktický cíl / vize *</Label>
            <Input
              id="goal-nazev"
              value={form.nazev}
              onChange={e => setForm(prev => ({ ...prev, nazev: e.target.value }))}
              placeholder="např. Zprovoznit CRM a finanční kalkulačky přímo v našem ERP."
              required
            />
          </div>

          {/* Popis cíle */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="goal-popis">Bližší popis / poznámky (volitelné)</Label>
            <Textarea
              id="goal-popis"
              value={form.popis}
              onChange={e => setForm(prev => ({ ...prev, popis: e.target.value }))}
              placeholder="Jaké výsledky nebo KPIs od toho očekáváme?"
              rows={2}
            />
          </div>

          <Button type="submit" disabled={isPending} className="self-end">
            {editingId ? 'Uložit změny' : 'Přidat cíl'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
