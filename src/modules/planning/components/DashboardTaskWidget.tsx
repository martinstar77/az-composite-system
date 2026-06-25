'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { 
  CheckSquare, 
  AlertTriangle, 
  TrendingUp, 
  Calendar,
  ChevronRight,
  Plus
} from 'lucide-react'
import { UkolPlanovani, Projekt } from '../types'
import { UkolRow } from './UkolRow'
import { Button } from '@/shared/components/ui/button'
import Link from 'next/link'

interface DashboardTaskWidgetProps {
  mojeUkoly: UkolPlanovani[]
  poTerminu: UkolPlanovani[]
  aktivniProjekty: Projekt[]
  users: { id: string; jmeno: string }[]
}

export function DashboardTaskWidget({
  mojeUkoly,
  poTerminu,
  aktivniProjekty,
  users
}: DashboardTaskWidgetProps) {
  const router = useRouter()

  const refreshDashboard = React.useCallback(() => {
    router.refresh()
  }, [router])

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* 1. MOJE ÚKOLY TENTO TÝDEN */}
      <div className="flex flex-col gap-4 rounded-xl border bg-card p-4.5 shadow-sm">
        <div className="flex items-center justify-between border-b pb-2.5">
          <div className="flex items-center gap-2">
            <CheckSquare className="h-4.5 w-4.5 text-primary" />
            <h2 className="text-sm font-bold uppercase tracking-wider">Moje agenda</h2>
          </div>
          <span className="inline-flex h-5 items-center justify-center rounded-full bg-primary/10 px-2 text-[10px] font-bold text-primary">
            {mojeUkoly.length}
          </span>
        </div>

        <div className="flex flex-col gap-2 overflow-y-auto max-h-[420px] pr-1">
          {mojeUkoly.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-xs text-muted-foreground border border-dashed rounded-lg">
              <span className="text-xl mb-1">🎉</span>
              Žádné úkoly na tento týden.
            </div>
          ) : (
            mojeUkoly.map(ukol => (
              <div key={ukol.id} className="relative">
                <div className="flex items-center gap-1.5 px-2.5 pt-1 text-[8px] text-muted-foreground font-bold uppercase truncate">
                  <span className="h-1 w-1 rounded-full" style={{ backgroundColor: ukol.milnik?.barva || '#8A0485' }} />
                  <span className="truncate">{ukol.milnik?.nazev}</span>
                </div>
                <UkolRow
                  ukol={ukol}
                  userProfiles={users}
                  onSuccess={refreshDashboard}
                />
              </div>
            ))
          )}
        </div>

        <Button 
          variant="outline" 
          size="sm" 
          className="w-full mt-auto text-xs"
          render={<Link href="/planovani/ukoly?vlastnik=mine" />}
        >
          Zobrazit celou mou agendu
          <ChevronRight className="ml-1 h-3 w-3" />
        </Button>
      </div>

      {/* 2. PO TERMÍNU (DEADLINE MISSED) */}
      <div className="flex flex-col gap-4 rounded-xl border border-red-200 dark:border-red-950/40 bg-card p-4.5 shadow-sm">
        <div className="flex items-center justify-between border-b border-red-100 dark:border-red-950/20 pb-2.5">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4.5 w-4.5 text-red-500" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-red-600 dark:text-red-400">Po termínu</h2>
          </div>
          <span className="inline-flex h-5 items-center justify-center rounded-full bg-red-100 dark:bg-red-950/60 px-2 text-[10px] font-bold text-red-600 dark:text-red-400">
            {poTerminu.length}
          </span>
        </div>

        <div className="flex flex-col gap-2 overflow-y-auto max-h-[420px] pr-1">
          {poTerminu.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-xs text-muted-foreground border border-dashed border-red-100 dark:border-red-950/10 rounded-lg">
              <span className="text-xl mb-1">👍</span>
              Skvělé, žádné úkoly po termínu!
            </div>
          ) : (
            poTerminu.map(ukol => (
              <div key={ukol.id} className="relative">
                <div className="flex items-center gap-1.5 px-2.5 pt-1 text-[8px] text-muted-foreground font-bold uppercase truncate">
                  <span className="h-1 w-1 rounded-full" style={{ backgroundColor: ukol.milnik?.barva || '#8A0485' }} />
                  <span className="truncate">{ukol.milnik?.nazev}</span>
                </div>
                <UkolRow
                  ukol={ukol}
                  userProfiles={users}
                  onSuccess={refreshDashboard}
                />
              </div>
            ))
          )}
        </div>

        <Button 
          variant="ghost" 
          size="sm" 
          className="w-full mt-auto text-xs text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/10"
          render={<Link href="/planovani/ukoly?stav=todo" />}
        >
          Vyřešit resty
          <ChevronRight className="ml-1 h-3 w-3" />
        </Button>
      </div>

      {/* 3. AKTIVNÍ PROJEKTY (PROGRESS) */}
      <div className="flex flex-col gap-4 rounded-xl border bg-card p-4.5 shadow-sm">
        <div className="flex items-center justify-between border-b pb-2.5">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4.5 w-4.5 text-emerald-500" />
            <h2 className="text-sm font-bold uppercase tracking-wider">Projekty</h2>
          </div>
          <span className="inline-flex h-5 items-center justify-center rounded-full bg-emerald-500/10 px-2 text-[10px] font-bold text-emerald-600">
            {aktivniProjekty.length}
          </span>
        </div>

        <div className="flex flex-col gap-4 overflow-y-auto max-h-[420px] pr-1">
          {aktivniProjekty.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-xs text-muted-foreground border border-dashed rounded-lg">
              Žádné aktivní projekty.
            </div>
          ) : (
            aktivniProjekty.map(proj => {
              const progress = proj.prumerne_progres ?? 0
              return (
                <Link 
                  key={proj.id}
                  href={`/planovani/${proj.id}`}
                  className="flex flex-col gap-2 p-2.5 rounded-lg border hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold truncate text-foreground/90">
                      {proj.nazev}
                    </span>
                    <span className="text-[10px] font-bold shrink-0" style={{ color: proj.barva }}>
                      {progress}%
                    </span>
                  </div>
                  
                  {/* Progress bar */}
                  <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all duration-500"
                      style={{ 
                        width: `${progress}%`,
                        backgroundColor: proj.barva 
                      }}
                    />
                  </div>
                </Link>
              )
            })
          )}
        </div>

        <Button 
          variant="outline" 
          size="sm" 
          className="w-full mt-auto text-xs"
          render={<Link href="/planovani" />}
        >
          Všechny projekty a plány
          <ChevronRight className="ml-1 h-3 w-3" />
        </Button>
      </div>
    </div>
  )
}
