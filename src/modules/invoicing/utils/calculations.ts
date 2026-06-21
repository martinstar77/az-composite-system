import type { DokladPolozka, DokladSoucty, DphSazka } from '../types'

/**
 * Vypočítá součty řádku na základě vstupních hodnot.
 * Používáme v editoru položek pro live preview.
 */
export function vypocitejRadek(params: {
  mnozstvi: number
  cena_bez_dph: number
  sazba_dph: number
  sleva_procent: number
}): { radek_bez_dph: number; radek_dph: number; radek_celkem: number } {
  const zaklad = params.mnozstvi * params.cena_bez_dph * (1 - params.sleva_procent / 100)
  const dph = zaklad * (params.sazba_dph / 100)
  return {
    radek_bez_dph: round2(zaklad),
    radek_dph:     round2(dph),
    radek_celkem:  round2(zaklad + dph),
  }
}

/**
 * Vypočítá kompletní součty celého dokladu včetně DPH rekapitulace.
 * Výsledek se zobrazuje v zápatí formuláře i v PDF.
 */
export function vypocitejSoucty(polozky: DokladPolozka[]): DokladSoucty {
  const dphMap = new Map<number, { zaklad: number; dph: number }>()

  let celkem_bez_dph = 0
  let celkem_dph = 0
  let zalohovy_odpocet = 0

  for (const p of polozky) {
    if (p.typ === 'text_radek') continue

    if (p.typ === 'zalohovy_odpocet') {
      zalohovy_odpocet += Math.abs(p.radek_celkem)
      continue
    }

    celkem_bez_dph += p.radek_bez_dph
    celkem_dph += p.radek_dph

    // Akumulace do sazby DPH
    const existing = dphMap.get(p.sazba_dph) ?? { zaklad: 0, dph: 0 }
    dphMap.set(p.sazba_dph, {
      zaklad: existing.zaklad + p.radek_bez_dph,
      dph:    existing.dph + p.radek_dph,
    })
  }

  const dph_sazky: DphSazka[] = Array.from(dphMap.entries())
    .sort(([a], [b]) => a - b)
    .map(([sazba, { zaklad, dph }]) => ({
      sazba,
      zaklad: round2(zaklad),
      dph:    round2(dph),
      celkem: round2(zaklad + dph),
    }))

  const celkem_s_dph = round2(celkem_bez_dph + celkem_dph)
  const k_uhrade = round2(celkem_s_dph - zalohovy_odpocet)

  return {
    celkem_bez_dph: round2(celkem_bez_dph),
    dph_sazky,
    celkem_dph:     round2(celkem_dph),
    celkem_s_dph,
    zalohovy_odpocet: round2(zalohovy_odpocet),
    k_uhrade,
  }
}

/**
 * Zaokrouhlí číslo na 2 desetinná místa (standardní bankovní zaokrouhlení).
 */
export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

/**
 * Formátuje číslo jako měnovou hodnotu v CZK.
 */
export function formatCzk(value: number): string {
  return new Intl.NumberFormat('cs-CZ', {
    style:    'currency',
    currency: 'CZK',
    minimumFractionDigits: 2,
  }).format(value)
}

/**
 * Formátuje číslo jako měnovou hodnotu v zadané měně.
 */
export function formatMena(value: number, mena: string = 'CZK'): string {
  return new Intl.NumberFormat('cs-CZ', {
    style:    'currency',
    currency: mena,
    minimumFractionDigits: 2,
  }).format(value)
}

/**
 * Formátuje datum do českého formátu DD.MM.YYYY
 */
export function formatDatum(datum: string | null | undefined): string {
  if (!datum) return '—'
  return new Date(datum).toLocaleDateString('cs-CZ', {
    day:   '2-digit',
    month: '2-digit',
    year:  'numeric',
  })
}

/**
 * Přidá N dní k aktuálnímu datu a vrátí jako YYYY-MM-DD string.
 */
export function addDays(days: number, from?: Date): string {
  const date = from ?? new Date()
  date.setDate(date.getDate() + days)
  return date.toISOString().split('T')[0]
}

/**
 * Vrátí aktuální datum ve formátu YYYY-MM-DD.
 */
export function dnesISO(): string {
  return new Date().toISOString().split('T')[0]
}
