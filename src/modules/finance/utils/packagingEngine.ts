import { BaliciProfil, StandardBoxSize } from "../types/logistics"

export interface PackageDimensions {
  delka_cm: number
  sirka_cm: number
  vyska_cm: number
  volumetricWeight_kg: number   // = (d × š × v) / koeficient
  billedWeight_kg: number       // = max(realWeight, volumetricWeight)
  resolvedBy: 'override' | 'profile_fixed' | 'profile_roll_calc' | 'profile_box_lookup' | 'fallback'
  dopravce_hint?: string
}

// Fallback lookup lists if standard box sizes are not fetched/available
const DEFAULT_BOXES_ROVNOMERNE: Omit<StandardBoxSize, 'id' | 'vytvoreno_at' | 'aktualizovano_at'>[] = [
  { nazev: 'Mini 20×20×20', delka_cm: 20, sirka_cm: 20, vyska_cm: 20, max_hmotnost_kg: 8, je_dlouha: false, poradi: 10, poznamka: '', vytvoril_id: '', upravil_id: '' },
  { nazev: 'Malá 30×30×30', delka_cm: 30, sirka_cm: 30, vyska_cm: 30, max_hmotnost_kg: 18, je_dlouha: false, poradi: 20, poznamka: '', vytvoril_id: '', upravil_id: '' },
  { nazev: 'Střední 50×40×40', delka_cm: 50, sirka_cm: 40, vyska_cm: 40, max_hmotnost_kg: 24, je_dlouha: false, poradi: 30, poznamka: '', vytvoril_id: '', upravil_id: '' },
  { nazev: 'Velká 50×50×50', delka_cm: 50, sirka_cm: 50, vyska_cm: 50, max_hmotnost_kg: 30, je_dlouha: false, poradi: 40, poznamka: '', vytvoril_id: '', upravil_id: '' },
  { nazev: 'XL 60×60×50', delka_cm: 60, sirka_cm: 60, vyska_cm: 50, max_hmotnost_kg: 40, je_dlouha: false, poradi: 50, poznamka: '', vytvoril_id: '', upravil_id: '' },
]

const DEFAULT_BOXES_DLOUHE: Omit<StandardBoxSize, 'id' | 'vytvoreno_at' | 'aktualizovano_at'>[] = [
  { nazev: 'Dlouhá GLS 120×45×45', delka_cm: 120, sirka_cm: 45, vyska_cm: 45, max_hmotnost_kg: 30, je_dlouha: true, poradi: 60, poznamka: '', vytvoril_id: '', upravil_id: '' },
  { nazev: 'Dlouhá 142×45×45', delka_cm: 142, sirka_cm: 45, vyska_cm: 45, max_hmotnost_kg: 60, je_dlouha: true, poradi: 70, poznamka: '', vytvoril_id: '', upravil_id: '' },
  { nazev: 'Dlouhá 142×50×50', delka_cm: 142, sirka_cm: 50, vyska_cm: 50, max_hmotnost_kg: 80, je_dlouha: true, poradi: 80, poznamka: '', vytvoril_id: '', upravil_id: '' },
]

