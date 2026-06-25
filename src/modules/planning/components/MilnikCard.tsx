'use client'

import * as React from 'react'
import { useTransition } from 'react'
import { toast } from 'sonner'
import {
  Calendar,
  GripVertical,
  MoreHorizontal,
  Pencil,
  Trash2,
  CheckCircle2,
  Clock,
  CheckSquare2,
  Square,
  Sparkles,
} from 'lucide-react'
import { Milnik, STAV_MILNIKU_CONFIG, PRIORITA_CONFIG } from '../types'
import { deleteMilnik, updateMilnikStav, updateMilnikTasks } from '../actions/milniky'
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

interface ParsedTask {
  text: string
  done: boolean
  rawLine: string
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

// Formátování jednoduchého markdownu (**bold**, *italic*)
function formatMarkdownLine(line: string) {
  if (!line) return null
  // Vyčistíme případné prázdné nebo nadbytečné nadpisy z popisu pro kompaktnost
  let cleaned = line
    .replace(/^###\s+/, '')
    .replace(/^##\s+/, '')
    .replace(/^#\s+/, '')
  
  const html = cleaned
    .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-foreground">$1</strong>')
    .replace(/\*(.*?)\*/g, '<em class="italic">$1</em>')
  
  return <span dangerouslySetInnerHTML={{ __html: html }} />
}

export function MilnikCard({ milnik, isDragging, dragHandleProps }: MilnikCardProps) {
  const [isPending, startTransition] = useTransition()
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false)
  const stavCfg = STAV_MILNIKU_CONFIG[milnik.stav]
  const prioritaCfg = PRIORITA_CONFIG[milnik.priorita]
  const deadline = formatDate(milnik.datum_splatnosti)
  const isCompleted = milnik.stav === 'completed'

  // Parsování checklistů z popisu
  const parsed = React.useMemo(() => {
    if (!milnik.popis) return { introLines: [], tasks: [] }
    const lines = milnik.popis.split('\n')
    const introLines: string[] = []
    const tasks: ParsedTask[] = []

    for (const line of lines) {
      const trimmed = line.trim()
      const isChecked = trimmed.startsWith('- [x]') || trimmed.startsWith('- [X]') || trimmed.startsWith('* [x]') || trimmed.startsWith('* [X]')
      const isUnchecked = trimmed.startsWith('- [ ]') || trimmed.startsWith('* [ ]')

      if (isChecked) {
        tasks.push({
          text: trimmed.substring(5).trim(),
          done: true,
          rawLine: line,
        })
      } else if (isUnchecked) {
        tasks.push({
          text: trimmed.substring(5).trim(),
          done: false,
          rawLine: line,
        })
      } else {
        if (trimmed.length > 0) {
          introLines.push(line)
        }
      }
    }
    return { introLines, tasks }
  }, [milnik.popis])

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

  // Přepínání stavu checkboxů
  function handleToggleTask(taskIndex: number) {
    if (isPending) return

    const updatedTasks = parsed.tasks.map((t, idx) => {
      if (idx === taskIndex) {
        return { ...t, done: !t.done }
      }
      return t
    })

    // Spočítat nový progress
    const completedCount = updatedTasks.filter(t => t.done).length
    const totalCount = updatedTasks.length
    const newProgress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

    // Rekonstrukce textu popisu se zachováním odrážek
    const originalLines = (milnik.popis ?? '').split('\n')
    let taskCounter = 0
    const newLines = originalLines.map(line => {
      const trimmed = line.trim()
      const isChecked = trimmed.startsWith('- [x]') || trimmed.startsWith('- [X]') || trimmed.startsWith('* [x]') || trimmed.startsWith('* [X]')
      const isUnchecked = trimmed.startsWith('- [ ]') || trimmed.startsWith('* [ ]')

      if (isChecked || isUnchecked) {
        const currentTask = updatedTasks[taskCounter]
        taskCounter++
        
        // Zjistit prefix (- nebo *) a odsazení
        const charIdx = line.indexOf(trimmed.charAt(0))
        const prefix = line.substring(0, charIdx) + line.charAt(0) + ' '
        const checkChar = currentTask.done ? 'x' : ' '
        return `${prefix}[${checkChar}] ${currentTask.text}`
      }
      return line
    })

    const newPopis = newLines.join('\n')

    startTransition(async () => {
      const result = await updateMilnikTasks(milnik.id, newPopis, newProgress)
      if (!result.success) {
        toast.error(result.error ?? 'Chyba při ukládání úkolu.')
      }
    })
  }

  return (
    <div
      className={`group flex flex-col rounded-xl border bg-card p-4 transition-all duration-200 shadow-sm hover:shadow-md border-border/80 ${
        isDragging ? 'shadow-lg ring-2 ring-primary/30 rotate-1' : ''
      } ${isCompleted ? 'border-emerald-500/20 bg-emerald-50/5 dark:bg-emerald-950/5' : ''}`}
    >
      {/* Hlavička karty */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {/* Drag Handle */}
          <div
            {...dragHandleProps}
            className="cursor-grab active:cursor-grabbing text-muted-foreground/30 hover:text-muted-foreground transition-colors p-1 -m-1 rounded flex-shrink-0"
          >
            <GripVertical className="h-4 w-4" />
          </div>

          <h3 className={`text-sm font-bold leading-snug truncate ${isCompleted ? 'line-through text-muted-foreground/70' : 'text-foreground'}`}>
            {milnik.nazev}
          </h3>
        </div>

        {/* Akce Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger render={
            <Button
              variant="ghost"
              size="icon-sm"
              className="opacity-0 group-hover:opacity-100 transition-opacity h-7 w-7 flex-shrink-0 -mr-1.5"
              id={`milnik-menu-${milnik.id}`}
            />
          }>
            <MoreHorizontal className="h-4 w-4" />
            <span className="sr-only">Akce milníku</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => setIsEditDialogOpen(true)}>
              <Pencil className="h-3.5 w-3.5 mr-2" />
              Upravit milník
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={handleToggleComplete}>
              <CheckCircle2 className="h-3.5 w-3.5 mr-2 text-emerald-500" />
              {isCompleted ? 'Označit jako aktivní' : 'Označit jako splněný'}
            </DropdownMenuItem>
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

      {/* Stav, priorita a termín */}
      <div className="flex items-center gap-1.5 mt-2 flex-wrap text-[11px]">
        {/* Stav badge */}
        <span className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 font-medium ${stavCfg.bg} ${stavCfg.color}`}>
          <span className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${stavCfg.dot} ${milnik.stav === 'in_progress' ? 'animate-pulse' : ''}`} />
          {stavCfg.label}
        </span>

        {/* Priorita */}
        <span className={`font-semibold ${prioritaCfg.color}`}>
          {prioritaCfg.icon} {prioritaCfg.label}
        </span>

        {/* Deadline */}
        {deadline && (
          <span className={`inline-flex items-center gap-1 font-mono ${deadline.isPast && !isCompleted ? 'text-red-500 font-bold' : 'text-muted-foreground'}`}>
            <Clock className="h-3 w-3" />
            {deadline.label}
            {deadline.isPast && !isCompleted && ' ⚠️'}
          </span>
        )}
      </div>

      {/* Intro info box (Status / Metadata) */}
      {parsed.introLines.length > 0 && (
        <div className="mt-3 flex flex-col gap-1 text-[11px] text-muted-foreground/90 bg-muted/30 p-2.5 rounded-lg border border-border/40 leading-relaxed font-sans">
          {parsed.introLines.map((line, idx) => (
            <div key={idx} className="block">
              {formatMarkdownLine(line)}
            </div>
          ))}
        </div>
      )}

      {/* Checklist / Úkoly (INTERAKTIVNÍ) */}
      {parsed.tasks.length > 0 && (
        <div className="mt-4 flex flex-col gap-2 pt-3 border-t border-dashed">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-primary/60" /> Cíle a úkoly
            </span>
            <span className="text-[10px] font-mono font-semibold text-muted-foreground">
              {parsed.tasks.filter(t => t.done).length}/{parsed.tasks.length}
            </span>
          </div>
          <div className="flex flex-col gap-2 mt-1">
            {parsed.tasks.map((task, idx) => (
              <button
                key={idx}
                onClick={() => handleToggleTask(idx)}
                disabled={isPending}
                className="flex items-start gap-2 text-left text-xs text-foreground/80 hover:text-foreground transition-colors outline-none select-none group/todo cursor-pointer disabled:opacity-50"
              >
                <span className="mt-0.5 flex-shrink-0 text-muted-foreground group-hover/todo:text-primary transition-colors">
                  {task.done ? (
                    <CheckSquare2 className="h-4 w-4 text-emerald-500 fill-emerald-500/10" />
                  ) : (
                    <Square className="h-4 w-4" />
                  )}
                </span>
                <span className={`leading-normal ${task.done ? 'line-through text-muted-foreground/60' : 'font-medium'}`}>
                  {task.text}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Vlastník a Progress Bar */}
      <div className="mt-auto pt-3">
        {/* Progress Bar */}
        <div className="flex items-center justify-between text-[11px] mb-1">
          <span className="text-muted-foreground">Progres</span>
          <span className="font-semibold tabular-nums" style={{ color: isCompleted ? 'var(--color-emerald-500)' : 'var(--primary)' }}>
            {milnik.progres_procenta}%
          </span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${milnik.progres_procenta}%`,
              backgroundColor: isCompleted ? '#10b981' : 'var(--primary)',
            }}
          />
        </div>

        {/* Vlastník */}
        {milnik.vlastnik?.jmeno && (
          <div className="flex items-center justify-end mt-2 pt-2 border-t border-border/30 text-[10px] text-muted-foreground">
            <span>Odpovědný: 👤 <strong>{milnik.vlastnik.jmeno}</strong></span>
          </div>
        )}
      </div>

      <MilnikFormDialog
        projektId={milnik.projekt_id}
        milnik={milnik}
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        trigger={null}
      />
    </div>
  )
}

