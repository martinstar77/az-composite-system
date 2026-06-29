/**
 * logisticsCalculator.ts
 *
 * A pure, deterministic utility for the AZ-Composites logistics engine.
 * Responsibilities:
 *   1. calculateGrossWeight()   — auto-computes hmotnost_baliku_kg from specifikace
 *   2. resolvePackagingProfile() — auto-selects the correct Balicí profil for a product
 *
 * No side-effects, no DB calls, no React state. Pure functions only.
 * Can be used in: ProductForm.tsx (live UI), Server Actions, bulk operations.
 */

import type { BaliciProfil } from "@/modules/finance/types/logistics"

// ---------------------------------------------------------------------------
// Public Types
// ---------------------------------------------------------------------------

export type WeightConfidence = "high" | "medium" | "low"

export interface WeightEstimate {
  /** Computed gross package weight in kg. null if data is insufficient. */
  weightKg: number | null
  /** How reliable this estimate is — drives the UI indicator */
  confidence: WeightConfidence
  /** Human-readable breakdown for display in the form tooltip */
  breakdown: string
  /** Computed net weight of product contents in kg (optional) */
  netWeightKg?: number | null
}

// ---------------------------------------------------------------------------
// Internal Constants
// ---------------------------------------------------------------------------

/** Density (kg/L) by resin chemistry code */
const RESIN_DENSITY: Record<string, number> = {
  EP: 1.15,   // Epoxy resin
  HRD: 0.95,  // Epoxy hardener
  VE: 1.12,   // Vinyl ester
  PE: 1.13,   // Polyester
  GEL: 1.20,  // Gelcoat
}

/** Drum / IBC container tare weight by volume (kg) */
function containerTareKg(volumeL: number): number {
  if (volumeL <= 5) return 0.5
  if (volumeL <= 25) return 2.5
  if (volumeL <= 100) return 8.0
  if (volumeL <= 200) return 18.0
  if (volumeL <= 400) return 35.0
  return 60.0  // 1000L IBC pallet
}

/** Density (kg/L) by adhesive chemistry code */
const ADHESIVE_DENSITY: Record<string, number> = {
  EP: 1.40,
  PU: 1.15,
  MMA: 1.05,
  MS: 1.30,
  ACR: 1.10,
}

/** Weight per connector piece (kg) by outer diameter (mm) */
function connectorWeightKg(diameterMm: number): number {
  if (diameterMm <= 16) return 0.025
  if (diameterMm <= 25) return 0.045
  if (diameterMm <= 35) return 0.080
  return 0.120
}

/** Weight per fastener piece (g) by thread size string e.g. "M8" */
function fastenerWeightG(threadSize: string): number {
  const map: Record<string, number> = {
    M4: 2, M5: 3, M6: 5, M8: 10, M10: 18, M12: 30, M16: 60
  }
  return map[threadSize?.toUpperCase()] ?? 10  // fallback: M8 weight
}

/** Parse a thickness string like "10MM", "25mm", "10" into meters */
function parseThicknessM(raw: string | number | null | undefined): number | null {
  if (raw == null) return null
  const str = String(raw).replace(/[^0-9.]/g, "")
  const val = parseFloat(str)
  if (isNaN(val) || val <= 0) return null
  // Heuristic: if value > 1 it's in mm, convert to m
  return val > 1 ? val / 1000 : val
}

/** Parse a volume string like "5L", "500 ml", "5", "500ml" — returns litres */
function parseVolumeL(raw: string | number | null | undefined, assumeMl = false): number | null {
  if (raw == null) return null
  let str = String(raw).trim().toLowerCase()
  if (/^0\d+/.test(str)) {
    str = str.replace(/^(0)(\d+)/, "$1.$2")
  }
  const num = parseFloat(str.replace(/[^0-9.]/g, ""))
  if (isNaN(num) || num <= 0) return null
  if (str.includes("ml") || assumeMl) return num / 1000
  if (str.includes("l")) return num
  if (num >= 500) return num / 1000 // Heuristic: if >= 500 without unit, assume ml
  return num  // assume litres
}

/** Parse a weight string like "1 kg", "500 g", "1.5" — returns kg */
function parseWeightKg(raw: string | number | null | undefined): number | null {
  if (raw == null) return null
  let str = String(raw).trim().toLowerCase()
  if (/^0\d+/.test(str)) {
    str = str.replace(/^(0)(\d+)/, "$1.$2")
  }
  const num = parseFloat(str.replace(/[^0-9.]/g, ""))
  if (isNaN(num) || num <= 0) return null
  if (str.includes("g") && !str.includes("kg")) return num / 1000
  return num  // assume kg
}

