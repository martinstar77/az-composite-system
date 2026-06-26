'use server'

import { createClient } from '@/shared/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import type {
  UdalostPlanovani,
  UdalostPlanovaniPayload,
  AgendaTopic,
} from '../types'

// ============================================================
// Zod schémata
// ============================================================

const udalostSchema = z.object({
  milnik_id: z.string().uuid().optional().nullable(),
  nazev: z.string().min(1, 'Název schůzky je povinný').max(500),
  popis: z.string().optional().nullable(),
  datum_zahajeni: z.string(), // ISO date or ISO timestamp
  datum_ukonceni: z.string().optional().nullable(),
  lokalita: z.string().optional().nullable(),
  organizator_id: z.string().uuid().optional().nullable(),
  ucastnici_ids: z.array(z.string().uuid()).default([]),
  agenda: z.array(z.object({
    id: z.string(),
    nazev: z.string(),
    popis: z.string().optional().nullable(),
    prezentuje_id: z.string().uuid().optional().nullable(),
    doba_minut: z.number().default(10),
    stav: z.enum(['planned', 'discussed']).default('planned'),
  })).default([]),
  zapis: z.string().optional().nullable(),
  stav: z.enum(['scheduled', 'active', 'completed', 'cancelled']).default('scheduled'),
})

const UDALOST_SELECT = `
  *,
  organizator:organizator_id (
    id,
    jmeno
  ),
  milnik:milnik_id (
    id,
    nazev,
    barva,
    projekt_id
  )
`

