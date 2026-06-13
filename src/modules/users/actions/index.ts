'use server'

import { createClient } from '@/shared/lib/supabase/server'
import { createAdminClient } from '@/shared/lib/supabase/admin'
import { UserProfile, Role } from '../types'

export async function getUsers(): Promise<{ data: UserProfile[] | null, error: any }> {
  const supabase = await createClient()
  
  // Checking if the current user is admin is handled by RLS on profily_uzivatelu, 
  // but we can also just execute the query. If they aren't admin, they'll only get their own profile.
  const { data, error } = await supabase
    .from('profily_uzivatelu')
    .select(`
      *,
      c_role_uzivatelu ( nazev )
    `)
    .order('vytvoreno_at', { ascending: false })
  
  return { data, error }
}

export async function getRoles(): Promise<{ data: Role[] | null, error: any }> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('c_role_uzivatelu')
    .select('*')
  
  return { data, error }
}

export async function updateUserRole(userId: string, newRoleId: string) {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('profily_uzivatelu')
    .update({ role_id: newRoleId })
    .eq('id', userId)
    .select()
    
  return { data, error }
}

export async function createUserWithPassword(email: string, password: string, roleId: string, nickname: string) {
  const adminAuthClient = createAdminClient()
  
  // 1. Create the user directly with a password via Supabase Admin API
  const { data: authData, error: createError } = await adminAuthClient.auth.admin.createUser({
    email: email,
    password: password,
    email_confirm: true 
  })
  
  if (createError) {
    return { error: createError }
  }

  // 2. Update the automatically created profile with nickname and requested role
  if (authData.user?.id) {
    const { error: profileError } = await adminAuthClient
      .from('profily_uzivatelu')
      .update({ 
        role_id: roleId,
        jmeno: nickname 
      })
      .eq('id', authData.user.id)
      
    if (profileError) {
       console.error("Failed to update created user's profile:", profileError)
    }
  }

  return { data: authData, error: null }
}

export async function updateUserProfile(userId: string, updates: { jmeno?: string, role_id?: string }) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('profily_uzivatelu')
    .update(updates)
    .eq('id', userId)
    .select()
    
  return { data, error }
}

export async function deleteUser(userId: string) {
  const adminAuthClient = createAdminClient()
  const { error } = await adminAuthClient.auth.admin.deleteUser(userId)
  return { error }
}

export async function adminResetPassword(userId: string, newPassword: string) {
  const adminAuthClient = createAdminClient()
  const { data, error } = await adminAuthClient.auth.admin.updateUserById(userId, {
    password: newPassword
  })
  return { data, error }
}

export async function getAllPermissions() {
  const supabase = await createClient()
  const { data, error } = await supabase.from('c_opravneni').select('*').order('modul')
  return { data, error }
}

export async function getRolePermissionsMatrix() {
  const supabase = await createClient()
  const { data, error } = await supabase.from('role_opravneni').select('*')
  return { data, error }
}

export async function togglePermission(roleId: string, permissionId: string, enabled: boolean) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('role_opravneni')
    .upsert({ role_id: roleId, opravneni_id: permissionId, povoleno: enabled })
    .select()
    
  return { data, error }
}
