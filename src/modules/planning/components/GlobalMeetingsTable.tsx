'use client'

import * as React from 'react'
import { useState, useTransition, useMemo } from 'react'
import { 
  Search, 
  X, 
  AlertCircle,
  Calendar,
  Users,
  Handshake,
  MapPin,
  Clock,
  Plus,
  ChevronRight,
  Eye,
  Notebook
} from 'lucide-react'
import { 
  UdalostPlanovani,
  StavUdalosti
} from '../types'
import { MeetingWorkspace } from './MeetingWorkspace'
import { UdalostFormDialog } from './UdalostFormDialog'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Badge } from '@/shared/components/ui/badge'
import { getCrmEntities } from '../actions/udalosti'
import Link from 'next/link'

interface GlobalMeetingsTableProps {
  initialMeetings: UdalostPlanovani[]
  users: { id: string; jmeno: string }[]
  projekty: { id: string; nazev: string; barva: string }[]
}

const STAV_UDALOSTI_CONFIG: Record<StavUdalosti, { label: string; color: string; bg: string }> = {
  scheduled: { label: 'Naplánováno', color: 'text-blue-700 dark:text-blue-200', bg: 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800/40' },
  active: { label: 'Probíhá', color: 'text-amber-700 dark:text-amber-200', bg: 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/40' },
  completed: { label: 'Dokončeno', color: 'text-emerald-700 dark:text-emerald-200', bg: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/40' },
  cancelled: { label: 'Zrušeno', color: 'text-zinc-500 dark:text-zinc-400', bg: 'bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700/50' }
}

export function GlobalMeetingsTable({ 
  initialMeetings, 
  users, 
  projekty 
}: GlobalMeetingsTableProps) {
  const [meetings, setMeetings] = useState<UdalostPlanovani[]>(initialMeetings)
  
  // Search and Filters State
  const [search, setSearch] = useState('')
  const [selectedTyp, setSelectedTyp] = useState<'all' | 'meeting' | 'schuzka'>('all')
  const [selectedStav, setSelectedStav] = useState<StavUdalosti | 'all'>('all')
  const [selectedProjekt, setSelectedProjekt] = useState<string | 'all'>('all')
  const [selectedOrganizer, setSelectedOrganizer] = useState<string | 'all'>('all')
  const [selectedCustomer, setSelectedCustomer] = useState<string | 'all'>('all')
  const [selectedSupplier, setSelectedSupplier] = useState<string | 'all'>('all')

  const [crmEntities, setCrmEntities] = useState<{
    zakaznici: { id: string; nazev_spolecnosti: string }[]
    dodavatele: { id: string; nazev_spolecnosti: string }[]
  }>({ zakaznici: [], dodavatele: [] })

  React.useEffect(() => {
    setMeetings(initialMeetings)
  }, [initialMeetings])

  React.useEffect(() => {
    getCrmEntities().then(res => {
      if (res.success && res.data) {
        setCrmEntities(res.data)
      }
    })
  }, [])

  const refreshMeetings = React.useCallback(async () => {
    setMeetings(initialMeetings)
  }, [initialMeetings])

  // Filter Logic
  const filteredMeetings = useMemo(() => {
    return meetings.filter(m => {
      // 1. Text Search (title, description, location)
      if (search.trim()) {
        const query = search.toLowerCase()
        const matchName = m.nazev.toLowerCase().includes(query)
        const matchDesc = m.popis?.toLowerCase().includes(query) ?? false
        const matchLoc = m.lokalita?.toLowerCase().includes(query) ?? false
        if (!matchName && !matchDesc && !matchLoc) return false
      }

      // 2. Type Filter (meeting / schuzka)
      if (selectedTyp !== 'all' && m.typ !== selectedTyp) return false

      // 3. Status Filter
      if (selectedStav !== 'all' && m.stav !== selectedStav) return false

      // 4. Project Filter
      if (selectedProjekt !== 'all' && m.milnik?.projekt_id !== selectedProjekt) return false

      // 5. Organizer Filter
      if (selectedOrganizer !== 'all' && m.organizator_id !== selectedOrganizer) return false

      // 6. Customer Filter
      if (selectedCustomer !== 'all' && m.zakaznik_id !== selectedCustomer) return false

      // 7. Supplier Filter
      if (selectedSupplier !== 'all' && m.dodavatel_id !== selectedSupplier) return false

      return true
    })
  }, [meetings, search, selectedTyp, selectedStav, selectedProjekt, selectedOrganizer, selectedCustomer, selectedSupplier])

  // Reset Filters
  function handleResetFilters() {
    setSearch('')
    setSelectedTyp('all')
    setSelectedStav('all')
    setSelectedProjekt('all')
    setSelectedOrganizer('all')
    setSelectedCustomer('all')
    setSelectedSupplier('all')
  }

  // Format Date and Time
  function formatDateTime(isoString: string, duration?: number | null) {
    const d = new Date(isoString)
    const dateStr = d.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'short' })
    const timeStr = d.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })
    return { dateStr, timeStr }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Filters Panel */}
      <div className="flex flex-col gap-4 p-4 rounded-xl border bg-card/60 backdrop-blur-md shadow-sm">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Vyhledat podle názvu, popisu nebo místa..."
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

          {(search || selectedTyp !== 'all' || selectedStav !== 'all' || selectedProjekt !== 'all' || selectedOrganizer !== 'all' || selectedCustomer !== 'all' || selectedSupplier !== 'all') && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleResetFilters}
              className="h-8 text-xs text-muted-foreground hover:text-foreground shrink-0 w-full sm:w-auto"
            >
              Zrušit filtry
            </Button>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Typ události */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Typ události</span>
            <select
              value={selectedTyp}
              onChange={e => setSelectedTyp(e.target.value as any)}
              className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="all">Všechny typy</option>
              <option value="meeting">👥 Interní meetingy</option>
              <option value="schuzka">🤝 Externí schůzky</option>
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
              <option value="all">Všechny stavy</option>
              {Object.entries(STAV_UDALOSTI_CONFIG).map(([key, cfg]) => (
                <option key={key} value={key}>{cfg.label}</option>
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

          {/* Organizátor */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Organizátor</span>
            <select
              value={selectedOrganizer}
              onChange={e => setSelectedOrganizer(e.target.value)}
              className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="all">Všichni organizátoři</option>
              {users.map(u => (
                <option key={u.id} value={u.id}>{u.jmeno}</option>
              ))}
            </select>
          </div>

          {/* Zákazník */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Zákazník</span>
            <select
              value={selectedCustomer}
              onChange={e => setSelectedCustomer(e.target.value)}
              className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="all">Všichni zákazníci</option>
              {crmEntities.zakaznici.map(z => (
                <option key={z.id} value={z.id}>{z.nazev_spolecnosti}</option>
              ))}
            </select>
          </div>

          {/* Dodavatel */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Dodavatel</span>
            <select
              value={selectedSupplier}
              onChange={e => setSelectedSupplier(e.target.value)}
              className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="all">Všichni dodavatelé</option>
              {crmEntities.dodavatele.map(d => (
                <option key={d.id} value={d.id}>{d.nazev_spolecnosti}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Empty State */}
      {filteredMeetings.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-20 text-center rounded-2xl border border-dashed bg-muted/10">
          <AlertCircle className="h-8 w-8 text-muted-foreground" />
          <div className="flex flex-col gap-1.5 max-w-sm">
            <h3 className="text-base font-semibold">Nebyly nalezeny žádné události</h3>
            <p className="text-sm text-muted-foreground">
              Zkuste upravit filtry nebo založit nový meeting či schůzku.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={handleResetFilters}>
            Zobrazit vše
          </Button>
        </div>
      )}

      {/* Datagrid Table */}
      {filteredMeetings.length > 0 && (
        <div className="w-full overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/40 font-semibold text-muted-foreground select-none">
                <th className="p-3 w-[120px]">Typ</th>
                <th className="p-3">Název & Projekt</th>
                <th className="p-3 w-[150px]">Datum a čas</th>
                <th className="p-3 w-[140px]">Lokalita</th>
                <th className="p-3 w-[110px]">Stav</th>
                <th className="p-3 w-[130px]">Organizátor</th>
                <th className="p-3 w-[180px]">Autor / Změna</th>
                <th className="p-3 w-[80px] text-right">Akce</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filteredMeetings.map(meeting => {
                const isSchuzka = meeting.typ === 'schuzka'
                const { dateStr, timeStr } = formatDateTime(meeting.datum_zahajeni)
                const stavCfg = STAV_UDALOSTI_CONFIG[meeting.stav] || STAV_UDALOSTI_CONFIG.scheduled
                
                const updaterName = meeting.upravil?.jmeno || meeting.vytvoril?.jmeno || 'Neznámý'
                const updateDate = new Date(meeting.aktualizovano_at).toLocaleDateString('cs-CZ', {
                  day: 'numeric',
                  month: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })

                return (
                  <tr 
                    key={meeting.id} 
                    className="hover:bg-muted/30 transition-colors group"
                  >
                    {/* Typ */}
                    <td className="p-3 font-medium">
                      {isSchuzka ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border bg-yellow-500/10 border-yellow-500/25 text-yellow-600 dark:text-yellow-400">
                          <Handshake className="h-3 w-3" />
                          Schůzka
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border bg-orange-500/10 border-orange-500/25 text-orange-600 dark:text-orange-400">
                          <Users className="h-3 w-3" />
                          Meeting
                        </span>
                      )}
                    </td>

                    {/* Název & Projekt */}
                    <td className="p-3">
                      <div className="flex flex-col gap-1">
                        <div className="flex flex-col gap-0.5">
                          <MeetingWorkspace
                            meeting={meeting}
                            userProfiles={users}
                            onSuccess={refreshMeetings}
                            trigger={
                              <button 
                                type="button" 
                                className="text-left font-bold text-foreground hover:underline hover:text-primary transition-colors cursor-pointer text-xs"
                              >
                                {meeting.nazev}
                              </button>
                            }
                          />
                          {meeting.zakaznik && (
                            <div className="flex items-center gap-1 text-[10px] text-yellow-600 dark:text-yellow-400 font-bold" title="Propojený zákazník">
                              <span>🤝</span>
                              <span>{meeting.zakaznik.nazev_spolecnosti}</span>
                            </div>
                          )}
                          {meeting.dodavatel && (
                            <div className="flex items-center gap-1 text-[10px] text-orange-600 dark:text-orange-400 font-bold" title="Propojený dodavatel">
                              <span>👥</span>
                              <span>{meeting.dodavatel.nazev_spolecnosti}</span>
                            </div>
                          )}
                        </div>
                        {meeting.milnik ? (
                          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                            <span 
                              className="h-1.5 w-1.5 rounded-full inline-block" 
                              style={{ backgroundColor: meeting.milnik.barva || '#e4e4e7' }} 
                            />
                            <span>{meeting.milnik.nazev}</span>
                            {meeting.milnik.projekt && (
                              <>
                                <span className="opacity-40">·</span>
                                <span className="font-semibold text-zinc-500 dark:text-zinc-400">{meeting.milnik.projekt.nazev}</span>
                              </>
                            )}
                          </div>
                        ) : (
                          <span className="text-[10px] text-muted-foreground italic">Bez milníku</span>
                        )}
                      </div>
                    </td>

                    {/* Datum a čas */}
                    <td className="p-3 text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                        <span>{dateStr} v {timeStr}</span>
                      </div>
                    </td>

                    {/* Lokalita */}
                    <td className="p-3 text-muted-foreground truncate max-w-[140px]">
                      {meeting.lokalita ? (
                        <div className="flex items-center gap-1" title={meeting.lokalita}>
                          <MapPin className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                          <span className="truncate">{meeting.lokalita}</span>
                        </div>
                      ) : (
                        <span className="italic opacity-50">Neuvedena</span>
                      )}
                    </td>

                    {/* Stav */}
                    <td className="p-3">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium border ${stavCfg.bg} ${stavCfg.color}`}>
                        {stavCfg.label}
                      </span>
                    </td>

                    {/* Organizátor */}
                    <td className="p-3 text-zinc-600 dark:text-zinc-300 font-medium">
                      {meeting.organizator?.jmeno || 'Nepřiřazen'}
                    </td>

                    {/* Autor / Změna */}
                    <td className="p-3 text-muted-foreground select-none">
                      <div className="flex flex-col">
                        <span className="font-medium text-zinc-600 dark:text-zinc-300">{updaterName}</span>
                        <span className="text-[9px] opacity-70 font-mono">{updateDate}</span>
                      </div>
                    </td>

                    {/* Akce */}
                    <td className="p-3 text-right">
                      <MeetingWorkspace
                        meeting={meeting}
                        userProfiles={users}
                        onSuccess={refreshMeetings}
                        trigger={
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-7 w-7 rounded-lg hover:bg-muted opacity-65 hover:opacity-100 transition-opacity"
                            title="Otevřít pracovní prostor"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                        }
                      />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
