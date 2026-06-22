import * as fs from 'fs'
import * as path from 'path'

// Presets loaded in system (aligned with our fixes)
const SCENARIO_PRESETS: Record<string, Record<string, any>> = {
  CN: {
    balik_standard: {
      typ_vypoctu_dopravy_v2: "linear_czk",
      koeficient_a: 94.788,
      koeficient_b: 1830.2,
      poplatek_banka_czk: 190,
      bezpecnostni_koeficient: 1.05
    }
  },
  IT: {
    balik_standard: {
      typ_vypoctu_dopravy_v2: "linear_czk",
      koeficient_a: 18.804,
      koeficient_b: 349.38,
      poplatek_banka_czk: 190,
      bezpecnostni_koeficient: 1.05
    },
    balik_dlouhy: {
      typ_vypoctu_dopravy_v2: "segmented_czk",
      poplatek_banka_czk: 190,
      bezpecnostni_koeficient: 1.05,
      segmenty_dopravy: [
        { od_kg: 0, do_kg: 46.9, a: 14.26, b: 718.45, dopravce: "UPS Economy" },
        { od_kg: 47, do_kg: 60.9, a: 12.464, b: 1124.6, dopravce: "UPS Economy (Extra)" },
        { od_kg: 61, do_kg: 9999, a: 29.985, b: 1066.8, dopravce: "FedEx Economy Freight" }
      ]
    }
  },
  CZ: {
    balik_dlouhy: {
      typ_vypoctu_dopravy_v2: "segmented_czk",
      poplatek_banka_czk: 190,
      bezpecnostni_koeficient: 1.05,
      segmenty_dopravy: [
        { od_kg: 0, do_kg: 30.9, a: 2.5374, b: 138.79, dopravce: "GLS/DPD" },
        { od_kg: 31, do_kg: 50, a: 0, b: 876, dopravce: "TOPTRANS" },
        { od_kg: 50.1, do_kg: 9999, a: 0, b: 1113, dopravce: "TOPTRANS" }
      ]
    }
  },
  DE: {
    balik_standard: {
      typ_vypoctu_dopravy_v2: "segmented_czk",
      poplatek_banka_czk: 190,
      bezpecnostni_koeficient: 1.05,
      segmenty_dopravy: [
        { od_kg: 0, do_kg: 30.9, a: 15.771, b: 216.52, dopravce: "GLS" },
        { od_kg: 31, do_kg: 9999, a: 8.375, b: 918, dopravce: "UPS Economy" }
      ]
    },
    balik_dlouhy: {
      typ_vypoctu_dopravy_v2: "segmented_czk",
      poplatek_banka_czk: 190,
      bezpecnostni_koeficient: 1.05,
      segmenty_dopravy: [
        { od_kg: 0, do_kg: 30.9, a: 15.16, b: 229.56, dopravce: "GLS" },
        { od_kg: 31, do_kg: 60.9, a: 27.777, b: 144.67, dopravce: "UPS Economy" },
        { od_kg: 61, do_kg: 9999, a: 8.1, b: 2487.8, dopravce: "FedEx Economy Freight" }
      ]
    }
  },
  PL: {
    balik_standard: {
      typ_vypoctu_dopravy_v2: "segmented_czk",
      poplatek_banka_czk: 190,
      bezpecnostni_koeficient: 1.05,
      segmenty_dopravy: [
        { od_kg: 0, do_kg: 30.9, a: 14.039, b: 153.3, dopravce: "GLS" },
        { od_kg: 31, do_kg: 9999, a: 9.8, b: 874.4, dopravce: "UPS Economy" }
      ]
    }
  },
  NL: {
    balik_standard: {
      typ_vypoctu_dopravy_v2: "segmented_czk",
      poplatek_banka_czk: 190,
      bezpecnostni_koeficient: 1.05,
      segmenty_dopravy: [
        { od_kg: 0, do_kg: 30.9, a: 18.929, b: 245.81, dopravce: "GLS" },
        { od_kg: 31, do_kg: 9999, a: 12.1, b: 1204.8, dopravce: "UPS Economy" }
      ]
    }
  },
  FR: {
    balik_standard: {
      typ_vypoctu_dopravy_v2: "segmented_czk",
      poplatek_banka_czk: 190,
      bezpecnostni_koeficient: 1.05,
      segmenty_dopravy: [
        { od_kg: 0, do_kg: 30.9, a: 15.771, b: 216.52, dopravce: "GLS" },
        { od_kg: 31, do_kg: 9999, a: 8.375, b: 918, dopravce: "UPS Economy" }
      ]
    },
    paleta: {
      typ_vypoctu_dopravy_v2: "pallet_alloc",
      pallet_cena_eur: 225.02,
      pallet_pocet_produktu: 30,
      poplatek_banka_czk: 190,
      bezpecnostni_koeficient: 1.05
    }
  }
}

// Maps section header in markdown to SCENARIO_PRESETS key
const TITLE_MAP: Record<string, { country: string; type: string }> = {
  "Doprava Čína krabice": { country: "CN", type: "balik_standard" },
  "Doprava Itálie krabice rovnoměrné": { country: "IT", type: "balik_standard" },
  "Doprava Itálie krabice dlouhé": { country: "IT", type: "balik_dlouhy" },
  "Doprava Česko krabice dlouhé": { country: "CZ", type: "balik_dlouhy" },
  "Doprava Německo krabice dlouhé": { country: "DE", type: "balik_dlouhy" },
  "Doprava Německo krabice rovnoměrné": { country: "DE", type: "balik_standard" },
  "Doprava Francie krabice rovnoměrné": { country: "FR", type: "balik_standard" },
  "Doprava Polsko krabice rovnoměrné": { country: "PL", type: "balik_standard" },
  "Doprava Nizozemsko krabice rovnoměrné": { country: "NL", type: "balik_standard" }
}

