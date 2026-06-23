export function generateProductName(
  specs: any, 
  categoryId: string, 
  fiberCodes?: Array<{ id: string, nazev: string }>
): string {
  if (categoryId === 'vyztuzne_materialy') {
    const materialMap: Record<string, string> = {
      CF: "Carbon",
      GF: "Glass",
      AF: "Aramid",
      BIOF: "Bio Flax",
      BIOH: "Bio Hemp",
      OF: "Other",
    }

    const formMap: Record<string, string> = {
      WF: "Fibre Fabric",
      UD: "UD Tape",
      BIAX: "Biaxial Fabric",
      MAT: "Fibre Mat"
    }

    const weaveMap: Record<string, string> = {
      P: "Plain",
      T22: "Twill 2/2",
      T44: "Twill 4/4",
      NP: "Needle punched",
      EM: "Emulsion",
      PB: "Powder binder",
      ST: "Stitched",
      "090": "0/90°",
      "45": "±45°"
    }

    // Fiber Code lookup helper (looks in list, falls back to raw ID capitalized)
    function getFiberCodeLabel(codeId: string) {
      if (!codeId || codeId.toLowerCase() === "na") return ""
      const found = fiberCodes?.find(f => f.id === codeId.toLowerCase())
      if (found) return found.nazev
      
      // Static fallback
      const staticMap: Record<string, string> = {
        syt45: "SYT45",
        syt45s: "SYT45S",
        tc33: "TC33",
        hts40: "HTS40",
        h2550: "H2550",
        af1000: "AF1000",
        af3000: "AF3000",
        as4: "AS4",
        tr30s: "TR30S"
      }
      return staticMap[codeId.toLowerCase()] || codeId.toUpperCase()
    }

    const useMap: Record<string, string> = {
      E: "Economy",
      V: "Visual",
      I: "Industry"
    }

    // 1. Resolve Material & Form
    let materialStr = ""
    if (specs.materiál === "HF") {
      const mat1Key = specs.material1 || (specs.materiál_složení && specs.materiál_složení[0]) || ""
      const mat2Key = specs.material2 || (specs.materiál_složení && specs.materiál_složení[1]) || ""
      const mat1 = materialMap[mat1Key] || ""
      const mat2 = materialMap[mat2Key] || ""
      materialStr = mat1 && mat2 ? `${mat1} / ${mat2} Hybrid` : "Hybrid"
    } else {
      materialStr = materialMap[specs.materiál] || ""
    }

    const formStr = formMap[specs.typ] || "Fabric"
    const baseName = materialStr ? `${materialStr} ${formStr}` : formStr

    // 2. Grammage
    const weightStr = specs.gramáž ? `${specs.gramáž}g/m2` : ""

    // 3. Fiber size / Tow
    function formatTow(tow: string) {
      if (!tow || tow === "NA") return ""
      if (tow.endsWith("t")) {
        return tow.replace("t", " Tex")
      }
      return tow
    }

    let towStr = ""
    if (specs.materiál === "HF") {
      const t1 = formatTow(specs.vlákno1 || (specs.vlákna_složení && specs.vlákna_složení[0]))
      const t2 = formatTow(specs.vlákno2 || (specs.vlákna_složení && specs.vlákna_složení[1]))
      towStr = t1 && t2 ? `${t1} / ${t2}` : (t1 || t2 || "")
    } else {
      towStr = formatTow(specs.vlákno)
    }

    // 4. Weave
    const weaveStr = weaveMap[specs.vazba] || specs.vazba || ""

    // 5. Width in cm
    const widthStr = specs.sirka_cm ? `${specs.sirka_cm}cm` : ""

    // 6. Fiber Code (replaces Brand/Manufacturer)
    let fiberCodeStr = ""
    if (specs.materiál === "HF") {
      const fc1 = getFiberCodeLabel(specs.kod_vlakna1)
      const fc2 = getFiberCodeLabel(specs.kod_vlakna2)
      fiberCodeStr = fc1 && fc2 ? `${fc1} / ${fc2}` : (fc1 || fc2 || "")
    } else {
      fiberCodeStr = getFiberCodeLabel(specs.kód_vlákna)
    }

    // 7. Quality Tier
    const useStr = useMap[specs.použití] || ""

    // Join sections before separator
    const nameParts = [baseName, weightStr, towStr, weaveStr, widthStr].filter(Boolean)
    let fullName = nameParts.join(" ")

    // Brand/FiberCode + Quality Tier goes after the en-dash " – " (Unicode \u2013)
    const fiberParts = [fiberCodeStr, useStr].filter(Boolean)
    if (fiberParts.length > 0) {
      fullName += ` – ${fiberParts.join(" ")}`
    }

    return fullName
  }

  if (categoryId === 'consumables') {
    const sub = specs.podkategorie
    switch (sub) {
      case 'BF': {
        const formatMap: Record<string, string> = {
          TUBE: "tubus",
          SHT: "plochá",
          VSHT: "V-sklad",
          GSC: "harmonika"
        }
        const formatStr = formatMap[specs.format] || specs.format || ""
        const thickStr = specs.tloustka_um ? `${specs.tloustka_um}µm` : ""
        const tempStr = specs.teplotni_odolnost || ""
        const widthStr = specs.sirka_cm ? `${specs.sirka_cm}cm` : ""
        return ["Vakuová fólie", formatStr, thickStr, tempStr, widthStr].filter(Boolean).join(" ")
      }
      case 'RF': {
        const perfMap: Record<string, string> = {
          NP: "neperforovaná",
          P3: "perforovaná P3",
          P6: "perforovaná P6",
          P16: "perforovaná P16",
          P31: "perforovaná P31"
        }
        const perfStr = perfMap[specs.perforace] || specs.perforace || ""
        const thickStr = specs.tloustka_um ? `${specs.tloustka_um}µm` : ""
        const tempMap: Record<string, string> = {
          LT: "LT",
          HT: "HT",
          "120": "120°C",
          "150": "150°C",
          "230": "230°C",
          "260": "260°C",
          LT120: "120°C",
          LT150: "150°C",
          HT230: "230°C",
          HT260: "260°C"
        }
        const tempStr = tempMap[specs.teplotni_odolnost] || specs.teplotni_odolnost || ""
        const widthStr = specs.sirka_cm ? `${specs.sirka_cm}cm` : ""
        return ["Separační fólie", perfStr, thickStr, tempStr, widthStr].filter(Boolean).join(" ")
      }
      case 'PP': {
        const polyMap: Record<string, string> = {
          PE: "polyester",
          PA66: "nylon"
        }
        const polyStr = polyMap[specs.polymer] || specs.polymer || ""
        const weightStr = specs.gramaz_gm2 ? `${specs.gramaz_gm2}g/m2` : ""
        const widthStr = specs.sirka_cm ? `${specs.sirka_cm}cm` : ""
        return ["Strhávací tkanina", polyStr, weightStr, widthStr].filter(Boolean).join(" ")
      }
      case 'PP-PTFE': {
        const adhStr = specs.je_lepici === true ? "samolepicí" : "nesamolepicí"
        const thickStr = specs.tloustka_um ? `${specs.tloustka_um}µm` : ""
        const widthStr = specs.sirka_cm ? `${specs.sirka_cm}cm` : ""
        return ["Teflonová strhávací tkanina", adhStr, thickStr, widthStr].filter(Boolean).join(" ")
      }
      case 'BC': {
        const weightStr = specs.gramaz_gm2 ? `${specs.gramaz_gm2}g/m2` : ""
        const widthStr = specs.sirka_cm ? `${specs.sirka_cm}cm` : ""
        return ["Odsávací netkaná textilie", weightStr, widthStr].filter(Boolean).join(" ")
      }
      case 'ST': {
        const tempStr = specs.teplotni_odolnost_c ? `${specs.teplotni_odolnost_c}°C` : ""
        const widthStr = specs.sirka_mm ? `${specs.sirka_mm}mm` : ""
        return ["Těsnicí páska", tempStr, widthStr].filter(Boolean).join(" ")
      }
      case 'FT': {
        const widthStr = specs.sirka_mm ? `${specs.sirka_mm}mm` : ""
        const tempStr = specs.teplotni_odolnost || ""
        return ["Lepicí páska Flash tape", widthStr, tempStr].filter(Boolean).join(" ")
      }
      case 'FM': {
        const typeMap: Record<string, string> = {
          EXT: "extrudovaná",
          WVN: "tkaná"
        }
        const colorMap: Record<string, string> = {
          CLR: "čirá",
          BLK: "černá",
          RED: "červená",
          GRN: "zelená"
        }
        const speedMap: Record<string, string> = {
          low: "nízká rychlost",
          medium: "střední rychlost",
          high: "vysoká rychlost"
        }
        const typeStr = typeMap[specs.typ_vyroby] || ""
        const matStr = specs.material || ""
        const speedStr = speedMap[specs.rychlost_proudeni] || specs.rychlost_proudeni || ""
        const colorStr = colorMap[specs.barva] || ""
        const widthStr = specs.sirka_cm ? `${specs.sirka_cm}cm` : ""
        return ["Distribuční síťka", typeStr, matStr, speedStr, colorStr, widthStr].filter(Boolean).join(" ")
      }
      case 'FCH': {
        const subMap: Record<string, string> = {
          TAPE: "páskový",
          SPRL: "spirálový",
          OMEGA: "omega profil",
          TUBE: "hadice",
          TTUBE: "hadice"
        }
        const subStr = subMap[specs.podtyp_fch] || ""
        let dimStr = ""
        if (specs.podtyp_fch === "TAPE") {
          dimStr = specs.sirka_mm && specs.vyska_mm ? `${specs.sirka_mm}x${specs.vyska_mm}mm` : ""
        } else if (specs.podtyp_fch === "SPRL") {
          dimStr = specs.vnitrni_prumer_mm ? `vnitřní průměr ${specs.vnitrni_prumer_mm}mm` : ""
        } else if (specs.podtyp_fch === "OMEGA") {
          dimStr = specs.vnitrni_prumer_mm ? `vnitřní průměr ${specs.vnitrni_prumer_mm}mm` : ""
        } else if (specs.podtyp_fch === "TUBE" || specs.podtyp_fch === "TTUBE") {
          dimStr = specs.vnitrni_prumer_mm ? `vnitřní průměr ${specs.vnitrni_prumer_mm}mm` : ""
        }

        let tempStr = ""
        if (specs.teplotni_odolnost) {
          const match = String(specs.teplotni_odolnost).match(/\d+/)
          if (match) {
            tempStr = `do ${match[0]}°C`
          }
        }
        return ["Distribuční kanálek", subStr, dimStr, tempStr].filter(Boolean).join(" ")
      }
      case 'TUBE': {
        const matStr = specs.material || ""
        const diaStr = specs.vnitrni_prumer_mm ? `vnitřní průměr ${specs.vnitrni_prumer_mm}mm` : ""
        let tempStr = ""
        if (specs.teplotni_odolnost) {
          const match = String(specs.teplotni_odolnost).match(/\d+/)
          if (match) {
            tempStr = `do ${match[0]}°C`
          }
        }
        return ["Hadice", matStr, diaStr, tempStr].filter(Boolean).join(" ")
      }
      case 'K': {
        const tvarStr = specs.tvar ? `tvar ${specs.tvar}` : ""
        const diaStr = specs.vnejsi_prumer_mm ? `vnější průměr ${specs.vnejsi_prumer_mm}mm` : ""
        return ["Konektor", tvarStr, diaStr].filter(Boolean).join(" ")
      }
    }
  }

  if (categoryId === 'naradi') {
    const sub = specs.podkategorie
    switch (sub) {
      case 'BU': {
        const tvarMap: Record<string, string> = {
          T: "T-kus",
          O: "kruhová"
        }
        const matMap: Record<string, string> = {
          MET: "kov",
          PLA: "plast"
        }
        const tvarStr = tvarMap[specs.tvar] || ""
        const matStr = matMap[specs.material] || ""
        const diaStr = specs.prumer_mm ? `${specs.prumer_mm}mm` : ""
        return ["Vakuová průchodka", tvarStr, matStr, diaStr].filter(Boolean).join(" ")
      }
      case 'QR': {
        const typMap: Record<string, string> = {
          PLUG: "vsuvka",
          SOCKET: "samice"
        }
        const matMap: Record<string, string> = {
          BRS: "mosaz",
          STL: "ocel",
          SS: "nerez"
        }
        const typStr = typMap[specs.typ_pripojeni] || ""
        const matStr = matMap[specs.material] || ""
        return ["Rychlospojka", typStr, matStr].filter(Boolean).join(" ")
      }
      case 'SQ': {
        const diaStr = specs.prumer_mm ? `${specs.prumer_mm}mm` : ""
        return ["Škrtící svorka", diaStr].filter(Boolean).join(" ")
      }
      case 'V': {
        const idStr = specs.identifikator ? `– ${specs.identifikator}` : ""
        return ["Vakuometr", idStr].filter(Boolean).join(" ")
      }
    }
  }

  if (categoryId === 'lepidla') {
    const chemMap: Record<string, string> = {
      EP: "epoxidové",
      PU: "polyuretanové",
      MMA: "akrylátové (MMA)"
    }
    const colorMap: Record<string, string> = {
      black: "černé",
      grey: "šedé",
      white: "bílé",
      clear: "čiré",
      "off-white": "krémové (off-white)"
    }
    const chemStr = chemMap[specs.chemie] || specs.chemie || ""
    const colorStr = colorMap[specs.barva] || specs.barva || ""
    const openTimeStr = specs.open_time_min ? `${specs.open_time_min} min` : ""
    const volumeStr = specs.objem || ""
    
    // Generate code like EP60B
    const chemCode = specs.chemie || ""
    const openTimeVal = specs.open_time_min || ""
    const colorCharMap: Record<string, string> = {
      black: "B",
      grey: "G",
      white: "W",
      clear: "C",
      "off-white": "O"
    }
    const colorChar = colorCharMap[specs.barva] || ""
    const codeSuffix = chemCode && openTimeVal && colorChar ? `(${chemCode}${openTimeVal}${colorChar})` : ""
    
    const parts = [
      `Lepidlo ${chemStr}`.trim(),
      colorStr,
      codeSuffix
    ].filter(Boolean).join(" ")

    const details = [openTimeStr, volumeStr].filter(Boolean).join(", ")
    return details ? `${parts}, ${details}` : parts
  }

  return ""
}