/** Round to 2 decimal places (retained name r3 to avoid refactoring of internal calls) */
function r3(n: number): number {
  return Math.round(n * 100) / 100
}/** Density (kg/m³) by tube/hose material code */
const TUBE_DENSITY: Record<string, number> = {
  HDPE: 950,
  PET: 1380,
}

/** Calculate hollow cylinder (tube/hose) weight (kg) */
function calculateHollowCylinderWeight(innerDiameterMm: number, lengthM: number, densityKgm3: number): number {
  const id = innerDiameterMm
  const od = id <= 12 ? id + 2 : id + 3
  const rOuter = od / 2000 // outer radius in meters
  const rInner = id / 2000 // inner radius in meters
  const areaPlasticM2 = Math.PI * (Math.pow(rOuter, 2) - Math.pow(rInner, 2))
  return areaPlasticM2 * lengthM * densityKgm3
}

/** Calculate hollow rectangular profile (flat flow channel tape) weight (kg) */
function calculateHollowRectWeight(widthMm: number, heightMm: number, lengthM: number, densityKgm3: number): number {
  const w = widthMm
  const h = heightMm
  const t = h <= 10 ? 1.0 : 1.5
  const wIn = Math.max(0, w - 2 * t)
  const hIn = Math.max(0, h - 2 * t)
  const areaPlasticM2 = (w * h - wIn * hIn) / 1000000
  return areaPlasticM2 * lengthM * densityKgm3
}

// ---------------------------------------------------------------------------
// Main Export: calculateGrossWeight
// ---------------------------------------------------------------------------

/**
 * Calculate the estimated gross package weight (hmotnost_baliku_kg) for a product.
 *
 * @param kategorieId   - The product category ID (e.g. "vyztuzne_materialy")
 * @param specs         - The specifikace JSONB object from the product
 * @param mnozstviVBaleni - The quantity per package (mnozstvi_v_baleni)
 * @returns WeightEstimate with weightKg, confidence, and a breakdown string
 */
