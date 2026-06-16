'use server'

import { createClient } from '@/shared/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export interface ProductFile {
  id: string
  produkt_id: string
  typ_dokumentu_id: string
  nazev: string
  file_path: string
  file_size_bytes: number | null
  content_type: string
  is_external: boolean
  vytvoril_id: string
  upravil_id?: string
  vytvoreno_at: string
  upraveno_at?: string
  c_typy_dokumentu?: {
    nazev: string
  }
  vytvoril?: {
    jmeno: string
  }
  signedUrl?: string
}

export async function getProductFiles(productId: string): Promise<{ data: ProductFile[] | null, error: any }> {
  const supabase = await createClient()
  
  // 1. Fetch metadata from database
  const { data: files, error: dbError } = await supabase
    .from('produkt_soubory')
    .select(`
      *,
      c_typy_dokumentu ( nazev ),
      vytvoril:vytvoril_id ( jmeno )
    `)
    .eq('produkt_id', productId)
    .order('vytvoreno_at', { ascending: false })

  if (dbError) {
    return { data: null, error: dbError }
  }

  if (!files || files.length === 0) {
    return { data: [], error: null }
  }

  // 2. Generate signed URLs for each private file (valid for 1 hour)
  const filesWithUrls = await Promise.all(
    files.map(async (file) => {
      // For external links, use the stored URL directly
      if (file.is_external) {
        return {
          ...file,
          signedUrl: file.file_path
        }
      }

      try {
        const { data, error } = await supabase
          .storage
          .from('product-assets')
          .createSignedUrl(file.file_path, 3600)

        return {
          ...file,
          signedUrl: error ? undefined : data?.signedUrl
        }
      } catch (err) {
        console.error(`Error generating signed URL for file ${file.id}:`, err)
        return file
      }
    })
  )

  return { data: filesWithUrls as ProductFile[], error: null }
}

export async function saveProductFileMetadata(data: {
  produkt_id: string
  typ_dokumentu_id: string
  nazev: string
  file_path: string
  file_size_bytes: number | null
  content_type: string
  is_external?: boolean
}) {
  const supabase = await createClient()

  // Get current user session to set auditor fields
  const { data: { user } } = await supabase.auth.getUser()

  const { data: fileRecord, error } = await supabase
    .from('produkt_soubory')
    .insert([{
      ...data,
      is_external: data.is_external ?? false,
      vytvoril_id: user?.id,
      upravil_id: user?.id
    }])
    .select()

  if (!error) {
    revalidatePath(`/produkty/${data.produkt_id}`)
  }

  return { data: fileRecord, error }
}

export async function deleteProductFile(fileId: string, filePath: string, productId: string, isExternal: boolean = false) {
  const supabase = await createClient()

  // 1. Delete from Supabase Storage bucket only if it is not an external link
  if (!isExternal) {
    const { error: storageError } = await supabase
      .storage
      .from('product-assets')
      .remove([filePath])

    if (storageError) {
      console.error("Error removing file from storage:", storageError.message)
      // We proceed to DB delete anyway to prevent orphaned metadata in DB if file was already missing
    }
  }

  // 2. Delete database record
  const { error: dbError } = await supabase
    .from('produkt_soubory')
    .delete()
    .eq('id', fileId)

  if (!dbError) {
    revalidatePath(`/produkty/${productId}`)
  }

  return { error: dbError }
}

export async function getDocumentTypes() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('c_typy_dokumentu')
    .select('*')
    .order('nazev', { ascending: true })

  return { data, error }
}
