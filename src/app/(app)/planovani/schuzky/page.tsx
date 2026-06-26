import { Metadata } from 'next'
import { CalendarRange, Plus } from 'lucide-react'
import { getUdalostiGlobal } from '@/modules/planning/actions/udalosti'
import { getProjekty } from '@/modules/planning/actions/projekty'
import { getUsers } from '@/modules/users/actions'
import { GlobalMeetingsTable } from '@/modules/planning/components/GlobalMeetingsTable'
import { UdalostFormDialog } from '@/modules/planning/components/UdalostFormDialog'
import { Button } from '@/shared/components/ui/button'

export const metadata: Metadata = {
  title: 'Schůzky & Meetingy — AZ Composite ERP',
  description: 'Globální přehled schůzek a vnitřních meetingů.',
}

export default async function GlobalMeetingsPage() {
  const [meetingsRes, projektyRes, usersRes] = await Promise.all([
    getUdalostiGlobal(),
    getProjekty(),
    getUsers(),
  ])

  const initialMeetings = meetingsRes.data ?? []
  const projekty = (projektyRes.data ?? []).map(p => ({
    id: p.id,
    nazev: p.nazev,
    barva: p.barva,
  }))
  const users = (usersRes.data ?? []).map(u => ({
    id: u.id,
    jmeno: u.jmeno ?? 'Neznámý',
  }))

  const activeCount = initialMeetings.filter(m => m.stav !== 'completed' && m.stav !== 'cancelled').length

  return (
    <div className="flex flex-col gap-6">
      {/* Hlavička */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <CalendarRange className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-bold tracking-tight">Schůzky & Meetingy</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            {activeCount === 0 
              ? 'Žádné aktivní nebo plánované události.' 
              : `Celkem ${activeCount} ${activeCount === 1 ? 'aktivní událost' : activeCount < 5 ? 'aktivní události' : 'aktivních událostí'} v týmu.`
            }
          </p>
        </div>

        {/* Tlačítka pro plánování nových akcí */}
        <div className="shrink-0 flex items-center gap-2">
          <UdalostFormDialog
            userProfiles={users}
            defaultTyp="meeting"
            trigger={
              <Button className="w-full sm:w-auto bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs h-9">
                <Plus className="h-4 w-4 mr-1.5" />
                Nový interní meeting
              </Button>
            }
          />
          <UdalostFormDialog
            userProfiles={users}
            defaultTyp="schuzka"
            trigger={
              <Button className="w-full sm:w-auto bg-yellow-500 hover:bg-yellow-600 text-white rounded-xl text-xs h-9">
                <Plus className="h-4 w-4 mr-1.5" />
                Nová externí schůzka
              </Button>
            }
          />
        </div>
      </div>

      {/* Interaktivní tabulka */}
      <GlobalMeetingsTable
        initialMeetings={initialMeetings}
        users={users}
        projekty={projekty}
      />
    </div>
  )
}
