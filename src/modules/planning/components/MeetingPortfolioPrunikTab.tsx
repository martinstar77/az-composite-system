'use client'

import React, { useState, useCallback, useRef } from 'react'
import { PORTFOLIO_SKUPINY, type PortfolioPrunikStav } from '../utils/portfolioPrunik'
import { updateZakaznikPortfolioPrunik } from '@/modules/invoicing/actions/customers'
import { CheckCircle2, Star, Target, Minus } from 'lucide-react'
import { cn } from '@/shared/lib/utils'

interface MeetingPortfolioPrunikTabProps {
  zakaznikId: string | null
  initialPrunik: Record<string, PortfolioPrunikStav> | null
}

type StavDef = {
  value: PortfolioPrunikStav
  label: string
  icon: React.ReactNode
  classes: string
}

const STAVY: StavDef[] = [
  {
    value: 'ano',
    label: 'ANO',
    icon: <CheckCircle2 className="size-3.5" />,
    classes: 'bg-emerald-500 text-white border-emerald-500 hover:bg-emerald-600',
  },
  {
    value: 'zajem',
    label: 'ZÁJEM',
    icon: <Star className="size-3.5" />,
    classes: 'bg-amber-400 text-white border-amber-400 hover:bg-amber-500',
  },
  {
    value: 'zamereni',
    label: 'ZAMĚŘENÍ',
    icon: <Target className="size-3.5" />,
    classes: 'bg-violet-600 text-white border-violet-600 hover:bg-violet-700',
  },
]

const INACTIVE_CLASSES = 'bg-background text-muted-foreground border-border hover:border-foreground/40 hover:bg-muted'

export default function MeetingPortfolioPrunikTab({
  zakaznikId,
  initialPrunik,
}: MeetingPortfolioPrunikTabProps) {
  const [prunik, setPrunik] = useState<Record<string, PortfolioPrunikStav>>(
    initialPrunik ?? {}
  )
  const [saving, setSaving] = useState(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleToggle = useCallback(
    (polozka: string, stav: PortfolioPrunikStav) => {
      setPrunik(prev => {
        // klik na aktivní stav → odznačit
        const next = { ...prev, [polozka]: prev[polozka] === stav ? null : stav }
        // debounced save
        if (saveTimer.current) clearTimeout(saveTimer.current)
        setSaving(true)
        saveTimer.current = setTimeout(async () => {
          if (zakaznikId) {
            await updateZakaznikPortfolioPrunik(zakaznikId, next)
          }
          setSaving(false)
        }, 800)
        return next
      })
    },
    [zakaznikId]
  )

  const getCount = (stav: PortfolioPrunikStav) =>
    Object.values(prunik).filter(v => v === stav).length

  if (!zakaznikId) {
    return (
      <div className="flex items-center justify-center h-40 text-sm text-muted-foreground">
        Schůzka nemá přiřazeného zákazníka — průnik portfolia nelze zobrazit.
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5 p-1">
      {/* ── Legenda + statistika ───────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        {STAVY.map(s => (
          <span key={s.value} className={cn('flex items-center gap-1.5 text-xs font-medium rounded-full px-2.5 py-1 border', s.classes)}>
            {s.icon}
            {s.label}
            <span className="font-bold ml-0.5">{getCount(s.value)}</span>
          </span>
        ))}
        {saving && (
          <span className="ml-auto text-xs text-muted-foreground animate-pulse">Ukládám…</span>
        )}
      </div>

      {/* ── Grid skupin portfolia ──────────────────────────────────── */}
      <div className="flex flex-col gap-6">
        {PORTFOLIO_SKUPINY.map(skupina => (
          <div key={skupina.nazev}>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2 px-1">
              {skupina.nazev}
            </h3>
            <div className="grid grid-cols-1 gap-1.5">
              {skupina.polozky.map(polozka => {
                const stavPolozky = prunik[polozka] ?? null
                return (
                  <div
                    key={polozka}
                    className="flex items-center gap-2 rounded-md border border-border bg-muted/20 px-3 py-1.5"
                  >
                    {/* Název položky */}
                    <span className="flex-1 text-sm truncate">{polozka}</span>

                    {/* Tlačítka stavů */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {STAVY.map(s => {
                        const isActive = stavPolozky === s.value
                        return (
                          <button
                            key={s.value}
                            onClick={() => handleToggle(polozka, s.value)}
                            title={s.label}
                            className={cn(
                              'flex items-center gap-1 rounded border text-xs font-medium px-2 py-0.5 transition-all',
                              isActive ? s.classes : INACTIVE_CLASSES
                            )}
                          >
                            {s.icon}
                            <span className="hidden sm:inline">{s.label}</span>
                          </button>
                        )
                      })}
                      {/* Tlačítko smazat */}
                      {stavPolozky !== null && (
                        <button
                          onClick={() => handleToggle(polozka, stavPolozky)}
                          title="Odznačit"
                          className="flex items-center rounded border border-border bg-background text-muted-foreground px-1.5 py-0.5 hover:bg-muted transition-all"
                        >
                          <Minus className="size-3" />
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
