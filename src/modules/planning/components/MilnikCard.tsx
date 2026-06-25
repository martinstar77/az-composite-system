'use client'

import * as React from 'react'
import { useTransition } from 'react'
import { toast } from 'sonner'
import { Calendar, GripVertical, MoreHorizontal, Pencil, Trash2, CheckCircle2, Clock } from 'lucide-react'
import { Milnik, STAV_MILNIKU_CONFIG, PRIORITA_CONFIG } from '../types'
import { deleteMilnik, updateMilnikStav } from '../actions/milniky'
import { MilnikFormDialog } from './MilnikFormDialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu'
import { Button } from '@/shared/components/ui/button'

interface MilnikCardProps {
  milnik: Milnik
  isDragging?: boolean
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return null
  const d = new Date(dateStr)
  const dnes = new Date()
  dnes.setHours(0, 0, 0, 0)
  const isPast = d < dnes
  return {
    label: d.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'short' }),
    isPast: isPast && dateStr !== null,
  }
}

export function MilnikCard({ milnik, isDragging, dragHandleProps }: MilnikCardProps) {
  const [isPending, startTransition] = useTransition()
  const stavCfg = STAV_MILNIKU_CONFIG[milnik.stav]
  const prioritaCfg = PRIORITA_CONFIG[milnik.priorita]
  const deadline = formatDate(milnik.datum_splatnosti)
  const isCompleted = milnik.stav === 'completed'

  function handleDelete() {
    if (!confirm(`Smazat milník „${milnik.nazev}"?`)) return
    startTransition(async () => {
      const result = await deleteMilnik(milnik.id)
      if (result.success) {
        toast.success('Milník byl odstraněn.')
      } else {
        toast.error(result.error ?? 'Chyba při mazání milníku.')
      }
    })
  }

  function handleToggleComplete() {
    const novyStav = isCompleted ? 'in_progress' : 'completed'
    startTransition(async () => {
      const result = await updateMilnikStav(milnik.id, novyStav)
      if (!result.success) {
        toast.error(result.error ?? 'Chyba při aktualizaci stavu.')
      }
    })
  }

  return (
    <div
      className={`group flex items-start gap-3 rounded-lg border bg-card p-3 transition-all duration-150 ${
        isDragging ? 'shadow-lg ring-2 ring-primary/30 rotate-1' : 'hover:shadow-sm'
      } ${isCompleted ? 'opacity-60' : ''}`}
    >
      {/* Drag handle */}
      <div
        {...dragHandleProps}
        className="mt-0.5 cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-muted-foreground transition-colors flex-shrink-0"
      >
        <GripVertical className="h-4 w-4" />
      </div>

      {/* Checkbox pro rychlé dokončení */}
      <button
        onClick={handleToggleComplete}
        disabled={isPending}
        className="mt-0.5 flex-shrink-0 text-muted-foreground hover:text-emerald-500 transition-colors"
        aria-label={isCompleted ? 'Označit jako nedokončený' : 'Označit jako dokončený'}
      >
        <CheckCircle2 className={`h-4 w-4 ${isCompleted ? 'text-emerald-500 fill-emerald-500/20' : ''}`} />
      </button>

      {/* Obsah */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-col gap-1 flex-1 min-w-0">
            <p className={`text-sm font-medium leading-snug ${isCompleted ? 'line-through text-muted-foreground' : ''}`}>
              {milnik.nazev}
            </p>
            {milnik.popis && (
              <p className="text-xs text-muted-foreground line-clamp-2">{milnik.popis}</p>
            )}
          </div>

          {/* Akce menu */}
          <DropdownMenu>
            <DropdownMenuTrigger render={
              <Button
                variant="ghost"
                size="icon-sm"
                className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 flex-shrink-0"
                id={`milnik-menu-${milnik.id}`}
              />
            }>
              <MoreHorizontal className="h-3.5 w-3.5" />
              <span className="sr-only">Akce milníku</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <MilnikFormDialog
                projektId={milnik.projekt_id}
                milnik={milnik}
                trigger={
                  <DropdownMenuItem onSelect={e => e.preventDefault()}>
                    <Pencil className="h-3.5 w-3.5 mr-2" />
                    Upravit
                  </DropdownMenuItem>
                }
              />
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onSelect={handleDelete}
                disabled={isPending}
              >
                <Trash2 className="h-3.5 w-3.5 mr-2" />
                Smazat
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Metadatabadges */}
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          {/* Stav badge s tečkou */}
          <span className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-xs font-medium ${stavCfg.bg} ${stavCfg.color}`}>
            <span className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${stavCfg.dot} ${milnik.stav === 'in_progress' ? 'animate-pulse' : ''}`} />
            {stavCfg.label}
          </span>

          {/* Priorita */}
          <span className={`text-xs font-medium ${prioritaCfg.color}`}>
            {prioritaCfg.icon} {prioritaCfg.label}
          </span>

          {/* Deadline */}
          {deadline && (
            <span className={`inline-flex items-center gap-1 text-xs ${deadline.isPast && !isCompleted ? 'text-red-500' : 'text-muted-foreground'}`}>
              <Clock className="h-3 w-3" />
              {deadline.label}
              {deadline.isPast && !isCompleted && ' ⚠️'}
            </span>
          )}

          {/* Vlastník */}
          {milnik.vlastnik?.jmeno && (
            <span className="text-xs text-muted-foreground ml-auto">
              👤 {milnik.vlastnik.jmeno}
            </span>
          )}
        </div>

        {/* Progress bar */}
        {milnik.progres_procenta > 0 && !isCompleted && (
          <div className="mt-2 flex items-center gap-2">
            <div className="flex-1 h-1 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all duration-300"
                style={{ width: `${milnik.progres_procenta}%` }}
              />
            </div>
            <span className="text-xs text-muted-foreground tabular-nums w-8 text-right">
              {milnik.progres_procenta}%
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
