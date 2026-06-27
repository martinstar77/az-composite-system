export const dynamic = 'force-dynamic'

import { createClient } from '@/shared/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ProfileView } from '@/modules/users/components/ProfileView'

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profily_uzivatelu')
    .select(`
      *,
      c_role_uzivatelu (
        nazev
      )
    `)
    .eq('id', user.id)
    .single()

  if (!profile) {
    return (
      <div className="w-full flex flex-col items-center justify-center py-20 text-center">
        <h1 className="text-xl font-bold text-destructive mb-2">Chyba</h1>
        <p className="text-muted-foreground">Profil uživatele nebyl nalezen v databázi.</p>
      </div>
    )
  }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground tracking-tight">Můj Profil</h1>
        <p className="text-muted-foreground mt-1">Zde naleznete své údaje a můžete si změnit přístupové heslo.</p>
      </div>

      <ProfileView profile={profile} email={user.email ?? ''} />
    </div>
  )
}
