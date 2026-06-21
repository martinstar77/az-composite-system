'use server'

import QRCode from 'qrcode'
import { buildSpaydString, cisloDokladuNaVS, czechAccountToIban } from '../utils/spayd'
import type { FiremniProfil } from '../types'

/**
 * Vygeneruje QR platební kód jako PNG data URI.
 * Lze přímo vložit jako <img src="..."> nebo do PDF přes react-pdf.
 *
 * Vrátí null, pokud IBAN není vyplněn — QR bez IBAN nemá smysl.
 */
export async function generatePaymentQR(params: {
  cisloDokladu: string
  kUhrade: number
  mena?: string
  firemniProfil: FiremniProfil
}): Promise<string | null> {
  let iban = params.firemniProfil.iban

  if (params.firemniProfil.typ_spojeni === 'uctu' && params.firemniProfil.cislo_uctu) {
    const calculatedIban = czechAccountToIban(params.firemniProfil.cislo_uctu)
    if (calculatedIban) {
      iban = calculatedIban
    }
  }

  const spayd = buildSpaydString({
    iban:             iban,
    castka:           params.kUhrade,
    mena:             params.mena ?? 'CZK',
    variabilniSymbol: cisloDokladuNaVS(params.cisloDokladu),
    zprava:           `Faktura ${params.cisloDokladu}`,
  })

  if (!spayd) return null

  try {
    const dataUri = await QRCode.toDataURL(spayd, {
      errorCorrectionLevel: 'M',
      margin: 1,
      width: 200,
      color: {
        dark:  '#000000',
        light: '#ffffff',
      },
    })
    return dataUri
  } catch (err) {
    console.error('[generatePaymentQR] Chyba:', err)
    return null
  }
}

/**
 * Vygeneruje QR platební kód jako SVG string.
 * Alternativa k PNG — vektorový formát pro tisk.
 */
export async function generatePaymentQRSvg(params: {
  cisloDokladu: string
  kUhrade: number
  mena?: string
  firemniProfil: FiremniProfil
}): Promise<string | null> {
  let iban = params.firemniProfil.iban

  if (params.firemniProfil.typ_spojeni === 'uctu' && params.firemniProfil.cislo_uctu) {
    const calculatedIban = czechAccountToIban(params.firemniProfil.cislo_uctu)
    if (calculatedIban) {
      iban = calculatedIban
    }
  }

  const spayd = buildSpaydString({
    iban:             iban,
    castka:           params.kUhrade,
    mena:             params.mena ?? 'CZK',
    variabilniSymbol: cisloDokladuNaVS(params.cisloDokladu),
    zprava:           `Faktura ${params.cisloDokladu}`,
  })

  if (!spayd) return null

  try {
    return await QRCode.toString(spayd, {
      type:             'svg',
      errorCorrectionLevel: 'M',
      margin: 1,
    })
  } catch (err) {
    console.error('[generatePaymentQRSvg] Chyba:', err)
    return null
  }
}
