import { Metadata } from 'next'
import { CheckSquare, Plus } from 'lucide-react'
import { getUkolyGlobal } from '@/modules/planning/actions/ukoly'
import { getProjekty } from '@/modules/planning/actions/projekty'
import { getUsers } from '@/modules/users/actions'
import { GlobalUkolyTable } from '@/modules/planning/components/GlobalUkolyTable'
import { UkolFormDialog } from '@/modules/planning/components/UkolFormDialog'
import { Button } from '@/shared/components/ui/button'
import { createClient } from '@/shared/lib/supabase/server'

export const metadata: Metadata = {
  title: 'Moje úkoly & Tým — AZ Composite ERP',
  description: 'Globální přehled úkolů a správa agendy pro celou firmu.',
}

export default async function GlobalUkolyPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Souběžné načtení dat pro optimální LCP/rychlost načtení
  const [ukolyRes, projektyRes, usersRes] = await Promise.all([
    getUkolyGlobal(),
    getProjekty(),
    getUsers(),
  ])

  const initialUkoly = ukolyRes.data ?? []
  const projekty = (projektyRes.data ?? []).map(p => ({
    id: p.id,
    nazev: p.nazev,
    barva: p.barva,
  }))
  const users = (usersRes.data ?? []).map(u => ({
    id: u.id,
    jmeno: u.jmeno ?? 'Neznámý',
  }))

  const activeCount = initialUkoly.filter(u => u.stav !== 'done').length

  return (
    <div className="flex flex-col gap-6">
      {/* Hlavička */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <CheckSquare className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-bold tracking-tight">Přehled úkolů</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            {activeCount === 0 
              ? 'Všechny úkoly jsou hotové!' 
              : `${activeCount} aktivních ${activeCount === 1 ? 'úkol' : activeCount < 5 ? 'úkoly' : 'úkolů'} v celém týmu.`
            }
          </p>
        </div>

        {/* Tlačítko pro vytvoření úkolu */}
        <div className="shrink-0">
          <UkolFormDialog
            userProfiles={users}
            trigger={
              <Button className="w-full sm:w-auto bg-primary text-primary-foreground hover:bg-primary/90">
                <Plus className="h-4 w-4 mr-1.5" />
                Nový úkol
              </Button>
            }
          />
        </div>
      </div>

      {/* Interaktivní tabulka a board */}
      <GlobalUkolyTable
        initialUkoly={initialUkoly}
        users={users}
        projekty={projekty}
        currentUserId={user?.id}
      />
    </div>
  )
}