// ============================================================
// getUdalostiByDateRange
// ============================================================
export async function getUdalostiByDateRange(
  from: string, // YYYY-MM-DD
  to: string    // YYYY-MM-DD
): Promise<{ success: boolean; data?: UdalostPlanovani[]; error?: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Nepřihlášený uživatel' }

    // Načteme události v daném časovém rozmezí
    // datum_zahajeni >= from AND datum_zahajeni <= to
    const { data, error } = await supabase
      .from('udalosti_planovani')
      .select(UDALOST_SELECT)
      .is('deleted_at', null)
      .gte('datum_zahajeni', `${from}T00:00:00Z`)
      .lte('datum_zahajeni', `${to}T23:59:59Z`)
      .order('datum_zahajeni', { ascending: true })

    if (error) throw error
    return { success: true, data: (data ?? []) as UdalostPlanovani[] }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

// ============================================================
// getUdalostiByMilnik
// ============================================================
export async function getUdalostiByMilnik(
  milnikId: string
): Promise<{ success: boolean; data?: UdalostPlanovani[]; error?: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Nepřihlášený uživatel' }

    const { data, error } = await supabase
      .from('udalosti_planovani')
      .select(UDALOST_SELECT)
      .eq('milnik_id', milnikId)
      .is('deleted_at', null)
      .order('datum_zahajeni', { ascending: true })

    if (error) throw error
    return { success: true, data: (data ?? []) as UdalostPlanovani[] }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

// ============================================================
// upsertUdalost
// ============================================================
export async function upsertUdalost(
  payload: unknown,
  id?: string
): Promise<{ success: boolean; data?: UdalostPlanovani; error?: string }> {
  try {
    const validated = udalostSchema.parse(payload)
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Nepřihlášený uživatel' }

    // Fetch parent milnik to get its tenant_id
    let tenantId = null
    if (validated.milnik_id) {
      const { data: milnik } = await supabase
        .from('milniky')
        .select('tenant_id')
        .eq('id', validated.milnik_id)
        .single()
      tenantId = milnik?.tenant_id ?? null
    }

    const dbPayload = {
      milnik_id: validated.milnik_id ?? null,
      nazev: validated.nazev,
      popis: validated.popis ?? null,
      datum_zahajeni: validated.datum_zahajeni,
      datum_ukonceni: validated.datum_ukonceni ?? null,
      lokalita: validated.lokalita ?? null,
      organizator_id: validated.organizator_id ?? null,
      ucastnici_ids: validated.ucastnici_ids,
      agenda: validated.agenda,
      zapis: validated.zapis ?? null,
      stav: validated.stav,
      upravil_id: user.id,
      tenant_id: tenantId,
      aktualizovano_at: new Date().toISOString()
    }

    let data
    let error

    if (id) {
      // UPDATE
      const { data: updated, error: err } = await supabase
        .from('udalosti_planovani')
        .update(dbPayload)
        .eq('id', id)
        .select(UDALOST_SELECT)
        .single()
      data = updated
      error = err
    } else {
      // INSERT
      const { data: inserted, error: err } = await supabase
        .from('udalosti_planovani')
        .insert({
          ...dbPayload,
          vytvoril_id: user.id
        })
        .select(UDALOST_SELECT)
        .single()
      data = inserted
      error = err
    }

    if (error) throw error

    revalidatePath('/planovani')
    revalidatePath('/planovani/kalendar')
    revalidatePath('/')
    return { success: true, data: data as UdalostPlanovani }
  } catch (e: any) {
    if (e.name === 'ZodError') {
      return { success: false, error: e.errors.map((err: any) => err.message).join(', ') }
    }
    return { success: false, error: e.message }
  }
}

// ============================================================
// deleteUdalost
// ============================================================
export async function deleteUdalost(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Nepřihlášený uživatel' }

    const { error } = await supabase
      .from('udalosti_planovani')
      .update({
        deleted_at: new Date().toISOString(),
        upravil_id: user.id
      })
      .eq('id', id)

    if (error) throw error

    revalidatePath('/planovani')
    revalidatePath('/planovani/kalendar')
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

// ============================================================
// generateMeetingOutputViaAI
// ============================================================
export async function generateMeetingOutputViaAI(
  meetingId: string
): Promise<{ success: boolean; data?: { summary: string; createdTasks: any[] }; error?: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Nepřihlášený uživatel' }

    // 1. Načteme schůzku
    const { data: meeting, error: meetingError } = await supabase
      .from('udalosti_planovani')
      .select('*')
      .eq('id', meetingId)
      .single()

    if (meetingError || !meeting) {
      return { success: false, error: 'Nepodařilo se načíst schůzku.' }
    }

    // Načteme všechny uživatele systému (profily_uzivatelu) pro ztotožnění
    const { data: profiles } = await supabase
      .from('profily_uzivatelu')
      .select('id, jmeno')

    const userListText = profiles?.map(p => `- ${p.jmeno} (ID: ${p.id})`).join('\n') || ''

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return { success: false, error: 'Chybí konfigurace GEMINI_API_KEY v .env.local.' }
    }

    // 2. Příprava promptu pro Gemini
    const dateFormatted = new Date(meeting.datum_zahajeni).toLocaleDateString('cs-CZ')
    const promptText = `
Jsi asistent řízení projektů pro společnost AZ-Composites.
Máme schůzku s názvem "${meeting.nazev}" konanou dne ${dateFormatted}.

Zde je seznam témat schůzky (agenda):
${JSON.stringify(meeting.agenda, null, 2)}

Zde jsou surové poznámky pořízené v průběhu schůzky (zápis):
---
${meeting.zapis || 'Bez zápisu.'}
---

Úkoly pro spárování uživatelů:
${userListText}

Zpracuj tyto poznámky a vygeneruj JSON výstup podle následující specifikace.
Vrátíš objekt s klíči:
1. "summaryMarkdown": krásně strukturovaný zápis v Markdownu. Měl by obsahovat:
   - Stručný souhrn (Executive Summary)
   - Seznam klíčových rozhodnutí (Key Decisions)
   - Stručné shrnutí jednotlivých témat, která se projednala
2. "tasks": pole nově vytvořených úkolů (akčních kroků). Pro každý úkol urči:
   - "nazev": krátký výstižný název úkolu
   - "popis": detailní vysvětlení, co se má udělat
   - "vlastnik_id": UUID vlastníka ze seznamu výše (pokud dokážeš jednoznačně ztotožnit např. "Martin", "Filip", "Jarda" s ID z tabulky). Pokud nevíš, nech null.
   - "datum_splatnosti": termín splnění ve formátu YYYY-MM-DD. Pokud byl termín vyjádřen relativně vůči datu schůzky (např. "do pátku", "do týdne"), spočítej přesné datum vůči datu schůzky ${meeting.datum_zahajeni}. Pokud termín chybí, nech null.
   - "oddeleni": jedno z: management, sales, purchasing, logistics, backbone, finance, rd, marketing, backoffice, legal. Vyber podle zaměření úkolu.

Odpověz POUZE validním JSON objektem. Nezačínej textem jako "zde je json" ani nepoužívej json tagy. Pouze čistý JSON objekt.
`

    // 3. Volání Gemini API
    const url = 'https://genergenerativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' + apiKey
    // Wait, fix the URL typo: 'https://genergenerativelanguage.googleapis.com' to 'https://generativelanguage.googleapis.com'
    const correctUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' + apiKey

    const response = await fetch(
      correctUrl,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: promptText }]
          }],
          generationConfig: {
            responseMimeType: 'application/json',
          }
        })
      }
    )

    if (!response.ok) {
      const errText = await response.text()
      throw new Error('Gemini API error: ' + errText)
    }

    const resJson = await response.json()
    const textOutput = resJson.candidates?.[0]?.content?.parts?.[0]?.text
    if (!textOutput) {
      throw new Error('Nebyly vráceny žádné výsledky z Gemini API.')
    }

    const result = JSON.parse(textOutput.trim())

    // 4. Uložení zápisu zformátovaného AI zpět do schůzky
    await supabase
      .from('udalosti_planovani')
      .update({
        zapis: result.summaryMarkdown,
        stav: 'completed',
        upravil_id: user.id
      })
      .eq('id', meetingId)

    // 5. Uložení/synchronizace zápisu do modulu Poznámky (Knowledge Base)
    // 5a. Najdeme nebo vytvoříme systémovou složku "Zápisy z meetingů"
    let { data: folder } = await supabase
      .from('slozky_poznamek')
      .select('id')
      .eq('nazev', 'Zápisy z meetingů')
      .is('deleted_at', null)
      .maybeSingle()

    let folderId = folder?.id
    if (!folderId) {
      const { data: newFolder, error: folderErr } = await supabase
        .from('slozky_poznamek')
        .insert({
          nazev: 'Zápisy z meetingů',
          barva: 'text-purple-500',
          is_shared: true,
          vytvoril_id: user.id,
          upravil_id: user.id
        })
        .select('id')
        .single()
      
      if (!folderErr && newFolder) {
        folderId = newFolder.id
      }
    }

    // 5b. Vytvoříme nebo aktualizujeme stávající poznámku v této složce
    // Hledáme poznámku se stejným názvem v této složce, abychom ji případně přepsali (např. při opakované AI analýze)
    const noteTitle = `Zápis: ${meeting.nazev} (${dateFormatted})`
    let { data: existingNote } = await supabase
      .from('poznamky')
      .select('id')
      .eq('nazev', noteTitle)
      .eq('slozka_id', folderId)
      .is('deleted_at', null)
      .maybeSingle()

    const notePayload = {
      nazev: noteTitle,
      obsah: `<div class="prose max-w-none">${result.summaryMarkdown}</div>`,
      obsah_txt: result.summaryMarkdown,
      slozka_id: folderId,
      is_shared: true,
      upravil_id: user.id,
      aktualizovano_at: new Date().toISOString()
    }

    if (existingNote) {
      await supabase
        .from('poznamky')
        .update(notePayload)
        .eq('id', existingNote.id)
    } else {
      await supabase
        .from('poznamky')
        .insert({
          ...notePayload,
          vytvoril_id: user.id
        })
    }

    // 6. Automatické založení vygenerovaných úkolů v DB (ukoly_planovani)
    const createdTasks = []
    if (Array.isArray(result.tasks) && result.tasks.length > 0) {
      for (const t of result.tasks) {
        const { data: inserted, error: insertError } = await supabase
          .from('ukoly_planovani')
          .insert({
            milnik_id: meeting.milnik_id,
            parent_meeting_id: meetingId,
            nazev: t.nazev,
            popis: t.popis || null,
            vlastnik_id: t.vlastnik_id || null,
            datum_splatnosti: t.datum_splatnosti || null,
            oddeleni: t.oddeleni || 'management',
            typ_udalosti: 'task',
            stav: 'todo',
            priorita: 'medium',
            vytvoril_id: user.id,
            upravil_id: user.id,
            tenant_id: meeting.tenant_id
          })
          .select('id, nazev, vlastnik_id, oddeleni')
          .single()

        if (!insertError && inserted) {
          createdTasks.push(inserted)
        }
      }
    }

    revalidatePath('/planovani')
    revalidatePath('/planovani/kalendar')
    revalidatePath('/poznamky')
    return { 
      success: true, 
      data: {
        summary: result.summaryMarkdown,
        createdTasks: createdTasks
      }
    }
  } catch (e: any) {
    console.error('Error in generateMeetingOutputViaAI:', e)
    return { success: false, error: e.message || 'Neočekávaná chyba při zpracování AI' }
  }
}

// ============================================================
// getTasksByMeeting
// ============================================================
export async function getTasksByMeeting(
  meetingId: string
): Promise<{ success: boolean; data?: any[]; error?: string }> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('ukoly_planovani')
      .select(`
        id,
        nazev,
        stav,
        priorita,
        oddeleni,
        vlastnik_id,
        datum_splatnosti,
        vlastnik:vlastnik_id (
          id,
          jmeno
        )
      `)
      .eq('parent_meeting_id', meetingId)
      .is('deleted_at', null)
      .order('vytvoreno_at', { ascending: true })

    if (error) throw error
    return { success: true, data: data ?? [] }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

