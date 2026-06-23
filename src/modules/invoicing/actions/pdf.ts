import { createElement } from 'react'
import { createClient } from '@/shared/lib/supabase/server'
import { generatePaymentQR } from './qr'
import { getFiremniProfil } from './settings'
import { getDokladById } from './documents'
import { vypocitejSoucty } from '../utils/calculations'

/**
 * Vygeneruje PDF pro doklad a vrátí jej jako Buffer.
 * Volej ze Server Action nebo Route Handleru — NIKDY z Client Component.
 *
 * Příklad použití v route handleru:
 *   const buffer = await generateDokladPDF(id)
 *   return new Response(buffer, {
 *     headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="${cislo}.pdf"` }
 *   })
 */
export async function generateDokladPDF(dokladId: string): Promise<Buffer | null> {
  // Force React 19 reconciler version detection override programmatically
  process.env.OVERRIDE_REACT_PDF_RECONCILER_REACT_VERSION = '19.0.0'
  const { renderToBuffer } = await import('@react-pdf/renderer')
  const { InvoicePDF } = await import('../components/InvoicePDF')

  // 1. Načíst doklad se všemi vztahy
  const doklad = await getDokladById(dokladId)
  if (!doklad) {
    throw new Error(`Doklad s ID "${dokladId}" nebyl nalezen v databázi.`);
  }

  // 2. Načíst firemní profil (pro případ, že snapshot chybí — starší doklady)
  const firemniProfil = doklad.firemni_udaje_snapshot ?? await getFiremniProfil()
  if (!firemniProfil) {
    throw new Error(`Firemní profil nebyl nalezen (ani v snapshotu dokladu, ani v globálním nastavení).`);
  }

  // Zajistit že doklad má snapshot
  if (!doklad.firemni_udaje_snapshot) {
    doklad.firemni_udaje_snapshot = firemniProfil
  }

  // 3. Vygenerovat QR platbu (pouze pro faktury a zálohy s bankovním převodem)
  let qrDataUri: string | null = null
  const soucty = vypocitejSoucty(doklad.polozky ?? [])

  if (
    (doklad.typ === 'faktura' || doklad.typ === 'zalohova_faktura') &&
    doklad.zpusob_uhrady === 'prevod' &&
    soucty.k_uhrade > 0
  ) {
    qrDataUri = await generatePaymentQR({
      cisloDokladu: doklad.cislo,
      kUhrade:      soucty.k_uhrade,
      mena:         doklad.mena,
      firemniProfil,
    })
  }

  // 4. Renderovat PDF
  try {
    const buffer = await renderToBuffer(
      createElement(InvoicePDF, { doklad, qrDataUri }) as any
    )
    return Buffer.from(buffer)
  } catch (err: any) {
    console.error('[generateDokladPDF] Chyba při renderování PDF:', err)
    throw new Error(`[react-pdf error] ${err.message}. Stack: ${err.stack || ''}`)
  }
}
