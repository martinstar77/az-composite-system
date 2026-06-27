'use client'

import * as React from 'react'
import { useState, useTransition, useMemo } from 'react'
import { 
  Filter, 
  Search, 
  LayoutGrid, 
  List, 
  Plus, 
  X, 
  AlertCircle 
} from 'lucide-react'
import { 
  UkolPlanovani, 
  OddeleniType, 
  StavUkolu, 
  ODDELENI_CONFIG, 
  STAV_UKOLU_CONFIG,
  STAV_MILNIKU_CONFIG
} from '../types'
import { UkolRow } from './UkolRow'
import { UkolDetailPanel } from './UkolDetailPanel'
import { UkolFormDialog } from './UkolFormDialog'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Badge } from '@/shared/components/ui/badge'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/shared/components/ui/sheet'

interface GlobalUkolyTableProps {
  initialUkoly: UkolPlanovani[]
  users: { id: string; jmeno: string; avatar_url?: string | null }[]
  projekty: { id: string; nazev: string; barva: string }[]
  currentUserId?: string
}

export function GlobalUkolyTable({ 
  initialUkoly, 
  users, 
  projekty,
  currentUserId 
}: GlobalUkolyTableProps) {
  const [ukoly, setUkoly] = useState<UkolPlanovani[]>(initialUkoly)
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list')
  const [isPending, startTransition] = useTransition()
  
  // Master-Detail State
  const [selectedUkolId, setSelectedUkolId] = useState<string | null>(null)
  const [isDesktop, setIsDesktop] = useState(false)
  
  // Search and Filters State
  const [search, setSearch] = useState('')
  const [selectedOddeleni, setSelectedOddeleni] = useState<OddeleniType | 'all'>('all')
  const [selectedVlastnik, setSelectedVlastnik] = useState<string | 'all'>('all')
  const [selectedProjekt, setSelectedProjekt] = useState<string | 'all'>('all')
  const [selectedStav, setSelectedStav] = useState<StavUkolu | 'all' | 'active'>('active')

  // Reload handler
  const refreshTasks = React.useCallback(async () => {
    // V Next.js Server Actions s revalidatePath se automaticky zaktualizují props (initialUkoly) 
    // při změně na serveru. Nicméně pro okamžitou změnu stavu v klientské instanci 
    // synchronizujeme state s props:
    setUkoly(initialUkoly)
  }, [initialUkoly])

  React.useEffect(() => {
    setUkoly(initialUkoly)
  }, [initialUkoly])

  // Track viewport size for Master-Detail responsive behavior
  React.useEffect(() => {
    const media = window.matchMedia('(min-width: 1024px)')
    setIsDesktop(media.matches)
    const listener = (e: MediaQueryListEvent) => setIsDesktop(e.matches)
    media.addEventListener('change', listener)
    return () => media.removeEventListener('change', listener)
  }, [])

  // Filter Logic
  const filteredUkoly = useMemo(() => {
    return ukoly.filter(u => {
      // 1. Vyhledávání textu
      if (search.trim()) {
        const query = search.toLowerCase()
        const matchName = u.nazev.toLowerCase().includes(query)
        const matchDesc = u.popis?.toLowerCase().includes(query) ?? false
        if (!matchName && !matchDesc) return false
      }

      // 2. Oddělení
      if (selectedOddeleni !== 'all' && u.oddeleni !== selectedOddeleni) return false

      // 3. Vlastník
      if (selectedVlastnik !== 'all') {
        if (selectedVlastnik === 'mine') {
          if (u.vlastnik_id !== currentUserId) return false
        } else if (u.vlastnik_id !== selectedVlastnik) return false
      }

      // 4. Projekt
      if (selectedProjekt !== 'all' && u.milnik?.projekt_id !== selectedProjekt) return false

      // 5. Stav
      if (selectedStav !== 'all') {
        if (selectedStav === 'active') {
          if (u.stav === 'done') return false
        } else if (u.stav !== selectedStav) {
          return false
        }
      }

      return true
    })
  }, [ukoly, search, selectedOddeleni, selectedVlastnik, selectedProjekt, selectedStav, currentUserId])

  const activeUkoly = useMemo(() => filteredUkoly.filter(u => u.stav !== 'done'), [filteredUkoly])
  const doneUkoly = useMemo(() => filteredUkoly.filter(u => u.stav === 'done'), [filteredUkoly])

  const activeGroups = useMemo(() => {
    const groups: { [key: string]: { milnik: any; ukoly: UkolPlanovani[] } } = {}
    activeUkoly.forEach(u => {
      const milnikId = u.milnik_id || 'no-milestone'
      if (!groups[milnikId]) {
        groups[milnikId] = {
          milnik: u.milnik || null,
          ukoly: []
        }
      }
      groups[milnikId].ukoly.push(u)
    })
    return Object.values(groups)
  }, [activeUkoly])

  const doneGroups = useMemo(() => {
    const groups: { [key: string]: { milnik: any; ukoly: UkolPlanovani[] } } = {}
    doneUkoly.forEach(u => {
      const milnikId = u.milnik_id || 'no-milestone'
      if (!groups[milnikId]) {
        groups[milnikId] = {
          milnik: u.milnik || null,
          ukoly: []
        }
      }
      groups[milnikId].ukoly.push(u)
    })
    return Object.values(groups)
  }, [doneUkoly])

  const selectedUkol = useMemo(() => {
    return ukoly.find(u => u.id === selectedUkolId) || null
  }, [ukoly, selectedUkolId])

  // Auto-select first active task on desktop if none or invalid is selected
  React.useEffect(() => {
    if (isDesktop) {
      if (filteredUkoly.length === 0) {
        setSelectedUkolId(null)
      } else if (!selectedUkolId || !filteredUkoly.some(u => u.id === selectedUkolId)) {
        setSelectedUkolId(filteredUkoly[0].id)
      }
    }
  }, [isDesktop, selectedUkolId, filteredUkoly])

  // Reset Filters
  function handleResetFilters() {
    setSearch('')
    setSelectedOddeleni('all')
    setSelectedVlastnik('all')
    setSelectedProjekt('all')
    setSelectedStav('active')
  }

  // Kanban Columns
  const columns: { id: StavUkolu; title: string; color: string; bg: string }[] = [
    { id: 'todo', title: 'K vyřízení', color: 'text-zinc-600 dark:text-zinc-400', bg: 'bg-zinc-100/50 dark:bg-zinc-900/50' },
    { id: 'in_progress', title: 'Probíhá', color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50/20 dark:bg-blue-950/10' },
    { id: 'blocked', title: 'Blokováno', color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50/20 dark:bg-red-950/10' },
    { id: 'done', title: 'Hotovo', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50/20 dark:bg-emerald-950/10' }
  ]

  return (
    <div className="flex flex-col gap-6">
      {/* Ovládací panel filtrů */}
      <div className="flex flex-col gap-4 p-4 rounded-xl border bg-card/60 backdrop-blur-md shadow-sm">
        {/* Hledání a Toggle zobrazení */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Vyhledat v úkolech..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 h-9"
            />
            {search && (
              <button 
                onClick={() => setSearch('')}
                className="absolute right-3 top-2.5 hover:text-foreground text-muted-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
            {/* View Mode Toggle */}
            <div className="flex items-center gap-1 bg-muted p-0.5 rounded-lg border w-full sm:w-auto">
              <Button
                variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
                className="h-8 flex-1 sm:flex-initial text-xs"
              >
                <List className="h-3.5 w-3.5 mr-1.5" />
                Seznam
              </Button>
              <Button
                variant={viewMode === 'kanban' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('kanban')}
                className="h-8 flex-1 sm:flex-initial text-xs"
              >
                <LayoutGrid className="h-3.5 w-3.5 mr-1.5" />
                Kanban
              </Button>
            </div>

            {/* Reset button if any filter is active */}
            {(search || selectedOddeleni !== 'all' || selectedVlastnik !== 'all' || selectedProjekt !== 'all' || selectedStav !== 'active') && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleResetFilters}
                className="h-8 text-xs text-muted-foreground hover:text-foreground shrink-0"
              >
                Zrušit filtry
              </Button>
            )}
          </div>
        </div>

        {/* Selektory pro detailní filtrování */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {/* Oddělení */}
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

          {/* Vlastník */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Odpovědná osoba</span>
            <select
              value={selectedVlastnik}
              onChange={e => setSelectedVlastnik(e.target.value)}
              className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="all">Všichni členové</option>
              {currentUserId && <option value="mine">Přiřazeno mně</option>}
              {users.map(u => (
                <option key={u.id} value={u.id}>{u.jmeno}</option>
              ))}
            </select>
          </div>

          {/* Projekt */}
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

          {/* Stav */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Stav</span>
            <select
              value={selectedStav}
              onChange={e => setSelectedStav(e.target.value as any)}
              className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="active">Aktivní (nedokončené)</option>
              <option value="all">Všechny stavy</option>
              {Object.entries(STAV_UKOLU_CONFIG).map(([key, cfg]) => (
                <option key={key} value={key}>{cfg.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Prázdný stav při filtraci */}
      {filteredUkoly.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-20 text-center rounded-2xl border border-dashed bg-muted/10">
          <AlertCircle className="h-8 w-8 text-muted-foreground" />
          <div className="flex flex-col gap-1.5 max-w-sm">
            <h3 className="text-base font-semibold">Nebyly nalezeny žádné úkoly</h3>
            <p className="text-sm text-muted-foreground">
              Zkuste upravit nebo vynulovat vyhledávací filtry pro zobrazení dalších úkolů.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={handleResetFilters}>
            Zobrazit všechny úkoly
          </Button>
        </div>
      )}

      {/* A. SEZNAMOVÝ POHLED (Dense List of UkolRows or Split Master-Detail) */}
      {viewMode === 'list' && filteredUkoly.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Master List (Left Pane) */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            {activeGroups.length > 0 && (
              <div className="flex flex-col gap-4">
                {doneUkoly.length > 0 && (
                  <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-1">
                    Aktivní úkoly ({activeUkoly.length})
                  </h3>
                )}
                
                {activeGroups.map(group => (
                  <div key={group.milnik?.id || 'no-milestone'} className="flex flex-col gap-1.5">
                    {/* Milestone Header */}
                    <div className="flex items-center gap-1.5 px-1.5 text-[9px] text-muted-foreground font-bold uppercase tracking-wider select-none">
                      <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ backgroundColor: group.milnik?.barva || '#8A0485' }} />
                      <span>{group.milnik?.nazev ?? 'Bez milníku'}</span>
                    </div>
                    {/* Compact List Container */}
                    <div className="flex flex-col border rounded-xl bg-card divide-y divide-border/40 overflow-hidden shadow-sm">
                      {group.ukoly.map(ukol => (
                        <UkolRow
                          key={ukol.id}
                          ukol={ukol}
                          userProfiles={users}
                          onSuccess={refreshTasks}
                          isSelectable={true}
                          isSelected={selectedUkolId === ukol.id}
                          onSelect={() => setSelectedUkolId(ukol.id)}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {doneGroups.length > 0 && (
              <div className="flex flex-col gap-4">
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-1">
                  Dokončené úkoly ({doneUkoly.length})
                </h3>
                
                {doneGroups.map(group => (
                  <div key={group.milnik?.id || 'no-milestone'} className="flex flex-col gap-1.5">
                    {/* Milestone Header */}
                    <div className="flex items-center gap-1.5 px-1.5 text-[9px] text-muted-foreground font-bold uppercase tracking-wider select-none">
                      <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ backgroundColor: group.milnik?.barva || '#8A0485' }} />
                      <span>{group.milnik?.nazev ?? 'Bez milníku'}</span>
                    </div>
                    {/* Compact List Container */}
                    <div className="flex flex-col border rounded-xl bg-card/45 divide-y divide-border/40 overflow-hidden shadow-sm opacity-80 transition-opacity hover:opacity-100">
                      {group.ukoly.map(ukol => (
                        <UkolRow
                          key={ukol.id}
                          ukol={ukol}
                          userProfiles={users}
                          onSuccess={refreshTasks}
                          isSelectable={true}
                          isSelected={selectedUkolId === ukol.id}
                          onSelect={() => setSelectedUkolId(ukol.id)}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Details Pane (Right Pane - Desktop only) */}
          <div className="hidden lg:block lg:col-span-7 sticky top-6">
            {selectedUkol ? (
              <UkolDetailPanel
                ukol={selectedUkol}
                userProfiles={users}
                onSuccess={refreshTasks}
                onClose={() => setSelectedUkolId(null)}
              />
            ) : (
              <div className="flex flex-col items-center justify-center py-32 text-center rounded-2xl border border-dashed bg-card/40 min-h-[500px]">
                <span className="text-3xl mb-3">📋</span>
                <h3 className="text-base font-semibold">Žádný úkol není vybrán</h3>
                <p className="text-sm text-muted-foreground max-w-xs mt-1">
                  Vyberte úkol ze seznamu vlevo pro zobrazení podrobností, poznámek a checklistu.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* B. KANBAN BOARD POHLED */}
      {viewMode === 'kanban' && filteredUkoly.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
          {columns.map(col => {
            const colUkoly = filteredUkoly.filter(u => u.stav === col.id)
            return (
              <div 
                key={col.id} 
                className={`flex flex-col gap-3 rounded-xl border p-3.5 shadow-sm min-h-[400px] ${col.bg}`}
              >
                {/* Header sloupce */}
                <div className="flex items-center justify-between pb-1.5 border-b border-border/40 select-none">
                  <h3 className={`text-xs font-bold uppercase tracking-wider ${col.color}`}>
                    {col.title}
                  </h3>
                  <Badge variant="secondary" className="h-5 px-1.5 font-mono text-[10px] tabular-nums">
                    {colUkoly.length}
                  </Badge>
                </div>

                {/* Úkoly ve sloupci */}
                <div className="flex flex-col gap-2 overflow-y-auto max-h-[600px] pr-1">
                  {colUkoly.length === 0 ? (
                    <div className="text-center py-8 text-[11px] text-muted-foreground border border-dashed border-muted rounded-lg select-none">
                      Žádné úkoly
                    </div>
                  ) : (
                    colUkoly.map(ukol => (
                      <div key={ukol.id} className="relative">
                        {/* Projekt a milník text pro kontext */}
                        <div className="flex items-center gap-1 mb-1 text-[8px] text-muted-foreground/80 font-bold uppercase truncate">
                          <span className="inline-block h-1 w-1 rounded-full" style={{ backgroundColor: ukol.milnik?.barva || '#8A0485' }} />
                          <span className="truncate">{ukol.milnik?.nazev}</span>
                        </div>
                        <UkolRow
                          ukol={ukol}
                          userProfiles={users}
                          onSuccess={refreshTasks}
                        />
                      </div>
                    ))
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Mobile Drawer Sheet Details */}
      <Sheet open={!!selectedUkolId && !isDesktop} onOpenChange={(open) => { if (!open) setSelectedUkolId(null) }}>
        <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col h-full bg-background">
          <SheetHeader className="p-4 border-b">
            <SheetTitle>Detail úkolu</SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto p-4">
            {selectedUkol && (
              <UkolDetailPanel
                ukol={selectedUkol}
                userProfiles={users}
                onSuccess={refreshTasks}
                onClose={() => setSelectedUkolId(null)}
              />
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
