'use client'

import * as React from 'react'
import { useState, useEffect, useCallback, useTransition } from 'react'
import { toast } from 'sonner'
import { 
  ChevronLeft, 
  ChevronRight, 
  Filter, 
  User, 
  Briefcase,
  AlertCircle,
  Calendar as CalendarIcon,
  Plus
} from 'lucide-react'
import { 
  UkolPlanovani, 
  UdalostPlanovani,
  OddeleniType, 
  TypUdalostiType,
  PrioritaUkolu,
  ODDELENI_CONFIG, 
  TYP_UDALOSTI_CONFIG, 
  STAV_UKOLU_CONFIG,
  PRIORITA_CONFIG
} from '../types'
import { getUkolyByDateRange, getMilnikyDeadlines } from '../actions/ukoly'
import { getUdalostiByDateRange } from '../actions/udalosti'
import { getProjekty } from '../actions/projekty'
import { getUsers } from '@/modules/users/actions'
import { UkolFormDialog } from './UkolFormDialog'
import { UdalostFormDialog } from './UdalostFormDialog'
import { MeetingWorkspace } from './MeetingWorkspace'
import { Button } from '@/shared/components/ui/button'
import { Badge } from '@/shared/components/ui/badge'
import { Label } from '@/shared/components/ui/label'

interface PlanningCalendarProps {
  projektId?: string // Volitelné - pokud chceme filtrovat pouze pro jeden projekt
}

const CZECH_DAYS = ['Pondělí', 'Úterý', 'Středa', 'Čtvrtek', 'Pátek', 'Sobota', 'Neděle']
const CZECH_MONTHS = [
  'Leden', 'Únor', 'Březen', 'Duben', 'Květen', 'Červen', 
  'Červenc', 'Srpen', 'Září', 'Říjen', 'Listopad', 'Prosinec'
]

