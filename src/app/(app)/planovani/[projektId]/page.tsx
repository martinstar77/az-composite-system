import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, CalendarRange, Pencil } from 'lucide-react'
import { getProjekt } from '@/modules/planning/actions/projekty'
import { getMilniky } from '@/modules/planning/actions/milniky'
import { MilestoneTimeline } from '@/modules/planning/components/MilestoneTimeline'
import { ProjektFormDialog } from '@/modules/planning/components/ProjektFormDialog'
import { STAV_PROJEKTU_CONFIG } from '@/modules/planning/types'
import { Button } from '@/shared/components/ui/button'

interface Props {
  params: Promise<{ projektId: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { projektId } = await params
  const result = await getProjekt(projektId)
  return {
    title: result.data
      ? `${result.data.nazev} — Plánování | AZ Composite ERP`
      : 'Projekt nenalezen | AZ Composite ERP',
  }
}

export default async function ProjektDetailPage({ params }: Props) {
  const { projektId } = await params

  const [projektResult, milnikyResult] = await Promise.all([
    getProjekt(projektId),
    getMilniky(projektId),
  ])

  if (!projektResult.success || !projektResult.data) {
    notFound()
  }

  const projekt = projektResult.data
  const milniky = milnikyResult.data ?? []
  const stavCfg = STAV_PROJEKTU_CONFIG[projekt.stav]

  // Formátování data
  function formatDate(d: string | null) {
    if (!d) return null
    return new Date(d).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'long', year: 'numeric' })
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Breadcrumb navigace */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/planovani" className="inline-flex items-center gap-1 hover:text-foreground transition-colors">
          <ArrowLeft className="h-3.5 w-3.5" />
          Plánování
        </Link>
        <span>/</span>
        <span className="text-foreground font-medium truncate">{projekt.nazev}</span>
      </div>

      {/* Hlavička projektu */}
      <div className="rounded-xl border bg-card overflow-hidden">
        {/* Barevný pruh */}
        <div className="h-2 w-full" style={{ backgroundColor: projekt.barva }} />

        <div className="p-5 flex flex-col gap-3">
          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-col gap-1.5">
              <h1 className="text-xl font-bold tracking-tight">{projekt.nazev}</h1>
              {projekt.popis && (
                <p className="text-sm text-muted-foreground max-w-2xl">{projekt.popis}</p>
              )}
            </div>
            <ProjektFormDialog
              projekt={projekt}
              trigger={
                <Button variant="outline" size="sm">
                  <Pencil className="h-3.5 w-3.5 mr-1.5" />
                  Upravit
                </Button>
              }
            />
          </div>

          {/* Metadata řádek */}
          <div className="flex items-center gap-3 flex-wrap">
            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${stavCfg.bg} ${stavCfg.color}`}>
              {stavCfg.label}
            </span>

            {(projekt.datum_zahajeni || projekt.datum_ukonceni) && (
              <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                <CalendarRange className="h-3.5 w-3.5" />
                {formatDate(projekt.datum_zahajeni)}
                {projekt.datum_ukonceni && (
                  <> → {formatDate(projekt.datum_ukonceni)}</>
                )}
              </span>
            )}

            {projekt.vytvoril?.jmeno && (
              <span className="text-xs text-muted-foreground ml-auto">
                Vytvořil: {projekt.vytvoril.jmeno}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Milníky a timeline */}
      <MilestoneTimeline
        projektId={projektId}
        milniky={milniky}
        projektBarva={projekt.barva}
      />
    </div>
  )
}
