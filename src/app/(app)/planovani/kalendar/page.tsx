import { Metadata } from 'next'
import { CalendarRange } from 'lucide-react'
import { PlanningCalendar } from '@/modules/planning/components/PlanningCalendar'

export const metadata: Metadata = {
  title: 'Kalendář plánování — AZ Composite ERP',
  description: 'Zobrazení všech firemních úkolů, schůzek, milníků a termínů v jednom kalendáři.',
}

interface Props {
  searchParams: Promise<{ projektId?: string }>
}

export default async function GlobalCalendarPage({ searchParams }: Props) {
  const { projektId } = await searchParams

  return (
    <div className="flex flex-col gap-6">
      {/* Hlavička */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <CalendarRange className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-bold tracking-tight">Kalendář událostí</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Přehled úkolů, schůzek a termínů napříč všemi odděleními a projekty.
        </p>
      </div>

      {/* Kalendář */}
      <div className="rounded-xl border bg-card p-4 sm:p-6 shadow-sm">
        <PlanningCalendar projektId={projektId} />
      </div>
    </div>
  )
}
