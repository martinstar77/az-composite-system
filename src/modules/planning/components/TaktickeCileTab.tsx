'use client'

import * as React from 'react'
import { useState, useEffect, useTransition } from 'react'
import { toast } from 'sonner'
import { 
  Target, 
  Plus, 
  Pencil, 
  Trash2, 
  PlusCircle, 
  Briefcase,
  Users,
} from 'lucide-react'
import { 
  Milnik, 
  CilOddeleniMilniku, 
  UkolPlanovani, 
  ODDELENI_CONFIG, 
  OddeleniType,
  STAV_UKOLU_CONFIG,
} from '../types'
import { getCileByMilnik, deleteCil } from '../actions/goals'
import { getUkolyByMilnik, createQuickUkol } from '../actions/ukoly'
import { CilFormDialog } from './CilFormDialog'
import { UkolFormDialog } from './UkolFormDialog'
import { UkolRow } from './UkolRow'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select'

interface TaktickeCileTabProps {
  milniky: Milnik[]
  userProfiles: { id: string; jmeno: string }[]
  projektBarva: string
}

export function TaktickeCileTab({
  milniky,
  userProfiles,
  projektBarva
}: TaktickeCileTabProps) {
  const [selectedMilnikId, setSelectedMilnikId] = useState<string>(
    milniky.length > 0 ? milniky[0].id : ''
  )
  const [goals, setGoals] = useState<CilOddeleniMilniku[]>([])
  const [ukoly, setUkoly] = useState<UkolPlanovani[]>([])
  const [loading, setLoading] = useState(true)
  const [isPending, startTransition] = useTransition()

  // Quick task add state per department column
  const [quickTaskTitles, setQuickTaskTitles] = useState<Record<string, string>>({})

  // Goal dialog state
  const [isGoalDialogOpen, setIsGoalDialogOpen] = useState(false)
  const [goalDialogDeptId, setGoalDialogDeptId] = useState<string | undefined>(undefined)
  const [goalDialogEditingGoal, setGoalDialogEditingGoal] = useState<CilOddeleniMilniku | null>(null)

  const activeMilnik = milniky.find(m => m.id === selectedMilnikId)

  const loadData = React.useCallback(async () => {
    if (!selectedMilnikId) return
    setLoading(true)
    const [goalsRes, ukolyRes] = await Promise.all([
      getCileByMilnik(selectedMilnikId),
      getUkolyByMilnik(selectedMilnikId)
    ])

    if (goalsRes.success && goalsRes.data) {
      setGoals(goalsRes.data)
    }
    if (ukolyRes.success && ukolyRes.data) {
      setUkoly(ukolyRes.data)
    }
    setLoading(false)
  }, [selectedMilnikId])

  useEffect(() => {
    loadData()
  }, [loadData])

  function handleOpenAddGoal(deptId: string) {
    setGoalDialogDeptId(deptId)
    setGoalDialogEditingGoal(null)
    setIsGoalDialogOpen(true)
  }

  function handleOpenEditGoal(goal: CilOddeleniMilniku) {
    setGoalDialogDeptId(goal.oddeleni_id)
    setGoalDialogEditingGoal(goal)
    setIsGoalDialogOpen(true)
  }

  function handleDeleteGoal(goalId: string) {
    if (!confirm('Opravdu chcete smazat tento taktický cíl? Propojeným úkolům bude cíl odebrán.')) return
    startTransition(async () => {
      const res = await deleteCil(goalId)
      if (res.success) {
        toast.success('Cíl byl smazán.')
        loadData()
      } else {
        toast.error(res.error ?? 'Chyba při mazání cíle.')
      }
    })
  }

  async function handleQuickTaskSubmit(e: React.FormEvent, deptId: string) {
    e.preventDefault()
    const title = quickTaskTitles[deptId]?.trim()
    if (!title) return

    const res = await createQuickUkol(selectedMilnikId, title, deptId)
    if (res.success) {
      toast.success('Úkol byl přidán.')
      setQuickTaskTitles(prev => ({ ...prev, [deptId]: '' }))
      loadData()
    } else {
      toast.error(res.error ?? 'Chyba při rychlém přidání úkolu.')
    }
  }

  function handleQuickTaskChange(deptId: string, value: string) {
    setQuickTaskTitles(prev => ({ ...prev, [deptId]: value }))
  }

  if (milniky.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center rounded-2xl border border-dashed bg-muted/20">
        <div className="flex items-center justify-center h-14 w-14 rounded-2xl bg-primary/10 text-2xl">🎯</div>
        <div className="flex flex-col gap-1 max-w-sm">
          <h3 className="text-sm font-semibold">Žádné milníky</h3>
          <p className="text-xs text-muted-foreground">
            Pro plánování taktických cílů musíte nejprve v projektu vytvořit alespoň jeden milník nebo fázi.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Milestone Selector bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border bg-card/65 p-4 rounded-xl shadow-sm">
        <div className="flex flex-col gap-1 select-none">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Aktivní milník / fáze</span>
          <Select value={selectedMilnikId} onValueChange={v => setSelectedMilnikId(v ?? '')}>
            <SelectTrigger className="w-[280px] h-9 text-xs font-semibold bg-background">
              <SelectValue placeholder="Vyberte milník...">
                {milniky.find(m => m.id === selectedMilnikId)?.nazev}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {milniky.map(m => (
                <SelectItem key={m.id} value={m.id} className="text-xs">
                  {m.nazev}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        {activeMilnik && (
          <div className="flex items-center gap-4 text-xs select-none">
            <div className="flex flex-col gap-0.5">
              <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Stav fáze</span>
              <span className="font-semibold text-foreground">{activeMilnik.stav === 'completed' ? '✓ Splněna' : '⚡ Probíhá'}</span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Splněné úkoly</span>
              <span className="font-mono font-semibold text-foreground">
                {ukoly.filter(u => u.stav === 'done').length}/{ukoly.length} ({ukoly.length > 0 ? Math.round((ukoly.filter(u => u.stav === 'done').length / ukoly.length) * 100) : 0}%)
              </span>
            </div>
          </div>
        )}
      </div>

      {loading ? (
        <div className="py-20 text-center text-xs text-muted-foreground italic select-none">
          Načítám data pro přehled cílů...
        </div>
      ) : (
        /* Columns grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 items-start">
          {(Object.entries(ODDELENI_CONFIG) as [OddeleniType, typeof ODDELENI_CONFIG[OddeleniType]][]).map(([deptId, cfg]) => {
            const deptGoal = goals.find(g => g.oddeleni_id === deptId)
            const deptTasks = ukoly.filter(u => u.oddeleni === deptId)
            
            // Separate tasks belonging to goal vs other tasks
            const goalTasks = deptTasks.filter(u => deptGoal && u.cil_id === deptGoal.id)
            const otherTasks = deptTasks.filter(u => !deptGoal || u.cil_id !== deptGoal.id)

            // Get STO Owner initials
            const deptOwner = userProfiles.find(u => u.id === cfg.colorHex /* Wait, owner ID isn't directly colorHex, let's just use jmeno from matching */)
            // Let's find owner based on department configuration if dynamic but since we render initials, we'll fetch from team profiles later.
            // Actually, in FirmaStruktura we have:
            // "dept.vlastnik?.jmeno" from database. 
            // In our config we can just show a generic initials or fetch initials from userProfiles who owns tasks.
            // Let's keep it simple: just render a placeholder or initials of the department name first letters.
            const initials = cfg.label.substring(0, 2).toUpperCase()

            return (
              <div 
                key={deptId}
                className="flex flex-col rounded-xl border bg-card/45 shadow-sm hover:border-zinc-300 dark:hover:border-zinc-800 transition-colors select-none overflow-hidden min-h-[450px]"
              >
                {/* Column Header */}
                <div 
                  className="flex items-center justify-between gap-2 p-3 border-b border-border/40 bg-muted/10"
                  style={{ borderTop: `4px solid ${cfg.colorHex}` }}
                >
                  <div className="flex flex-col min-w-0">
                    <h3 className="text-xs font-bold text-foreground truncate" title={cfg.label}>
                      {cfg.label}
                    </h3>
                  </div>

                  <span className="h-5 px-1.5 rounded bg-muted text-[10px] font-semibold font-mono text-muted-foreground shrink-0">
                    {deptTasks.length}
                  </span>
                </div>

                {/* Column Body */}
                <div className="p-3 flex flex-col gap-4 flex-1">
                  
                  {/* Goal Section */}
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1 select-none">
                      🎯 Taktická vize / Cíl
                    </span>
                    
                    {deptGoal ? (
                      <div className="flex flex-col gap-1 border p-2.5 rounded-lg bg-background hover:shadow-sm transition-shadow group relative">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-[8px] font-bold px-1 py-0.5 rounded border border-border/40 bg-muted/40 uppercase text-muted-foreground shrink-0 select-none">
                            {deptGoal.stav === 'completed' ? 'Splněno' : deptGoal.stav === 'in_progress' ? 'Probíhá' : 'Plánováno'}
                          </span>
                          
                          {/* Goal actions */}
                          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={() => handleOpenEditGoal(deptGoal)}
                              className="text-muted-foreground hover:text-foreground p-0.5"
                              title="Upravit cíl"
                            >
                              <Pencil className="h-3 w-3" />
                            </button>
                            <button 
                              onClick={() => handleDeleteGoal(deptGoal.id)}
                              className="text-muted-foreground hover:text-destructive p-0.5"
                              title="Smazat cíl"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        </div>

                        <span className={`text-[11px] font-bold text-foreground leading-snug ${deptGoal.stav === 'completed' ? 'line-through text-muted-foreground/60' : ''}`}>
                          {deptGoal.nazev}
                        </span>
                        {deptGoal.popis && (
                          <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed truncate-2-lines">
                            {deptGoal.popis}
                          </p>
                        )}
                      </div>
                    ) : (
                      <button 
                        onClick={() => handleOpenAddGoal(deptId)}
                        className="flex flex-col items-center justify-center p-3 rounded-lg border border-dashed border-border/70 hover:border-zinc-400 dark:hover:border-zinc-700 bg-background/20 hover:bg-background/40 transition-colors text-center text-xs text-muted-foreground/70 font-semibold gap-1 py-4 cursor-pointer"
                      >
                        <Plus className="h-3.5 w-3.5 text-muted-foreground/50" />
                        <span>Zadat vizi oddělení</span>
                      </button>
                    )}
                  </div>

                  {/* Tasks Section */}
                  <div className="flex flex-col gap-2.5 flex-1">
                    
                    {/* Goal-related tasks */}
                    {deptGoal && goalTasks.length > 0 && (
                      <div className="flex flex-col gap-1.5">
                        <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-0.5 select-none">
                          ⚡ Úkoly cíle ({goalTasks.length})
                        </span>
                        <div className="flex flex-col gap-1.5">
                          {goalTasks.map(u => (
                            <UkolRow 
                              key={u.id} 
                              ukol={u} 
                              onSuccess={loadData} 
                              userProfiles={userProfiles} 
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Other tasks */}
                    {otherTasks.length > 0 && (
                      <div className="flex flex-col gap-1.5">
                        <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-0.5 select-none">
                          {deptGoal ? '📦 Ostatní úkoly' : '📋 Úkoly oddělení'} ({otherTasks.length})
                        </span>
                        <div className="flex flex-col gap-1.5">
                          {otherTasks.map(u => (
                            <UkolRow 
                              key={u.id} 
                              ukol={u} 
                              onSuccess={loadData} 
                              userProfiles={userProfiles} 
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {deptTasks.length === 0 && (
                      <div className="flex-1 flex items-center justify-center py-6 text-center select-none">
                        <span className="text-[10px] text-muted-foreground/40 italic">Žádné úkoly v této fázi</span>
                      </div>
                    )}

                  </div>

                  {/* Quick add task input */}
                  <form 
                    onSubmit={e => handleQuickTaskSubmit(e, deptId)}
                    className="mt-auto pt-2 border-t border-border/30 flex items-center gap-1.5"
                  >
                    <Input 
                      placeholder="+ Rychlý úkol..."
                      value={quickTaskTitles[deptId] || ''}
                      onChange={e => handleQuickTaskChange(deptId, e.target.value)}
                      className="h-7 text-[10px] px-2 flex-1"
                    />
                    <Button 
                      type="submit" 
                      variant="ghost" 
                      size="icon-sm" 
                      className="h-7 w-7 text-muted-foreground hover:text-foreground shrink-0"
                      disabled={!quickTaskTitles[deptId]?.trim()}
                    >
                      <PlusCircle className="h-4 w-4" />
                    </Button>
                  </form>

                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Goal Form Dialog */}
      {isGoalDialogOpen && goalDialogDeptId && activeMilnik && (
        <CilFormDialog 
          milnikId={selectedMilnikId}
          milnikNazev={activeMilnik.nazev}
          defaultOddeleniId={goalDialogDeptId}
          editingGoal={goalDialogEditingGoal}
          open={isGoalDialogOpen}
          onOpenChange={setIsGoalDialogOpen}
          onSuccess={loadData}
        />
      )}
    </div>
  )
}
