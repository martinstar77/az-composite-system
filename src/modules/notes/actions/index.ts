'use server'

import { createClient } from '@/shared/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { Note, NoteFolder } from '../types'

// --- Zod schemas ---
const folderSchema = z.object({
  name: z.string().min(1, "Název složky je povinný"),
  color: z.string().optional(),
  is_shared: z.boolean().default(false),
})

const noteSchema = z.object({
  title: z.string().min(1, "Název poznámky je povinný"),
  content: z.string().optional().nullable(),
  content_text: z.string().optional().nullable(),
  folder_id: z.string().uuid().optional().nullable(),
  is_shared: z.boolean().default(false),
})

// --- Folder Actions ---

export async function getFolders(): Promise<{ success: boolean; data?: NoteFolder[]; error?: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: "Nepřihlášený uživatel" }

    const { data, error } = await supabase
      .from('slozky_poznamek')
      .select(`
        *,
        vytvoril:vytvoril_id ( jmeno ),
        upravil:upravil_id ( jmeno )
      `)
      .or(`vytvoril_id.eq.${user.id},is_shared.eq.true`)
      .is('deleted_at', null)
      .order('nazev')

    if (error) throw error
    return { success: true, data: data as NoteFolder[] }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

export async function upsertFolder(payload: unknown, folderId?: string): Promise<{ success: boolean; error?: string }> {
  try {
    const validated = folderSchema.parse(payload)
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: "Nepřihlášený uživatel" }

    const dbPayload = {
      nazev: validated.name,
      barva: validated.color || 'text-blue-500',
      is_shared: validated.is_shared,
      upravil_id: user.id,
      aktualizovano_at: new Date().toISOString()
    }

    let error
    if (folderId) {
      // Check RLS or ownership before update is handled by DB RLS policies
      const { error: err } = await supabase
        .from('slozky_poznamek')
        .update(dbPayload)
        .eq('id', folderId)
      error = err
    } else {
      const { error: err } = await supabase
        .from('slozky_poznamek')
        .insert({
          ...dbPayload,
          vytvoril_id: user.id
        })
      error = err
    }

    if (error) throw error
    revalidatePath('/poznamky')
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

export async function deleteFolder(folderId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: "Nepřihlášený uživatel" }

    // Soft delete
    const { error } = await supabase
      .from('slozky_poznamek')
      .update({
        deleted_at: new Date().toISOString(),
        upravil_id: user.id
      })
      .eq('id', folderId)

    if (error) throw error
    revalidatePath('/poznamky')
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

// --- Note Actions ---

export async function getNotes(folderId?: string | null): Promise<{ success: boolean; data?: Note[]; error?: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: "Nepřihlášený uživatel" }

    let query = supabase
      .from('poznamky')
      .select(`
        *,
        vytvoril:vytvoril_id ( jmeno ),
        upravil:upravil_id ( jmeno )
      `)
      .or(`vytvoril_id.eq.${user.id},is_shared.eq.true`)
      .is('deleted_at', null)
      .order('aktualizovano_at', { ascending: false })

    if (folderId) {
      query = query.eq('slozka_id', folderId)
    } else if (folderId === null) {
      query = query.is('slozka_id', null)
    }

    const { data, error } = await query

    if (error) throw error
    return { success: true, data: data as Note[] }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

export async function getNote(noteId: string): Promise<{ success: boolean; data?: Note; error?: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: "Nepřihlášený uživatel" }

    const { data, error } = await supabase
      .from('poznamky')
      .select(`
        *,
        vytvoril:vytvoril_id ( jmeno ),
        upravil:upravil_id ( jmeno )
      `)
      .eq('id', noteId)
      .single()

    if (error) throw error
    return { success: true, data: data as Note }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

export async function upsertNote(payload: unknown, noteId?: string): Promise<{ success: boolean; data?: Note; error?: string }> {
  try {
    const validated = noteSchema.parse(payload)
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: "Nepřihlášený uživatel" }

    const dbPayload = {
      nazev: validated.title,
      obsah: validated.content,
      obsah_txt: validated.content_text || '',
      slozka_id: validated.folder_id || null,
      is_shared: validated.is_shared,
      upravil_id: user.id,
      aktualizovano_at: new Date().toISOString()
    }

    let error
    let data
    if (noteId) {
      const { data: updated, error: err } = await supabase
        .from('poznamky')
        .update(dbPayload)
        .eq('id', noteId)
        .select()
        .single()
      error = err
      data = updated
    } else {
      const { data: inserted, error: err } = await supabase
        .from('poznamky')
        .insert({
          ...dbPayload,
          vytvoril_id: user.id
        })
        .select()
        .single()
      error = err
      data = inserted
    }

    if (error) throw error
    revalidatePath('/poznamky')
    return { success: true, data: data as Note }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

export async function deleteNote(noteId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: "Nepřihlášený uživatel" }

    // Soft delete
    const { error } = await supabase
      .from('poznamky')
      .update({
        deleted_at: new Date().toISOString(),
        upravil_id: user.id
      })
      .eq('id', noteId)

    if (error) throw error
    revalidatePath('/poznamky')
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}