export function calculateGrossWeight(
  kategorieId: string,
  specs: Record<string, unknown>,
  mnozstviVBaleni: number
): WeightEstimate {

  const s = specs // shorthand

  switch (kategorieId) {

    // -----------------------------------------------------------------------
    // FABRICS (Výztužné materiály)
    // -----------------------------------------------------------------------
    case "vyztuzne_materialy": {
      const gramaz = Number(s.gramáž ?? s.gramaz_gm2 ?? 0)  // g/m²
      const sirka_cm = Number(s.sirka_cm ?? 0)
      const delka_m = Number(s.delka_m ?? 0)
      const packType = String(s.typ_baleni ?? "role")
      const qty = Number(s.pocet_kusu ?? 1)

      if (!gramaz || !sirka_cm || !delka_m) {
        return { weightKg: null, netWeightKg: null, confidence: "low", breakdown: "Chybí gramáž, šířka nebo délka." }
      }

      const sirka_m = sirka_cm / 100
      const net = (gramaz / 1000) * sirka_m * delka_m

      if (packType === "krabice") {
        const netTotal = net * qty
        const packaging = 0.5
        const total = r3(netTotal + packaging)
        return {
          weightKg: total,
          netWeightKg: r3(netTotal),
          confidence: "high",
          breakdown: `${r3(netTotal)} kg materiál (${qty} ks) + ${packaging} kg krabice = ${total} kg`
        }
      } else if (packType === "metraz") {
        // Cut-to-length, minimal packaging
        const total = r3(net + 0.05)
        return {
          weightKg: total,
          netWeightKg: r3(net),
          confidence: "high",
          breakdown: `${r3(net)} kg materiál + 0.05 kg balení = ${total} kg`
        }
      } else {
        // role (default)
        const tubeWeight = r3(sirka_m * 0.85)
        const packaging = 1.2
        const total = r3(net + tubeWeight + packaging)
        return {
          weightKg: total,
          netWeightKg: r3(net),
          confidence: "high",
          breakdown: `${r3(net)} kg net + ${tubeWeight} kg jádro + ${packaging} kg obal = ${total} kg`
        }
      }
    }

    // -----------------------------------------------------------------------
    // PREPREGS
    // -----------------------------------------------------------------------
    case "prepregy": {
      const gramaz = Number(s.gramáž ?? 0)
      const sirka_cm = Number(s.sirka_cm ?? 0)
      const delka_m = Number(s.delka_m ?? 0)

      if (!gramaz || !sirka_cm || !delka_m) {
        return { weightKg: null, netWeightKg: null, confidence: "low", breakdown: "Chybí gramáž, šířka nebo délka." }
      }

      const sirka_m = sirka_cm / 100
      const net = r3((gramaz / 1000) * sirka_m * delka_m)
      const tubeWeight = r3(sirka_m * 0.85)
      const packaging = 2.0  // extra: frozen gel packs + protective box
      const total = r3(net + tubeWeight + packaging)
      return {
        weightKg: total,
        netWeightKg: net,
        confidence: "high",
        breakdown: `${net} kg net + ${tubeWeight} kg jádro + ${packaging} kg obal/gelpacky = ${total} kg`
      }
    }

    // -----------------------------------------------------------------------
    // RESINS & GELCOATS (Pryskyřice a Gelcoaty)
    // -----------------------------------------------------------------------
    case "pryskyrice": {
      const chemie = String(s.chemie ?? s.typ ?? "EP").toUpperCase()
      const objem = Number(s.objem_nakup_l ?? 0)

      if (!objem) {
        return { weightKg: null, netWeightKg: null, confidence: "low", breakdown: "Chybí objem nákupu (objem_nakup_l)." }
      }

      const density = RESIN_DENSITY[chemie] ?? 1.15
      const tare = containerTareKg(objem)
      const net = r3(objem * density)
      // Resolve actual quantity as mnozstviVBaleni (number of canisters/pieces)
      const qty = mnozstviVBaleni || 1
      const total = r3((net + tare) * qty)
      const netTotal = r3(net * qty)

      let containerType = "kanystr"
      if (objem <= 5) containerType = "kanystr"
      else if (objem <= 25) containerType = "kanystr 20L"
      else if (objem <= 100) containerType = "ocelový sud 100L"
      else if (objem <= 200) containerType = "ocelový sud 200L"
      else if (objem <= 400) containerType = "IBC 400L"
      else containerType = "IBC paleta 1000L"

      return {
        weightKg: total,
        netWeightKg: netTotal,
        confidence: chemie in RESIN_DENSITY ? "high" : "medium",
        breakdown: `${qty} ks × (${objem}L × ${density} kg/L + ${tare} kg obal) = ${total} kg`
      }
    }

    // -----------------------------------------------------------------------
    // ADHESIVES (Lepidla — structural adhesive cartridges)
    // -----------------------------------------------------------------------
    case "lepidla": {
      const chemie = String(s.chemie ?? "EP").toUpperCase()
      const objem = parseVolumeL(s.objem as string, true)

      if (!objem) {
        return { weightKg: null, netWeightKg: null, confidence: "low", breakdown: "Chybí objem kartušy (objem)." }
      }

      const density = ADHESIVE_DENSITY[chemie] ?? 1.15
      const tare = 0.15  // cartridge body weight
      const net = r3(objem * density)
      const qty = mnozstviVBaleni || 1
      const total = r3((net + tare) * qty + (qty > 1 ? 0.15 : 0))
      const netTotal = r3(net * qty)
      return {
        weightKg: total,
        netWeightKg: netTotal,
        confidence: chemie in ADHESIVE_DENSITY ? "high" : "medium",
        breakdown: `${qty} ks × (${objem * 1000}ml × ${density} kg/L + ${tare} kg kartuše) + ${qty > 1 ? "0.15 kg krabice" : "0 kg"} = ${total} kg`
      }
    }

    // -----------------------------------------------------------------------
    // CONSUMABLE CHEMISTRY (Spotřební chemie a čističe)
    // -----------------------------------------------------------------------
    case "spotrebni_chemie": {
      const typ = String(s.typ ?? "CON").toUpperCase()
      const mnozstvi = s.mnozstvi as string

      if (typ === "WIP") {
        // Wipes — sold by piece count
        const n = parseFloat(String(mnozstvi).replace(/[^0-9]/g, "")) || 0
        if (!n) return { weightKg: null, netWeightKg: null, confidence: "low", breakdown: "Chybí počet utěrek." }
        const qty = mnozstviVBaleni || 1
        const total = r3((n * 0.004 + 0.12) * qty)
        const netTotal = r3(n * 0.004 * qty)
        return {
          weightKg: total,
          netWeightKg: netTotal,
          confidence: "medium",
          breakdown: `${qty} ks × (${n} ks × 4g + 0.12 kg krabice) = ${total} kg`
        }
      } else if (typ === "SPR") {
        // Aerosol spray
        const vol = parseVolumeL(mnozstvi, true)
        if (!vol) return { weightKg: null, netWeightKg: null, confidence: "low", breakdown: "Chybí objem spreje." }
        const qty = mnozstviVBaleni || 1
        const total = r3((vol * 0.85 + 0.08) * qty)
        const netTotal = r3(vol * 0.85 * qty)
        return {
          weightKg: total,
          netWeightKg: netTotal,
          confidence: "high",
          breakdown: `${qty} ks × (${vol * 1000}ml × 0.85 kg/L + 0.08 kg plechovka) = ${total} kg`
        }
      } else {
        // CON — liquid concentrate
        const vol = parseVolumeL(mnozstvi, false)
        if (!vol) return { weightKg: null, netWeightKg: null, confidence: "low", breakdown: "Chybí objem kapaliny." }
        const tare = vol <= 1 ? 0.15 : vol <= 5 ? 0.35 : 0.80
        const qty = mnozstviVBaleni || 1
        const net = r3(vol * 0.95)
        const total = r3((net + tare) * qty)
        const netTotal = r3(net * qty)
        return {
          weightKg: total,
          netWeightKg: netTotal,
          confidence: "high",
          breakdown: `${qty} ks × (${vol}L × 0.95 kg/L + ${tare} kg obal) = ${total} kg`
        }
      }
    }

    // -----------------------------------------------------------------------
    // CHEMIE (Spray adhesives, blinders, sealers, release agents)
    // -----------------------------------------------------------------------
    case "chemie": {
      const podkat = String(s.podkategorie ?? "").toLowerCase()
      const objem = s.objem as string | number

      if (podkat === "lepidlo_ve_spreji" || podkat === "blinder") {
        // Aerosol spray — objem is in ml
        const volMl = parseFloat(String(objem).replace(/[^0-9.]/g, "")) || 0
        if (!volMl) return { weightKg: null, netWeightKg: null, confidence: "low", breakdown: "Chybí objem spreje (ml)." }
        const qty = mnozstviVBaleni || 1
        const net = r3((volMl / 1000) * 0.85)
        const total = r3((net + 0.08) * qty)
        const netTotal = r3(net * qty)
        return {
          weightKg: total,
          netWeightKg: netTotal,
          confidence: "high",
          breakdown: `${qty} ks × (${volMl}ml × 0.85 kg/L + 0.08 kg plechovka) = ${total} kg`
        }
      } else {
        // sealer, release_agent — objem is in litres
        const vol = parseVolumeL(objem, false)
        if (!vol) return { weightKg: null, netWeightKg: null, confidence: "low", breakdown: "Chybí objem (L)." }
        const tare = containerTareKg(vol)
        const qty = mnozstviVBaleni || 1
        const net = r3(vol * 0.88)
        const total = r3((net + tare) * qty)
        const netTotal = r3(net * qty)
        return {
          weightKg: total,
          netWeightKg: netTotal,
          confidence: "high",
          breakdown: `${qty} ks × (${vol}L × 0.88 kg/L + ${tare} kg obal) = ${total} kg`
        }
      }
    }

    // -----------------------------------------------------------------------
    // CORES Standard & Active
    // -----------------------------------------------------------------------
    case "cores_standard":
    case "cores_active": {
      const hustota = Number(s.hustota_kgm3 ?? 0)
      const sirka_cm = Number(s.sirka_cm ?? 0)
      const delka_cm = Number(s.delka_cm ?? 0)
      const tloušťka_m = parseThicknessM(s.tloušťka as string)
      const qty = mnozstviVBaleni || 1

      if (!hustota || !sirka_cm || !delka_cm || !tloušťka_m) {
        return {
          weightKg: null,
          netWeightKg: null,
          confidence: "low",
          breakdown: "Chybí hustota, rozměry desky nebo tloušťka."
        }
      }

      const sirka_m = sirka_cm / 100
      const delka_m = delka_cm / 100
      const volumeOneSheet = sirka_m * delka_m * tloušťka_m
      const net = r3(hustota * volumeOneSheet * qty)
      const packaging = 0.5
      const total = r3(net + packaging)
      return {
        weightKg: total,
        netWeightKg: net,
        confidence: "high",
        breakdown: `${hustota} kg/m³ × (${sirka_cm}×${delka_cm}cm × ${r3(tloušťka_m * 1000)}mm) × ${qty} ks = ${net} kg + ${packaging} kg obal = ${total} kg`
      }
    }

    // -----------------------------------------------------------------------
    // ABRASIVES & POLISHING (Broušení a leštění)
    // -----------------------------------------------------------------------
    case "brouseni_a_lesteni": {
      const podkat = String(s.podkategorie ?? "pasty")

      if (podkat === "pasty" || podkat === "vosk") {
        const netWeight = parseWeightKg((s.hmotnost || s.mnozstvi) as string) || 0
        if (!netWeight) return { weightKg: null, netWeightKg: null, confidence: "low", breakdown: "Chybí hmotnost pasty/vosku." }
        const qty = mnozstviVBaleni || 1
        const packaging = 0.15
        const total = r3((netWeight + packaging) * qty)
        const netTotal = r3(netWeight * qty)
        return {
          weightKg: total,
          netWeightKg: netTotal,
          confidence: "high",
          breakdown: `${qty} ks × (${netWeight} kg netto + ${packaging} kg obal) = ${total} kg`
        }
      }

      if (podkat === "brusne_kotouce") {
        const typ = String(s.typ_kotouce ?? "vlneny")
        const prumer = Number(s.prumer ?? 160)
        const lookupMap: Record<string, Record<number, number>> = {
          vlneny: { 80: 0.10, 125: 0.14, 150: 0.16, 160: 0.18, 200: 0.24 },
          pena:   { 80: 0.04, 125: 0.05, 150: 0.06, 160: 0.07 },
          vlnove_koule: { 75: 0.12, 85: 0.15 },
        }
        const sizes = lookupMap[typ] ?? lookupMap.vlneny
        const keys = Object.keys(sizes).map(Number).sort((a, b) => a - b)
        const matched = keys.find(k => prumer <= k) ?? keys[keys.length - 1]
        const unit_kg = sizes[matched] ?? 0.18
        const qty = mnozstviVBaleni || 1
        const packaging = 0.1
        const total = r3(unit_kg * qty + packaging)
        const netTotal = r3(unit_kg * qty)
        return {
          weightKg: total,
          netWeightKg: netTotal,
          confidence: "medium",
          breakdown: `${qty} ks × ${unit_kg} kg (${typ} D${prumer}) + ${packaging} kg obal = ${total} kg`
        }
      }

      if (podkat === "prislusenstvi") {
        const prumer = Number(s.prumer ?? 150)
        const unit_kg = prumer >= 150 ? 0.08 : 0.05
        const qty = mnozstviVBaleni || 1
        const total = r3(unit_kg * qty + 0.05)
        const netTotal = r3(unit_kg * qty)
        return {
          weightKg: total,
          netWeightKg: netTotal,
          confidence: "medium",
          breakdown: `${qty} ks × ${unit_kg} kg (D${prumer}) + 0.05 kg = ${total} kg`
        }
      }

      return { weightKg: null, netWeightKg: null, confidence: "low", breakdown: "Neznámá podkategorie broušení." }
    }

    // -----------------------------------------------------------------------
    // CONSUMABLES (Films, Tapes, Channels)
    // -----------------------------------------------------------------------
    case "consumables": {
      const podkat = String(s.podkategorie ?? "BF")

      if (["BF", "RF", "PP", "PP-PTFE", "BC", "FM"].includes(podkat)) {
        const gramaz = Number(s.gramaz_gm2 ?? s.gramáž ?? 0)
        const sirka_cm = Number(s.sirka_cm ?? 0)
        const delka_m = Number(s.delka_m ?? 0)

        if (!gramaz || !sirka_cm || !delka_m) {
          return { weightKg: null, netWeightKg: null, confidence: "low", breakdown: "Chybí gramáž, šířka nebo délka." }
        }

        const sirka_m = sirka_cm / 100
        const net = r3((gramaz / 1000) * sirka_m * delka_m)
        const tubeWeight = r3(sirka_m * 0.35)
        const packaging = 0.3
        const total = r3(net + tubeWeight + packaging)
        return {
          weightKg: total,
          netWeightKg: net,
          confidence: "high",
          breakdown: `${net} kg net (${gramaz} g/m²) + ${tubeWeight} kg jádro + ${packaging} kg obal = ${total} kg`
        }
      }

      if (podkat === "ST") {
        const sirka_mm = Number(s.sirka_mm ?? 12)
        const delka_m = Number(s.delka_m ?? 15)
        const tloustka_mm = Number(s.tloustka_mm ?? 3.5)
        const pocet_roli = Number(s.pocet_roli_v_baleni ?? 1)

        const perRollVolumeM3 = (sirka_mm / 1000) * (tloustka_mm / 1000) * delka_m
        const perRollKg = r3(perRollVolumeM3 * 250)
        const net = r3(perRollKg * pocet_roli)
        const packaging = 0.2
        const total = r3(net + packaging)
        return {
          weightKg: total,
          netWeightKg: net,
          confidence: "high",
          breakdown: `${pocet_roli} rolí × ${perRollKg} kg (${sirka_mm}mm × ${tloustka_mm}mm × ${delka_m}m) + ${packaging} kg obal = ${total} kg`
        }
      }

      if (podkat === "FT") {
        const sirka_mm = Number(s.sirka_mm ?? 25)
        const delka_m = Number(s.delka_m ?? 66)
        const pocet_roli = Number(s.pocet_roli_v_baleni ?? 1)

        const perRollKg = r3((sirka_mm / 1000) * delka_m * 0.070)
        const net = r3(perRollKg * pocet_roli)
        const packaging = 0.1
        const total = r3(net + packaging)
        return {
          weightKg: total,
          netWeightKg: net,
          confidence: "medium",
          breakdown: `${pocet_roli} rolí × ${perRollKg} kg (${sirka_mm}mm × ${delka_m}m @70 g/m²) + ${packaging} kg = ${total} kg`
        }
      }

      if (podkat === "FCH") {
        const podtyp = String(s.podtyp_fch ?? "TAPE")
        const delka_m = Number(s.delka_m ?? 100)
        const material = String(s.material ?? "HDPE").toUpperCase()
        const density = TUBE_DENSITY[material] ?? 1100

        if (podtyp === "TAPE") {
          const sirka_mm = Number(s.sirka_mm ?? 15)
          const vyska_mm = Number(s.vyska_mm ?? 4)
          const net = r3(calculateHollowRectWeight(sirka_mm, vyska_mm, delka_m, density))
          const total = r3(net + 0.05)
          const t = vyska_mm <= 10 ? 1.0 : 1.5
          return {
            weightKg: total,
            netWeightKg: net,
            confidence: "high",
            breakdown: `Dutý profil ${sirka_mm}×${vyska_mm}mm (stěna ${t}mm) × ${delka_m}m × ${density} kg/m³ = ${net} kg + 0.05 kg = ${total} kg`
          }
        } else {
          const prumer_mm = Number(s.vnitrni_prumer_mm ?? s.prumer_mm ?? 10)
          const tubeNet = calculateHollowCylinderWeight(prumer_mm, delka_m, density)

          if (podtyp === "OMEGA") {
            const baseWeight = delka_m * 0.05 * 0.200 // 50mm strip at 200g/m2
            const net = r3(tubeNet + baseWeight)
            const total = r3(net + 0.1)
            const od = prumer_mm <= 12 ? prumer_mm + 2 : prumer_mm + 3
            return {
              weightKg: total,
              netWeightKg: net,
              confidence: "high",
              breakdown: `Omega kanálek Ø${od}/${prumer_mm}mm (${r3(tubeNet)} kg) + vázací páska (${r3(baseWeight)} kg) = ${net} kg + 0.1 kg = ${total} kg`
            }
          } else {
            // SPRL or other
            const net = r3(tubeNet)
            const total = r3(net + 0.1)
            const od = prumer_mm <= 12 ? prumer_mm + 2 : prumer_mm + 3
            return {
              weightKg: total,
              netWeightKg: net,
              confidence: "high",
              breakdown: `Hadice Ø${od}/${prumer_mm}mm × ${delka_m}m × ${density} kg/m³ = ${net} kg + 0.1 kg = ${total} kg`
            }
          }
        }
      }

      if (podkat === "TUBE") {
        const delka_m = Number(s.delka_m ?? 50)
        const prumer_mm = Number(s.vnitrni_prumer_mm ?? s.prumer_mm ?? 10)
        const material = String(s.material ?? "HDPE").toUpperCase()
        const density = TUBE_DENSITY[material] ?? 1100
        const net = r3(calculateHollowCylinderWeight(prumer_mm, delka_m, density))
        const total = r3(net + 0.1)
        const od = prumer_mm <= 12 ? prumer_mm + 2 : prumer_mm + 3
        return {
          weightKg: total,
          netWeightKg: net,
          confidence: "high",
          breakdown: `Hadice Ø${od}/${prumer_mm}mm × ${delka_m}m × ${density} kg/m³ = ${net} kg + 0.1 kg = ${total} kg`
        }
      }

      if (podkat === "K" || podkat === "KP") {
        const prumer = Number(s.vnejsi_prumer_mm ?? s.prumer_mm ?? 20)
        const qty = mnozstviVBaleni || 1
        const unit_kg = connectorWeightKg(prumer)
        const total = r3(unit_kg * qty + 0.05)
        const netTotal = r3(unit_kg * qty)
        return {
          weightKg: total,
          netWeightKg: netTotal,
          confidence: "medium",
          breakdown: `${qty} ks × ${unit_kg} kg (Ø${prumer}mm) + 0.05 kg = ${total} kg`
        }
      }

      if (podkat === "MTI") {
        const qty = mnozstviVBaleni || 1
        const typ_mti = String(s.typ_mti ?? "Hose")

        if (typ_mti === "Hose") {
          const net = r3(calculateHollowCylinderWeight(8, qty, 950))
          const total = r3(net + 0.05)
          return {
            weightKg: total,
            netWeightKg: net,
            confidence: "high",
            breakdown: `MTI Hadice Ø10/8mm × ${qty}m × 950 kg/m³ = ${net} kg + 0.05 kg = ${total} kg`
          }
        } else if (typ_mti === "RBL") {
          const net = r3(calculateHollowCylinderWeight(6, qty, 950))
          const total = r3(net + 0.05)
          return {
            weightKg: total,
            netWeightKg: net,
            confidence: "high",
            breakdown: `MTI RBL Hadice Ø8/6mm × ${qty}m × 950 kg/m³ = ${net} kg + 0.05 kg = ${total} kg`
          }
        } else if (typ_mti === "MVS") {
          const sirka_mm = Number(s.sirka_mm ?? 100)
          const net = r3((sirka_mm / 1000) * qty * 0.200)
          const total = r3(net + 0.05)
          return {
            weightKg: total,
            netWeightKg: net,
            confidence: "medium",
            breakdown: `MTI MVS membrána ${sirka_mm}mm × ${qty}m × 200 g/m² = ${net} kg + 0.05 kg = ${total} kg`
          }
        } else {
          // Valve
          const unit_kg = 0.05
          const net = r3(unit_kg * qty)
          const total = r3(net + 0.05)
          return {
            weightKg: total,
            netWeightKg: net,
            confidence: "medium",
            breakdown: `MTI ventil: ${qty} ks × 0.05 kg = ${net} kg + 0.05 kg = ${total} kg`
          }
        }
      }

      return { weightKg: null, netWeightKg: null, confidence: "low", breakdown: `Neznámá podkategorie spotřebního materiálu: ${podkat}` }
    }

    // -----------------------------------------------------------------------
    // TOOLS (Nářadí)
    // -----------------------------------------------------------------------
    case "naradi": {
      const podkat = String(s.podkategorie ?? "BU")

      if (podkat === "BU") {
        const prumer = Number(s.prumer_mm ?? 50)
        const lookupMap: Record<number, number> = { 25: 0.04, 50: 0.08, 75: 0.15, 100: 0.25, 150: 0.45 }
        const keys = Object.keys(lookupMap).map(Number).sort((a, b) => a - b)
        const matched = keys.find(k => prumer <= k) ?? keys[keys.length - 1]
        const unit_kg = lookupMap[matched]
        const qty = mnozstviVBaleni || 1
        const total = r3(unit_kg * qty + 0.05)
        const netTotal = r3(unit_kg * qty)
        return { weightKg: total, netWeightKg: netTotal, confidence: "medium", breakdown: `${qty} ks BU Ø${prumer}mm × ${unit_kg} kg + 0.05 kg = ${total} kg` }
      }

      if (podkat === "QR") {
        const mat = String(s.material ?? "SS").toUpperCase()
        const unit_kg = mat === "SS" ? 0.12 : 0.05
        const qty = mnozstviVBaleni || 1
        const total = r3(unit_kg * qty + 0.05)
        const netTotal = r3(unit_kg * qty)
        return { weightKg: total, netWeightKg: netTotal, confidence: "medium", breakdown: `${qty} ks QR (${mat}) × ${unit_kg} kg + 0.05 kg = ${total} kg` }
      }

      if (podkat === "SQ") {
        const prumer = Number(s.prumer_mm ?? 25)
        const unit_kg = prumer <= 25 ? 0.18 : 0.30
        const qty = mnozstviVBaleni || 1
        const total = r3(unit_kg * qty + 0.05)
        const netTotal = r3(unit_kg * qty)
        return { weightKg: total, netWeightKg: netTotal, confidence: "medium", breakdown: `${qty} ks SQ Ø${prumer}mm × ${unit_kg} kg + 0.05 kg = ${total} kg` }
      }

      if (podkat === "V") {
        const qty = mnozstviVBaleni || 1
        const total = r3(0.35 * qty + (qty > 1 ? 0.05 : 0))
        const netTotal = r3(0.35 * qty)
        return { weightKg: total, netWeightKg: netTotal, confidence: "medium", breakdown: `${qty} ks Vakuometr × 0.35 kg + ${qty > 1 ? "0.05 kg" : "0 kg"} = ${total} kg` }
      }

      if (podkat === "CU") {
        const vol = Number(s.objem_l ?? 5)
        const qty = mnozstviVBaleni || 1
        const dryUnitWeight = vol === 400 ? 75.0 : 25.0
        const dryUnitNet = vol === 400 ? 70.0 : 20.0
        const total = r3(dryUnitWeight * qty)
        const netTotal = r3(dryUnitNet * qty)
        return { weightKg: total, netWeightKg: netTotal, confidence: "medium", breakdown: `${qty} ks × prázdná mycí stanice (${dryUnitWeight} kg) = ${total} kg` }
      }

      if (podkat === "SU") {
        const qty = mnozstviVBaleni || 1
        const total = r3(2.5 * qty)
        const netTotal = r3(2.3 * qty)
        return { weightKg: total, netWeightKg: netTotal, confidence: "medium", breakdown: `${qty} ks × Spin Unit RST5 (2.5 kg) = ${total} kg` }
      }

      return { weightKg: null, netWeightKg: null, confidence: "low", breakdown: `Neznámá podkategorie nářadí: ${podkat}` }
    }

    // -----------------------------------------------------------------------
    // FASTENERS (Spojovací materiál)
    // -----------------------------------------------------------------------
    case "spojovaci_material": {
      const zavit = String(s.zavit_prumer ?? "M8")
      const qty = mnozstviVBaleni || 1
      const g_per_piece = fastenerWeightG(zavit)
      const net = r3(g_per_piece * qty / 1000)
      const packaging = 0.1
      const total = r3(net + packaging)
      return {
        weightKg: total,
        netWeightKg: net,
        confidence: "medium",
        breakdown: `${qty} ks ${zavit} × ${g_per_piece}g + ${packaging} kg obal = ${total} kg`
      }
    }

    default:
      return {
        weightKg: null,
        netWeightKg: null,
        confidence: "low",
        breakdown: `Neznámá kategorie: ${kategorieId}`
      }
  }
}

