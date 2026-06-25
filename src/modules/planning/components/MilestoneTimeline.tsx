'use client'

import * as React from 'react'
import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Milnik, STAV_MILNIKU_CONFIG, StavMilniku } from '../types'
import { updatePoradi } from '../actions/milniky'
import { MilnikCard } from './MilnikCard'
import { MilnikFormDialog } from './MilnikFormDialog'
import { Button } from '@/shared/components/ui/button'

interface MilestoneTimelineProps {
  projektId: string
  milniky: Milnik[]
  projektBarva: string
}

// Jednoduchý drag-and-drop bez externích závislostí
export function MilestoneTimeline({ projektId, milniky: initialMilniky, projektBarva }: MilestoneTimelineProps) {
  const [milniky, setMilniky] = useState<Milnik[]>(initialMilniky)
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [overIndex, setOverIndex] = useState<number | null>(null)
  const [isSaving, startSave] = useTransition()

  // Statistiky
  const total = milniky.length
  const completed = milniky.filter(m => m.stav === 'completed').length
  const inProgress = milniky.filter(m => m.stav === 'in_progress').length
  const blocked = milniky.filter(m => m.stav === 'blocked').length
  const avgProgress = total > 0
    ? Math.round(milniky.reduce((s, m) => s + m.progres_procenta, 0) / total)
    : 0

  // Drag-and-drop handlers (nativní HTML5 DnD)
  function handleDragStart(index: number) {
    setDragIndex(index)
  }
  function handleDragOver(e: React.DragEvent, index: number) {
    e.preventDefault()
    setOverIndex(index)
  }
  function handleDrop(e: React.DragEvent, dropIndex: number) {
    e.preventDefault()
    if (dragIndex === null || dragIndex === dropIndex) {
      setDragIndex(null)
      setOverIndex(null)
      return
    }

    const newMilniky = [...milniky]
    const [moved] = newMilniky.splice(dragIndex, 1)
    newMilniky.splice(dropIndex, 0, moved)

    // Přiřadit nové pořadí
    const reordered = newMilniky.map((m, i) => ({ ...m, poradi: i }))
    setMilniky(reordered)
    setDragIndex(null)
    setOverIndex(null)

    // Persistovat na server
    startSave(async () => {
      const result = await updatePoradi(reordered.map(m => ({ id: m.id, poradi: m.poradi })))
      if (!result.success) {
        toast.error('Chyba při ukládání pořadí.')
        setMilniky(milniky) // Rollback
      }
    })
  }
  function handleDragEnd() {
    setDragIndex(null)
    setOverIndex(null)
  }

  // Synchronizace při změně z vnějšku (po server revalidaci)
  React.useEffect(() => {
    setMilniky(initialMilniky)
  }, [initialMilniky])

  return (
    <div className="flex flex-col gap-6">
      {/* Statistický mini-panel */}
      {total > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatBox label="Celkem fází" value={total} color="text-foreground" />
          <StatBox label="Dokončeno" value={completed} color="text-emerald-500" />
          <StatBox label="Probíhá" value={inProgress} color="text-blue-500" />
          <StatBox label="Blokováno" value={blocked} color="text-red-500" />
        </div>
      )}

      {/* Horizontální vizuální timeline (pro desktop) */}
      {total > 0 && (
        <div className="hidden sm:flex items-center gap-0 overflow-x-auto pb-2 -mx-1 px-1">
          {milniky.map((m, i) => {
            const cfg = STAV_MILNIKU_CONFIG[m.stav]
            const dotColor = m.barva ?? projektBarva
            return (
              <React.Fragment key={m.id}>
                <div className="flex flex-col items-center gap-1.5 flex-shrink-0 min-w-[80px] max-w-[120px]">
                  {/* Uzel */}
                  <div
                    className={`h-3 w-3 rounded-full border-2 border-background ring-2 transition-all ${cfg.dot} ${m.stav === 'in_progress' ? 'animate-pulse scale-110' : ''}`}
                    style={{ boxShadow: `0 0 0 2px ${dotColor}30` }}
                    title={m.nazev}
                  />
                  {/* Název */}
                  <span className="text-[10px] text-center text-muted-foreground leading-tight line-clamp-2 max-w-[80px]">
                    {m.nazev}
                  </span>
                  {/* Procenta */}
                  <span className={`text-[10px] font-semibold tabular-nums ${cfg.color}`}>
                    {m.progres_procenta}%
                  </span>
                </div>
                {/* Spojovací čára */}
                {i < milniky.length - 1 && (
                  <div className="flex-1 h-px bg-border min-w-[16px] mt-[-20px]" />
                )}
              </React.Fragment>
            )
          })}
        </div>
      )}

      {/* Celkový progress projektu */}
      {total > 0 && (
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground whitespace-nowrap">Celkový progres projektu</span>
          <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${avgProgress}%`, backgroundColor: projektBarva }}
            />
          </div>
          <span className="text-sm font-bold tabular-nums" style={{ color: projektBarva }}>
            {avgProgress}%
          </span>
        </div>
      )}

      {/* Seznam milníků s drag-and-drop */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Fáze a milníky
            {isSaving && <span className="ml-2 text-xs font-normal text-muted-foreground">Ukládám…</span>}
          </h2>
          <MilnikFormDialog projektId={projektId} />
        </div>

        {total === 0 ? (
          <EmptyMilniky projektId={projektId} />
        ) : (
          <div className="flex flex-col gap-2">
            {milniky.map((milnik, index) => (
              <div
                key={milnik.id}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={e => handleDragOver(e, index)}
                onDrop={e => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
                className={`transition-opacity ${overIndex === index && dragIndex !== index ? 'ring-2 ring-primary/50 rounded-lg' : ''}`}
              >
                <MilnikCard
                  milnik={milnik}
                  isDragging={dragIndex === index}
                  dragHandleProps={{
                    onMouseDown: (e) => e.currentTarget.parentElement?.setAttribute('draggable', 'true'),
                  }}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function StatBox({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded-lg border bg-card p-3 text-center">
      <div className={`text-2xl font-bold tabular-nums ${color}`}>{value}</div>
      <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
    </div>
  )
}

function EmptyMilniky({ projektId }: { projektId: string }) {
  return (
    <div className="flex flex-col items-center gap-3 py-12 text-center rounded-xl border border-dashed bg-muted/30">
      <div className="text-3xl">🎯</div>
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium">Žádné milníky zatím</p>
        <p className="text-xs text-muted-foreground">Přidej první fázi nebo milník projektu</p>
      </div>
      <MilnikFormDialog projektId={projektId} />
    </div>
  )
}
