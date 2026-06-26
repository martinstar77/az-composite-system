'use client'

import React, { useState, useCallback, useRef } from 'react'
import type { UdalostPlanovani } from '../types'
import { updateCilSchuzky } from '../actions/udalosti'
import { updateZakaznikCrmData } from '@/modules/invoicing/actions/customers'
import { Building2, Users, TrendingUp, Phone, AlertCircle } from 'lucide-react'

type ZakaznikInline = {
  id: string
  nazev_spolecnosti: string
  ico?: string | null
  dic?: string | null
  adresa?: { ulice?: string; mesto?: string; psc?: string; stat?: string } | null
  telefon?: string | null
  pocet_zamestnancu?: number | null
  odhadovany_obrat?: string | null
  je_dluznik?: boolean
  pouzivane_technologie?: string | null
  pozadovane_technologie?: string | null
}

interface MeetingPripravaTabProps {
  meeting: UdalostPlanovani
  zakaznik: ZakaznikInline | null
}

const OBRATY = [
  '< 500k CZK',
  '500k – 2M CZK',
  '2M – 10M CZK',
  '10M – 50M CZK',
  '50M – 200M CZK',
  '> 200M CZK',
]

export default function MeetingPripravaTab({ meeting, zakaznik }: MeetingPripravaTabProps) {
  const [cil, setCil] = useState(meeting.cil_schuzky ?? '')
  const [pouzTech, setPouzTech] = useState(zakaznik?.pouzivane_technologie ?? '')
  const [pozadTech, setPozadTech] = useState(zakaznik?.pozadovane_technologie ?? '')
  const [pocetZam, setPocetZam] = useState<string>(zakaznik?.pocet_zamestnancu?.toString() ?? '')
  const [obrat, setObrat] = useState(zakaznik?.odhadovany_obrat ?? '')
  const [isDluznik, setIsDluznik] = useState(zakaznik?.je_dluznik ?? false)
  const [saving, setSaving] = useState<string | null>(null)

  const cilTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const crmTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── auto-save cíl schůzky (debounced 1s) ──────────────────────────
  const handleCilChange = useCallback((v: string) => {
    setCil(v)
    if (cilTimer.current) clearTimeout(cilTimer.current)
    cilTimer.current = setTimeout(async () => {
      setSaving('cil')
      await updateCilSchuzky(meeting.id, v || null)
      setSaving(null)
    }, 1000)
  }, [meeting.id])

  // ── auto-save CRM pole (debounced 1.5s) ─────────────────────────────
  const saveCrm = useCallback((patch: Parameters<typeof updateZakaznikCrmData>[1]) => {
    if (!zakaznik?.id) return
    if (crmTimer.current) clearTimeout(crmTimer.current)
    crmTimer.current = setTimeout(async () => {
      setSaving('crm')
      await updateZakaznikCrmData(zakaznik.id, patch)
      setSaving(null)
    }, 1500)
  }, [zakaznik?.id])

  const handlePouzTechChange = (v: string) => {
    setPouzTech(v)
    saveCrm({ pouzivane_technologie: v || null })
  }
  const handlePozadTechChange = (v: string) => {
    setPozadTech(v)
    saveCrm({ pozadovane_technologie: v || null })
  }
  const handlePocetZamChange = (v: string) => {
    setPocetZam(v)
    const n = parseInt(v, 10)
    saveCrm({ pocet_zamestnancu: isNaN(n) ? null : n })
  }
  const handleObratChange = (v: string) => {
    setObrat(v)
    saveCrm({ odhadovany_obrat: v || null })
  }
  const handleDluznikChange = (v: boolean) => {
    setIsDluznik(v)
    saveCrm({ je_dluznik: v })
  }

  const adresa = zakaznik?.adresa
    ? [zakaznik.adresa.ulice, zakaznik.adresa.mesto, zakaznik.adresa.psc, zakaznik.adresa.stat]
        .filter(Boolean).join(', ')
    : null

  return (
    <div className="flex flex-col gap-6 p-1">
      {/* ── Cíl schůzky ───────────────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-semibold text-foreground">Cíl schůzky</label>
          {saving === 'cil' && (
            <span className="text-xs text-muted-foreground animate-pulse">Ukládám…</span>
          )}
        </div>
        <textarea
          value={cil}
          onChange={e => handleCilChange(e.target.value)}
          placeholder="Čeho chceme touto schůzkou dosáhnout? (automaticky se ukládá)"
          rows={3}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
      </section>

      {/* ── Info zákazníka ─────────────────────────────────────────── */}
      {zakaznik ? (
        <section className="rounded-lg border border-border bg-muted/30 overflow-hidden">
          {/* Header */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-muted/60">
            <Building2 className="size-4 text-primary" />
            <span className="text-sm font-semibold">{zakaznik.nazev_spolecnosti}</span>
            {isDluznik && (
              <span className="ml-auto flex items-center gap-1 text-xs font-medium text-red-600 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-full px-2 py-0.5">
                <AlertCircle className="size-3" />
                DLUŽNÍK
              </span>
            )}
          </div>

          <div className="p-4 grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
            {/* Identifikace */}
            {zakaznik.ico && (
              <div>
                <span className="text-xs text-muted-foreground uppercase tracking-wide">IČO</span>
                <p className="font-mono mt-0.5">{zakaznik.ico}</p>
              </div>
            )}
            {zakaznik.dic && (
              <div>
                <span className="text-xs text-muted-foreground uppercase tracking-wide">DIČ</span>
                <p className="font-mono mt-0.5">{zakaznik.dic}</p>
              </div>
            )}
            {adresa && (
              <div className="col-span-2">
                <span className="text-xs text-muted-foreground uppercase tracking-wide">Adresa</span>
                <p className="mt-0.5">{adresa}</p>
              </div>
            )}
            {zakaznik.telefon && (
              <div>
                <span className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                  <Phone className="size-3" /> Telefon
                </span>
                <p className="mt-0.5">{zakaznik.telefon}</p>
              </div>
            )}
          </div>

          {/* Editovatelná CRM pole */}
          <div className="px-4 pb-4 grid grid-cols-2 gap-4 text-sm border-t border-border pt-4">
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                <Users className="size-3" /> Počet zaměstnanců
              </label>
              <input
                type="number"
                value={pocetZam}
                onChange={e => handlePocetZamChange(e.target.value)}
                placeholder="—"
                className="mt-1 w-full rounded border border-border bg-background px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-primary/40"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                <TrendingUp className="size-3" /> Odhadovaný obrat
              </label>
              <select
                value={obrat}
                onChange={e => handleObratChange(e.target.value)}
                className="mt-1 w-full rounded border border-border bg-background px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-primary/40"
              >
                <option value="">— nevyplněno —</option>
                {OBRATY.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-2 col-span-2">
              <input
                id="je-dluznik"
                type="checkbox"
                checked={isDluznik}
                onChange={e => handleDluznikChange(e.target.checked)}
                className="rounded border-border"
              />
              <label htmlFor="je-dluznik" className="text-sm cursor-pointer">
                Zákazník je dlužník
              </label>
              {saving === 'crm' && (
                <span className="ml-auto text-xs text-muted-foreground animate-pulse">Ukládám…</span>
              )}
            </div>
          </div>
        </section>
      ) : (
        <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground text-center">
          Schůzka nemá přiřazeného zákazníka — přiřaďte ho v nastavení schůzky.
        </div>
      )}

      {/* ── Portfolio zákazníka (technologie) ─────────────────────── */}
      {zakaznik && (
        <section>
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-sm font-semibold">Portfolio zákazníka</h3>
            {saving === 'crm' && (
              <span className="text-xs text-muted-foreground animate-pulse">Ukládám…</span>
            )}
          </div>
          <div className="grid grid-cols-1 gap-3">
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wide">Jaké technologie využívají</label>
              <textarea
                value={pouzTech}
                onChange={e => handlePouzTechChange(e.target.value)}
                placeholder="např. infuze, prepreg, ruční laminování…"
                rows={2}
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wide">Jaké technologie chtějí zavést</label>
              <textarea
                value={pozadTech}
                onChange={e => handlePozadTechChange(e.target.value)}
                placeholder="např. RTM, filament winding…"
                rows={2}
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
          </div>
        </section>
      )}
    </div>
  )
}