// ---------------------------------------------------------------------------
// Main Export: resolvePackagingProfile
// ---------------------------------------------------------------------------

/**
 * Automatically select the best Balicí profil for a product based on its
 * category and specifikace data. Returns null if no suitable profile found.
 *
 * @param kategorieId       - The product category ID
 * @param specs             - The specifikace JSONB object
 * @param availableProfiles - The list of Balicí profiles from the DB
 */
export function resolvePackagingProfile(
  kategorieId: string,
  specs: Record<string, unknown>,
  availableProfiles: BaliciProfil[]
): BaliciProfil | null {

  if (!availableProfiles.length) return null

  const findByType = (typ_obalu: string) =>
    availableProfiles.find(p => p.typ_obalu === typ_obalu) ?? null

  const findRollByWidth = (sirka_cm: number) => {
    const rolls = availableProfiles.filter(p => p.typ_obalu === "role")
    if (!rolls.length) return null
    // Wide fabrics (>80cm) use 127mm core, narrow use 76mm core
    const coreHint = sirka_cm > 80 ? "127" : "76"
    return rolls.find(p => p.nazev.includes(coreHint)) ?? rolls[0]
  }

  switch (kategorieId) {

    case "vyztuzne_materialy": {
      const packType = String(specs.typ_baleni ?? "role")
      const sirka_cm = Number(specs.sirka_cm ?? 100)
      if (packType === "role") return findRollByWidth(sirka_cm)
      if (packType === "krabice") return findByType("krabice_standard")
      return findByType("sacek")  // metraz
    }

    case "prepregy": {
      // Prepregs ship in long flat boxes
      return findByType("krabice_dlouha") ?? findByType("krabice_standard")
    }

    case "cores_standard":
    case "cores_active": {
      // Core sheets → long flat box
      return findByType("krabice_dlouha") ?? findByType("krabice_standard")
    }

    case "pryskyrice": {
      const objem = Number(specs.objem_nakup_l ?? 5)
      if (objem > 25) return findByType("paleta")
      return null // Ignore volumetric for buckets/cans
    }

    case "lepidla": {
      return null
    }

    case "spotrebni_chemie": {
      return null
    }

    case "chemie": {
      return null
    }

    case "brouseni_a_lesteni": {
      return null
    }

    case "consumables": {
      const podkat = String(specs.podkategorie ?? "BF")

      if (["BF", "RF", "PP", "PP-PTFE", "BC", "FM"].includes(podkat)) {
        const sirka_cm = Number(specs.sirka_cm ?? 100)
        return findRollByWidth(sirka_cm)
      }
      if (podkat === "ST") return null
      if (podkat === "FT") return null
      if (podkat === "FCH") {
        const podtyp = String(specs.podtyp_fch ?? "TAPE")
        if (podtyp === "SPRL" || podtyp === "OMEGA" || podtyp === "TUBE" || podtyp === "TTUBE") {
          return findByType("krabice_dlouha") ?? findByType("krabice_standard")
        }
        return null
      }
      if (podkat === "K" || podkat === "KP" || podkat === "MTI") {
        return null
      }
      return null
    }

    case "naradi": {
      const podkat = String(specs.podkategorie ?? "BU")
      if (podkat === "CU" || podkat === "SU") {
        return findByType("paleta") ?? findByType("krabice_standard")
      }
      return null
    }

    case "spojovaci_material": {
      return null
    }

    default:
      return findByType("krabice_standard")
  }
}
