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
  OddeleniType, 
  TypUdalostiType,
  ODDELENI_CONFIG, 
  TYP_UDALOSTI_CONFIG, 
  STAV_UKOLU_CONFIG,
  PRIORITA_CONFIG
} from '../types'
import { getUkolyByDateRange, getMilnikyDeadlines } from '../actions/ukoly'
import { getUsers } from '@/modules/users/actions'
import { UkolFormDialog } from './UkolFormDialog'
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
  
  // Data
  const [ukoly, setUkoly] = useState<UkolPlanovani[]>([])
  const [milnikyDeadlines, setMilnikyDeadlines] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [userProfiles, setUserProfiles] = useState<any[]>([])
  
  // Dialogs
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [activeEditUkol, setActiveEditUkol] = useState<UkolPlanovani | null>(null)
  
  // Filters
  const [selectedOddeleni, setSelectedOddeleni] = useState<OddeleniType[]>([])
  const [selectedOwner, setSelectedOwner] = useState<string>('')
  const [selectedTyp, setSelectedTyp] = useState<TypUdalostiType[]>([])
  const [showFilters, setShowFilters] = useState(false)

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

    const [ukolyRes, deadlinesRes] = await Promise.all([
      getUkolyByDateRange(fromStr, toStr),
      getMilnikyDeadlines(fromStr, toStr)
    ])

    if (ukolyRes.success && ukolyRes.data) {
      setUkoly(ukolyRes.data)
    }
    if (deadlinesRes.success && deadlinesRes.data) {
      setMilnikyDeadlines(deadlinesRes.data)
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
    loadUsers()
  }, [])

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
    if (projektId && u.milnik?.projekt_id !== projektId) return false
    // Oddělení filter
    if (selectedOddeleni.length > 0 && !selectedOddeleni.includes(u.oddeleni)) return false
    // Vlastník filter
    if (selectedOwner && selectedOwner !== '-' && u.vlastnik_id !== selectedOwner) return false
    // Typ filter
    if (selectedTyp.length > 0 && !selectedTyp.includes(u.typ_udalosti)) return false
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

    const dayMilniky = milnikyDeadlines.filter(m => 
      m.datum_splatnosti === dateStr && (!projektId || m.projekt_id === projektId)
    )

    return { ukoly: dayUkoly, milniky: dayMilniky }
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
            const { ukoly: dayUkoly, milniky: dayMilniky } = getEventsForDay(date)
            const hasEvents = dayUkoly.length > 0 || dayMilniky.length > 0

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
                      className="event-item text-[9px] bg-red-50 dark:bg-red-950/20 border border-red-200/50 text-red-700 dark:text-red-400 rounded px-1 py-0.5 font-bold truncate flex items-center gap-1"
                      title={`Deadline milníku: ${m.nazev}`}
                    >
                      🎯 {m.nazev}
                    </div>
                  ))}
                  
                  {/* Tasks */}
                  {dayUkoly.map(u => {
                    const cfg = ODDELENI_CONFIG[u.oddeleni]
                    const prioritaCfg = PRIORITA_CONFIG[u.priorita as keyof typeof PRIORITA_CONFIG]
                    return (
                      <div
                        key={u.id}
                        onClick={(e) => {
                          e.stopPropagation()
                          setActiveEditUkol(u)
                        }}
                        className={`event-item text-[9px] border rounded px-1.5 py-0.5 truncate flex items-center justify-between gap-1 cursor-pointer transition-all hover:brightness-95 dark:hover:brightness-110 ${cfg.bg} ${cfg.color} ${u.stav === 'done' ? 'line-through opacity-60' : ''}`}
                        title={`${u.nazev} (${cfg.label})`}
                      >
                        <span className="truncate flex-1 font-medium">{u.nazev}</span>
                        {u.priorita === 'critical' && <span className="text-[9px]">⚡</span>}
                      </div>
                    )
                  })}
                </div>

                {/* Mobile indicators (dots) */}
                <div className="md:hidden flex items-center justify-center gap-1 mt-1 flex-wrap">
                  {dayMilniky.length > 0 && (
                    <span className="h-1.5 w-1.5 rounded-full bg-red-500 shrink-0" />
                  )}
                  {dayUkoly.map(u => (
                    <span 
                      key={u.id} 
                      className={`h-1.5 w-1.5 rounded-full shrink-0 ${ODDELENI_CONFIG[u.oddeleni].bg}`}
                      style={{ border: '1px solid currentColor', color: ODDELENI_CONFIG[u.oddeleni].color }}
                    />
                  ))}
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
            const { ukoly: selectedUkoly, milniky: selectedMilniky } = getEventsForDay(selectedDate)
            const hasAny = selectedUkoly.length > 0 || selectedMilniky.length > 0
            if (!hasAny) {
              return <p className="text-xs text-muted-foreground italic py-2 text-center">Žádné události</p>
            }
            return (
              <div className="flex flex-col gap-2">
                {selectedMilniky.map(m => (
                  <div key={m.id} className="text-xs bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 rounded-lg p-2 font-bold border border-red-200/50">
                    🎯 Deadline milníku: <span className="font-semibold">{m.nazev}</span>
                  </div>
                ))}
                {selectedUkoly.map(u => {
                  const cfg = ODDELENI_CONFIG[u.oddeleni]
                  const stavCfg = STAV_UKOLU_CONFIG[u.stav]
                  return (
                    <div 
                      key={u.id}
                      onClick={() => setActiveEditUkol(u)}
                      className={`flex flex-col gap-1 p-2 rounded-lg border cursor-pointer hover:bg-muted/10 transition-colors ${cfg.bg} ${cfg.color} ${u.stav === 'done' ? 'opacity-60' : ''}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className={`text-xs font-bold ${u.stav === 'done' ? 'line-through' : ''}`}>{u.nazev}</span>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-semibold border border-black/10 dark:border-white/10 ${stavCfg.bg} ${stavCfg.color}`}>{stavCfg.label}</span>
                      </div>
                      <span className="text-[10px] opacity-80">{cfg.label} • {TYP_UDALOSTI_CONFIG[u.typ_udalosti].label}</span>
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
          const { ukoly: dayUkoly, milniky: dayMilniky } = getEventsForDay(date)
          
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
                  <div key={m.id} className="text-[10px] bg-red-50 dark:bg-red-950/20 border border-red-200/50 text-red-700 dark:text-red-400 rounded-lg p-2 font-bold leading-normal">
                    🎯 Deadline: {m.nazev}
                  </div>
                ))}
                
                {/* Tasks */}
                {dayUkoly.length === 0 && dayMilniky.length === 0 ? (
                  <span className="text-[10px] text-muted-foreground/50 italic py-2 text-center md:text-left">Bez událostí</span>
                ) : (
                  dayUkoly.map(u => {
                    const cfg = ODDELENI_CONFIG[u.oddeleni]
                    const stavCfg = STAV_UKOLU_CONFIG[u.stav]
                    return (
                      <div
                        key={u.id}
                        onClick={() => setActiveEditUkol(u)}
                        className={`p-2 rounded-lg border text-[11px] leading-normal flex flex-col gap-1 cursor-pointer transition-all hover:brightness-95 dark:hover:brightness-110 ${cfg.bg} ${cfg.color} ${u.stav === 'done' ? 'opacity-60' : ''}`}
                      >
                        <span className={`font-bold ${u.stav === 'done' ? 'line-through' : ''}`}>{u.nazev}</span>
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
    const { ukoly: dayUkoly, milniky: dayMilniky } = getEventsForDay(currentDate)

    return (
      <div className="border rounded-xl p-4 bg-card flex flex-col gap-4 select-none">
        <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider border-b pb-2">
          Agenda pro {currentDate.toLocaleDateString('cs-CZ', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </h3>

        {dayMilniky.length > 0 && (
          <div className="flex flex-col gap-2">
            <h4 className="text-xs font-bold text-red-600 dark:text-red-400">Milníky a termíny</h4>
            {dayMilniky.map(m => (
              <div key={m.id} className="text-xs bg-red-50 dark:bg-red-950/20 border border-red-200/50 text-red-700 dark:text-red-400 rounded-lg p-3 font-bold flex items-center gap-2">
                <span>🎯</span>
                <span>Deadline milníku: <strong>{m.nazev}</strong></span>
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-col gap-2">
          <h4 className="text-xs font-bold text-muted-foreground">Úkoly a události</h4>
          {dayUkoly.length === 0 ? (
            <p className="text-xs text-muted-foreground italic py-4 text-center border border-dashed rounded-lg bg-muted/10">Žádné úkoly pro tento den</p>
          ) : (
            <div className="flex flex-col gap-3">
              {dayUkoly.map(u => {
                const cfg = ODDELENI_CONFIG[u.oddeleni]
                const stavCfg = STAV_UKOLU_CONFIG[u.stav]
                const prioritaCfg = PRIORITA_CONFIG[u.priorita as keyof typeof PRIORITA_CONFIG]
                return (
                  <div
                    key={u.id}
                    onClick={() => setActiveEditUkol(u)}
                    className={`p-3 rounded-lg border cursor-pointer hover:bg-muted/10 transition-colors flex justify-between items-center gap-4 ${cfg.bg} ${cfg.color} ${u.stav === 'done' ? 'opacity-60' : ''}`}
                  >
                    <div className="flex flex-col gap-1 min-w-0">
                      <span className={`text-xs font-bold leading-normal truncate ${u.stav === 'done' ? 'line-through' : ''}`}>{u.nazev}</span>
                      <span className="text-[10px] opacity-80">{cfg.label} • {TYP_UDALOSTI_CONFIG[u.typ_udalosti].label}</span>
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
        <div className="flex items-center gap-2">
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

          <Button
            variant={showFilters || selectedOddeleni.length > 0 || selectedOwner || selectedTyp.length > 0 ? 'secondary' : 'outline'}
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="h-7 text-xs"
          >
            <Filter className="h-3.5 w-3.5 mr-1" />
            Filtry {(selectedOddeleni.length + (selectedOwner ? 1 : 0) + selectedTyp.length) > 0 && `(${selectedOddeleni.length + (selectedOwner ? 1 : 0) + selectedTyp.length})`}
          </Button>
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
                setSelectedOddeleni([])
                setSelectedOwner('')
                setSelectedTyp([])
              }}
              className="text-[10px] font-bold text-destructive hover:underline"
            >
              Vymazat filtry
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Department Filter */}
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-semibold flex items-center gap-1 text-muted-foreground"><Briefcase className="h-3.5 w-3.5" /> Oddělení</Label>
              <div className="flex flex-wrap gap-1.5 max-h-[120px] overflow-y-auto pr-1">
                {(Object.entries(ODDELENI_CONFIG) as [OddeleniType, typeof ODDELENI_CONFIG[OddeleniType]][]).map(([key, cfg]) => {
                  const active = selectedOddeleni.includes(key)
                  return (
                    <button
                      key={key}
                      onClick={() => {
                        setSelectedOddeleni(prev => 
                          prev.includes(key) ? prev.filter(x => x !== key) : [...prev, key]
                        )
                      }}
                      className={`text-[10px] font-medium px-2 py-0.5 rounded-full border transition-all ${
                        active ? `${cfg.bg} ${cfg.color} border-current ring-1 ring-offset-1 ring-current` : 'bg-transparent text-muted-foreground hover:bg-muted'
                      }`}
                    >
                      {cfg.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Owner Filter */}
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-semibold flex items-center gap-1 text-muted-foreground"><User className="h-3.5 w-3.5" /> Odpovědná osoba</Label>
              <select
                value={selectedOwner}
                onChange={e => setSelectedOwner(e.target.value)}
                className="w-full text-xs px-2.5 py-1.5 rounded-lg border bg-background border-border/80 focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">Všichni</option>
                <option value="-">Nepřiřazeno</option>
                {userProfiles.map(u => (
                  <option key={u.id} value={u.id}>{u.jmeno}</option>
                ))}
              </select>
            </div>

            {/* Type Filter */}
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-semibold flex items-center gap-1 text-muted-foreground"><CalendarIcon className="h-3.5 w-3.5" /> Typ události</Label>
              <div className="flex flex-wrap gap-1.5">
                {(Object.entries(TYP_UDALOSTI_CONFIG) as [TypUdalostiType, typeof TYP_UDALOSTI_CONFIG[TypUdalostiType]][]).map(([key, cfg]) => {
                  const active = selectedTyp.includes(key)
                  return (
                    <button
                      key={key}
                      onClick={() => {
                        setSelectedTyp(prev => 
                          prev.includes(key) ? prev.filter(x => x !== key) : [...prev, key]
                        )
                      }}
                      className={`text-[10px] font-medium px-2 py-0.5 rounded-full border transition-all ${
                        active ? 'bg-primary text-primary-foreground border-transparent' : 'bg-transparent text-muted-foreground hover:bg-muted'
                      }`}
                    >
                      {cfg.icon} {cfg.label}
                    </button>
                  )
                })}
              </div>
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
