import { Metadata } from 'next'
import { FirmaStruktura } from '@/modules/planning/components/FirmaStruktura'
import { getOddeleni } from '@/modules/planning/actions/oddeleni'
import { getUsers } from '@/modules/users/actions'
import { getUkolyGlobal } from '@/modules/planning/actions/ukoly'

export const metadata: Metadata = {
  title: 'Organizační struktura | AZ-Composites ERP',
  description: 'Přehled oddělení společnosti, jejich vlastníků, KPIs a rozpracovaných úkolů.',
}

export default async function FirmaStrukturaPage() {
  const [oddeleniRes, usersRes, ukolyRes] = await Promise.all([
    getOddeleni(),
    getUsers(),
    getUkolyGlobal()
  ])

  const departments = oddeleniRes.success ? (oddeleniRes.data ?? []) : []
  const userProfiles = (usersRes.data ?? []).map(u => ({
    id: u.id,
    jmeno: u.jmeno || u.email || 'Neznámý'
  }))
  const allUkoly = ukolyRes.success ? (ukolyRes.data ?? []) : []

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-1.5 select-none">
        <h1 className="text-xl font-bold font-sans tracking-tight">Organizační struktura</h1>
        <p className="text-xs text-muted-foreground">
          Rozdělení odpovědností (STO), klíčových činností a KPIs mezi zakladatele a členy týmu.
        </p>
      </div>

      <FirmaStruktura
        initialDepartments={departments}
        userProfiles={userProfiles}
        allUkoly={allUkoly}
      />
    </div>
  )
}
