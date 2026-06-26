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
  typ: z.enum(['meeting', 'schuzka']).default('meeting'),
  priprava: z.string().optional().nullable(),
  surovy_prepis: z.string().optional().nullable(),
  email_navrh: z.string().optional().nullable(),
  zakaznik_id: z.string().uuid().optional().nullable(),
  dodavatel_id: z.string().uuid().optional().nullable(),
})

const UDALOST_SELECT = `
  *,
  organizator:organizator_id (
    id,
    jmeno
  ),
  vytvoril:vytvoril_id (
    id,
    jmeno
  ),
  upravil:upravil_id (
    id,
    jmeno
  ),
  zakaznik:zakaznik_id (
    id,
    nazev_spolecnosti
  ),
  dodavatel:dodavatel_id (
    id,
    nazev_spolecnosti
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
      typ: validated.typ,
      priprava: validated.priprava ?? null,
      surovy_prepis: validated.surovy_prepis ?? null,
      email_navrh: validated.email_navrh ?? null,
      zakaznik_id: validated.zakaznik_id ?? null,
      dodavatel_id: validated.dodavatel_id ?? null,
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
// ============================================================
// generateMeetingOutputViaAI
// ============================================================
export async function generateMeetingOutputViaAI(
  meetingId: string,
  audioBase64?: string,
  audioMimeType?: string,
  customTranscript?: string
): Promise<{ 
  success: boolean; 
  data?: { 
    summary: string; 
    transcript: string; 
    email_navrh: string; 
    createdTasks: any[] 
  }; 
  error?: string 
}> {
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
    
    let sourceInputDesc = ''
    if (customTranscript) {
      sourceInputDesc = `
Uživatel ručně upravil surový přepis schůzky. Použij tento text jako hlavní zdroj pro zápis a ulož ho beze změn (nebo jen s opravou překlepů) do klíče "transcript":
---
${customTranscript}
---`
    } else if (audioBase64) {
      sourceInputDesc = `
K tomuto requestu je přiložen zvukový záznam (audio) s diktováním poznámek ze schůzky.
Poslechni si nahrávku a ulož její doslovný a přesný přepis (v českém jazyce) do klíče "transcript".
Pokud v nahrávce zazní specifické pojmy, napiš je správně gramaticky.`
    } else {
      sourceInputDesc = `
Použij tyto stávající poznámky/zápis jako hlavní zdroj pro analýzu a ulož je do klíče "transcript":
---
${meeting.zapis || meeting.surovy_prepis || 'Bez zápisu.'}
---`
    }

    const promptText = `
Jsi asistent řízení projektů pro společnost AZ-Composites.
Máme schůzku s názvem "${meeting.nazev}" konanou dne ${dateFormatted} (typ: ${meeting.typ === 'schuzka' ? 'externí schůzka se zákazníkem/dodavatelem' : 'interní meeting'}).

Zde je předem připravený plán a cíle schůzky (příprava):
---
${meeting.priprava || 'Bez přípravy.'}
---

Zde je seznam témat schůzky (agenda):
${JSON.stringify(meeting.agenda, null, 2)}

${sourceInputDesc}

Úkoly pro spárování vlastníků (vlastnik_id):
${userListText}

Zpracuj tyto vstupní údaje a vygeneruj JSON výstup podle následující specifikace.
Vrátíš objekt s těmito klíči:
1. "transcript": Doslovný přepis audia (pokud bylo přiloženo audio), nebo nezměněný text (pokud byl předán textový přepis z customTranscript).
2. "summaryMarkdown": Krásně strukturovaný zápis v češtině (Markdown). Měl by obsahovat:
   - Stručný souhrn schůzky (Executive Summary)
   - Seznam klíčových rozhodnutí (Key Decisions)
   - Stručné shrnutí jednotlivých témat, která se projednala
3. "tasks": Pole nově navržených úkolů (akčních kroků). Pro každý úkol urči:
   - "nazev": krátký výstižný název úkolu
   - "popis": detailní vysvětlení, co se má udělat
   - "vlastnik_id": UUID vlastníka ze seznamu výše (pokud dokážeš jednoznačně ztotožnit např. "Martin", "Filip" s ID z tabulky). Pokud nevíš, nech null.
   - "datum_splatnosti": termín splnění ve formátu YYYY-MM-DD. Pokud byl termín vyjádřen relativně vůči datu schůzky (např. "do pátku", "do týdne"), spočítej přesné datum vůči datu schůzky ${meeting.datum_zahajeni}. Pokud termín chybí, nech null.
   - "oddeleni": jedno z: management, sales, purchasing, logistics, backbone, finance, rd, marketing, backoffice, legal. Vyber podle zaměření úkolu.
