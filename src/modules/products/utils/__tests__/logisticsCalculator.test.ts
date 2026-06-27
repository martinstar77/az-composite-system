import { describe, it, expect } from "vitest"
import { calculateGrossWeight, resolvePackagingProfile } from "../logisticsCalculator"
import type { BaliciProfil } from "@/modules/finance/types/logistics"

describe("logisticsCalculator - calculateGrossWeight", () => {
  it("should calculate weight for vyztuzne_materialy (Fabrics) - role", () => {
    const specs = {
      gramáž: 200, // 200 g/m2
      sirka_cm: 100, // 1m
      delka_m: 50, // 50m
      typ_baleni: "role"
    }
    const result = calculateGrossWeight("vyztuzne_materialy", specs, 1)
    // Formula: (200/1000 * 1 * 50) + (1 * 0.85) + 1.2 = 10 + 0.85 + 1.2 = 12.05
    expect(result.weightKg).toBe(12.05)
    expect(result.confidence).toBe("high")
  })

  it("should calculate weight for vyztuzne_materialy (Fabrics) - krabice", () => {
    const specs = {
      gramáž: 200,
      sirka_cm: 100,
      delka_m: 2,
      typ_baleni: "krabice",
      pocet_kusu: 5
    }
    const result = calculateGrossWeight("vyztuzne_materialy", specs, 1)
    // Formula: (200/1000 * 1 * 2 * 5) + 0.5 = 2 + 0.5 = 2.5
    expect(result.weightKg).toBe(2.5)
  })

  it("should calculate weight for prepregy", () => {
    const specs = {
      gramáž: 400,
      sirka_cm: 125, // 1.25m
      delka_m: 10
    }
    const result = calculateGrossWeight("prepregy", specs, 1)
    // Net: (400/1000 * 1.25 * 10) = 5.0 kg
    // Tube: 1.25 * 0.85 = 1.0625 kg
    // Packaging: 2.0 kg
    // Total: 5 + 1.0625 + 2 = 8.0625 -> r3 -> 8.063
    expect(result.weightKg).toBe(8.063)
  })

  it("should calculate weight for pryskyrice (Resins)", () => {
    const specs = {
      chemie: "EP",
      objem_nakup_l: 200
    }
    const result = calculateGrossWeight("pryskyrice", specs, 1)
    // Net: 200 * 1.15 = 230 kg
    // Tare: 18 kg (200L drum)
    // Total: 248 kg
    expect(result.weightKg).toBe(248)
    expect(result.confidence).toBe("high")
  })

  it("should calculate weight for lepidla (Adhesives)", () => {
    const specs = {
      chemie: "PU",
      objem: "400ml"
    }
    const result = calculateGrossWeight("lepidla", specs, 1)
    // Net: 0.4 * 1.15 = 0.46 kg
    // Tare: 0.15 kg
    // Total: 0.61 kg
    expect(result.weightKg).toBe(0.61)
  })

  it("should calculate weight for spotrebni_chemie - WIP", () => {
    const specs = {
      typ: "WIP",
      mnozstvi: "150ks"
    }
    const result = calculateGrossWeight("spotrebni_chemie", specs, 1)
    // 150 * 0.004 + 0.12 = 0.6 + 0.12 = 0.72
    expect(result.weightKg).toBe(0.72)
  })

  it("should calculate weight for spotrebni_chemie - SPR", () => {
    const specs = {
      typ: "SPR",
      mnozstvi: "500ml"
    }
    const result = calculateGrossWeight("spotrebni_chemie", specs, 1)
    // 0.5 * 0.85 + 0.08 = 0.425 + 0.08 = 0.505
    expect(result.weightKg).toBe(0.505)
  })

  it("should calculate weight for cores (cores_standard)", () => {
    const specs = {
      hustota_kgm3: 80,
      sirka_cm: 120, // 1.2m
      delka_cm: 100, // 1.0m
      tloušťka: "10MM" // 0.01m
    }
    const result = calculateGrossWeight("cores_standard", specs, 5)
    // Vol: 1.2 * 1.0 * 0.01 = 0.012 m3
    // Net: 80 * 0.012 * 5 = 4.8 kg
    // Total: 4.8 + 0.5 = 5.3 kg
    expect(result.weightKg).toBe(5.3)
  })

  it("should calculate weight for consumables - ST (Sealing Tape)", () => {
    const specs = {
      podkategorie: "ST",
      sirka_mm: 12,
      delka_m: 15,
      tloustka_mm: 3.5,
      pocet_roli_v_baleni: 2
    }
    const result = calculateGrossWeight("consumables", specs, 1)
    // per roll: 0.012 * 0.0035 * 15 = 0.00063 m3
    // weight per roll: 0.00063 * 250 = 0.1575 kg -> rounded? perRollKg = r3(0.1575) = 0.158 kg
    // net: 0.158 * 2 = 0.316 kg
    // total: 0.316 + 0.2 = 0.516 kg
    expect(result.weightKg).toBe(0.516)
  })

  it("should calculate weight for spojovaci_material (Fasteners)", () => {
    const specs = {
      zavit_prumer: "M8"
    }
    const result = calculateGrossWeight("spojovaci_material", specs, 100)
    // M8 = 10g/pc. 100 pcs = 1000g = 1.0 kg
    // Total: 1.0 + 0.1 = 1.1 kg
    expect(result.weightKg).toBe(1.1)
  })
})

describe("logisticsCalculator - resolvePackagingProfile", () => {
  const dummyProfiles = [
    { id: "p-role-76", nazev: "Role 76mm", typ_obalu: "role" },
    { id: "p-role-127", nazev: "Role 127mm", typ_obalu: "role" },
    { id: "p-krabice-std", nazev: "Krabice Standard", typ_obalu: "krabice_standard" },
    { id: "p-krabice-dl", nazev: "Krabice Dlouhá", typ_obalu: "krabice_dlouha" },
    { id: "p-sacek", nazev: "Sáček", typ_obalu: "sacek" },
    { id: "p-paleta", nazev: "Paleta", typ_obalu: "paleta" }
  ] as BaliciProfil[]

  it("should select role profile with matching core diameter for fabrics based on width", () => {
    const specsWide = { typ_baleni: "role", sirka_cm: 100 }
    const profileWide = resolvePackagingProfile("vyztuzne_materialy", specsWide, dummyProfiles)
    expect(profileWide?.id).toBe("p-role-127")

    const specsNarrow = { typ_baleni: "role", sirka_cm: 75 }
    const profileNarrow = resolvePackagingProfile("vyztuzne_materialy", specsNarrow, dummyProfiles)
    expect(profileNarrow?.id).toBe("p-role-76")
  })

  it("should select krabice_dlouha for cores", () => {
    const profile = resolvePackagingProfile("cores_standard", {}, dummyProfiles)
    expect(profile?.id).toBe("p-krabice-dl")
  })

  it("should select paleta for resins > 25L", () => {
    const profile = resolvePackagingProfile("pryskyrice", { objem_nakup_l: 200 }, dummyProfiles)
    expect(profile?.id).toBe("p-paleta")

    const profileSmall = resolvePackagingProfile("pryskyrice", { objem_nakup_l: 5 }, dummyProfiles)
    expect(profileSmall?.id).toBe("p-krabice-std")
  })
})
