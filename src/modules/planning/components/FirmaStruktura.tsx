'use client'

import * as React from 'react'
import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { 
  Building, 
  Users, 
  Trash2, 
  Pencil, 
  CheckSquare, 
  AlertCircle, 
  HelpCircle,
  Briefcase,
  TrendingUp,
  Plus
} from 'lucide-react'
import type { FirmaOddeleni, UkolPlanovani } from '../types'
import { deleteOddeleni } from '../actions/oddeleni'
import { OddeleniFormDialog } from './OddeleniFormDialog'
import { UkolRow } from './UkolRow'
import { Button } from '@/shared/components/ui/button'
import { Badge } from '@/shared/components/ui/badge'

interface FirmaStrukturaProps {
  initialDepartments: FirmaOddeleni[]
  userProfiles: { id: string; jmeno: string }[]
  allUkoly: UkolPlanovani[]
}

export function FirmaStruktura({
  initialDepartments,
  userProfiles,
  allUkoly
}: FirmaStrukturaProps) {
  const [departments, setDepartments] = useState<FirmaOddeleni[]>(initialDepartments)
  const [viewMode, setViewMode] = useState<'departments' | 'owners'>('departments')
  const [isPending, startTransition] = useTransition()
  const [expandedDeptId, setExpandedDeptId] = useState<string | null>(null)

  // Sync state if props update
  React.useEffect(() => {
    setDepartments(initialDepartments)
  }, [initialDepartments])

  // Get active tasks for a specific department
  const getTasksForDept = (deptId: string) => {
    return allUkoly.filter(u => u.oddeleni === deptId && u.stav !== 'done')
  }

  // Reload handler
  const handleRefresh = async () => {
    // The server component page.tsx will automatically re-render and feed updated props,
    // but we can also trigger a router refresh or sync.
    window.location.reload()
  }

  const handleDeleteDept = (deptId: string, deptName: string) => {
    if (!confirm(`Opravdu chcete smazat oddělení „${deptName}“?`)) return

    startTransition(async () => {
      const res = await deleteOddeleni(deptId)
      if (res.success) {
        toast.success('Oddělení bylo smazáno.')
        setDepartments(prev => prev.filter(d => d.id !== deptId))
      } else {
        toast.error(res.error ?? 'Chyba při mazání oddělení.')
      }
    })
  }

  // Owner grouping calculations
  const ownersList = [
    { name: 'Martin', id: '18eca23b-ec53-4444-8671-bd64f823ef8e' },
    { name: 'Filip', id: '834df162-22a7-479a-983a-32fc99b5ccd0' },
    { name: 'Jarda', id: '918428ed-fa42-47ae-9570-b11a68f84ca5' },
    { name: 'Společné / Jiné', id: null }
  ]

  return (
    <div className="flex flex-col gap-6">
      
      {/* Upper Control Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border bg-card/65 p-3.5 rounded-xl shadow-sm">
        
        {/* Toggle Mode */}
        <div className="flex items-center gap-1 bg-muted p-0.5 rounded-lg border w-full sm:w-auto">
          <Button
            variant={viewMode === 'departments' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('departments')}
            className="h-8 flex-1 sm:flex-initial text-xs font-semibold"
          >
            <Briefcase className="h-3.5 w-3.5 mr-1.5" />
            Podle oddělení
          </Button>
          <Button
            variant={viewMode === 'owners' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('owners')}
            className="h-8 flex-1 sm:flex-initial text-xs font-semibold"
          >
            <Users className="h-3.5 w-3.5 mr-1.5" />
            Podle vlastníků (STO)
          </Button>
        </div>

        {/* Add department button */}
        <div className="shrink-0 w-full sm:w-auto">
          <OddeleniFormDialog 
            userProfiles={userProfiles}
            onSuccess={handleRefresh}
            trigger={
              <Button size="sm" className="w-full sm:w-auto h-8 text-xs font-bold gap-1">
                <Plus className="h-3.5 w-3.5" />
                Nové oddělení
              </Button>
            }
          />
        </div>
      </div>

      {/* A. DEPARTMENT VIEW GRID */}
      {viewMode === 'departments' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {departments.map(dept => {
            const isExpanded = expandedDeptId === dept.id
            const deptTasks = getTasksForDept(dept.id)
            const activeTaskCount = dept.pocet_aktivnich_ukolu ?? 0

            return (
              <div 
                key={dept.id}
                className="flex flex-col rounded-xl border bg-card/45 shadow-sm hover:border-zinc-400 dark:hover:border-zinc-700 transition-all select-none overflow-hidden"
              >
                {/* Card Header */}
                <div 
                  className="flex items-center justify-between gap-3 p-4 border-b border-border/40"
                  style={{ borderLeft: `4px solid ${dept.barva}` }}
                >
                  <div className="flex flex-col min-w-0">
                    <h3 className="text-sm font-bold text-foreground truncate">
                      {dept.nazev}
                    </h3>
                    <span className="text-[10px] text-muted-foreground font-mono">ID: {dept.id}</span>
                  </div>

                  {/* STO Owner initials */}
                  <div className="flex items-center shrink-0">
                    {dept.vlastnik?.jmeno ? (
                      <span 
                        className="h-6.5 w-6.5 rounded-full bg-zinc-200 dark:bg-zinc-800 text-[10px] font-bold border flex items-center justify-center text-foreground"
                        title={`Single-Threaded Owner: ${dept.vlastnik.jmeno}`}
                      >
                        {dept.vlastnik.jmeno.substring(0, 2).toUpperCase()}
                      </span>
                    ) : (
                      <span 
                        className="h-6.5 w-6.5 rounded-full bg-muted border border-dashed flex items-center justify-center text-[10px] text-muted-foreground"
                        title="Společné vlastnictví"
                      >
                        👥
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-4 flex flex-col gap-3 flex-1">
                  {/* Key activities */}
                  {dept.popis && (
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Činnosti</span>
                      <p className="text-xs text-foreground/80 leading-relaxed font-normal">
                        {dept.popis}
                      </p>
                    </div>
                  )}

                  {/* KPIs */}
                  {dept.kpi && (
                    <div className="flex flex-col gap-1 bg-muted/30 border border-border/20 p-2.5 rounded-lg">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                        <TrendingUp className="h-3 w-3 text-emerald-500" /> KPIs & Metriky
                      </span>
                      <p className="text-[11px] text-foreground/90 font-medium leading-normal italic">
                        {dept.kpi}
                      </p>
                    </div>
                  )}
                </div>

                {/* Card Footer Actions */}
                <div className="bg-muted/15 border-t border-border/40 px-4 py-2.5 flex items-center justify-between mt-auto">
                  
                  {/* Task Count Toggle */}
                  <button
                    onClick={() => setExpandedDeptId(isExpanded ? null : dept.id)}
                    className={`text-xs font-semibold flex items-center gap-1.5 cursor-pointer hover:underline transition-colors ${
                      activeTaskCount > 0 ? 'text-primary' : 'text-muted-foreground'
                    }`}
                  >
                    <CheckSquare className="h-3.5 w-3.5" />
                    <span>{activeTaskCount} aktivních {activeTaskCount === 1 ? 'úkol' : activeTaskCount >= 2 && activeTaskCount <= 4 ? 'úkoly' : 'úkolů'}</span>
                  </button>

                  <div className="flex items-center gap-1">
                    {/* Edit */}
                    <OddeleniFormDialog
                      oddeleni={dept}
                      userProfiles={userProfiles}
                      onSuccess={handleRefresh}
                      trigger={
                        <Button variant="ghost" size="icon-sm" className="h-7 w-7 text-muted-foreground hover:text-foreground">
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      }
                    />

                    {/* Delete */}
                    <Button 
                      variant="ghost" 
                      size="icon-sm" 
                      onClick={() => handleDeleteDept(dept.id, dept.nazev)}
                      disabled={isPending}
                      className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Expanded Tasks Area */}
                {isExpanded && (
                  <div className="border-t border-border/40 p-4 bg-muted/20 flex flex-col gap-2 max-h-[300px] overflow-y-auto scrollbar-thin">
                    <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider pb-1">Rozpracované úkoly oddělení:</h4>
                    {deptTasks.length === 0 ? (
                      <p className="text-xs text-muted-foreground italic py-3 text-center bg-background/50 border border-dashed rounded-lg">Oddělení nemá žádné aktivní úkoly</p>
                    ) : (
                      deptTasks.map(ukol => (
                        <UkolRow
                          key={ukol.id}
                          ukol={ukol}
                          userProfiles={userProfiles}
                          onSuccess={handleRefresh}
                        />
                      ))
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* B. OWNER VIEW GRID */}
      {viewMode === 'owners' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
          {ownersList.map(owner => {
            const ownerDepts = departments.filter(d => 
              owner.id ? d.vlastnik_id === owner.id : !d.vlastnik_id
            )
            const totalActiveTasks = ownerDepts.reduce((acc, d) => acc + (d.pocet_aktivnich_ukolu ?? 0), 0)

            return (
              <div 
                key={owner.name} 
                className="flex flex-col gap-4 rounded-xl border bg-card/65 p-4 shadow-sm min-h-[400px]"
              >
                {/* Owner Header */}
                <div className="flex items-center justify-between pb-3 border-b border-border/40 select-none">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary text-xs font-bold font-sans">
                      {owner.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div className="flex flex-col">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                        {owner.name}
                      </h3>
                      <span className="text-[10px] text-muted-foreground">Single-Threaded Owner</span>
                    </div>
                  </div>
                  <Badge variant="secondary" className="h-5 px-1.5 font-mono text-[10px] tabular-nums" title="Celkový počet aktivních úkolů">
                    {totalActiveTasks} active
                  </Badge>
                </div>

                {/* Departments Owned */}
                <div className="flex flex-col gap-3">
                  {ownerDepts.length === 0 ? (
                    <div className="text-center py-12 text-xs text-muted-foreground border border-dashed border-muted rounded-lg select-none">
                      Nevlastní žádné oddělení
                    </div>
                  ) : (
                    ownerDepts.map(dept => (
                      <div 
                        key={dept.id} 
                        className="flex flex-col p-3 rounded-lg border bg-card/45 hover:border-zinc-400 dark:hover:border-zinc-700 transition-colors"
                        style={{ borderLeft: `3px solid ${dept.barva}` }}
                      >
                        <div className="flex justify-between items-start gap-2">
                          <span className="text-xs font-bold text-foreground">{dept.nazev}</span>
                          <Badge variant="outline" className="h-4 px-1 text-[9px] font-mono shrink-0">
                            {dept.pocet_aktivnich_ukolu ?? 0} active
                          </Badge>
                        </div>
                        
                        {dept.popis && (
                          <p className="text-[10px] text-muted-foreground mt-1.5 line-clamp-2 leading-relaxed">
                            {dept.popis}
                          </p>
                        )}
                        
                        <div className="flex justify-end gap-1 mt-2.5 pt-2.5 border-t border-border/20">
                          {/* Edit shortcut */}
                          <OddeleniFormDialog
                            oddeleni={dept}
                            userProfiles={userProfiles}
                            onSuccess={handleRefresh}
                            trigger={
                              <button className="text-[10px] text-muted-foreground hover:text-foreground font-semibold flex items-center gap-0.5 cursor-pointer">
                                <Pencil className="h-2.5 w-2.5" /> Upravit
                              </button>
                            }
                          />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