function calculateCost(weight: number, preset: any): number {
  switch (preset.typ_vypoctu_dopravy_v2) {
    case "linear_czk":
      return preset.koeficient_a * weight + preset.koeficient_b
    case "segmented_czk": {
      const segs = preset.segmenty_dopravy || []
      const seg = segs.find((s: any) => weight >= s.od_kg && (s.do_kg === null || weight <= s.do_kg)) ?? segs[segs.length - 1]
      if (!seg) return 0
      return seg.a * weight + seg.b
    }
    default:
      return 0
  }
}

function main() {
  const docPath = path.join(process.cwd(), "dokumentace", "doprava-vypocet-ceny.md")
  if (!fs.existsSync(docPath)) {
    console.error(`Dokument nenalezen na cestě: ${docPath}`)
    process.exit(1)
  }

  const content = fs.readFileSync(docPath, "utf-8")
  const lines = content.split(/\r?\n/)

  let currentCategory = ""
  let inTable = false
  const categoriesData: Record<string, { weight: number; price: number }[]> = {}

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()

    // Match category header: e.g. "Doprava Čína krabice:" or "Doprava Polsko krabice rovnoměrné"
    if (line.startsWith("Doprava ")) {
      const categoryName = line.replace(/:+$/, "").trim()
      if (TITLE_MAP[categoryName]) {
        currentCategory = categoryName
        if (!categoriesData[currentCategory]) {
          categoriesData[currentCategory] = []
        }
        inTable = false
      } else {
        currentCategory = ""
      }
      continue
    }

    if (!currentCategory) continue

    // Detect start of table data after header
    if (line.toLowerCase().includes("hmotnost") && line.toLowerCase().includes("cena")) {
      inTable = true
      continue
    }

    if (inTable) {
      if (line === "") {
        if (categoriesData[currentCategory].length > 0) {
          inTable = false
          currentCategory = ""
        }
        continue
      }

      // Parse line: e.g., "4\t1855\tUPS Express Saver"
      const parts = line.split(/\s+/)
      const weight = parseFloat(parts[0])
      const price = parseFloat(parts[1])

      if (!isNaN(weight) && !isNaN(price)) {
        categoriesData[currentCategory].push({ weight, price })
      } else if (categoriesData[currentCategory].length > 0) {
        inTable = false
        currentCategory = ""
      }
    }
  }

  console.log("==========================================================================")
  console.log("       LOGISTICKÁ KALIBRACE: POROVNÁNÍ IMPL. VZORCŮ S REÁLNÝMI DATY       ")
  console.log("==========================================================================")

  let totalPoints = 0
  let totalAbsoluteError = 0
  let totalPercentageError = 0

  for (const [categoryName, dataPoints] of Object.entries(categoriesData)) {
    const mapping = TITLE_MAP[categoryName]
    const preset = SCENARIO_PRESETS[mapping.country]?.[mapping.type]

    console.log(`\n\n🔹 KATEGORIE: ${categoryName}`)
    console.log(`   Model: ${preset.typ_vypoctu_dopravy_v2} | Odkud: ${mapping.country} | Typ: ${mapping.type}`)
    console.log("--------------------------------------------------------------------------")
    console.log("Váha [kg] | Reálná [CZK] | Model bez buf. [CZK] | Rozdíl [CZK] | Odchylka % | Model s buf. 1.05 [CZK]")
    console.log("--------------------------------------------------------------------------")

    let catAbsoluteError = 0
    let catPercentageError = 0

    dataPoints.forEach(pt => {
      const modelCostRaw = calculateCost(pt.weight, preset)
      const modelCostWithBuffer = modelCostRaw * preset.bezpecnostni_koeficient
      const absDiff = modelCostRaw - pt.price
      const pctDiff = (absDiff / pt.price) * 100

      catAbsoluteError += Math.abs(absDiff)
      catPercentageError += Math.abs(pctDiff)

      totalPoints++
      totalAbsoluteError += Math.abs(absDiff)
      totalPercentageError += Math.abs(pctDiff)

      console.log(
        `${pt.weight.toString().padEnd(9)} | ` +
        `${pt.price.toString().padEnd(12)} | ` +
        `${modelCostRaw.toFixed(1).padEnd(20)} | ` +
        `${(absDiff >= 0 ? "+" : "")}${absDiff.toFixed(1).padEnd(11)} | ` +
        `${(pctDiff >= 0 ? "+" : "")}${pctDiff.toFixed(2).padEnd(9)}% | ` +
        `${modelCostWithBuffer.toFixed(1)}`
      )
    })

    const avgAbs = catAbsoluteError / dataPoints.length
    const avgPct = catPercentageError / dataPoints.length
    console.log("--------------------------------------------------------------------------")
    console.log(`Průměrná odchylka v této kategorii: ${avgAbs.toFixed(1)} CZK (${avgPct.toFixed(2)}%)`)
  }

  console.log("\n\n==========================================================================")
  console.log("                      CELKOVÉ SHRNUTÍ KALIBRACE                           ")
  console.log("==========================================================================")
  console.log(`Celkem zvalidováno datových bodů (hmotností): ${totalPoints}`)
  console.log(`Celková průměrná absolutní chyba modelu: ${(totalAbsoluteError / totalPoints).toFixed(1)} CZK`)
  console.log(`Celková průměrná procentuální odchylka: ${(totalPercentageError / totalPoints).toFixed(2)}%`)
  console.log("==========================================================================")
}

main()
