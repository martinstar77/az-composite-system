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
    // Total: 5 + 1.06 + 2 = 8.06 -> r3 -> 8.06
    expect(result.weightKg).toBe(8.06)
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
    // 0.5 * 0.85 + 0.08 = 0.425 + 0.08 = 0.505 -> r3 -> 0.51
    expect(result.weightKg).toBe(0.51)
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
    // net: 0.16 * 2 = 0.32 kg
    // total: 0.32 + 0.2 = 0.52 kg
    expect(result.weightKg).toBe(0.52)
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

  it("should calculate weight for hollow cylinder FCH SPRL channel", () => {
    const specs = {
      podkategorie: "FCH",
      podtyp_fch: "SPRL",
      vnitrni_prumer_mm: 10,
      delka_m: 50,
      material: "HDPE"
    }
    const result = calculateGrossWeight("consumables", specs, 1)
    // ID=10 -> OD=12. R_out=0.006, R_in=0.005.
    // Area = Math.PI * (0.006^2 - 0.005^2) = 0.0000345575 m2
    // Net = 0.0000345575 * 50 * 950 = 1.641 kg -> 1.64
    // Gross = 1.64 + 0.1 = 1.74
    expect(result.weightKg).toBe(1.74)
  })

  it("should calculate weight for hollow cylinder FCH OMEGA channel with base fabric strip weight", () => {
    const specs = {
      podkategorie: "FCH",
      podtyp_fch: "OMEGA",
      vnitrni_prumer_mm: 13,
      delka_m: 50,
      material: "HDPE"
    }
    const result = calculateGrossWeight("consumables", specs, 1)
    // ID=13 -> OD=16. R_out=0.008, R_in=0.0065.
    // TubeNet = 3.246 kg. Base strip = 50 * 0.05 * 0.200 = 0.50 kg.
    // Net = 3.246 + 0.50 = 3.746 -> r3 -> 3.75 kg
    // Gross = 3.75 + 0.1 = 3.85 kg
    expect(result.weightKg).toBe(3.85)
  })

  it("should calculate weight for hollow rect FCH TAPE channel", () => {
    const specs = {
      podkategorie: "FCH",
      podtyp_fch: "TAPE",
      sirka_mm: 15,
      vyska_mm: 4,
      delka_m: 100,
      material: "HDPE"
    }
    const result = calculateGrossWeight("consumables", specs, 1)
    // W=15, H=4, t=1.0. W_in=13, H_in=2.
    // Area = 15*4 - 13*2 = 34 mm2 = 0.000034 m2
    // Net = 0.000034 * 100 * 950 = 3.23
    // Gross = 3.23 + 0.05 = 3.28
    expect(result.weightKg).toBe(3.28)
  })

  it("should calculate weight for hollow cylinder TUBE Hadice", () => {
    const specs = {
      podkategorie: "TUBE",
      vnitrni_prumer_mm: 8,
      delka_m: 50,
      material: "HDPE"
    }
    const result = calculateGrossWeight("consumables", specs, 1)
    // ID=8 -> OD=10. R_out=0.005, R_in=0.004.
    // Area = Math.PI * (0.005^2 - 0.004^2) = 0.000028274 m2
    // Net = 0.000028274 * 50 * 950 = 1.343 -> 1.34
    // Gross = 1.34 + 0.1 = 1.44
    expect(result.weightKg).toBe(1.44)
  })

  it("should calculate weight for hollow cylinder TUBE Hadice with boundary ID=12 mapping to OD=14", () => {
    const specs = {
      podkategorie: "TUBE",
      vnitrni_prumer_mm: 12,
      delka_m: 50,
      material: "HDPE"
    }
    const result = calculateGrossWeight("consumables", specs, 1)
    // ID=12 -> ID <= 12 -> OD=14. R_out=0.007, R_in=0.006.
    // Area = Math.PI * (0.007^2 - 0.006^2) = 0.00004084 m2
    // Net = 0.00004084 * 50 * 950 = 1.9399 -> 1.94
    // Gross = 1.94 + 0.1 = 2.04
    expect(result.weightKg).toBe(2.04)
  })

  it("should calculate weight for MTI Hose based on packaging quantity as length", () => {
    const specs = {
      podkategorie: "MTI",
      typ_mti: "Hose"
    }
    const result = calculateGrossWeight("consumables", specs, 50)
    // qty=50m. ID=8 (default for MTI Hose). OD=10. R_out=0.005, R_in=0.004.
    // Area = Math.PI * (0.005^2 - 0.004^2) = 0.000028274 m2
    // Net = 0.000028274 * 50 * 950 = 1.343 -> 1.34
    // Gross = 1.34 + 0.05 = 1.39
    expect(result.weightKg).toBe(1.39)
  })

  it("should calculate weight for Release Film (RF) by computing grammage from thickness", () => {
    const specs = {
      podkategorie: "RF",
      tloustka_um: 12.5,
      sirka_cm: 122,
      delka_m: 153
    }
    const result = calculateGrossWeight("consumables", specs, 1)
    // Grammage calculated: Math.round(12.5 * 0.95 * 2) / 2 = 12.0 g/m2
    // Net: 12 / 1000 * 1.22 * 153 = 2.2399 -> r3 -> 2.24 kg
    // Tube: 1.22 * 0.35 = 0.427 -> r3 -> 0.43 kg
    // Packaging: 0.3 kg
    // Gross = 2.24 + 0.43 + 0.3 = 2.97 kg
    expect(result.weightKg).toBe(2.97)
  })

  it("should calculate weight for PP-PTFE self-adhesive by computing grammage from thickness map", () => {
    const specs = {
      podkategorie: "PP-PTFE",
      je_lepici: true,
      tloustka_um: 120,
      sirka_cm: 100,
      delka_m: 30
    }
    const result = calculateGrossWeight("consumables", specs, 1)
    // Grammage mapped: 120 -> 225 g/m2
    // Net: 225 / 1000 * 1.0 * 30 = 6.75 kg
    // Tube: 1.0 * 0.35 = 0.35 kg
    // Packaging: 0.3 kg
    // Gross = 6.75 + 0.35 + 0.3 = 7.40 kg
    expect(result.weightKg).toBe(7.40)
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

  it("should select paleta for resins > 25L, otherwise null", () => {
    const profile = resolvePackagingProfile("pryskyrice", { objem_nakup_l: 200 }, dummyProfiles)
    expect(profile?.id).toBe("p-paleta")

    const profileSmall = resolvePackagingProfile("pryskyrice", { objem_nakup_l: 5 }, dummyProfiles)
    expect(profileSmall).toBeNull()
  })
})
