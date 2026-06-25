import { Metadata } from 'next'
import { CalendarRange, LayoutGrid } from 'lucide-react'
import { getProjekty } from '@/modules/planning/actions/projekty'
import { ProjektCard } from '@/modules/planning/components/ProjektCard'
import { ProjektFormDialog } from '@/modules/planning/components/ProjektFormDialog'
import { Button } from '@/shared/components/ui/button'

export const metadata: Metadata = {
  title: 'Plánování — AZ Composite ERP',
  description: 'Přehled projektů a milníků. Sledujte pokrok a stav fází vašich projektů.',
}

export default async function PlanovaniPage() {
  const result = await getProjekty()
  const projekty = result.data ?? []

  const aktivni = projekty.filter(p => p.stav === 'active').length
  const celkem = projekty.length

  return (
    <div className="flex flex-col gap-6">
      {/* Hlavička */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <CalendarRange className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-bold tracking-tight">Plánování</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            {celkem === 0
              ? 'Zatím žádné projekty. Vytvořte první.'
              : `${celkem} ${celkem === 1 ? 'projekt' : celkem < 5 ? 'projekty' : 'projektů'} · ${aktivni} aktivních`
            }
          </p>
        </div>
        <ProjektFormDialog />
      </div>

      {/* Prázdný stav */}
      {projekty.length === 0 && (
        <div className="flex flex-col items-center gap-4 py-20 text-center rounded-2xl border border-dashed bg-muted/20">
          <div className="flex items-center justify-center h-16 w-16 rounded-2xl bg-primary/10">
            <CalendarRange className="h-8 w-8 text-primary" />
          </div>
          <div className="flex flex-col gap-1.5">
            <h2 className="text-base font-semibold">Začněte prvním projektem</h2>
            <p className="text-sm text-muted-foreground max-w-sm">
              Každý projekt obsahuje sadu milníků a fází. Sledujte pokrok, přiřazujte zodpovědnosti a dodržujte termíny.
            </p>
          </div>
          <ProjektFormDialog
            trigger={
              <Button>
                <CalendarRange className="h-4 w-4 mr-2" />
                Vytvořit první projekt
              </Button>
            }
          />
        </div>
      )}

      {/* Grid projektů */}
      {projekty.length > 0 && (
        <>
          {/* Rychlé filtrování stavů */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground mr-1">Stav:</span>
            {(['active', 'planned', 'on_hold', 'completed', 'archived'] as const).map(stav => {
              const count = projekty.filter(p => p.stav === stav).length
              if (count === 0) return null
              const labels: Record<string, string> = {
                active: 'Aktivní', planned: 'Plánované', on_hold: 'Pozastavené',
                completed: 'Dokončené', archived: 'Archivované'
              }
              return (
                <span key={stav} className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs text-muted-foreground">
                  {labels[stav]} <strong className="text-foreground">{count}</strong>
                </span>
              )
            })}
          </div>

          {/* Karty projektů */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {projekty.map(projekt => (
              <ProjektCard key={projekt.id} projekt={projekt} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