4. "followUpEmail": Návrh profesionálního, slušného a výstižného follow-up e-mailu pro klienta/dodavatele v českém jazyce. Měl by shrnout hlavní body schůzky a další postup. Pokud jde o interní meeting, napiš sem stručné shrnutí pro interní oběžník, jinak pro externí schůzku naformátuj e-mail s předmětem a tělem.

Odpověz POUZE validním JSON objektem. Nezačínej textem jako "zde je json" ani nepoužívej json tagy. Pouze čistý JSON objekt.
`

    // 3. Volání Gemini API
    const correctUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=' + apiKey

    const parts: any[] = []
    if (audioBase64 && audioMimeType) {
      parts.push({
        inlineData: {
          mimeType: audioMimeType,
          data: audioBase64
        }
      })
    }
    parts.push({ text: promptText })

    const response = await fetch(
      correctUrl,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{ parts }],
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

    const finalTranscript = result.transcript || customTranscript || meeting.surovy_prepis || meeting.zapis || ''
    const finalSummary = result.summaryMarkdown || ''
    const finalEmail = result.followUpEmail || ''

    // 4. Uložení zápisu, přepisu a e-mailu zpět do schůzky
    await supabase
      .from('udalosti_planovani')
      .update({
        zapis: finalSummary,
        surovy_prepis: finalTranscript,
        email_navrh: finalEmail,
        stav: 'completed',
        upravil_id: user.id,
        aktualizovano_at: new Date().toISOString()
      })
      .eq('id', meetingId)

    // 5. Uložení/synchronizace zápisu do modulu Poznámky (Knowledge Base)
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
      obsah: `<div class="prose max-w-none">${finalSummary}</div>`,
      obsah_txt: finalSummary,
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
      // Smazat staré úkoly z tohoto meetingu, abychom při regeneraci neměli duplicity
      await supabase
        .from('ukoly_planovani')
        .update({ deleted_at: new Date().toISOString() })
        .eq('parent_meeting_id', meetingId)

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
    revalidatePath('/planovani/schuzky')
    revalidatePath('/poznamky')
    
    return { 
      success: true, 
      data: {
        summary: finalSummary,
        transcript: finalTranscript,
        email_navrh: finalEmail,
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

// ============================================================
// getUdalostiGlobal
// ============================================================
export async function getUdalostiGlobal(filters?: {
  typ?: 'meeting' | 'schuzka'
  stav?: string
  organizator_id?: string
  milnik_id?: string
}): Promise<{ success: boolean; data?: UdalostPlanovani[]; error?: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Nepřihlášený uživatel' }

    let query = supabase
      .from('udalosti_planovani')
      .select(`
        *,
        organizator:organizator_id (
          id,
          jmeno
        ),
        vytvoril:vytvoril_id (
          id,
          jmeno
        ),
        upravil:upravil_id (
          id,
          jmeno
        ),
        zakaznik:zakaznik_id (
          id,
          nazev_spolecnosti
        ),
        dodavatel:dodavatel_id (
          id,
          nazev_spolecnosti
        ),
        milnik:milnik_id (
          id,
          nazev,
          barva,
          projekt_id,
          projekt:projekt_id (
            id,
            nazev,
            barva
          )
        )
      `)
      .is('deleted_at', null)

    if (filters?.typ) {
      query = query.eq('typ', filters.typ)
    }

    if (filters?.stav) {
      query = query.eq('stav', filters.stav)
    }

    if (filters?.organizator_id) {
      query = query.eq('organizator_id', filters.organizator_id)
    }

    if (filters?.milnik_id) {
      query = query.eq('milnik_id', filters.milnik_id)
    }

    const { data, error } = await query.order('datum_zahajeni', { ascending: false })

    if (error) throw error
    return { success: true, data: data as UdalostPlanovani[] }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

// ============================================================
// getCrmEntities
// ============================================================
export async function getCrmEntities(): Promise<{
  success: boolean
  data?: {
    zakaznici: { id: string; nazev_spolecnosti: string }[]
    dodavatele: { id: string; nazev_spolecnosti: string }[]
  }
  error?: string
}> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Nepřihlášený uživatel' }

    // Paralelní načtení zákazníků a dodavatelů
    const [zakazniciRes, dodavateleRes] = await Promise.all([
      supabase.from('zakaznici').select('id, nazev_spolecnosti').is('deleted_at', null).order('nazev_spolecnosti'),
      supabase.from('dodavatele').select('id, nazev_spolecnosti').is('deleted_at', null).order('nazev_spolecnosti')
    ])

    if (zakazniciRes.error) throw zakazniciRes.error
    if (dodavateleRes.error) throw dodavateleRes.error

    return {
      success: true,
      data: {
        zakaznici: zakazniciRes.data ?? [],
        dodavatele: dodavateleRes.data ?? []
      }
    }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}



