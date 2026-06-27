'use server'

import { createClient } from '@/shared/lib/supabase/server'
import { createAdminClient } from '@/shared/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { UserProfile, Role } from '../types'

export const passwordSchema = z.string()
  .min(8, 'Heslo musí mít alespoň 8 znaků')
  .refine(val => /[A-Z]/.test(val), 'Heslo musí obsahovat alespoň jedno velké písmeno')
  .refine(val => /[a-z]/.test(val), 'Heslo musí obsahovat alespoň jedno malé písmeno')
  .refine(val => /\d/.test(val), 'Heslo musí obsahovat alespoň jednu číslici')
  .refine(val => /[!@#$%^&*(),.?":{}|<>]/.test(val), 'Heslo musí obsahovat alespoň jeden speciální znak')

async function ensureAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Unauthorized')
  }
  const { data: profile } = await supabase
    .from('profily_uzivatelu')
    .select('role_id')
    .eq('id', user.id)
    .single()
    
  if (profile?.role_id !== 'admin') {
    throw new Error('Unauthorized - Admin role required')
  }
}

export async function getUsers(): Promise<{ data: UserProfile[] | null, error: unknown }> {
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

export async function getRoles(): Promise<{ data: Role[] | null, error: unknown }> {
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
  await ensureAdmin()

  const passwordParse = passwordSchema.safeParse(password)
  if (!passwordParse.success) {
    return { error: { message: passwordParse.error.issues[0].message } }
  }

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

export async function updateUserFull(userId: string, payload: { email?: string, jmeno?: string, role_id?: string }) {
  await ensureAdmin()
  const adminAuthClient = createAdminClient()
  
  // 1. Update Auth if email is provided
  if (payload.email) {
    const { error: authError } = await adminAuthClient.auth.admin.updateUserById(userId, {
      email: payload.email,
      email_confirm: true // Force confirmation so they don't get stuck in a pending state
    })
    
    if (authError) return { error: authError }
  }

  // 2. Update Profile
  const profileUpdates: { jmeno?: string, role_id?: string } = {}
  if (payload.jmeno !== undefined) profileUpdates.jmeno = payload.jmeno
  if (payload.role_id !== undefined) profileUpdates.role_id = payload.role_id

  if (Object.keys(profileUpdates).length > 0) {
    const { error: profileError } = await adminAuthClient
      .from('profily_uzivatelu')
      .update(profileUpdates)
      .eq('id', userId)
      
    if (profileError) return { error: profileError }
  }

  revalidatePath('/nastaveni/uzivatele')
  return { success: true }
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
  await ensureAdmin()
  const adminAuthClient = createAdminClient()
  const { error } = await adminAuthClient.auth.admin.deleteUser(userId)
  return { error }
}

export async function adminResetPassword(userId: string, newPassword: string) {
  await ensureAdmin()

  const passwordParse = passwordSchema.safeParse(newPassword)
  if (!passwordParse.success) {
    return { error: { message: passwordParse.error.issues[0].message } }
  }

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

export async function updateSelfPassword(password: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'Nepřihlášený uživatel' }
    }

    const passwordParse = passwordSchema.safeParse(password)
    if (!passwordParse.success) {
      return { success: false, error: passwordParse.error.issues[0].message }
    }

    const { error } = await supabase.auth.updateUser({
      password: password
    })

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (e) {
    const errorMsg = e instanceof Error ? e.message : 'Neznámá chyba při změně hesla'
    return { success: false, error: errorMsg }
  }
}