export function resolvePackageDimensions(
  realWeightKg: number,
  profile: BaliciProfil | null,
  overrides: { delka?: number | null; sirka?: number | null; vyska?: number | null },
  boxSizesList?: StandardBoxSize[]
): PackageDimensions {
  const koef = profile?.koeficient_objemove_hmotnosti ?? 5000

  // 1. Override priority
  if (overrides.delka && overrides.sirka && overrides.vyska) {
    const vol = (overrides.delka * overrides.sirka * overrides.vyska) / koef
    return {
      delka_cm: overrides.delka,
      sirka_cm: overrides.sirka,
      vyska_cm: overrides.vyska,
      volumetricWeight_kg: Number(vol.toFixed(3)),
      billedWeight_kg: Number(Math.max(realWeightKg, vol).toFixed(3)),
      resolvedBy: 'override'
    }
  }

  if (!profile) {
    return {
      delka_cm: overrides.delka ?? 0,
      sirka_cm: overrides.sirka ?? 0,
      vyska_cm: overrides.vyska ?? 0,
      volumetricWeight_kg: 0,
      billedWeight_kg: realWeightKg,
      resolvedBy: 'fallback'
    }
  }

  // 2. Resolve dimensions based on profile packaging type
  let delka = (profile.delka_cm ?? 0) + (profile.padding_delka_cm ?? 0)
  let sirka = 0
  let vyska = 0
  let resolvedBy: PackageDimensions['resolvedBy'] = 'profile_fixed'

  // Partition the boxes list
  const boxes = boxSizesList ?? []
  const dbBoxesRovnomerne = boxes.filter(b => !b.je_dlouha)
  const dbBoxesDlouhe = boxes.filter(b => b.je_dlouha)

  const activeBoxesRovnomerne = dbBoxesRovnomerne.length > 0 ? dbBoxesRovnomerne : DEFAULT_BOXES_ROVNOMERNE
  const activeBoxesDlouhe = dbBoxesDlouhe.length > 0 ? dbBoxesDlouhe : DEFAULT_BOXES_DLOUHE

  switch (profile.typ_obalu) {
    case 'role': {
      // Cylinder: length is fixed. Volume V = weight / density.
      // V = pi * r^2 * h => r = sqrt(V / (pi * h))
      // h is in dm (delka_cm / 10), V is in dm^3 (weight / density)
      const density = profile.hustota_kg_dm3 ?? 0.45
      const volumeDm3 = realWeightKg / density
      const hDm = delka / 10
      
      let prumerCm = 10 // Min 10 cm fallback
      if (hDm > 0) {
        const radiusDm = Math.sqrt(volumeDm3 / (Math.PI * hDm))
        prumerCm = Math.max(radiusDm * 2 * 10, 10)
      }
      
      sirka = Math.ceil(prumerCm + (profile.padding_sirka_cm ?? 0))
      vyska = Math.ceil(prumerCm + (profile.padding_vyska_cm ?? 0))
      resolvedBy = 'profile_roll_calc'
      break
    }

    case 'krabice_dlouha': {
      // Fixed length, width & height determined by weight lookup
      // Sort boxes by weight limit ascending
      const sortedBoxes = [...activeBoxesDlouhe].sort((a, b) => (a.max_hmotnost_kg ?? 9999) - (b.max_hmotnost_kg ?? 9999))
      const matchedBox = sortedBoxes.find(b => realWeightKg <= (b.max_hmotnost_kg ?? 9999)) ?? sortedBoxes[sortedBoxes.length - 1]
      
      sirka = matchedBox ? Number(matchedBox.sirka_cm) : 45
      vyska = matchedBox ? Number(matchedBox.vyska_cm) : 45
      // Use matchedBox length if the profile length is not defined
      if (!profile.delka_cm && matchedBox) {
        delka = Number(matchedBox.delka_cm) + (profile.padding_delka_cm ?? 0)
      }
      resolvedBy = 'profile_box_lookup'
      break
    }

    case 'krabice_standard': {
      // All 3 dimensions resolved by weight lookup
      const sortedBoxes = [...activeBoxesRovnomerne].sort((a, b) => (a.max_hmotnost_kg ?? 9999) - (b.max_hmotnost_kg ?? 9999))
      const matchedBox = sortedBoxes.find(b => realWeightKg <= (b.max_hmotnost_kg ?? 9999)) ?? sortedBoxes[sortedBoxes.length - 1]
      
      if (matchedBox) {
        delka = Number(matchedBox.delka_cm) + (profile.padding_delka_cm ?? 0)
        sirka = Number(matchedBox.sirka_cm) + (profile.padding_sirka_cm ?? 0)
        vyska = Number(matchedBox.vyska_cm) + (profile.padding_vyska_cm ?? 0)
      } else {
        delka = 30
        sirka = 30
        vyska = 30
      }
      resolvedBy = 'profile_box_lookup'
      break
    }

    default: {
      // sacek, paleta, krabice_volna
      sirka = (profile.sirka_cm ?? 0) + (profile.padding_sirka_cm ?? 0)
      vyska = (profile.vyska_cm ?? 0) + (profile.padding_vyska_cm ?? 0)
      resolvedBy = 'profile_fixed'
      break
    }
  }

  // Sanity check
  if (delka <= 0 || sirka <= 0 || vyska <= 0) {
    return {
      delka_cm: delka,
      sirka_cm: sirka,
      vyska_cm: vyska,
      volumetricWeight_kg: 0,
      billedWeight_kg: realWeightKg,
      resolvedBy: 'fallback'
    }
  }

  const vol = (delka * sirka * vyska) / koef
  return {
    delka_cm: Number(delka.toFixed(1)),
    sirka_cm: Number(sirka.toFixed(1)),
    vyska_cm: Number(vyska.toFixed(1)),
    volumetricWeight_kg: Number(vol.toFixed(3)),
    billedWeight_kg: Number(Math.max(realWeightKg, vol).toFixed(3)),
    resolvedBy
  }
}
