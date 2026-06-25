'use client'

import * as React from 'react'
import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { 
  ChevronDown, 
  ChevronUp, 
  Pencil, 
  Trash2, 
  CheckSquare2, 
  Square,
  Clock
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

interface UkolRowProps {
  ukol: UkolPlanovani
  onSuccess?: () => void
  userProfiles: { id: string; jmeno: string }[]
}

export function UkolRow({ ukol, onSuccess, userProfiles }: UkolRowProps) {
  const [isPending, startTransition] = useTransition()
  const [isExpanded, setIsExpanded] = useState(false)
  
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
  const isBlocked = ukol.stav === 'blocked'

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
    if (!confirm(`Smazat úkol „${ukol.nazev}"?`)) return

    startTransition(async () => {
      const result = await deleteUkol(ukol.id)
      if (result.success) {
        toast.success('Úkol smazán')
        onSuccess?.()
      } else {
        toast.error(result.error ?? 'Chyba při mazání úkolu')
      }
    })
  }

  function formatDate(dateStr: string | null) {
    if (!dateStr) return null
    const d = new Date(dateStr)
    return d.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'short' })
  }

  const deadline = formatDate(ukol.datum_splatnosti)
  const initials = ukol.vlastnik?.jmeno
    ? ukol.vlastnik.jmeno.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()
    : null

  const eventColor = ukol.barva || (ukol.typ_udalosti === 'meeting' ? '#8b5cf6' : null)
  const rowStyle = eventColor && !isCompleted ? {
    backgroundColor: eventColor + '0d',
    borderColor: eventColor + '25',
  } : {}

  return (
    <div 
      onClick={() => setIsExpanded(!isExpanded)}
      className={`group flex flex-col rounded-lg border bg-card/45 transition-all select-none cursor-pointer ${
        isBlocked ? 'border-red-500/30 bg-red-50/5' : 'border-border/60 hover:border-border'
      } ${isCompleted ? 'opacity-70 bg-muted/10' : ''}`}
      style={rowStyle}
    >
      {/* Compact Row Header */}
      <div className="flex items-center justify-between gap-3 p-2.5 min-h-[48px] md:min-h-[44px]">
        {/* Left Side: Oddělení Dot + Status Checkbox */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {/* Department dot */}
          <div 
            className={`h-2.5 w-2.5 rounded-full shrink-0 border border-black/10 dark:border-white/10 ${
              eventColor ? '' : oddeleniCfg.bg
            }`} 
            style={{ 
              backgroundColor: eventColor || undefined,
              borderColor: eventColor || undefined,
              color: oddeleniCfg.color 
            }}
            title={oddeleniCfg.label}
          />

          {/* Status Checkbox */}
          <button 
            onClick={handleStavToggle}
            disabled={isPending}
            className="text-muted-foreground hover:text-foreground shrink-0 focus:outline-none transition-colors"
          >
            {isCompleted ? (
              <CheckSquare2 className="h-4.5 w-4.5 text-emerald-500 fill-emerald-500/10 animate-scale-up" />
            ) : (
              <Square className="h-4.5 w-4.5" />
            )}
          </button>

          {/* Name & Metadata */}
          <div className="flex flex-col min-w-0 flex-1">
            <span className={`text-xs font-semibold leading-normal truncate ${isCompleted ? 'line-through text-muted-foreground/80' : 'text-foreground'}`}>
              {ukol.typ_udalosti === 'meeting' && '👥 '}
              {ukol.nazev}
            </span>
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/80 mt-0.5">
              <span className={oddeleniCfg.color}>{oddeleniCfg.label}</span>
              <span>•</span>
              <span>{typCfg.icon} {typCfg.label}</span>
              {ukol.lokalita && (
                <>
                  <span>•</span>
                  <span className="truncate max-w-[120px]" title={ukol.lokalita}>
                    📍 {ukol.lokalita}
                  </span>
                </>
              )}
              {deadline && (
                <>
                  <span>•</span>
                  <span className="flex items-center gap-1 font-mono">
                    <Clock className="h-2.5 w-2.5" />
                    {deadline}
                  </span>
                </>
              )}
              {localChecklist.length > 0 && (
                <>
                  <span>•</span>
                  <span>
                    {localChecklist.filter(item => item.done).length}/{localChecklist.length}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right Side: Owner Initials + Priority + Collapse Arrow */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Priority */}
          {ukol.priorita !== 'medium' && (
            <Badge variant={ukol.priorita === 'critical' || ukol.priorita === 'high' ? 'destructive' : 'outline'} className="h-4.5 px-1.5 text-[9px] font-semibold">
              {prioritaCfg.icon} {prioritaCfg.label}
            </Badge>
          )}

          {/* Owner Initials Avatar */}
          {initials ? (
            <div 
              className="h-6 w-6 rounded-full bg-muted flex items-center justify-center text-[9px] font-bold border text-muted-foreground shrink-0"
              title={ukol.vlastnik?.jmeno}
            >
              {initials}
            </div>
          ) : (
            <div className="h-6 w-6 rounded-full bg-muted/40 border border-dashed flex items-center justify-center text-[10px] text-muted-foreground/50 shrink-0" title="Bez vlastníka">
              👤
            </div>
          )}

          {/* Expand/Collapse Chevron */}
          <div className="text-muted-foreground/60 group-hover:text-muted-foreground transition-colors shrink-0">
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </div>
        </div>
      </div>

      {/* Expanded Accordion Body */}
      {isExpanded && (
        <div 
          onClick={(e) => e.stopPropagation()}
          className="border-t border-border/40 bg-muted/15 p-3 flex flex-col gap-3"
        >
          {/* Lokalita */}
          {ukol.lokalita && (
            <div className="text-xs flex items-center gap-1.5 text-muted-foreground font-normal">
              <span className="font-semibold text-foreground shrink-0">Lokalita:</span>
              <span className="bg-muted px-2 py-0.5 rounded border border-border/40 select-text cursor-default truncate" title={ukol.lokalita}>
                {ukol.lokalita}
              </span>
            </div>
          )}

          {/* Description */}
          {ukol.popis && (
            <div className="text-xs text-muted-foreground leading-relaxed font-normal whitespace-pre-wrap">
              {ukol.popis}
            </div>
          )}

          {/* Checklist */}
          {localChecklist.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Checklist (Podúkoly)</span>
              <div className="flex flex-col gap-2 pl-0.5 mt-0.5">
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
                    <span className={`leading-tight ${item.done ? 'line-through text-muted-foreground/60' : 'font-medium text-foreground/90'}`}>
                      {item.text}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Bottom Actions Row */}
          <div className="flex items-center justify-between mt-1 pt-2 border-t border-border/30">
            <span className="text-[10px] text-muted-foreground">
              Stav: <span className={`font-semibold ${stavCfg.color}`}>{stavCfg.label}</span>
            </span>

            <div className="flex items-center gap-1.5">
              {/* Edit button */}
              <UkolFormDialog
                milnikId={ukol.milnik_id}
                ukol={ukol}
                userProfiles={userProfiles}
                onSuccess={onSuccess}
                trigger={
                  <Button variant="ghost" size="icon-sm" className="h-7 w-7 text-muted-foreground hover:text-foreground">
                    <Pencil className="h-3.5 w-3.5" />
                    <span className="sr-only">Upravit</span>
                  </Button>
                }
              />

              {/* Delete button */}
              <Button 
                variant="ghost" 
                size="icon-sm" 
                onClick={handleDelete}
                disabled={isPending}
                className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span className="sr-only">Smazat</span>
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
