'use client'

import * as React from 'react'
import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { 
  Pencil, 
  Trash2, 
  CheckSquare2, 
  Square,
  Clock,
  X
} from 'lucide-react'
import { 
  UkolPlanovani, 
  StavUkolu, 
  ODDELENI_CONFIG, 
  STAV_UKOLU_CONFIG, 
  TYP_UDALOSTI_CONFIG, 
  PRIORITA_CONFIG,
  ChecklistItem
} from '../types'
import { toggleUkolStav, toggleChecklistItem, deleteUkol } from '../actions/ukoly'
import { Button } from '@/shared/components/ui/button'
import { Badge } from '@/shared/components/ui/badge'
import { UkolFormDialog } from './UkolFormDialog'

interface UkolDetailPanelProps {
  ukol: UkolPlanovani
  onSuccess?: () => void
  onClose?: () => void
  userProfiles: { id: string; jmeno: string }[]
}

export function UkolDetailPanel({ 
  ukol, 
  onSuccess, 
  onClose,
  userProfiles 
}: UkolDetailPanelProps) {
  const [isPending, startTransition] = useTransition()
  
  // Optimistic state for checklist items
  const [localChecklist, setLocalChecklist] = useState<ChecklistItem[]>(ukol.checklist || [])

  // Sync checklist when prop changes
  React.useEffect(() => {
    setLocalChecklist(ukol.checklist || [])
  }, [ukol.checklist])

  const oddeleniCfg = ODDELENI_CONFIG[ukol.oddeleni]
  const stavCfg = STAV_UKOLU_CONFIG[ukol.stav]
  const typCfg = TYP_UDALOSTI_CONFIG[ukol.typ_udalosti]
  const prioritaCfg = PRIORITA_CONFIG[ukol.priorita as keyof typeof PRIORITA_CONFIG]

  const isCompleted = ukol.stav === 'done'

  function handleStavToggle(e: React.MouseEvent) {
    e.stopPropagation()
    if (isPending) return

    const novyStav: StavUkolu = isCompleted ? 'todo' : 'done'
    
    startTransition(async () => {
      const result = await toggleUkolStav(ukol.id, novyStav)
      if (result.success) {
        toast.success(novyStav === 'done' ? 'Úkol dokončen' : 'Úkol přesunut do plánu')
        onSuccess?.()
      } else {
        toast.error(result.error ?? 'Chyba při změně stavu')
      }
    })
  }

  function handleChecklistToggle(idx: number, currentDone: boolean) {
    if (isPending) return

    const newDone = !currentDone
    // Optimistic update
    const updated = [...localChecklist]
    updated[idx] = { ...updated[idx], done: newDone }
    setLocalChecklist(updated)

    startTransition(async () => {
      const result = await toggleChecklistItem(ukol.id, idx, newDone)
      if (!result.success) {
        toast.error(result.error ?? 'Chyba při aktualizaci checklistu')
        // Rollback
        setLocalChecklist(ukol.checklist || [])
      } else {
        onSuccess?.()
      }
    })
  }

  function handleDelete(e: React.MouseEvent) {
    e.stopPropagation()
    if (!confirm(`Smazat úkol „${ukol.nazev}“?`)) return

    startTransition(async () => {
      const result = await deleteUkol(ukol.id)
      if (result.success) {
        toast.success('Úkol smazán')
        onClose?.()
        onSuccess?.()
      } else {
        toast.error(result.error ?? 'Chyba při mazání úkolu')
      }
    })
  }

  function formatDate(dateStr: string | null) {
    if (!dateStr) return null
    const d = new Date(dateStr)
    return d.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'long', year: 'numeric' })
  }

  const deadline = formatDate(ukol.datum_splatnosti)
  const initials = ukol.vlastnik?.jmeno
    ? ukol.vlastnik.jmeno.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()
    : null

  const eventColor = ukol.barva
  const borderStyle = eventColor ? { borderColor: eventColor + '30' } : {}

  return (
    <div 
      className="flex flex-col bg-card border rounded-xl p-5 shadow-md h-full min-h-[500px]"
      style={borderStyle}
    >
      {/* Detail Header / Milestone Info */}
      <div className="flex items-center justify-between gap-4 mb-4 select-none">
        {ukol.milnik ? (
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-muted/40 border border-border/30 rounded-lg text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
            <span 
              className="inline-block h-2 w-2 rounded-full border border-black/10 dark:border-white/10" 
              style={{ backgroundColor: ukol.milnik.barva || '#8A0485' }} 
            />
            <span>{ukol.milnik.nazev}</span>
          </div>
        ) : (
          <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
            Bez milníku
          </div>
        )}

        {onClose && (
          <Button 
            variant="ghost" 
            size="icon-sm" 
            onClick={onClose}
            className="lg:hidden text-muted-foreground hover:text-foreground shrink-0"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Task Title & Status Checkbox */}
      <div className="flex items-start gap-3">
        <button 
          onClick={handleStavToggle}
          disabled={isPending}
          className="mt-1 text-muted-foreground hover:text-foreground shrink-0 focus:outline-none transition-colors"
        >
          {isCompleted ? (
            <CheckSquare2 className="h-6 w-6 text-emerald-500 fill-emerald-500/10 animate-scale-up" />
          ) : (
            <Square className="h-6 w-6" />
          )}
        </button>

        <div className="flex-1 min-w-0 flex flex-col gap-1">
          <h2 className={`text-lg font-bold leading-snug select-text ${isCompleted ? 'line-through text-muted-foreground/80' : 'text-foreground'}`}>
            {ukol.nazev}
          </h2>
          {ukol.cil_info && (
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground/75 mt-1 bg-muted/30 hover:bg-muted/50 border border-border/30 rounded px-2 py-0.5 w-fit select-none font-medium max-w-full">
              <span className="shrink-0">🎯</span>
              <span className="truncate" title={ukol.cil_info.nazev}>{ukol.cil_info.nazev}</span>
            </div>
          )}
        </div>
      </div>

      {/* Metadata Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 border-y py-2.5 my-3 border-border/40">
        <div className="flex flex-col gap-1">
          <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Odpovědný</span>
          <div className="flex items-center gap-2">
            {initials ? (
              <div 
                className="h-6 w-6 rounded-full bg-muted flex items-center justify-center text-[9px] font-bold border text-muted-foreground shrink-0"
                title={ukol.vlastnik?.jmeno}
              >
                {initials}
              </div>
            ) : (
              <div className="h-6 w-6 rounded-full bg-muted/30 border border-dashed flex items-center justify-center text-[10px] text-muted-foreground/50 shrink-0">
                👤
              </div>
            )}
            <span className="text-xs font-semibold text-foreground truncate max-w-[80px]" title={ukol.vlastnik?.jmeno}>
              {ukol.vlastnik?.jmeno ? ukol.vlastnik.jmeno.split(' ')[0] : 'Není'}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Oddělení</span>
          <Badge 
            variant="outline" 
            className={`h-6 px-2 text-[10px] font-bold w-fit ${oddeleniCfg.color} ${oddeleniCfg.bg} border-black/5 dark:border-white/5`}
          >
            {oddeleniCfg.label}
          </Badge>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Priorita</span>
          <Badge 
            variant={ukol.priorita === 'critical' || ukol.priorita === 'high' ? 'destructive' : 'outline'} 
            className="h-6 px-2 text-[10px] font-bold w-fit"
          >
            {prioritaCfg.icon} {prioritaCfg.label}
          </Badge>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Termín</span>
          <div className="flex items-center gap-1.5 h-6 text-xs text-muted-foreground font-mono">
            <Clock className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />
            <span className="truncate" title={deadline || 'Bez termínu'}>
              {deadline || 'Není'}
            </span>
          </div>
        </div>
      </div>

      {/* Task Description / Notes */}
      <div className="flex flex-col gap-1.5 flex-1 min-h-[180px]">
        <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Popis a poznámky</span>
        <div className="flex-1 bg-muted/15 border border-border/40 p-3.5 rounded-xl text-xs text-muted-foreground leading-relaxed font-normal whitespace-pre-wrap select-text overflow-y-auto">
          {ukol.popis || (
            <span className="text-muted-foreground/45 italic">Bez detailního popisu.</span>
          )}
        </div>
      </div>

      {/* Checklist (Podúkoly) */}
      {localChecklist.length > 0 && (
        <div className="flex flex-col gap-1.5 mt-3">
          <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">
            Podúkoly ({localChecklist.filter(item => item.done).length}/{localChecklist.length})
          </span>
          <div className="flex flex-col gap-2 bg-muted/10 border border-border/40 p-2.5 rounded-xl max-h-[150px] overflow-y-auto">
            {localChecklist.map((item, idx) => (
              <button
                key={idx}
                onClick={() => handleChecklistToggle(idx, item.done)}
                disabled={isPending}
                className="flex items-start gap-2 text-left text-xs text-foreground/80 hover:text-foreground transition-colors outline-none select-none group/item cursor-pointer disabled:opacity-50"
              >
                <span className="mt-0.5 shrink-0 text-muted-foreground group-hover/item:text-primary transition-colors">
                  {item.done ? (
                    <CheckSquare2 className="h-4 w-4 text-emerald-500 fill-emerald-500/10" />
                  ) : (
                    <Square className="h-4 w-4" />
                  )}
                </span>
                <span className={`leading-tight ${item.done ? 'line-through text-muted-foreground/60' : 'font-medium text-foreground/95'}`}>
                  {item.text}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Panel Bottom Actions */}
      <div className="flex items-center justify-between border-t border-border/30 mt-6 pt-4 select-none">
        <span className="text-[10px] text-muted-foreground">
          Stav: <span className={`font-semibold ${stavCfg.color}`}>{stavCfg.label}</span>
        </span>

        <div className="flex items-center gap-2">
          {/* Edit button */}
          <UkolFormDialog
            milnikId={ukol.milnik_id}
            ukol={ukol}
            userProfiles={userProfiles}
            onSuccess={onSuccess}
            trigger={
              <Button variant="outline" size="sm" className="h-8 text-xs font-semibold">
                <Pencil className="h-3.5 w-3.5 mr-1.5" />
                Upravit
              </Button>
            }
          />

          {/* Delete button */}
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleDelete}
            disabled={isPending}
            className="h-8 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="h-3.5 w-3.5 mr-1.5" />
            Smazat
          </Button>
        </div>
      </div>
    </div>
  )
}
