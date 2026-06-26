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
  cil_schuzky: z.string().optional().nullable(),
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
    nazev_spolecnosti,
    ico,
    dic,
    adresa,
    telefon,
    pocet_zamestnancu,
    odhadovany_obrat,
    je_dluznik,
    mesicni_fakturace,
    pouzivane_technologie,
    pozadovane_technologie,
    portfolio_prunik
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
      cil_schuzky: validated.cil_schuzky ?? null,
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
// updateCilSchuzky — auto-save cíle schůzky
// ============================================================
export async function updateCilSchuzky(
  meetingId: string,
  cil_schuzky: string | null
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Nepřihlášený uživatel' }

    const { error } = await supabase
      .from('udalosti_planovani')
      .update({ cil_schuzky, upravil_id: user.id, aktualizovano_at: new Date().toISOString() })
      .eq('id', meetingId)

    if (error) throw error
    revalidatePath('/planovani/schuzky')
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

// ============================================================
// updateZapisSchuzky — auto-save textového záznamu ze schůzky
// ============================================================
export async function updateZapisSchuzky(
  meetingId: string,
  zapis: string | null
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Nepřihlášený uživatel' }

    const { error } = await supabase
      .from('udalosti_planovani')
      .update({ zapis, upravil_id: user.id, aktualizovano_at: new Date().toISOString() })
      .eq('id', meetingId)

    if (error) throw error
    revalidatePath('/planovani/schuzky')
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

// Helper function to convert TiPtap HTML to clean plain text/markdown style for Gemini
function cleanHtmlForAI(html: string): string {
  if (!html) return '';
  return html
    // Convert list items to markdown list format
    .replace(/<li>/gi, '\n- ')
    .replace(/<\/li>/gi, '')
    // Convert paragraph tags to newlines
    .replace(/<p>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    // Convert line breaks to newlines
    .replace(/<br\s*\/?>/gi, '\n')
    // Remove presentation tags (spans, marks, etc)
    .replace(/<span\b[^>]*>/gi, '')
    .replace(/<\/span>/gi, '')
    .replace(/<mark\b[^>]*>/gi, '')
    .replace(/<\/mark>/gi, '')
    // Remove all remaining HTML tags
    .replace(/<[^>]*>/g, ' ')
    // Decode HTML entities
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    // Split, clean lines and collapse spacing
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .join('\n')
    .trim();
}

// Helper to escape and format inline markdown formatting (bold, italic)
function formatInlineMarkdown(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>');
}

// Convert markdown returned by Gemini to rich text HTML for TipTap editor
function markdownToHtml(md: string): string {
  if (!md) return '';
  
  const lines = md.split('\n');
  const result: string[] = [];
  let inList = false;

  for (let line of lines) {
    const trimmed = line.trim();
    
    // Checklist or bullet points
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      if (!inList) {
        result.push('<ul>');
        inList = true;
      }
      const itemContent = trimmed.substring(2).trim();
      result.push(`<li>${formatInlineMarkdown(itemContent)}</li>`);
      continue;
    }

    // Close list if we are exiting bullet items
    if (inList && !trimmed.startsWith('- ') && !trimmed.startsWith('* ')) {
      result.push('</ul>');
      inList = false;
    }

    if (!trimmed) {
      continue;
    }

    // Headers
    if (trimmed.startsWith('### ')) {
      result.push(`<h3>${formatInlineMarkdown(trimmed.substring(4))}</h3>`);
    } else if (trimmed.startsWith('## ')) {
      result.push(`<h2>${formatInlineMarkdown(trimmed.substring(3))}</h2>`);
    } else if (trimmed.startsWith('# ')) {
      result.push(`<h1>${formatInlineMarkdown(trimmed.substring(2))}</h1>`);
    } else {
      // Regular paragraph
      result.push(`<p>${formatInlineMarkdown(trimmed)}</p>`);
    }
  }

  if (inList) {
    result.push('</ul>');
  }

  return result.join('\n');
}

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

    // 2. Příprava promptu pro Gemini (s vyčištěným HTML)
    const dateFormatted = new Date(meeting.datum_zahajeni).toLocaleDateString('cs-CZ')
    
    const cleanZapis = cleanHtmlForAI(meeting.zapis || '')
    const cleanSurovyPrepis = cleanHtmlForAI(meeting.surovy_prepis || '')
    const cleanPriprava = cleanHtmlForAI(meeting.priprava || '')
    const cleanCustomTranscript = customTranscript ? cleanHtmlForAI(customTranscript) : ''

    const isAudio = !!audioBase64
    const isRecalculate = !audioBase64 && !!customTranscript

    let sourceInputDesc = ''
    let responseFormatDesc = ''

    if (isAudio) {
      sourceInputDesc = `
K tomuto requestu je přiložen zvukový záznam (audio) s diktováním nových poznámek ze schůzky.
Poslechni si nahrávku a ulož její doslovný a přesný přepis (v českém jazyce) do klíče "transcript" (jako čistý text bez HTML).
Pokud v nahrávce zazní specifické pojmy, napiš je správně gramaticky.

Zde je dosavadní surový přepis schůzky (předchozí diktování/poznámky):
---
${cleanSurovyPrepis || 'Bez předchozího přepisu.'}
---
DŮLEŽITÉ: Jako podklad pro generování "summaryMarkdown", "tasks" a "followUpEmail" použij jak dosavadní surový přepis schůzky, tak novou nahrávku. Ale v klíči "transcript" vrať POUZE přepis té nové nahrávky jako čistý text (předchozí přepis k němu připojíme programově v aplikaci).`

      responseFormatDesc = `
Vrátíš JSON objekt s těmito klíči:
1. "transcript": Doslovný přepis nové audio nahrávky jako čistý text bez jakýchkoli HTML tagů.
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
4. "followUpEmail": Návrh profesionálního, slušného a výstižného follow-up e-mailu pro klienta/dodavatele v českém jazyce. Měl by shrnout hlavní body schůzky a další postup. Pokud jde o interní meeting, napiš sem stručné shrnutí pro interní oběžník, jinak pro externí schůzku naformátuj e-mail s předmětem a tělem.`
    } else if (isRecalculate) {
      sourceInputDesc = `
Uživatel ručně upravil surový přepis schůzky. Použij tento text jako hlavní zdroj pro zápis a analýzu:
---
${cleanCustomTranscript}
---`

      responseFormatDesc = `
Vrátíš JSON objekt s těmito klíči:
1. "summaryMarkdown": Krásně strukturovaný zápis v češtině (Markdown). Měl by obsahovat:
   - Stručný souhrn schůzky (Executive Summary)
   - Seznam klíčových rozhodnutí (Key Decisions)
   - Stručné shrnutí jednotlivých témat, která se projednala
2. "tasks": Pole nově navržených úkolů (akčních kroků). Pro každý úkol urči:
   - "nazev": krátký výstižný název úkolu
   - "popis": detailní vysvětlení, co se má udělat
   - "vlastnik_id": UUID vlastníka ze seznamu výše (pokud dokážeš jednoznačně ztotožnit např. "Martin", "Filip" s ID z tabulky). Pokud nevíš, nech null.
   - "datum_splatnosti": termín splnění ve formátu YYYY-MM-DD. Pokud byl termín vyjádřen relativně vůči datu schůzky (např. "do pátku", "do týdne"), spočítej přesné datum vůči datu schůzky ${meeting.datum_zahajeni}. Pokud termín chybí, nech null.
   - "oddeleni": jedno z: management, sales, purchasing, logistics, backbone, finance, rd, marketing, backoffice, legal. Vyber podle zaměření úkolu.
3. "followUpEmail": Návrh profesionálního, slušného a výstižného follow-up e-mailu pro klienta/dodavatele v českém jazyce. Měl by shrnout hlavní body schůzky a další postup. Pokud jde o interní meeting, napiš sem stručné shrnutí pro interní oběžník, jinak pro externí schůzku naformátuj e-mail s předmětem a tělem.`
    } else {
      sourceInputDesc = `
Použij tyto stávající poznámky/zápis jako hlavní zdroj pro analýzu a vygenerování výstupů:
---
${cleanZapis || 'Bez zápisu.'}
---`

      responseFormatDesc = `
Vrátíš JSON objekt s těmito klíči:
1. "summaryMarkdown": Krásně strukturovaný zápis v češtině (Markdown). Měl by obsahovat:
   - Stručný souhrn schůzky (Executive Summary)
   - Seznam klíčových rozhodnutí (Key Decisions)
   - Stručné shrnutí jednotlivých témat, která se projednala
2. "tasks": Pole nově navržených úkolů (akčních kroků). Pro každý úkol urči:
   - "nazev": krátký výstižný název úkolu
   - "popis": detailní vysvětlení, co se má udělat
   - "vlastnik_id": UUID vlastníka ze seznamu výše (pokud dokážeš jednoznačně ztotožnit např. "Martin", "Filip" s ID z tabulky). Pokud nevíš, nech null.
   - "datum_splatnosti": termín splnění ve formátu YYYY-MM-DD. Pokud byl termín vyjádřen relativně vůči datu schůzky (např. "do pátku", "do týdne"), spočítej přesné datum vůči datu schůzky ${meeting.datum_zahajeni}. Pokud termín chybí, nech null.
   - "oddeleni": jedno z: management, sales, purchasing, logistics, backbone, finance, rd, marketing, backoffice, legal. Vyber podle zaměření úkolu.
3. "followUpEmail": Návrh profesionálního, slušného a výstižného follow-up e-mailu pro klienta/dodavatele v českém jazyce. Měl by shrnout hlavní body schůzky a další postup. Pokud jde o interní meeting, napiš sem stručné shrnutí pro interní oběžník, jinak pro externí schůzku naformátuj e-mail s předmětem a tělem.`
    }

    const promptText = `
Jsi asistent řízení projektů pro společnost AZ-Composites.
Máme schůzku s názvem "${meeting.nazev}" konanou dne ${dateFormatted} (typ: ${meeting.typ === 'schuzka' ? 'externí schůzka se zákazníkem/dodavateli' : 'interní meeting'}).

Zde je předem připravený plán a cíle schůzky (příprava):
---
${cleanPriprava || 'Bez přípravy.'}
---

Zde je seznam témat schůzky (agenda):
${JSON.stringify(meeting.agenda, null, 2)}

${sourceInputDesc}

Úkoly pro spárování vlastníků (vlastnik_id):
${userListText}

Zpracuj tyto vstupní údaje a vygeneruj JSON výstup podle následující specifikace.
${responseFormatDesc}

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

    // Sloučení nového přepisu se stávajícím pokud se jedná o audio nahrávku, nebo ošetření textových přepisů
    let finalTranscript = ''
    if (isAudio) {
      const newTranscript = (result.transcript || '').trim()
      if (meeting.surovy_prepis) {
        finalTranscript = `${meeting.surovy_prepis}\n\n${newTranscript}`.trim()
      } else {
        finalTranscript = newTranscript
      }
    } else if (isRecalculate) {
      finalTranscript = cleanCustomTranscript
    } else {
      // Pro notes: pokud je surovy_prepis prázdný, přesuneme tam zapsané poznámky před tím, než
      // zapis přepíšeme AI výstupem. Tím nepřijde uživatel o surové poznámky.
      finalTranscript = meeting.surovy_prepis || cleanZapis
    }

    // Convert markdown returned from AI to HTML for the rich text editor
    const finalSummary = markdownToHtml(result.summaryMarkdown || '')
    const finalEmail = result.followUpEmail || ''
    const serializedTasks = Array.isArray(result.tasks) ? JSON.stringify(result.tasks) : '[]'

    // 4. Uložení zápisu, sloučeného přepisu, e-mailu a DRAFT úkolů do schůzky
    // Stav schůzky zůstává beze změny (neschváleno)
    await supabase
      .from('udalosti_planovani')
      .update({
        zapis: finalSummary,
        surovy_prepis: finalTranscript,
        email_navrh: finalEmail,
        popis: serializedTasks, // Zde ukládáme navržené úkoly jako draft
        upravil_id: user.id,
        aktualizovano_at: new Date().toISOString()
      })
      .eq('id', meetingId)

    revalidatePath('/planovani')
    revalidatePath('/planovani/kalendar')
    revalidatePath('/planovani/schuzky')
    
    return { 
      success: true, 
      data: {
        summary: finalSummary,
        transcript: finalTranscript,
        email_navrh: finalEmail,
        createdTasks: result.tasks || []
      }
    }
  } catch (e: any) {
    console.error('Error in generateMeetingOutputViaAI:', e)
    return { success: false, error: e.message || 'Neočekávaná chyby při zpracování AI' }
  }
}

// ============================================================
// schvalitUdalostVystupy
// ============================================================
export async function schvalitUdalostVystupy(
  meetingId: string,
  finalZapis: string,
  finalEmail: string,
  tasks: any[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Nepřihlášený uživatel' }

    // 1. Načteme schůzku pro získání cizích klíčů
    const { data: meeting, error: meetingError } = await supabase
      .from('udalosti_planovani')
      .select('*')
      .eq('id', meetingId)
      .single()

    if (meetingError || !meeting) {
      return { success: false, error: 'Nepodařilo se načíst schůzku.' }
    }

    // 2. Uložíme schválený zápis a přepneme stav schůzky na 'completed'
    // Vyčistíme draft úkolů z pole popis
    const { error: updateError } = await supabase
      .from('udalosti_planovani')
      .update({
        zapis: finalZapis,
        email_navrh: finalEmail,
        stav: 'completed',
        popis: null, // Vyčistíme drafty z popisu
        upravil_id: user.id,
        aktualizovano_at: new Date().toISOString()
      })
      .eq('id', meetingId)

    if (updateError) throw updateError

    // 3. Uložení/synchronizace zápisu do modulu Poznámky (Knowledge Base)
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

    const dateFormatted = new Date(meeting.datum_zahajeni).toLocaleDateString('cs-CZ')
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
      obsah: `<div class="prose max-w-none">${finalZapis}</div>`,
      obsah_txt: finalZapis,
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

    // 4. Uložení úkolů do ukoly_planovani
    // Smazat případné dříve vytvořené úkoly pro tuto schůzku
    await supabase
      .from('ukoly_planovani')
      .update({ deleted_at: new Date().toISOString() })
      .eq('parent_meeting_id', meetingId)

    if (Array.isArray(tasks) && tasks.length > 0) {
      for (const t of tasks) {
        await supabase
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
      }
    }

    revalidatePath('/planovani')
    revalidatePath('/planovani/kalendar')
    revalidatePath('/planovani/schuzky')
    revalidatePath('/poznamky')

    return { success: true }
  } catch (e: any) {
    console.error('Error in schvalitUdalostVystupy:', e)
    return { success: false, error: e.message || 'Neočekávaná chyba při schvalování' }
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
          nazev_spolecnosti,
          ico,
          dic,
          adresa,
          telefon,
          pocet_zamestnancu,
          odhadovany_obrat,
          je_dluznik,
          pouzivane_technologie,
          pozadovane_technologie,
          portfolio_prunik
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



