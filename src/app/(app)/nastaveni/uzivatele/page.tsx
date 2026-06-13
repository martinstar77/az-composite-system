import { getUsers, getRoles, getAllPermissions, getRolePermissionsMatrix } from '@/modules/users/actions'
import { UserDataTable } from '@/modules/users/components/UserDataTable'
import { CreateUserDialog } from '@/modules/users/components/CreateUserDialog'
import { PermissionsMatrix } from '@/modules/users/components/PermissionsMatrix'
import { createClient } from '@/shared/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs"

export default async function UsersSettingsPage() {
  // 1. Security Check: Only Admins should access this page.
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profily_uzivatelu')
    .select('role_id')
    .eq('id', user.id)
    .single()

  if (profile?.role_id !== 'admin') {
    return (
      <div className="w-full flex flex-col items-center justify-center py-20 text-center">
        <h1 className="text-2xl font-bold text-destructive mb-2">Přístup odepřen</h1>
        <p className="text-muted-foreground">Nemáte administrátorská oprávnění pro přístup k této sekci.</p>
      </div>
    )
  }

  // 2. Fetch Data
  const [
    { data: users }, 
    { data: roles },
    { data: permissions },
    { data: matrix }
  ] = await Promise.all([
    getUsers(),
    getRoles(),
    getAllPermissions(),
    getRolePermissionsMatrix()
  ])

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground tracking-tight">Správa Týmu a Oprávnění</h1>
        <p className="text-muted-foreground mt-1">Definujte, kdo má přístup do systému a co v něm může dělat.</p>
      </div>

      <Tabs defaultValue="users" className="w-full">
        <TabsList className="bg-zinc-900 border border-zinc-800 p-1 mb-6">
          <TabsTrigger value="users" className="data-[state=active]:bg-zinc-800">Seznam uživatelů</TabsTrigger>
          <TabsTrigger value="permissions" className="data-[state=active]:bg-zinc-800">Matice oprávnění rolí</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-6">
          <div className="flex justify-end">
            <CreateUserDialog roles={roles || []} />
          </div>
          <UserDataTable data={users || []} roles={roles || []} />
        </TabsContent>

        <TabsContent value="permissions">
          <div className="space-y-4">
            <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
              <p className="text-sm text-zinc-300">
                <strong>Instrukce:</strong> Zde nastavujete globální přístupová práva pro celé skupiny uživatelů. Změna v této tabulce se okamžitě projeví všem uživatelům s danou rolí. Role "Administrátor" má vždy povoleny všechny přístupy.
              </p>
            </div>
            <PermissionsMatrix 
              roles={roles || []} 
              permissions={permissions || []} 
              initialMatrix={matrix || []} 
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
