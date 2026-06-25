import { Metadata } from 'next'
import { createClient } from '@/shared/lib/supabase/server'
import { getUkolyGlobal } from '@/modules/planning/actions/ukoly'
import { getProjekty } from '@/modules/planning/actions/projekty'
import { getUsers } from '@/modules/users/actions'
import { DashboardTaskWidget } from '@/modules/planning/components/DashboardTaskWidget'
import { LayoutDashboard } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Přehled — AZ Composite ERP',
  description: 'Interní systém pro správu kompozitních materiálů, úkolů a projektů.',
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [ukolyRes, projektyRes, usersRes] = await Promise.all([
    getUkolyGlobal(),
    getProjekty(),
    getUsers(),
  ])

  const allTasks = ukolyRes.data ?? []
  const allProjects = projektyRes.data ?? []
  const allUsers = (usersRes.data ?? []).map(u => ({
    id: u.id,
    jmeno: u.jmeno ?? 'Neznámý',
  }))

  const todayStr = new Date().toISOString().split('T')[0]

  // 1. Moje aktivní úkoly (přiřazené přihlášenému uživateli, nedokončené)
  const mojeUkoly = user
    ? allTasks.filter(u => u.vlastnik_id === user.id && u.stav !== 'done')
    : []

  // 2. Úkoly po termínu (nedokončené, datum splatnosti je v minulosti)
  const poTerminu = allTasks.filter(u => {
    if (u.stav === 'done') return false
    if (!u.datum_splatnosti) return false
    return u.datum_splatnosti < todayStr
  })

  // 3. Aktivní projekty
  const aktivniProjekty = allProjects.filter(p => p.stav === 'active')

  return (
    <div className="flex flex-col gap-6">
      {/* Hlavička */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <LayoutDashboard className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-bold tracking-tight">Dashboard</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Vítejte v systému AZ Composite. Zde je přehled vaší dnešní agendy.
        </p>
      </div>

      {/* Widgety */}
      <DashboardTaskWidget
        mojeUkoly={mojeUkoly}
        poTerminu={poTerminu}
        aktivniProjekty={aktivniProjekty}
        users={allUsers}
      />
    </div>
  )
}
