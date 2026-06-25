'use client'

import * as React from 'react'
import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import {
  Milnik,
  STAV_MILNIKU_CONFIG,
  StavMilniku,
  PRIORITA_CONFIG,
} from '../types'
import Link from 'next/link'
import { updatePoradi, deleteMilnik, updateMilnikStav } from '../actions/milniky'
import { MilnikCard } from './MilnikCard'
import { MilnikFormDialog } from './MilnikFormDialog'
import { Button } from '@/shared/components/ui/button'
import {
  Calendar,
  List,
  GanttChartSquare,
  Plus,
  GripVertical,
  CheckCircle2,
  Clock,
  Trash2,
  Pencil,
  Info,
} from 'lucide-react'

interface MilestoneTimelineProps {
  projektId: string
  milniky: Milnik[]
  projektBarva: string
}

function formatDateCS(dateStr: string | null) {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric', year: '2-digit' })
}

export function MilestoneTimeline({ projektId, milniky: initialMilniky, projektBarva }: MilestoneTimelineProps) {
  const [milniky, setMilniky] = useState<Milnik[]>(initialMilniky)
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [overIndex, setOverIndex] = useState<number | null>(null)
  const [isSaving, startSave] = useTransition()
  
  // Řízení stavu dialogu pro editaci (mimo dropdown kvůli unmount chybě)
  const [activeEditMilnik, setActiveEditMilnik] = useState<Milnik | null>(null)

  // Záložky: timeline / table / gantt
  const [activeTab, setActiveTab] = useState<'timeline' | 'table' | 'gantt'>('timeline')

  const handleTabChange = (tab: 'timeline' | 'table' | 'gantt') => {
    setActiveTab(tab)
  }

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

    const reordered = newMilniky.map((m, i) => ({ ...m, poradi: i }))
    setMilniky(reordered)
    setDragIndex(null)
    setOverIndex(null)

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

  // Smazání milníku v tabulkovém/gantt pohledu
  function handleDeleteMilnik(id: string, nazev: string) {
    if (!confirm(`Smazat milník „${nazev}"?`)) return
    startSave(async () => {
      const result = await deleteMilnik(id)
      if (result.success) {
        toast.success('Milník byl odstraněn.')
      } else {
        toast.error(result.error ?? 'Chyba při mazání milníku.')
      }
    })
  }

  // Změna dokončení milníku v tabulkovém/gantt pohledu
  function handleToggleComplete(milnik: Milnik) {
    const isCompleted = milnik.stav === 'completed'
    const novyStav = isCompleted ? 'in_progress' : 'completed'
    startSave(async () => {
      const result = await updateMilnikStav(milnik.id, novyStav)
      if (!result.success) {
        toast.error(result.error ?? 'Chyba při aktualizaci stavu.')
      }
    })
  }

  // Synchronizace při změně z vnějšku (po server revalidaci)
  React.useEffect(() => {
    setMilniky(initialMilniky)
  }, [initialMilniky])

  // --- Gantt Výpočty ---
  const milnikySDatumy = milniky.filter(m => m.datum_zahajeni || m.datum_splatnosti)
  
  // Zjištění rozsahu pro Gantt
  let ganttStart = new Date()
  let ganttEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
  
  if (milnikySDatumy.length > 0) {
    const dates = milnikySDatumy.flatMap(m => [
      m.datum_zahajeni ? new Date(m.datum_zahajeni) : null,
      m.datum_splatnosti ? new Date(m.datum_splatnosti) : null
    ]).filter((d): d is Date => d !== null)

    if (dates.length > 0) {
      ganttStart = new Date(Math.min(...dates.map(d => d.getTime())))
      ganttEnd = new Date(Math.max(...dates.map(d => d.getTime())))
    }
  }

  const rawGanttPeriodMs = ganttEnd.getTime() - ganttStart.getTime()
  const totalWeeks = Math.max(4, Math.ceil(rawGanttPeriodMs / (7 * 24 * 60 * 60 * 1000)))
  const useMonths = totalWeeks > 16

  let columnsCount = totalWeeks
  const headers: { label: string; sub: string }[] = []

  if (useMonths) {
    const startYear = ganttStart.getFullYear()
    const startMonth = ganttStart.getMonth()
    const endYear = ganttEnd.getFullYear()
    const endMonth = ganttEnd.getMonth()

    columnsCount = (endYear - startYear) * 12 + (endMonth - startMonth) + 1
    if (columnsCount < 4) columnsCount = 4

    ganttStart = new Date(startYear, startMonth, 1, 0, 0, 0, 0)
    ganttEnd = new Date(startYear, startMonth + columnsCount, 0, 23, 59, 59, 999)

    for (let m = 0; m < columnsCount; m++) {
      const d = new Date(startYear, startMonth + m, 1)
      const monthName = d.toLocaleDateString('cs-CZ', { month: 'long' })
      const capitalized = monthName.charAt(0).toUpperCase() + monthName.slice(1)
      headers.push({
        label: capitalized,
        sub: d.getFullYear().toString(),
      })
    }
  } else {
    const startDay = ganttStart.getDay()
    const diffToMon = startDay === 0 ? -6 : 1 - startDay
    ganttStart.setDate(ganttStart.getDate() + diffToMon)
    ganttStart.setHours(0, 0, 0, 0)

    const endDay = ganttEnd.getDay()
    const diffToSun = endDay === 0 ? 0 : 7 - endDay
    ganttEnd.setDate(ganttEnd.getDate() + diffToSun)
    ganttEnd.setHours(23, 59, 59, 999)

    columnsCount = totalWeeks
    for (let w = 0; w < totalWeeks; w++) {
      const wDate = new Date(ganttStart.getTime() + w * 7 * 24 * 60 * 60 * 1000)
      headers.push({
        label: `Týden ${w + 1}`,
        sub: wDate.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric' }),
      })
    }
  }

  const ganttPeriodMs = ganttEnd.getTime() - ganttStart.getTime()
  const containerMinWidth = Math.max(900, columnsCount * 100)

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

      {/* Přepínač pohledů (Amazon/Rohlik style tabs) */}
      <div className="flex items-center justify-between border-b pb-px flex-wrap gap-3">
        <div className="flex items-center gap-1 bg-muted/60 p-0.5 rounded-lg border">
          <Button
            variant={activeTab === 'timeline' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => handleTabChange('timeline')}
            className="h-7 px-2.5 text-xs font-medium"
          >
            <Calendar className="h-3.5 w-3.5 mr-1.5" />
            Časová osa
          </Button>
          <Button
            variant={activeTab === 'table' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => handleTabChange('table')}
            className="h-7 px-2.5 text-xs font-medium"
          >
            <List className="h-3.5 w-3.5 mr-1.5" />
            Tabulka fází
          </Button>
          <Button
            variant={activeTab === 'gantt' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => handleTabChange('gantt')}
            className="h-7 px-2.5 text-xs font-medium"
          >
            <GanttChartSquare className="h-3.5 w-3.5 mr-1.5" />
            Ganttův diagram
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2.5 text-xs font-medium"
            render={<Link href={`/planovani/kalendar?projektId=${projektId}`} />}
          >
            <Calendar className="h-3.5 w-3.5 mr-1.5" />
            Kalendář
          </Button>
        </div>

        <div className="flex items-center gap-2">
          {isSaving && <span className="text-xs text-muted-foreground animate-pulse">Ukládám změny…</span>}
          <MilnikFormDialog projektId={projektId} />
        </div>
      </div>

      {/* Celkový progress projektu */}
      {total > 0 && (
        <div className="flex items-center gap-3 bg-card border rounded-xl p-4">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">
            Celkový pokrok
          </span>
          <div className="flex-1 h-2.5 rounded-full bg-muted overflow-hidden">
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

      {/* HLAVNÍ OBSAH DLE ZÁLOŽEK */}
      {total === 0 ? (
        <EmptyMilniky projektId={projektId} />
      ) : (
        <>
          {/* A. TIMELINE POHLED (Karty + Drag Handle) */}
          {activeTab === 'timeline' && (
            <div className="flex flex-col gap-6">
              {/* Horizontální vizuální uzly */}
              <div className="hidden sm:flex items-center gap-0 overflow-x-auto pb-4 -mx-1 px-1">
                {milniky.map((m, i) => {
                  const cfg = STAV_MILNIKU_CONFIG[m.stav]
                  const dotColor = m.barva ?? projektBarva
                  return (
                    <React.Fragment key={m.id}>
                      <div className="flex flex-col items-center gap-2 flex-shrink-0 min-w-[100px] max-w-[140px]">
                        <div
                          className={`h-4 w-4 rounded-full border-2 border-background ring-2 transition-all flex items-center justify-center ${cfg.dot} ${m.stav === 'in_progress' ? 'animate-pulse scale-110' : ''}`}
                          style={{ boxShadow: `0 0 0 2px ${dotColor}30` }}
                          title={`${m.nazev} (${m.progres_procenta}%)`}
                        >
                          {m.stav === 'completed' && <span className="text-[8px] text-white">✓</span>}
                        </div>
                        <span className="text-[10px] font-semibold text-center text-foreground leading-tight line-clamp-2 max-w-[90px]">
                          {m.nazev}
                        </span>
                        <span className="text-[9px] text-muted-foreground tabular-nums">
                          {m.progres_procenta}%
                        </span>
                      </div>
                      {i < milniky.length - 1 && (
                        <div className="flex-1 h-0.5 bg-border min-w-[20px] mt-[-30px]" />
                      )}
                    </React.Fragment>
                  )
                })}
              </div>

              {/* Sloupcový přehled fází (Vedle sebe) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 items-start">
                {milniky.map((milnik, index) => (
                  <div
                    key={milnik.id}
                    draggable
                    onDragStart={() => handleDragStart(index)}
                    onDragOver={e => handleDragOver(e, index)}
                    onDrop={e => handleDrop(e, index)}
                    onDragEnd={handleDragEnd}
                    className={`transition-opacity ${overIndex === index && dragIndex !== index ? 'ring-2 ring-primary/50 rounded-xl' : ''}`}
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
            </div>
          )}

          {/* B. TABULKOVÝ POHLED (Enterprise DataGrid) */}
          {activeTab === 'table' && (
            <div className="rounded-xl border bg-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b bg-muted/40 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      <th className="py-2.5 px-3 w-8"></th>
                      <th className="py-2.5 px-3 w-8"></th>
                      <th className="py-2.5 px-3">Název fáze</th>
                      <th className="py-2.5 px-3 w-32">Stav</th>
                      <th className="py-2.5 px-3 w-24">Priorita</th>
                      <th className="py-2.5 px-3 w-36">Zahájení</th>
                      <th className="py-2.5 px-3 w-36">Deadline</th>
                      <th className="py-2.5 px-3 w-40">Pokrok</th>
                      <th className="py-2.5 px-3 w-36">Odpovědný</th>
                      <th className="py-2.5 px-3 w-20 text-right">Akce</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y text-sm">
                    {milniky.map((milnik, index) => {
                      const stavCfg = STAV_MILNIKU_CONFIG[milnik.stav]
                      const prioritaCfg = PRIORITA_CONFIG[milnik.priorita]
                      return (
                        <tr
                          key={milnik.id}
                          className={`hover:bg-muted/30 transition-colors group ${milnik.stav === 'completed' ? 'opacity-65' : ''}`}
                        >
                          <td className="py-2 px-3 text-muted-foreground/30 hover:text-muted-foreground cursor-grab">
                            <GripVertical className="h-4 w-4" />
                          </td>
                          <td className="py-2 px-3">
                            <button
                              onClick={() => handleToggleComplete(milnik)}
                              className="text-muted-foreground hover:text-emerald-500 transition-colors"
                            >
                              <CheckCircle2 className={`h-4 w-4 ${milnik.stav === 'completed' ? 'text-emerald-500 fill-emerald-500/10' : ''}`} />
                            </button>
                          </td>
                          <td className="py-2 px-3 font-medium">
                            <div className="flex flex-col">
                              <span>{milnik.nazev}</span>
                              {milnik.popis && <span className="text-xs text-muted-foreground font-normal line-clamp-1">{milnik.popis}</span>}
                            </div>
                          </td>
                          <td className="py-2 px-3">
                            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${stavCfg.bg} ${stavCfg.color}`}>
                              <span className={`h-1.5 w-1.5 rounded-full ${stavCfg.dot}`} />
                              {stavCfg.label}
                            </span>
                          </td>
                          <td className="py-2 px-3">
                            <span className={`text-xs font-semibold ${prioritaCfg.color}`}>
                              {prioritaCfg.icon} {prioritaCfg.label}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-muted-foreground font-mono text-xs">
                            {formatDateCS(milnik.datum_zahajeni)}
                          </td>
                          <td className="py-2 px-3 text-muted-foreground font-mono text-xs">
                            {formatDateCS(milnik.datum_splatnosti)}
                          </td>
                          <td className="py-2 px-3">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                                <div
                                  className="h-full rounded-full bg-primary"
                                  style={{
                                    width: `${milnik.progres_procenta}%`,
                                    backgroundColor: milnik.stav === 'completed' ? 'var(--color-emerald-500)' : undefined
                                  }}
                                />
                              </div>
                              <span className="text-xs font-mono font-semibold tabular-nums w-8 text-right">
                                {milnik.progres_procenta}%
                              </span>
                            </div>
                          </td>
                          <td className="py-2 px-3 text-xs">
                            {milnik.vlastnik?.jmeno ? `👤 ${milnik.vlastnik.jmeno}` : '-'}
                          </td>
                          <td className="py-2 px-3 text-right">
                            <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                size="icon-sm"
                                variant="ghost"
                                onClick={() => setActiveEditMilnik(milnik)}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                size="icon-sm"
                                variant="ghost"
                                className="text-destructive hover:text-destructive"
                                onClick={() => handleDeleteMilnik(milnik.id, milnik.nazev)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* C. GANTTŮV DIAGRAM (CSS Grid + Percentage Scale) */}
          {activeTab === 'gantt' && (
            <div className="rounded-xl border bg-card overflow-hidden flex flex-col">
              {milnikySDatumy.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-16 text-center">
                  <div className="text-4xl">📊</div>
                  <h3 className="text-sm font-semibold">Žádná data pro Ganttův diagram</h3>
                  <p className="text-xs text-muted-foreground max-w-sm">
                    Upravte milníky a zadejte u nich **Datum zahájení** a **Deadline**, aby se zde zobrazila časová osa.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <div className="flex flex-col" style={{ minWidth: `${containerMinWidth}px` }}>
                    {/* Gantt Header */}
                    <div className="flex border-b bg-muted/40 text-xs font-semibold text-muted-foreground uppercase">
                      <div className="w-[220px] py-3 px-4 border-r flex-shrink-0">Milník / Fáze</div>
                      <div className="flex-1 grid" style={{ gridTemplateColumns: `repeat(${columnsCount}, minmax(0, 1fr))` }}>
                        {headers.map((h, idx) => (
                          <div key={idx} className="py-3 text-center border-r last:border-r-0 font-mono text-[10px]">
                            {h.label}
                            <span className="block text-[9px] font-normal text-muted-foreground mt-0.5">{h.sub}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Gantt Rows */}
                    <div className="divide-y">
                      {milniky.map(m => {
                        const start = m.datum_zahajeni ? new Date(m.datum_zahajeni) : ganttStart
                        const end = m.datum_splatnosti ? new Date(m.datum_splatnosti) : ganttEnd
                        const adjustedStart = start < ganttStart ? ganttStart : start
                        const adjustedEnd = end > ganttEnd ? ganttEnd : end
                        
                        const startMs = adjustedStart.getTime() - ganttStart.getTime()
                        const endMs = adjustedEnd.getTime() - ganttStart.getTime()

                        const leftPercent = Math.max(0, Math.min(100, (startMs / ganttPeriodMs) * 100))
                        const widthPercent = Math.max(2, Math.min(100 - leftPercent, ((endMs - startMs) / ganttPeriodMs) * 100))

                        const barColor = m.barva ?? projektBarva
                        const completedColor = m.stav === 'completed' ? '#10b981' : barColor

                        return (
                          <div key={m.id} className="flex hover:bg-muted/10 items-center transition-colors group">
                            {/* Left label column */}
                            <div className="w-[220px] py-3 px-4 border-r flex-shrink-0 flex flex-col gap-0.5">
                              <span className={`text-xs font-semibold truncate ${m.stav === 'completed' ? 'line-through text-muted-foreground' : ''}`}>
                                {m.nazev}
                              </span>
                              <span className="text-[10px] text-muted-foreground font-mono">
                                {m.datum_zahajeni ? formatDateCS(m.datum_zahajeni) : '?'} → {m.datum_splatnosti ? formatDateCS(m.datum_splatnosti) : '?'}
                              </span>
                            </div>

                            {/* Right Gantt Chart Track */}
                            <div className="flex-1 h-14 relative px-1 flex items-center bg-zinc-50/40 dark:bg-zinc-950/10">
                              {/* Grid vertical lines */}
                              <div className="absolute inset-0 grid" style={{ gridTemplateColumns: `repeat(${columnsCount}, minmax(0, 1fr))` }}>
                                {Array.from({ length: columnsCount }).map((_, i) => (
                                  <div key={i} className="border-r border-dashed border-zinc-200/50 dark:border-zinc-800/40 h-full" />
                                ))}
                              </div>

                              {/* Gantt Bar */}
                              {(m.datum_zahajeni || m.datum_splatnosti) && (
                                <div
                                  className="absolute h-8 rounded-lg shadow-sm flex flex-col justify-center px-2 border overflow-hidden transition-all duration-300 group-hover:shadow-md cursor-pointer"
                                  style={{
                                    left: `${leftPercent}%`,
                                    width: `${widthPercent}%`,
                                    borderColor: `${completedColor}30`,
                                    backgroundColor: `${completedColor}12`,
                                  }}
                                  onClick={() => setActiveEditMilnik(m)}
                                  title={`${m.nazev}: ${m.progres_procenta}% dokončeno`}
                                >
                                  {/* Pokrok overlay */}
                                  <div
                                    className="absolute left-0 top-0 bottom-0 opacity-20 transition-all duration-500"
                                    style={{
                                      width: `${m.progres_procenta}%`,
                                      backgroundColor: completedColor,
                                    }}
                                  />
                                  
                                  {/* Label inside the bar (if wide enough) */}
                                  <div className="relative z-10 flex items-center justify-between text-[10px] font-semibold text-foreground truncate select-none">
                                    <span className="truncate pr-1">{m.nazev}</span>
                                    <span className="text-[9px] opacity-80 tabular-nums">{m.progres_procenta}%</span>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* D. KALENDÁŘ POHLED ODSTRANĚN (přesměrován na globální) */}
        </>
      )}

      {/* Kontrolovaný Dialog pro Editaci milníku */}
      {activeEditMilnik && (
        <MilnikFormDialog
          projektId={projektId}
          milnik={activeEditMilnik}
          open={!!activeEditMilnik}
          onOpenChange={(open) => {
            if (!open) setActiveEditMilnik(null)
          }}
          trigger={null}
        />
      )}
    </div>
  )
}

function StatBox({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded-xl border bg-card p-3.5 text-center shadow-sm hover:shadow-md transition-shadow">
      <div className={`text-2xl font-bold tabular-nums ${color}`}>{value}</div>
      <div className="text-xs text-muted-foreground mt-0.5 font-medium">{label}</div>
    </div>
  )
}

function EmptyMilniky({ projektId }: { projektId: string }) {
  return (
    <div className="flex flex-col items-center gap-4 py-16 text-center rounded-2xl border border-dashed bg-muted/20">
      <div className="flex items-center justify-center h-14 w-14 rounded-2xl bg-primary/10 text-2xl">🎯</div>
      <div className="flex flex-col gap-1 max-w-sm">
        <h3 className="text-sm font-semibold">Žádné milníky v tomto projektu</h3>
        <p className="text-xs text-muted-foreground">
          Pro zobrazení časové osy a plánování přidejte první milník nebo fázi projektu.
        </p>
      </div>
      <MilnikFormDialog projektId={projektId} />
    </div>
  )
}
