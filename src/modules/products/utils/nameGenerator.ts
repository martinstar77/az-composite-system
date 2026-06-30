export function generateProductName(
  specs: any, 
  categoryId: string, 
  fiberCodes?: Array<{ id: string, nazev: string }>,
  lang: 'cs' | 'en' = 'cs'
): string {
  const isCs = lang === 'cs';

  if (categoryId === 'vyztuzne_materialy') {
    const materialMapCS: Record<string, string> = {
      CF: "Uhlíková",
      GF: "Skelná",
      AF: "Aramidová",
      BIOF: "Bio lněná",
      BIOH: "Bio konopná",
      PAN: "Polyakrylonitrilová",
      PET: "Polyesterová (PET)",
      OF: "Ostatní",
    }
    const materialMapHybridCS: Record<string, string> = {
      CF: "uhlík",
      GF: "sklo",
      AF: "aramid",
      BIOF: "bio len",
      BIOH: "bio konopí",
      PAN: "polyakrylonitril",
      PET: "PET",
      OF: "ostatní",
    }
    const materialMapEN: Record<string, string> = {
      CF: "Carbon",
      GF: "Glass",
      AF: "Aramid",
      BIOF: "Bio Flax",
      BIOH: "Bio Hemp",
      PAN: "Polyacrylonitrile",
      PET: "Polyethylene Terephthalate",
      OF: "Other",
    }

    const formMapCS: Record<string, string> = {
      WF: "tkanina",
      UD: "UD páska",
      BIAX: "biaxiální tkanina",
      MAT: "rohož"
    }
    const formMapEN: Record<string, string> = {
      WF: "Fibre Fabric",
      UD: "UD Tape",
      BIAX: "Biaxial Fabric",
      MAT: "Fibre Mat"
    }

    const weaveMapCS: Record<string, string> = {
      P: "plátno",
      T22: "kepr 2/2",
      T44: "kepr 4/4",
      NP: "vpichovaná",
      EM: "emulzní",
      PB: "prášková",
      ST: "šitá",
      "090": "0/90°",
      "45": "±45°"
    }
    const weaveMapEN: Record<string, string> = {
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

    const useMapCS: Record<string, string> = {
      E: "Ekonomická",
      V: "Pohledová",
      I: "Průmyslová"
    }
    const useMapEN: Record<string, string> = {
      E: "Economy",
      V: "Visual",
      I: "Industry"
    }

    // 1. Resolve Material & Form
    let materialStr = ""
    if (specs.materiál === "HF") {
      const mat1Key = specs.material1 || (specs.materiál_složení && specs.materiál_složení[0]) || ""
      const mat2Key = specs.material2 || (specs.materiál_složení && specs.materiál_složení[1]) || ""
      if (isCs) {
        const mat1 = materialMapHybridCS[mat1Key] || ""
        const mat2 = materialMapHybridCS[mat2Key] || ""
        materialStr = mat1 && mat2 ? `Hybridní (${mat1} / ${mat2})` : "Hybridní"
      } else {
        const mat1 = materialMapEN[mat1Key] || ""
        const mat2 = materialMapEN[mat2Key] || ""
        materialStr = mat1 && mat2 ? `${mat1} / ${mat2} Hybrid` : "Hybrid"
      }
    } else {
      materialStr = isCs ? (materialMapCS[specs.materiál] || "") : (materialMapEN[specs.materiál] || "")
    }

    const formStr = isCs ? (formMapCS[specs.typ] || "tkanina") : (formMapEN[specs.typ] || "Fabric")
    
    // Capitalize first letter of baseName in CS if it starts with lowercase
    let baseName = ""
    if (isCs) {
      baseName = materialStr ? `${materialStr} ${formStr}` : (formStr.charAt(0).toUpperCase() + formStr.slice(1))
    } else {
      baseName = materialStr ? `${materialStr} ${formStr}` : formStr
    }

    // 2. Grammage
    const weightStr = specs.gramáž ? `${specs.gramáž}g/m2` : ""

    // 3. Fiber size / Tow
    function formatTow(tow: string) {
      if (!tow || tow === "NA") return ""
      if (tow.endsWith("t")) {
        return tow.replace("t", " dtex")
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
    const weaveStr = (specs.vazba && specs.vazba.toUpperCase() !== "NA")
      ? (isCs ? (weaveMapCS[specs.vazba] || specs.vazba) : (weaveMapEN[specs.vazba] || specs.vazba))
      : ""

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
    const useStr = isCs ? (useMapCS[specs.použití] || "") : (useMapEN[specs.použití] || "")

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
        const formatMapCS: Record<string, string> = {
          TUBE: "tubus",
          SHT: "plochá",
          VSHT: "V-sklad",
          GSC: "harmonika"
        }
        const formatMapEN: Record<string, string> = {
          TUBE: "tube",
          SHT: "flat sheet",
          VSHT: "V-fold",
          GSC: "gusseted tube"
        }
        const formatStr = isCs 
          ? (formatMapCS[specs.format] || specs.format || "")
          : (formatMapEN[specs.format] || specs.format || "")
        const thickStr = specs.tloustka_um ? `${specs.tloustka_um}µm` : ""
        const tempStr = specs.teplotni_odolnost || ""
        const widthStr = specs.sirka_cm ? `${specs.sirka_cm}cm` : ""
        const baseName = isCs ? "Vakuová fólie" : "Vacuum bagging film"
        return [baseName, formatStr, thickStr, tempStr, widthStr].filter(Boolean).join(" ")
      }
      case 'RF': {
        const perfMapCS: Record<string, string> = {
          NP: "neperforovaná",
          P3: "perforovaná P3",
          P6: "perforovaná P6",
          P16: "perforovaná P16",
          P31: "perforovaná P31"
        }
        const perfMapEN: Record<string, string> = {
          NP: "non-perforated",
          P3: "perforated P3",
          P6: "perforated P6",
          P16: "perforated P16",
          P31: "perforated P31"
        }
        const perfStr = isCs
          ? (perfMapCS[specs.perforace] || specs.perforace || "")
          : (perfMapEN[specs.perforace] || specs.perforace || "")
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
        const baseName = isCs ? "Separační fólie" : "Release film"
        return [baseName, perfStr, thickStr, tempStr, widthStr].filter(Boolean).join(" ")
      }
      case 'PP': {
        const polyMapCS: Record<string, string> = {
          PE: "polyester",
          PA66: "nylon"
        }
        const polyMapEN: Record<string, string> = {
          PE: "polyester",
          PA66: "nylon"
        }
        const polyStr = isCs
          ? (polyMapCS[specs.polymer] || specs.polymer || "")
          : (polyMapEN[specs.polymer] || specs.polymer || "")
        const weightStr = specs.gramaz_gm2 ? `${specs.gramaz_gm2}g/m2` : ""
        const widthStr = specs.sirka_cm ? `${specs.sirka_cm}cm` : ""
        const baseName = isCs ? "Strhávací tkanina" : "Peel ply"
        return [baseName, polyStr, weightStr, widthStr].filter(Boolean).join(" ")
      }
      case 'PP-PTFE': {
        const adhStr = isCs
          ? (specs.je_lepici === true ? "samolepicí" : "nesamolepicí")
          : (specs.je_lepici === true ? "self-adhesive" : "non-adhesive")
        const thickStr = specs.tloustka_um ? `${specs.tloustka_um}µm` : ""
        const widthStr = specs.sirka_cm ? `${specs.sirka_cm}cm` : ""
        const baseName = isCs ? "Teflonová strhávací tkanina" : "PTFE coated peel ply"
        return [baseName, adhStr, thickStr, widthStr].filter(Boolean).join(" ")
      }
      case 'BC': {
        const weightStr = specs.gramaz_gm2 ? `${specs.gramaz_gm2}g/m2` : ""
        const widthStr = specs.sirka_cm ? `${specs.sirka_cm}cm` : ""
        const baseName = isCs ? "Odsávací netkaná textilie" : "Breather/bleeder felt"
        return [baseName, weightStr, widthStr].filter(Boolean).join(" ")
      }
      case 'ST': {
        const tempStr = specs.teplotni_odolnost_c ? `${specs.teplotni_odolnost_c}°C` : ""
        const widthStr = specs.sirka_mm ? `${specs.sirka_mm}mm` : ""
        const baseName = isCs ? "Těsnicí páska" : "Sealant tape"
        return [baseName, tempStr, widthStr].filter(Boolean).join(" ")
      }
      case 'FT': {
        const widthStr = specs.sirka_mm ? `${specs.sirka_mm}mm` : ""
        const tempStr = specs.teplotni_odolnost || ""
        const baseName = isCs ? "Lepicí páska Flash tape" : "Flash tape adhesive tape"
        return [baseName, widthStr, tempStr].filter(Boolean).join(" ")
      }
      case 'FM': {
        const typeMapCS: Record<string, string> = {
          EXT: "extrudovaná",
          WVN: "tkaná"
        }
        const typeMapEN: Record<string, string> = {
          EXT: "extruded",
          WVN: "woven"
        }
        const colorMapCS: Record<string, string> = {
          CLR: "čirá",
          BLK: "černá",
          RED: "červená",
          GRN: "zelená"
        }
        const colorMapEN: Record<string, string> = {
          CLR: "clear",
          BLK: "black",
          RED: "red",
          GRN: "green"
        }
        const speedMapCS: Record<string, string> = {
          low: "nízká rychlost",
          medium: "střední rychlost",
          high: "vysoká rychlost"
        }
        const speedMapEN: Record<string, string> = {
          low: "low flow speed",
          medium: "medium flow speed",
          high: "high flow speed"
        }
        const typeStr = isCs ? (typeMapCS[specs.typ_vyroby] || "") : (typeMapEN[specs.typ_vyroby] || "")
        const matStr = specs.material || ""
        const speedStr = isCs 
          ? (speedMapCS[specs.rychlost_proudeni] || specs.rychlost_proudeni || "")
          : (speedMapEN[specs.rychlost_proudeni] || specs.rychlost_proudeni || "")
        const colorStr = isCs ? (colorMapCS[specs.barva] || "") : (colorMapEN[specs.barva] || "")
        
        const flexMapCS: Record<string, string> = {
          velka: "vysoká flexibilita",
          mala: "nízká flexibilita",
          zadna: "bez flexibility",
          true: "vysoká flexibilita",
          false: "bez flexibility",
          ANO: "vysoká flexibilita",
          NE: "bez flexibility"
        }
        const flexMapEN: Record<string, string> = {
          velka: "high flexibility",
          mala: "low flexibility",
          zadna: "no flexibility",
          true: "high flexibility",
          false: "no flexibility",
          ANO: "high flexibility",
          NE: "no flexibility"
        }
        const rawFlex = specs.flexibilita !== undefined && specs.flexibilita !== null ? String(specs.flexibilita) : ""
        const flexStr = rawFlex 
          ? (isCs ? (flexMapCS[rawFlex] || `flexibilita: ${rawFlex}`) : (flexMapEN[rawFlex] || `flexibility: ${rawFlex}`))
          : ""

        const widthStr = specs.sirka_cm ? `${specs.sirka_cm}cm` : ""
        const baseName = isCs ? "Distribuční síťka" : "Resin distribution mesh"
        return [baseName, typeStr, matStr, speedStr, colorStr, flexStr, widthStr].filter(Boolean).join(" ")
      }
      case 'FCH': {
        const subMapCS: Record<string, string> = {
          TAPE: "páskový",
          SPRL: "spirálový",
          OMEGA: "omega profil",
          TUBE: "hadice",
          TTUBE: "hadice"
        }
        const subMapEN: Record<string, string> = {
          TAPE: "flat tape style",
          SPRL: "spiral",
          OMEGA: "omega profile",
          TUBE: "tube",
          TTUBE: "tube"
        }
        const subStr = isCs 
          ? (subMapCS[specs.podtyp_fch] || "")
          : (subMapEN[specs.podtyp_fch] || "")
        let dimStr = ""
        if (specs.podtyp_fch === "TAPE") {
          dimStr = specs.sirka_mm && specs.vyska_mm ? `${specs.sirka_mm}x${specs.vyska_mm}mm` : ""
        } else {
          if (specs.vnitrni_prumer_mm) {
            dimStr = isCs 
              ? `vnitřní průměr ${specs.vnitrni_prumer_mm}mm`
              : `inner diameter ${specs.vnitrni_prumer_mm}mm`
          }
        }
        const baseName = isCs ? "Distribuční kanálek" : "Resin distribution channel"
        return [baseName, subStr, dimStr].filter(Boolean).join(" ")
      }
      case 'TUBE': {
        const matStr = specs.material || ""
        let diaStr = ""
        if (specs.vnitrni_prumer_mm) {
          diaStr = isCs
            ? `vnitřní průměr ${specs.vnitrni_prumer_mm}mm`
            : `inner diameter ${specs.vnitrni_prumer_mm}mm`
        }
        let tempStr = ""
        if (specs.teplotni_odolnost) {
          const match = String(specs.teplotni_odolnost).match(/\d+/)
          if (match) {
            tempStr = isCs ? `do ${match[0]}°C` : `up to ${match[0]}°C`
          }
        }
        const baseName = isCs ? "Hadice" : "Hose"
        return [baseName, matStr, diaStr, tempStr].filter(Boolean).join(" ")
      }
      case 'K': {
        const tvarStr = specs.tvar ? (isCs ? `tvar ${specs.tvar}` : `shape ${specs.tvar}`) : ""
        let diaStr = ""
        if (specs.vnejsi_prumer_mm) {
          diaStr = isCs
            ? `vnější průměr ${specs.vnejsi_prumer_mm}mm`
            : `outer diameter ${specs.vnejsi_prumer_mm}mm`
        }
        const baseName = isCs ? "Konektor" : "Connector"
        return [baseName, tvarStr, diaStr].filter(Boolean).join(" ")
      }
      case 'MTI': {
        const typ = specs.typ_mti || ""
        const typLabelMap: Record<string, string> = {
          Hose: "MTI Hose",
          Valve: "MTI Valve",
          MVS: "MTI MVS",
          RBL: "MTI Resin Brake Line"
        }
        const baseName = typLabelMap[typ] || `MTI ${typ}`
        if (typ === 'MVS' && specs.sirka_mm) {
          const widthSuffix = /^\d+$/.test(String(specs.sirka_mm)) ? `${specs.sirka_mm} mm` : String(specs.sirka_mm)
          return `${baseName} ${widthSuffix}`
        }
        return baseName
      }
      case 'KP': {
        const tvarMapCS: Record<string, string> = {
          T: "T-kus",
          O: "kruhový"
        }
        const tvarMapEN: Record<string, string> = {
          T: "T-piece",
          O: "circular"
        }
        const tvarStr = isCs ? (tvarMapCS[specs.tvar] || "") : (tvarMapEN[specs.tvar] || "")
        const matStr = isCs ? "plast" : "plastic"
        const diaStr = specs.prumer_mm ? `${specs.prumer_mm}mm` : ""
        const baseName = isCs ? "Konektor průchodný" : "Through-connector"
        return [baseName, tvarStr, matStr, diaStr].filter(Boolean).join(" ")
      }
    }
  }

  if (categoryId === 'naradi') {
    const sub = specs.podkategorie
    switch (sub) {
      case 'BU': {
        const diaStr = specs.prumer_mm ? `${specs.prumer_mm}mm` : ""
        const matStr = isCs ? "kov" : "metal"
        const baseName = isCs ? "Vakuová průchodka" : "Vacuum breach/feedthrough"
        return [baseName, matStr, diaStr].filter(Boolean).join(" ")
      }
      case 'QR': {
        const typMapCS: Record<string, string> = {
          PLUG: "vsuvka",
          SOCKET: "samice"
        }
        const typMapEN: Record<string, string> = {
          PLUG: "plug (male)",
          SOCKET: "socket (female)"
        }
        const matMapCS: Record<string, string> = {
          BRS: "mosaz",
          STL: "ocel",
          SS: "nerez"
        }
        const matMapEN: Record<string, string> = {
          BRS: "brass",
          STL: "steel",
          SS: "stainless steel"
        }
        const typStr = isCs ? (typMapCS[specs.typ_pripojeni] || "") : (typMapEN[specs.typ_pripojeni] || "")
        const matStr = isCs ? (matMapCS[specs.material] || "") : (matMapEN[specs.material] || "")
        const baseName = isCs ? "Rychlospojka" : "Quick coupling"
        return [baseName, typStr, matStr].filter(Boolean).join(" ")
      }
      case 'SQ': {
        const diaStr = specs.prumer_mm ? `${specs.prumer_mm}mm` : ""
        const baseName = isCs ? "Škrtící svorka" : "Hose pinch clamp"
        return [baseName, diaStr].filter(Boolean).join(" ")
      }
      case 'V': {
        const idStr = specs.identifikator ? `– ${specs.identifikator}` : ""
        const baseName = isCs ? "Vakuometr" : "Vacuum gauge"
        return [baseName, idStr].filter(Boolean).join(" ")
      }
      case 'CU': {
        const objemStr = specs.objem_l ? `, ${specs.objem_l} l` : ""
        const baseName = isCs ? "Mycí stanice RST5" : "RST5 Cleaning station"
        return `${baseName}${objemStr}`
      }
      case 'SU': {
        return "Spinner unit Spin RST5"
      }
    }
  }

  if (categoryId === 'lepidla') {
    const chemMapCS: Record<string, string> = {
      EP: "epoxidové",
      PU: "polyuretanové",
      MMA: "akrylátové (MMA)"
    }
    const chemMapEN: Record<string, string> = {
      EP: "epoxy",
      PU: "polyurethane",
      MMA: "acrylic (MMA)"
    }
    const colorMapCS: Record<string, string> = {
      black: "černé",
      grey: "šedé",
      white: "bílé",
      clear: "čiré",
      "off-white": "krémové (off-white)"
    }
    const colorMapEN: Record<string, string> = {
      black: "black",
      grey: "grey",
      white: "white",
      clear: "clear",
      "off-white": "off-white"
    }
    const chemStr = isCs ? (chemMapCS[specs.chemie] || specs.chemie || "") : (chemMapEN[specs.chemie] || specs.chemie || "")
    const colorStr = isCs ? (colorMapCS[specs.barva] || specs.barva || "") : (colorMapEN[specs.barva] || specs.barva || "")
    const openTimeStr = specs.open_time_min ? `${specs.open_time_min} min` : ""
    
    let volumeStr = specs.objem ? String(specs.objem).trim() : ""
    if (volumeStr && !volumeStr.toLowerCase().includes('ml') && !volumeStr.toLowerCase().includes('l')) {
      volumeStr = `${volumeStr} ml`
    } else if (volumeStr) {
      // Ensure there's a space before ml/L if not present, optional cleanup
      volumeStr = volumeStr.replace(/([0-9])([a-zA-Z]+)/, '$1 $2').toLowerCase()
    }
    
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
    
    const prefix = isCs ? `Lepidlo ${chemStr}` : `${chemStr.charAt(0).toUpperCase() + chemStr.slice(1)} adhesive`
    const parts = [
      prefix.trim(),
      colorStr,
      codeSuffix
    ].filter(Boolean).join(" ")

    const details = [openTimeStr, volumeStr].filter(Boolean).join(", ")
    return details ? `${parts}, ${details}` : parts
  }
  
  if (categoryId === 'pryskyrice') {
    const typeLabelMapCS: Record<string, string> = {
      RES: "pryskyřice",
      HRD: "tužidlo",
      GEL: "gelcoat",
      COP: "coupling coat",
      FIL: "tmel"
    }
    const typeLabelMapEN: Record<string, string> = {
      RES: "resin",
      HRD: "hardener",
      GEL: "gelcoat",
      COP: "coupling coat",
      FIL: "filler"
    }

    const adjMapCS: Record<string, { F: string; M: string; N: string }> = {
      EP: { F: "epoxidová", M: "epoxidový", N: "epoxidové" },
      VE: { F: "vinylesterová", M: "vinylesterový", N: "vinylesterové" },
      PE: { F: "polyesterová", M: "polyesterový", N: "polyesterové" }
    }
    const adjMapEN: Record<string, string> = {
      EP: "Epoxy",
      VE: "Vinyl ester",
      PE: "Polyester"
    }

    const typ = specs.typ || ""
    const chemie = specs.chemie || ""
    const pouziti = specs.pouziti || ""

    const baseNoun = isCs ? (typeLabelMapCS[typ] || typ) : (typeLabelMapEN[typ] || typ)
    let adjective = ""
    let baseName = ""
    
    if (isCs) {
      if (typ === "HRD") {
        const chemNounCS: Record<string, string> = {
          EP: "epoxidovou",
          VE: "vinylesterovou",
          PE: "polyesterovou"
        }
        const chemStr = chemNounCS[chemie] || chemie
        baseName = `Tužidlo pro ${chemStr} pryskyřici`
      } else {
        if (adjMapCS[chemie]) {
          if (typ === "RES") adjective = adjMapCS[chemie].F
          else adjective = adjMapCS[chemie].M
        }
        baseName = adjective ? `${adjective.charAt(0).toUpperCase() + adjective.slice(1)} ${baseNoun}` : baseNoun
      }
    } else {
      if (typ === "HRD") {
        const chemNounEN: Record<string, string> = {
          EP: "epoxy",
          VE: "vinyl ester",
          PE: "polyester"
        }
        const chemStr = chemNounEN[chemie] || chemie.toLowerCase()
        baseName = `Hardener for ${chemStr} resin`
      } else {
        adjective = adjMapEN[chemie] || ""
        baseName = adjective ? `${adjective} ${baseNoun}` : baseNoun
      }
    }

    const extraParts: string[] = []

    if (typ === "COP" || typ === "GEL" || typ === "FIL" || typ === "RES") {
      const techMapCS: Record<string, string> = {
        INF: "pro infuzi",
        WL: "pro ruční laminaci"
      }
      const techMapEN: Record<string, string> = {
        INF: "for infusion",
        WL: "for hand lay-up"
      }
      const techStr = isCs ? (techMapCS[specs.technologie] || "") : (techMapEN[specs.technologie] || "")
      if (techStr) extraParts.push(techStr)
    }

    let fullName = [baseName, ...extraParts].filter(Boolean).join(" ")

    if (typ === "HRD" && specs.cas_vytvrzeni) {
      const curingCS: Record<string, string> = {
        slow: "pomalé",
        medium: "střední",
        fast: "rychlé"
      }
      const curingEN: Record<string, string> = {
        slow: "slow",
        medium: "medium",
        fast: "fast"
      }
      const val = specs.cas_vytvrzeni.toLowerCase()
      fullName += isCs
        ? `, ${curingCS[val] || specs.cas_vytvrzeni}`
        : `, ${curingEN[val] || specs.cas_vytvrzeni}`
    }

    return fullName
  }

  if (categoryId === 'spotrebni_chemie') {
    const sub = specs.podkategorie || "standard"
    if (sub === 'pmp') {
      const qty = specs.mnozstvi || ""
      const baseName = isCs ? "Čistič PMP liquid" : "Cleaner PMP liquid"
      return `${baseName}, ${qty}`.trim().replace(/,\s*$/, '')
    }

    const typeLabelMapCS: Record<string, string> = {
      WIP: "Čisticí ubrousky",
      CON: "Čisticí koncentrát",
      SPR: "Čisticí sprej"
    }
    const typeLabelMapEN: Record<string, string> = {
      WIP: "Cleaning wipes",
      CON: "Cleaning concentrate",
      SPR: "Cleaning spray"
    }
    const unitMapCS: Record<string, string> = {
      WIP: "ks",
      CON: "l",
      SPR: "ml"
    }
    const unitMapEN: Record<string, string> = {
      WIP: "pcs",
      CON: "l",
      SPR: "ml"
    }

    const typ = specs.typ || ""
    const brand = specs.značka || specs.znacka || ""
    const qty = specs.mnozstvi || specs.množství || ""

    const typeLabel = isCs ? (typeLabelMapCS[typ] || "Čistič") : (typeLabelMapEN[typ] || "Cleaner")
    const unit = isCs ? (unitMapCS[typ] || "") : (unitMapEN[typ] || "")

    let qtyStr = ""
    if (qty) {
      const hasUnitSuffix = /[a-zA-Z]/.test(qty)
      qtyStr = hasUnitSuffix ? `, ${qty}` : `, ${qty} ${unit}`.trim()
    }
    return `${typeLabel} ${brand}${qtyStr}`.trim()
  }

  if (categoryId === 'chemie') {
    const sub = specs.podkategorie
    const chemieMapCS: Record<string, string> = {
      waterbased: "na vodní bázi",
      solvent: "rozpouštědlový"
    }
    const chemieMapEN: Record<string, string> = {
      waterbased: "water-based",
      solvent: "solvent-based"
    }
    const vlastnostMapCS: Record<string, string> = {
      visual: "pohledové",
      industry: "nepohledové",
      HS: "High Slip",
      LS: "Low Slip",
      EP: "Easy Paint"
    }
    const vlastnostMapEN: Record<string, string> = {
      visual: "cosmetic",
      industry: "industrial",
      HS: "High Slip",
      LS: "Low Slip",
      EP: "Easy Paint"
    }

    const subNameMapCS: Record<string, string> = {
      lepidlo_ve_spreji: "Lepidlo ve spreji",
      blinder: "Binder",
      plnic_poru_sealer: "Plnič pórů / Sealer",
      separatory_release_agent: "Separátor / Release agent"
    }
    const subNameMapEN: Record<string, string> = {
      lepidlo_ve_spreji: "Spray adhesive",
      blinder: "Binder",
      plnic_poru_sealer: "Pore sealer / filler",
      separatory_release_agent: "Release agent"
    }

    const baseName = isCs ? (subNameMapCS[sub] || "Chemie") : (subNameMapEN[sub] || "Chemicals")
    const chemieStr = isCs ? (chemieMapCS[specs.chemie] || "") : (chemieMapEN[specs.chemie] || "")
    const vlastnostStr = isCs ? (vlastnostMapCS[specs.vlastnost] || "") : (vlastnostMapEN[specs.vlastnost] || "")
    const objemStr = specs.objem || ""

    if (sub === 'lepidlo_ve_spreji') {
      return [baseName, vlastnostStr].filter(Boolean).join(" ") + (objemStr ? `, ${objemStr}` : "")
    } else if (sub === 'blinder') {
      return [baseName, chemieStr].filter(Boolean).join(" ") + (objemStr ? `, ${objemStr}` : "")
    } else if (sub === 'plnic_poru_sealer' || sub === 'separatory_release_agent') {
      const prep = [chemieStr, vlastnostStr].filter(Boolean).join(" ")
      return [baseName, prep].filter(Boolean).join(" ") + (objemStr ? `, ${objemStr}` : "")
    }
    return baseName
  }

  if (categoryId === 'brouseni_a_lesteni') {
    const sub = specs.podkategorie
    if (sub === 'vosk') {
      const waxNameMap = {
        uv_shield: "UV shield",
        flash_touch: "Flash Touch"
      }
      const stateMapCS = {
        tekuty_vosk: "tekutý vosk",
        pasta: "pasta"
      }
      const stateMapEN = {
        tekuty_vosk: "liquid wax",
        pasta: "paste"
      }
      const waxName = (waxNameMap as any)[specs.nazev_vosku] || specs.nazev_vosku || ""
      const stateStr = isCs ? ((stateMapCS as any)[specs.skupenstvi] || specs.skupenstvi || "") : ((stateMapEN as any)[specs.skupenstvi] || specs.skupenstvi || "")
      const qtyStr = specs.mnozstvi || ""
      const baseName = isCs ? "Vosk" : "Wax"
      return [`${baseName} ${waxName} ${stateStr}`.trim(), qtyStr].filter(Boolean).join(", ")
    }

    if (sub === 'pasty') {
      const contMapCS = {
        CAN: "plechovka",
        BOT: "láhev"
      }
      const contMapEN = {
        CAN: "can",
        BOT: "bottle"
      }
      const contStr = isCs ? ((contMapCS as any)[specs.obal] || specs.obal || "") : ((contMapEN as any)[specs.obal] || specs.obal || "")

      const typeMap = {
        rex: "Rex",
        perla15: "Perla 15",
        top_finish_3: "Top Finish 3"
      }
      const colorMapCS = {
        white: "bílá",
        black: "černá"
      }
      const colorMapEN = {
        white: "white",
        black: "black"
      }
      const pasteType = (typeMap as any)[specs.typ] || specs.typ || ""
      const colorStr = isCs ? ((colorMapCS as any)[specs.barva] || "") : ((colorMapEN as any)[specs.barva] || "")
      const weightStr = specs.hmotnost || ""

      const typeAndColor = [pasteType, colorStr].filter(Boolean).join(" ")
      let prefix = ""
      if (isCs) {
        prefix = (specs.typ === 'rex' || specs.typ === 'perla15') ? "Brusná pasta" : "Lešticí pasta"
      } else {
        prefix = (specs.typ === 'rex' || specs.typ === 'perla15') ? "Abrasive compound" : "Polishing compound"
      }
      return [`${prefix} ${typeAndColor}`.trim(), contStr, weightStr].filter(Boolean).join(", ")
    } else if (sub === 'brusne_kotouce') {
      const discTypeMapCS = {
        vlneny: "vlněný",
        pena: "pěnový"
      }
      const discTypeMapEN = {
        vlneny: "wool",
        pena: "foam"
      }
      const pasteNameMap = {
        ST1: "Rex",
        ST1Y: "Rex",
        SL3: "Perla 15"
      }
      const discTypeStr = isCs ? ((discTypeMapCS as any)[specs.typ_kotouce] || specs.typ_kotouce || "") : ((discTypeMapEN as any)[specs.typ_kotouce] || specs.typ_kotouce || "")
      const code = specs.kod_kotouce || ""
      const prumer = specs.prumer ? `D${specs.prumer}` : ""

      if (specs.typ_kotouce === 'vlneny') {
        if (code === 'UNI') {
          return isCs
            ? `Brusný kotouč vlněný koule universal ${prumer}`.trim()
            : `Wool universal ball buffing pad ${prumer}`.trim()
        }
        const assocPaste = (pasteNameMap as any)[code] || ""
        if (isCs) {
          const assocPart = assocPaste ? ` pro ${assocPaste}` : ""
          return `Brusný kotouč vlněný ${code}${assocPart} ${prumer}`.trim()
        } else {
          const assocPart = assocPaste ? ` for ${assocPaste}` : ""
          return `Wool buffing pad ${code}${assocPart} ${prumer}`.trim()
        }
      } else if (specs.typ_kotouce === 'pena') {
        return isCs
          ? `Brusný kotouč pěnový ${code} ${prumer}`.trim()
          : `Foam buffing pad ${code} ${prumer}`.trim()
      }
      return isCs
        ? `Brusný kotouč ${discTypeStr} ${prumer}`.trim()
        : `${discTypeStr.charAt(0).toUpperCase() + discTypeStr.slice(1)} buffing pad ${prumer}`.trim()
    } else if (sub === 'prislusenstvi') {
      const typeMap = {
        backplate: "Backplate"
      }
      const propMapCS = {
        rigid: "rigidní",
        flexible: "flexibilní"
      }
      const propMapEN = {
        rigid: "rigid",
        flexible: "flexible"
      }
      const accType = (typeMap as any)[specs.typ_prislusenstvi] || specs.typ_prislusenstvi || ""
      const propStr = isCs ? ((propMapCS as any)[specs.vlastnost] || specs.vlastnost || "") : ((propMapEN as any)[specs.vlastnost] || specs.vlastnost || "")
      const prumer = specs.prumer ? `D${specs.prumer}` : ""

      return `${accType} ${propStr} ${prumer}`.trim()
    }
    return isCs ? "Broušení a leštění" : "Sanding and polishing"
  }

  return ""
}

export function generateProductNames(
  specs: any,
  categoryId: string,
  fiberCodes?: Array<{ id: string, nazev: string }>
): { cs: string; en: string } {
  return {
    cs: generateProductName(specs, categoryId, fiberCodes, 'cs'),
    en: generateProductName(specs, categoryId, fiberCodes, 'en')
  }
}
