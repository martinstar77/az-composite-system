/**
 * SPAYD (Short Payment Descriptor) — Czech/EU QR Payment standard
 *
 * Podporováno: Česká spořitelna, ČSOB, Komerční banka, Fio banka,
 *              Moneta, Raiffeisen, Air Bank a další.
 *
 * Zákazník naskenuje QR v mobilní bance → platba je předvyplněna automaticky.
 */

export interface SpaydParams {
  iban:               string   // CZ1234567890123456789012
  castka:             number   // Celková částka k úhradě
  mena?:              string   // Výchozí: 'CZK'
  variabilniSymbol:   string   // Číslo dokladu bez prefixu (např. '20260001')
  zprava?:            string   // Popis platby (max 60 znaků)
}

/**
 * Sestaví SPAYD QR string pro QR platbu.
 * Vrátí null, pokud IBAN není vyplněn (QR bez IBAN nemá smysl).
 */
export function buildSpaydString(params: SpaydParams): string | null {
  if (!params.iban || params.iban.trim() === '') return null

  // Variabilní symbol — extrahujeme číslice z čísla dokladu
  // 'FAK-2026-0001' → '20260001'
  const vs = params.variabilniSymbol
    .replace(/[^0-9]/g, '')  // odstranit non-numeric
    .slice(0, 10)             // max 10 číslic (limit SPAYD)

  const parts = [
    'SPD*1.0',
    `ACC:${params.iban.replace(/\s/g, '')}`,
    `AM:${params.castka.toFixed(2)}`,
    `CC:${params.mena ?? 'CZK'}`,
  ]

  if (vs) {
    parts.push(`X-VS:${vs}`)
  }

  if (params.zprava) {
    // SPAYD spec: max 60 znaků, žádné hvězdičky v hodnotě
    const zprava = params.zprava.replace(/\*/g, ' ').slice(0, 60)
    parts.push(`MSG:${zprava}`)
  }

  return parts.join('*')
}

/**
 * Extrahuje číselnout část z čísla dokladu pro variabilní symbol.
 * Příklad: 'FAK-2026-0001' → '20260001'
 */
export function cisloDokladuNaVS(cislo: string): string {
  return cislo.replace(/[^0-9]/g, '').slice(0, 10)
}

/**
 * Převede české číslo účtu (např. "19-20001/0100" nebo "23048255/2010") na mezinárodní formát IBAN.
 * Vrátí null, pokud je formát neplatný.
 */
export function czechAccountToIban(accountStr: string): string | null {
  if (!accountStr) return null

  // Odstranit mezery
  const cleanStr = accountStr.replace(/\s/g, '')

  // Regulární výraz pro české bankovní účty:
  // volitelné předčíslí (1-6 číslic) pomlčka, číslo účtu (2-10 číslic), lomítko, kód banky (4 číslice)
  const match = cleanStr.match(/^(?:(\d{1,6})-)?(\d{2,10})\/(\d{4})$/)
  if (!match) return null

  const prefix = match[1] || '0'
  const number = match[2]
  const bankCode = match[3]

  // Doplnění nulami na standardní délku: předčíslí 6 znaků, číslo účtu 10 znaků
  const paddedPrefix = prefix.padStart(6, '0')
  const paddedNumber = number.padStart(10, '0')

  // Kód země CZ je 1235 numericky, kontrolní součet nahradíme '00' na konci před výpočtem
  // Celý řetězec pro výpočet kontrolních číslic: Kód banky + Předčíslí + Číslo + Kód země + '00'
  // SPD/IBAN norma: BBBB PPPPPP NNNNNNNNNN CZ 00 -> numeric: BBBBPPPPPPNNNNNNNNNN123500
  const numericString = `${bankCode}${paddedPrefix}${paddedNumber}123500`

  try {
    const mod = BigInt(numericString) % BigInt(97)
    const checksum = BigInt(98) - mod
    const checksumStr = checksum.toString().padStart(2, '0')
    return `CZ${checksumStr}${bankCode}${paddedPrefix}${paddedNumber}`
  } catch (e) {
    console.error('[czechAccountToIban] Chyba při převodu na BigInt:', e)
    return null
  }
}