function toISODateString(date: Date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function PlanningCalendar({ projektId }: PlanningCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [view, setView] = useState<'month' | 'week' | 'day'>('month')
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())

  // Dynamic style calculator for events
  const getEventStyle = useCallback((u: UkolPlanovani) => {
    const eventColor = u.barva || 
      (u.typ_udalosti === 'order' ? '#eab308' : 
       u.typ_udalosti === 'deadline' ? '#ef4444' : 
       ODDELENI_CONFIG[u.oddeleni].colorHex)
    return {
      style: {
        '--event-color': eventColor,
        borderLeft: `3px solid ${eventColor}`,
        boxShadow: `0 1px 3px rgba(0, 0, 0, 0.05), 0 0 12px color-mix(in srgb, ${eventColor} 45%, transparent)`,
      } as React.CSSProperties,
      className: `pl-1.5 bg-[color-mix(in_srgb,var(--event-color)_18%,#ffffff)] dark:bg-[color-mix(in_srgb,var(--event-color)_25%,#1c1c1e)] border-[color-mix(in_srgb,var(--event-color)_40%,#e4e4e7)] dark:border-[color-mix(in_srgb,var(--event-color)_55%,#2c2c2e)] text-[color-mix(in_srgb,var(--event-color)_95%,#000000)] dark:text-[color-mix(in_srgb,var(--event-color)_15%,#ffffff)] ${
        u.stav === 'done' ? 'line-through opacity-50' : ''
      }`
    }
  }, [])
  
  // Data
  const [ukoly, setUkoly] = useState<UkolPlanovani[]>([])
  const [udalosti, setUdalosti] = useState<UdalostPlanovani[]>([])
  const [milnikyDeadlines, setMilnikyDeadlines] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [userProfiles, setUserProfiles] = useState<any[]>([])
  
  // Dialogs
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [activeEditUkol, setActiveEditUkol] = useState<UkolPlanovani | null>(null)
  
  // Filters
  const [selectedOddeleni, setSelectedOddeleni] = useState<OddeleniType | 'all'>('all')
  const [selectedOwner, setSelectedOwner] = useState<string | 'all'>('all')
  const [selectedTyp, setSelectedTyp] = useState<TypUdalostiType | 'meeting' | 'schuzka' | 'all'>('all')
  const [selectedPriorita, setSelectedPriorita] = useState<PrioritaUkolu | 'all'>('all')
  const [selectedProjekt, setSelectedProjekt] = useState<string | 'all'>('all')
  const [showFilters, setShowFilters] = useState(false)

  // Projects list for filter
  const [projekty, setProjekty] = useState<any[]>([])

  // Touch swipe states
  const [touchStart, setTouchStart] = useState<number | null>(null)
  const [touchEnd, setTouchEnd] = useState<number | null>(null)

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  // Calculate range dates for query
  const getRangeDates = useCallback(() => {
    if (view === 'month') {
      const firstDay = new Date(year, month, 1)
      const startDayOfWeek = (firstDay.getDay() + 6) % 7
      
      const startDate = new Date(year, month, 1 - startDayOfWeek)
      const endDate = new Date(year, month + 1, 42 - startDayOfWeek) // 6 rows max
      return { start: startDate, end: endDate }
    } else if (view === 'week') {
      const day = currentDate.getDay()
      const diffToMon = day === 0 ? -6 : 1 - day
      const monday = new Date(currentDate)
      monday.setDate(currentDate.getDate() + diffToMon)
      
      const sunday = new Date(monday)
      sunday.setDate(monday.getDate() + 6)
      return { start: monday, end: sunday }
    } else {
      return { start: currentDate, end: currentDate }
    }
  }, [currentDate, year, month, view])

  // Fetch data from Server Actions
  const loadData = useCallback(async () => {
    setLoading(true)
    const { start, end } = getRangeDates()
    const fromStr = toISODateString(start)
    const toStr = toISODateString(end)

    const [ukolyRes, deadlinesRes, udalostiRes] = await Promise.all([
      getUkolyByDateRange(fromStr, toStr),
      getMilnikyDeadlines(fromStr, toStr),
      getUdalostiByDateRange(fromStr, toStr)
    ])

    if (ukolyRes.success && ukolyRes.data) {
      setUkoly(ukolyRes.data)
    }
    if (deadlinesRes.success && deadlinesRes.data) {
      setMilnikyDeadlines(deadlinesRes.data)
    }
    if (udalostiRes.success && udalostiRes.data) {
      setUdalosti(udalostiRes.data)
    }
    setLoading(false)
  }, [getRangeDates])

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    async function loadUsers() {
      const res = await getUsers()
      if (res.data) {
        setUserProfiles(res.data)
      }
    }
    async function loadProjects() {
      if (!projektId) {
        const res = await getProjekty()
        if (res.data) {
          setProjekty(res.data)
        }
      }
    }
    loadUsers()
    loadProjects()
  }, [projektId])

  // Navigation handlers
  function handlePrev() {
    if (view === 'month') {
      setCurrentDate(new Date(year, month - 1, 1))
    } else if (view === 'week') {
      const prevWeek = new Date(currentDate)
      prevWeek.setDate(currentDate.getDate() - 7)
      setCurrentDate(prevWeek)
    } else {
      const prevDay = new Date(currentDate)
      prevDay.setDate(currentDate.getDate() - 1)
      setCurrentDate(prevDay)
    }
  }

  function handleNext() {
    if (view === 'month') {
      setCurrentDate(new Date(year, month + 1, 1))
    } else if (view === 'week') {
      const nextWeek = new Date(currentDate)
      nextWeek.setDate(currentDate.getDate() + 7)
      setCurrentDate(nextWeek)
    } else {
      const nextDay = new Date(currentDate)
      nextDay.setDate(currentDate.getDate() + 1)
      setCurrentDate(nextDay)
    }
  }

  function handleToday() {
    setCurrentDate(new Date())
    setSelectedDate(new Date())
  }

  // Touch Swipe handlers
  const minSwipeDistance = 50
  
  function handleTouchStart(e: React.TouchEvent) {
    setTouchStart(e.targetTouches[0].clientX)
  }

  function handleTouchMove(e: React.TouchEvent) {
    setTouchEnd(e.targetTouches[0].clientX)
  }

  function handleTouchEnd() {
    if (!touchStart || !touchEnd) return
    const distance = touchStart - touchEnd
    const isLeftSwipe = distance > minSwipeDistance
    const isRightSwipe = distance < -minSwipeDistance
    
    if (isLeftSwipe) {
      handleNext()
    } else if (isRightSwipe) {
      handlePrev()
    }
    
    setTouchStart(null)
    setTouchEnd(null)
  }

  // Filter application
  const filteredUkoly = ukoly.filter(u => {
    // Projekt filter
    if (projektId) {
      if (u.milnik?.projekt_id !== projektId) return false
    } else if (selectedProjekt !== 'all') {
      if (u.milnik?.projekt_id !== selectedProjekt) return false
    }
    // Oddělení filter
    if (selectedOddeleni !== 'all' && u.oddeleni !== selectedOddeleni) return false
    // Vlastník filter
    if (selectedOwner !== 'all') {
      if (selectedOwner === '-') {
        if (u.vlastnik_id) return false
      } else if (u.vlastnik_id !== selectedOwner) {
        return false
      }
    }
    // Typ filter
    if (selectedTyp !== 'all' && u.typ_udalosti !== selectedTyp) return false
    // Priorita filter
    if (selectedPriorita !== 'all' && u.priorita !== selectedPriorita) return false
    return true
  })

  // Filter application for meetings/events
  const filteredUdalosti = udalosti.filter(u => {
    // Projekt filter
    if (projektId) {
      if (u.milnik?.projekt_id !== projektId) return false
    } else if (selectedProjekt !== 'all') {
      if (u.milnik?.projekt_id !== selectedProjekt) return false
    }
    // Typ filter
    if (selectedTyp !== 'all') {
      if (selectedTyp === 'meeting' && u.typ !== 'meeting') return false
      if (selectedTyp === 'schuzka' && u.typ !== 'schuzka') return false
      if (selectedTyp !== 'meeting' && selectedTyp !== 'schuzka') return false
    }
    // Since meetings don't have department, owner, or priority check them if filters are active
    if (selectedOddeleni !== 'all') return false
    if (selectedOwner !== 'all' && u.organizator_id !== selectedOwner) return false
    return true
  })

  // Filter application for milestone deadlines
  const filteredMilniky = milnikyDeadlines.filter(m => {
    // Projekt filter
    if (projektId) {
      if (m.projekt_id !== projektId) return false
    } else if (selectedProjekt !== 'all') {
      if (m.projekt_id !== selectedProjekt) return false
    }
    // Only show milestones if 'deadline' is selected or if no type filter is active
    if (selectedTyp !== 'all' && selectedTyp !== 'deadline') return false
    
    // Milestones do not have department, owner, or task priority in this context.
    // If user has filtered by department, owner, or priority, we should hide milestones since they don't match those filters.
    if (selectedOddeleni !== 'all') return false
    if (selectedOwner !== 'all') return false
    if (selectedPriorita !== 'all') return false
    
    return true
  })

  // Calendar cell builder
  const getDaysInMonthGrid = () => {
    const firstDay = new Date(year, month, 1)
    const startDayOfWeek = (firstDay.getDay() + 6) % 7
    const currentMonthDays = new Date(year, month + 1, 0).getDate()
    const prevMonthDays = new Date(year, month, 0).getDate()
    
    const days = []

    // Prev month days
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      days.push({
        date: new Date(year, month - 1, prevMonthDays - i),
        isCurrentMonth: false
      })
    }

    // Current month days
    for (let i = 1; i <= currentMonthDays; i++) {
      days.push({
        date: new Date(year, month, i),
        isCurrentMonth: true
      })
    }

    // Next month days
    const totalCells = days.length <= 35 ? 35 : 42
    const trailing = totalCells - days.length
    for (let i = 1; i <= trailing; i++) {
      days.push({
        date: new Date(year, month + 1, i),
        isCurrentMonth: false
      })
    }

    return days
  }

  // Check if dates are same day
  const isSameDay = (d1: Date, d2: Date) => {
    return d1.getFullYear() === d2.getFullYear() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getDate() === d2.getDate()
  }

  // Get events on a specific day
  const getEventsForDay = (date: Date) => {
    const dateStr = toISODateString(date)
    
    const dayUkoly = filteredUkoly.filter(u => 
      u.datum_splatnosti === dateStr || u.datum_zahajeni === dateStr
    )

    const dayMilniky = filteredMilniky.filter(m => 
      m.datum_splatnosti === dateStr
    )

    const dayUdalosti = filteredUdalosti.filter(u => {
      if (!u.datum_zahajeni) return false
      const eventDateStr = toISODateString(new Date(u.datum_zahajeni))
      return eventDateStr === dateStr
    })

    return { ukoly: dayUkoly, milniky: dayMilniky, udalosti: dayUdalosti }
  }

  // Click on empty grid cell -> quick create
  function handleCellClick(date: Date, e: React.MouseEvent) {
    if ((e.target as HTMLElement).closest('.event-item')) return
    setSelectedDate(date)
    setIsCreateDialogOpen(true)
  }

  // View switch render
  const renderMonthView = () => {
    const gridDays = getDaysInMonthGrid()
    const today = new Date()

    return (
      <div className="flex flex-col select-none">
        {/* Days of week header */}
        <div className="grid grid-cols-7 border-b text-center py-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider bg-muted/20">
          {CZECH_DAYS.map(day => (
            <div key={day} className="truncate px-1">{day.substring(0, 2)}</div>
          ))}
        </div>

        {/* Days grid */}
        <div 
          className="grid grid-cols-7 grid-rows-5 md:grid-rows-6 border-b divide-x divide-y border-r border-l"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {gridDays.map(({ date, isCurrentMonth }, idx) => {
            const isToday = isSameDay(date, today)
            const isSelected = isSameDay(date, selectedDate)
            const { ukoly: dayUkoly, milniky: dayMilniky, udalosti: dayUdalosti } = getEventsForDay(date)
            const hasEvents = dayUkoly.length > 0 || dayMilniky.length > 0 || dayUdalosti.length > 0

            return (
              <div
                key={idx}
                onClick={(e) => handleCellClick(date, e)}
                className={`min-h-[75px] md:min-h-[110px] p-1 flex flex-col justify-between transition-colors relative cursor-pointer group ${
                  isCurrentMonth ? 'bg-card' : 'bg-muted/10 text-muted-foreground/60'
                } ${isSelected ? 'ring-1 ring-primary/60 bg-primary/5 dark:bg-primary/5' : 'hover:bg-muted/30'}`}
              >
                {/* Day number */}
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] md:text-xs font-semibold tabular-nums px-1.5 py-0.5 rounded-full ${
                    isToday ? 'bg-primary text-primary-foreground font-bold' : ''
                  }`}>
                    {date.getDate()}
                  </span>
                  
                  {/* Plus icon on hover */}
                  <span className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] text-muted-foreground font-bold pr-1 hidden md:inline">
                    + Nový
                  </span>
                </div>

                {/* Events container - Desktop */}
                <div className="hidden md:flex flex-col gap-1 mt-1 flex-1 overflow-y-auto max-h-[75px] scrollbar-thin">
                  {/* Milestone deadlines */}
                  {dayMilniky.map(m => (
                    <div
                      key={m.id}
                      className="event-item text-[9px] bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-200 rounded px-1 py-0.5 font-bold truncate flex items-center gap-1"
                      title={`Deadline milníku: ${m.nazev}`}
                    >
                      🎯 {m.nazev}
                    </div>
                  ))}

                  {/* Meetings & Events */}
                  {dayUdalosti.map(event => {
                    const isSchuzka = event.typ === 'schuzka'
                    return (
                      <div
                        key={event.id}
                        onClick={(e) => e.stopPropagation()}
                        className="event-item w-full"
                      >
                        <MeetingWorkspace
                          meeting={event}
                          userProfiles={userProfiles}
                          onSuccess={loadData}
                          trigger={
                            <button
                              type="button"
                              className={`text-left w-full text-[9px] border rounded px-1.5 py-0.5 truncate flex items-center gap-1 cursor-pointer transition-all font-medium shadow-[0_0_8px_rgba(0,0,0,0.02)] ${
                                isSchuzka
                                  ? 'bg-amber-500/15 border-amber-500/35 text-amber-600 dark:text-amber-400 hover:bg-amber-500/25 dark:bg-amber-500/20 dark:border-amber-500/45 dark:hover:bg-amber-500/30 dark:shadow-[0_0_10px_rgba(245,158,11,0.25)]'
                                  : 'bg-orange-500/15 border-orange-500/35 text-orange-600 dark:text-orange-400 hover:bg-orange-500/25 dark:bg-orange-500/20 dark:border-orange-500/45 dark:hover:bg-orange-500/30 dark:shadow-[0_0_10px_rgba(249,115,22,0.25)]'
                              }`}
                              title={`${isSchuzka ? 'Schůzka (ext.)' : 'Meeting (int.)'}: ${event.nazev}${event.lokalita ? ' (📍 ' + event.lokalita + ')' : ''}`}
                            >
                              {isSchuzka ? '🤝' : '👥'} {event.nazev}
                            </button>
                          }
                        />
                      </div>
                    )
                  })}
                  
                  {/* Tasks */}
                  {dayUkoly.map(u => {
                    const cfg = ODDELENI_CONFIG[u.oddeleni]
                    const prioritaCfg = PRIORITA_CONFIG[u.priorita as keyof typeof PRIORITA_CONFIG]
                    const { style, className } = getEventStyle(u)
                    return (
                      <div
                        key={u.id}
                        onClick={(e) => {
                          e.stopPropagation()
                          setActiveEditUkol(u)
                        }}
                        style={style}
                        className={`event-item text-[9px] border rounded px-1.5 py-0.5 truncate flex items-center justify-between gap-1 cursor-pointer transition-all hover:brightness-95 dark:hover:brightness-110 ${className}`}
                        title={`${u.nazev}${u.lokalita ? ' (📍 ' + u.lokalita + ')' : ''} (${cfg.label})`}
                      >
                        <span className="truncate flex-1 font-medium">
                          {u.nazev}
                          {u.lokalita && ' 📍'}
                        </span>
                        {u.priorita === 'critical' && <span className="text-[9px] shrink-0">⚡</span>}
                      </div>
                    )
                  })}
                </div>

                {/* Mobile indicators (dots) */}
                <div className="md:hidden flex items-center justify-center gap-1 mt-1 flex-wrap">
                  {dayMilniky.length > 0 && (
                    <span className="h-1.5 w-1.5 rounded-full bg-red-500 shrink-0" />
                  )}
                  {dayUdalosti.map(e => (
                    <span 
                      key={e.id}
                      className={`h-1.5 w-1.5 rounded-full shrink-0 shadow-[0_0_6px_currentColor] ${e.typ === 'schuzka' ? 'bg-amber-500' : 'bg-orange-500'}`}
                      title={e.nazev}
                    />
                  ))}
                  {dayUkoly.map(u => {
                    const eventColor = u.barva
                    const style = eventColor 
                      ? { backgroundColor: eventColor, borderColor: eventColor } 
                      : { borderColor: 'currentColor', color: ODDELENI_CONFIG[u.oddeleni].color }
                    const bgClass = eventColor ? '' : ODDELENI_CONFIG[u.oddeleni].bg
                    return (
                      <span 
                        key={u.id} 
                        className={`h-1.5 w-1.5 rounded-full shrink-0 border ${bgClass}`}
                        style={style}
                      />
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>

        {/* Selected day agenda for mobile */}
        <div className="md:hidden mt-4 border rounded-xl p-3 bg-card">
          <div className="flex items-center justify-between border-b pb-2 mb-2">
            <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Agenda: {selectedDate.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'long' })}
            </h4>
            <Button 
              size="sm" 
              variant="outline" 
              className="h-7 text-[10px] px-2"
              onClick={() => setIsCreateDialogOpen(true)}
            >
              <Plus className="h-3 w-3 mr-1" /> Přidat
            </Button>
          </div>
          {(() => {
            const { ukoly: selectedUkoly, milniky: selectedMilniky, udalosti: selectedUdalosti } = getEventsForDay(selectedDate)
            const hasAny = selectedUkoly.length > 0 || selectedMilniky.length > 0 || selectedUdalosti.length > 0
            if (!hasAny) {
              return <p className="text-xs text-muted-foreground italic py-2 text-center">Žádné události</p>
            }
            return (
              <div className="flex flex-col gap-2">
                {/* Meetings & Events */}
                {selectedUdalosti.map(event => {
                  const isSchuzka = event.typ === 'schuzka'
                  return (
                    <MeetingWorkspace
                      key={event.id}
                      meeting={event}
                      userProfiles={userProfiles}
                      onSuccess={loadData}
                      trigger={
                        <button
                          type="button"
                          className={`text-left w-full flex flex-col gap-1 p-2.5 rounded-lg border cursor-pointer transition-colors shadow-sm ${
                            isSchuzka
                              ? 'border-amber-500/35 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400'
                              : 'border-orange-500/35 bg-orange-500/10 hover:bg-orange-500/20 text-orange-700 dark:text-orange-400'
                          }`}
                        >
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-xs">
                              {isSchuzka ? '🤝' : '👥'} {event.nazev}
                            </span>
                            <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-semibold border ${
                              isSchuzka
                                ? 'border-amber-500/40 bg-amber-500/20 text-amber-700 dark:text-amber-400'
                                : 'border-orange-500/40 bg-orange-500/20 text-orange-700 dark:text-orange-400'
                            }`}>
                              {isSchuzka ? 'Schůzka (ext.)' : 'Meeting (int.)'}
                            </span>
                          </div>
                          <span className="text-[10px] opacity-80">
                            Organizátor: {userProfiles.find(p => p.id === event.organizator_id)?.jmeno || "Nepřiřazeno"}
                            {event.lokalita && ` • 📍 ${event.lokalita}`}
                          </span>
                        </button>
                      }
                    />
                  )
                })}
                {selectedMilniky.map(m => (
                  <div key={m.id} className="text-xs bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-200 rounded-lg p-2 font-bold border border-red-200 dark:border-red-900/50">
                    🎯 Deadline milníku: <span className="font-semibold">{m.nazev}</span>
                  </div>
                ))}
                {selectedUkoly.map(u => {
                  const cfg = ODDELENI_CONFIG[u.oddeleni]
                  const stavCfg = STAV_UKOLU_CONFIG[u.stav]
                  const { style, className } = getEventStyle(u)
                  return (
                    <div 
                      key={u.id}
                      onClick={() => setActiveEditUkol(u)}
                      style={style}
                      className={`flex flex-col gap-1 p-2 rounded-lg border cursor-pointer hover:bg-muted/10 transition-colors ${className}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className={`text-xs font-bold ${u.stav === 'done' ? 'line-through' : ''}`}>
                          {u.nazev}
                        </span>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-semibold border border-black/10 dark:border-white/10 ${stavCfg.bg} ${stavCfg.color}`}>{stavCfg.label}</span>
                      </div>
                      <span className="text-[10px] opacity-80">
                        {cfg.label} • {TYP_UDALOSTI_CONFIG[u.typ_udalosti].label}
                        {u.lokalita && ` • 📍 ${u.lokalita}`}
                      </span>
                    </div>
                  )
                })}
              </div>
            )
          })()}
        </div>
      </div>
    )
  }

  // Week view render
  const renderWeekView = () => {
    const { start } = getRangeDates()
    const days = []
    
    for (let i = 0; i < 7; i++) {
      const d = new Date(start)
      d.setDate(start.getDate() + i)
      days.push(d)
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-7 border rounded-xl divide-y md:divide-y-0 md:divide-x overflow-hidden select-none bg-card">
        {days.map((date, idx) => {
          const isToday = isSameDay(date, new Date())
          const { ukoly: dayUkoly, milniky: dayMilniky, udalosti: dayUdalosti } = getEventsForDay(date)
          
          return (
            <div key={idx} className="flex flex-col min-h-[150px] p-3">
              {/* Day title */}
              <div className="flex md:flex-col justify-between md:justify-start items-center md:items-start border-b pb-2 mb-2 gap-1.5">
                <span className="text-[10px] font-bold text-muted-foreground uppercase">{CZECH_DAYS[idx]}</span>
                <span className={`text-xs font-bold tabular-nums px-2 py-0.5 rounded-full ${
                  isToday ? 'bg-primary text-primary-foreground' : 'text-foreground'
                }`}>
                  {date.getDate()}.{date.getMonth() + 1}.
                </span>
              </div>

              {/* Tasks and deadlines */}
              <div className="flex flex-col gap-2 flex-1">
                {/* Milestones */}
                {dayMilniky.map(m => (
                  <div key={m.id} className="text-[10px] bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-200 rounded-lg p-2 font-bold leading-normal">
                    🎯 Deadline: {m.nazev}
                  </div>
                ))}
                
                {/* Meetings & Events */}
                {dayUdalosti.map(event => {
                  const isSchuzka = event.typ === 'schuzka'
                  return (
                    <MeetingWorkspace
                      key={event.id}
                      meeting={event}
                      userProfiles={userProfiles}
                      onSuccess={loadData}
                      trigger={
                        <button
                          type="button"
                          className={`text-left w-full p-2.5 rounded-lg border text-[11px] leading-normal flex flex-col gap-1 cursor-pointer transition-all mb-2 shadow-sm ${
                            isSchuzka
                              ? 'border-amber-500/35 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 dark:shadow-[0_0_8px_rgba(245,158,11,0.2)]'
                              : 'border-orange-500/35 bg-orange-500/10 hover:bg-orange-500/20 text-orange-700 dark:text-orange-400 dark:shadow-[0_0_8px_rgba(249,115,22,0.2)]'
                          }`}
                        >
                          <span className="font-bold">
                            {isSchuzka ? '🤝' : '👥'} {event.nazev}
                          </span>
                          {event.lokalita && <span className="text-[9px] opacity-80 flex items-center gap-0.5">📍 {event.lokalita}</span>}
                        </button>
                      }
                    />
                  )
                })}

                {/* Tasks */}
                {dayUkoly.length === 0 && dayMilniky.length === 0 && dayUdalosti.length === 0 ? (
                  <span className="text-[10px] text-muted-foreground/50 italic py-2 text-center md:text-left">Bez událostí</span>
                ) : (
                  dayUkoly.map(u => {
                    const cfg = ODDELENI_CONFIG[u.oddeleni]
                    const stavCfg = STAV_UKOLU_CONFIG[u.stav]
                    const { style, className } = getEventStyle(u)
                    return (
                      <div
                        key={u.id}
                        onClick={() => setActiveEditUkol(u)}
                        style={style}
                        className={`p-2 rounded-lg border text-[11px] leading-normal flex flex-col gap-1 cursor-pointer transition-all hover:brightness-95 dark:hover:brightness-110 ${className}`}
                      >
                        <span className={`font-bold ${u.stav === 'done' ? 'line-through' : ''}`}>
                          {u.nazev}
                        </span>
                        {u.lokalita && <span className="text-[9px] opacity-80 flex items-center gap-0.5">📍 {u.lokalita}</span>}
                        <div className="flex justify-between items-center text-[9px] opacity-90 mt-1">
                          <span>{TYP_UDALOSTI_CONFIG[u.typ_udalosti].label}</span>
                          <span className={`font-medium ${stavCfg.color}`}>{stavCfg.label}</span>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  // Day view render
  const renderDayView = () => {
    const { ukoly: dayUkoly, milniky: dayMilniky, udalosti: dayUdalosti } = getEventsForDay(currentDate)

    return (
      <div className="border rounded-xl p-4 bg-card flex flex-col gap-4 select-none">
        <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider border-b pb-2">
          Agenda pro {currentDate.toLocaleDateString('cs-CZ', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </h3>

        {dayMilniky.length > 0 && (
          <div className="flex flex-col gap-2">
            <h4 className="text-xs font-bold text-red-600 dark:text-red-400">Milníky a termíny</h4>
            {dayMilniky.map(m => (
              <div key={m.id} className="text-xs bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-200 rounded-lg p-3 font-bold flex items-center gap-2">
                <span>🎯</span>
                <span>Deadline milníku: <strong>{m.nazev}</strong></span>
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-col gap-2">
          {dayUdalosti.length > 0 && (
            <div className="flex flex-col gap-2 mb-4">
              <h4 className="text-xs font-bold text-zinc-500 dark:text-zinc-400">Schůzky a meetingy</h4>
              {dayUdalosti.map(event => {
                const isSchuzka = event.typ === 'schuzka'
                return (
                  <MeetingWorkspace
                    key={event.id}
                    meeting={event}
                    userProfiles={userProfiles}
                    onSuccess={loadData}
                    trigger={
                      <button
                        type="button"
                        className={`text-left w-full p-3 rounded-lg border cursor-pointer transition-colors flex justify-between items-center gap-4 shadow-sm ${
                          isSchuzka
                            ? 'border-amber-500/35 bg-amber-500/10 hover:bg-amber-500/20'
                            : 'border-orange-500/35 bg-orange-500/10 hover:bg-orange-500/20'
                        }`}
                      >
                        <div className="flex flex-col gap-1 min-w-0">
                          <span className={`text-xs font-bold leading-normal truncate ${isSchuzka ? 'text-amber-700 dark:text-amber-400' : 'text-orange-700 dark:text-orange-400'}`}>
                            {isSchuzka ? '🤝' : '👥'} {event.nazev}
                          </span>
                          <span className={`text-[10px] opacity-80 ${isSchuzka ? 'text-amber-700/80 dark:text-amber-400/80' : 'text-orange-700/80 dark:text-orange-400/80'}`}>
                            Organizátor: {userProfiles.find(p => p.id === event.organizator_id)?.jmeno || "Nepřiřazeno"}
                            {event.lokalita && ` • 📍 ${event.lokalita}`}
                          </span>
                        </div>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${
                          isSchuzka
                            ? 'border-amber-500/40 bg-amber-500/20 text-amber-700 dark:text-amber-400'
                            : 'border-orange-500/40 bg-orange-500/20 text-orange-700 dark:text-orange-400'
                        }`}>
                          {isSchuzka ? 'Schůzka (ext.)' : 'Meeting (int.)'}
                        </span>
                      </button>
                    }
                  />
                )
              })}
            </div>
          )}

          <h4 className="text-xs font-bold text-muted-foreground">Úkoly a události</h4>
          {dayUkoly.length === 0 && dayUdalosti.length === 0 ? (
            <p className="text-xs text-muted-foreground italic py-4 text-center border border-dashed rounded-lg bg-muted/10">Žádné události pro tento den</p>
          ) : (
            <div className="flex flex-col gap-3">
              {dayUkoly.map(u => {
                const cfg = ODDELENI_CONFIG[u.oddeleni]
                const stavCfg = STAV_UKOLU_CONFIG[u.stav]
                const prioritaCfg = PRIORITA_CONFIG[u.priorita as keyof typeof PRIORITA_CONFIG]
                const { style, className } = getEventStyle(u)
                return (
                  <div
                    key={u.id}
                    onClick={() => setActiveEditUkol(u)}
                    style={style}
                    className={`p-3 rounded-lg border cursor-pointer hover:bg-muted/10 transition-colors flex justify-between items-center gap-4 ${className}`}
                  >
                    <div className="flex flex-col gap-1 min-w-0">
                      <span className={`text-xs font-bold leading-normal truncate ${u.stav === 'done' ? 'line-through' : ''}`}>
                        {u.nazev}
                      </span>
                      <span className="text-[10px] opacity-80">
                        {cfg.label} • {TYP_UDALOSTI_CONFIG[u.typ_udalosti].label}
                        {u.lokalita && ` • 📍 ${u.lokalita}`}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2 shrink-0">
                      {u.priorita !== 'medium' && (
                        <Badge variant="outline" className="h-4.5 text-[9px]">{prioritaCfg.icon} {prioritaCfg.label}</Badge>
                      )}
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${stavCfg.bg} ${stavCfg.color}`}>{stavCfg.label}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Calendar Header Nav & Views Selector */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border bg-card/65 p-3 rounded-xl shadow-sm">
        {/* Nav tools */}
        <div className="flex items-center justify-between sm:justify-start gap-2">
          <div className="flex items-center gap-1 bg-muted/60 p-0.5 rounded-lg border">
            <Button variant="ghost" size="icon-sm" onClick={handlePrev} className="h-7 w-7">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={handleToday} className="h-7 text-xs px-2.5 font-medium">
              Dnes
            </Button>
            <Button variant="ghost" size="icon-sm" onClick={handleNext} className="h-7 w-7">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          
          <h2 className="text-sm font-bold text-foreground truncate pl-1 font-sans">
            {CZECH_MONTHS[month]} {year}
          </h2>
        </div>

        {/* View togglers & Filters toggler */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {/* Quick Create Buttons */}
          <div className="flex items-center gap-1 bg-muted/60 p-0.5 rounded-lg border shrink-0">
            <UkolFormDialog
              milnikId={ukoly.length > 0 ? ukoly[0].milnik_id : (milnikyDeadlines.length > 0 ? milnikyDeadlines[0].id : '')}
              userProfiles={userProfiles}
              onSuccess={loadData}
              trigger={
                <Button size="sm" variant="ghost" className="h-7 text-xs px-2 sm:px-2.5 font-semibold text-blue-500 hover:text-blue-600 hover:bg-blue-500/10 gap-1 shrink-0">
                  <span>✓ Úkol</span>
                </Button>
              }
            />
            <UdalostFormDialog
              milnikId={ukoly.length > 0 ? ukoly[0].milnik_id : (milnikyDeadlines.length > 0 ? milnikyDeadlines[0].id : '')}
              userProfiles={userProfiles}
              onSuccess={loadData}
              defaultTyp="meeting"
              trigger={
                <Button size="sm" variant="ghost" className="h-7 text-xs px-2 sm:px-2.5 font-semibold text-orange-500 hover:text-orange-600 hover:bg-orange-500/10 gap-1 shrink-0">
                  <span>👥 Meeting</span>
                </Button>
              }
            />
            <UdalostFormDialog
              milnikId={ukoly.length > 0 ? ukoly[0].milnik_id : (milnikyDeadlines.length > 0 ? milnikyDeadlines[0].id : '')}
              userProfiles={userProfiles}
              onSuccess={loadData}
              defaultTyp="schuzka"
              trigger={
                <Button size="sm" variant="ghost" className="h-7 text-xs px-2 sm:px-2.5 font-semibold text-amber-500 hover:text-amber-600 hover:bg-amber-500/10 gap-1 shrink-0">
                  <span>🤝 Schůzka</span>
                </Button>
              }
            />
          </div>

          <div className="flex items-center gap-1 bg-muted/60 p-0.5 rounded-lg border flex-1 sm:flex-initial justify-center">
            <Button
              variant={view === 'month' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setView('month')}
              className="h-7 text-xs font-semibold px-2.5"
            >
              Měsíc
            </Button>
            <Button
              variant={view === 'week' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setView('week')}
              className="h-7 text-xs font-semibold px-2.5"
            >
              Týden
            </Button>
            <Button
              variant={view === 'day' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setView('day')}
              className="h-7 text-xs font-semibold px-2.5"
            >
              Den
            </Button>
          </div>

          {(() => {
            const activeFiltersCount = 
              (selectedOddeleni !== 'all' ? 1 : 0) +
              (selectedOwner !== 'all' ? 1 : 0) +
              (selectedTyp !== 'all' ? 1 : 0) +
              (selectedPriorita !== 'all' ? 1 : 0) +
              (!projektId && selectedProjekt !== 'all' ? 1 : 0)

            return (
              <Button
                variant={showFilters || activeFiltersCount > 0 ? 'secondary' : 'outline'}
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className="h-7 text-xs"
              >
                <Filter className="h-3.5 w-3.5 mr-1" />
                Filtry {activeFiltersCount > 0 && `(${activeFiltersCount})`}
              </Button>
            )
          })()}
        </div>
      </div>

      {/* Filters Drawer / Panel */}
      {showFilters && (
        <div className="border bg-card p-4 rounded-xl flex flex-col gap-4 animate-fade-in shadow-sm">
          <div className="flex items-center justify-between border-b pb-2">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <Filter className="h-3.5 w-3.5" /> Filtrovat události
            </h3>
            <button 
              onClick={() => {
                setSelectedOddeleni('all')
                setSelectedOwner('all')
                setSelectedTyp('all')
                setSelectedPriorita('all')
                setSelectedProjekt('all')
              }}
              className="text-[10px] font-bold text-destructive hover:underline"
            >
              Vymazat filtry
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {/* Projekt Filter (only show if not locked to project) */}
            {!projektId && (
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Projekt</span>
                <select
                  value={selectedProjekt}
                  onChange={e => setSelectedProjekt(e.target.value)}
                  className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="all">Všechny projekty</option>
                  {projekty.map(p => (
                    <option key={p.id} value={p.id}>{p.nazev}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Oddělení Filter */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Oddělení</span>
              <select
                value={selectedOddeleni}
                onChange={e => setSelectedOddeleni(e.target.value as any)}
                className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="all">Všechna oddělení</option>
                {Object.entries(ODDELENI_CONFIG).map(([key, cfg]) => (
                  <option key={key} value={key}>{cfg.label}</option>
                ))}
              </select>
            </div>

            {/* Owner Filter */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Odpovědná osoba</span>
              <select
                value={selectedOwner}
                onChange={e => setSelectedOwner(e.target.value)}
                className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="all">Všichni</option>
                <option value="-">Nepřiřazeno</option>
                {userProfiles.map(u => (
                  <option key={u.id} value={u.id}>{u.jmeno}</option>
                ))}
              </select>
            </div>

            {/* Type Filter */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Typ události</span>
              <select
                value={selectedTyp}
                onChange={e => setSelectedTyp(e.target.value as any)}
                className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="all">Všechny typy</option>
                <option value="meeting">👥 Interní meeting (oranžová)</option>
                <option value="schuzka">🤝 Externí schůzka (žlutá)</option>
                {Object.entries(TYP_UDALOSTI_CONFIG).map(([key, cfg]) => (
                  <option key={key} value={key}>{cfg.icon} {cfg.label}</option>
                ))}
              </select>
            </div>

            {/* Priority Filter */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Priorita</span>
              <select
                value={selectedPriorita}
                onChange={e => setSelectedPriorita(e.target.value as any)}
                className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="all">Všechny priority</option>
                {Object.entries(PRIORITA_CONFIG).map(([key, cfg]) => (
                  <option key={key} value={key}>{cfg.icon} {cfg.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Main Views Container */}
      {loading ? (
        <div className="border rounded-xl p-16 text-center bg-card flex flex-col items-center justify-center gap-2">
          <span className="text-lg">📅</span>
          <span className="text-xs text-muted-foreground animate-pulse font-medium">Načítám kalendář...</span>
        </div>
      ) : (
        <>
          {view === 'month' && renderMonthView()}
          {view === 'week' && renderWeekView()}
          {view === 'day' && renderDayView()}
        </>
      )}

      {/* Form Dialog for Creating Task */}
      <UkolFormDialog
        milnikId={ukoly.length > 0 ? ukoly[0].milnik_id : (milnikyDeadlines.length > 0 ? milnikyDeadlines[0].id : '')}
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        userProfiles={userProfiles}
        onSuccess={loadData}
        trigger={null}
      />

      {/* Form Dialog for Editing Task */}
      {activeEditUkol && (
        <UkolFormDialog
          milnikId={activeEditUkol.milnik_id}
          ukol={activeEditUkol}
          open={!!activeEditUkol}
          onOpenChange={open => {
            if (!open) setActiveEditUkol(null)
          }}
          userProfiles={userProfiles}
          onSuccess={loadData}
          trigger={null}
        />
      )}
    </div>
  )
}
