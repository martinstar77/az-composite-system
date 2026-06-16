export function generateProductName(
  specs: any, 
  categoryId: string, 
  fiberCodes?: Array<{ id: string, nazev: string }>
): string {
  if (categoryId !== 'vyztuzne_materialy') return ""

  const materialMap: Record<string, string> = {
    CF: "Carbon",
    GF: "Glass",
    AF: "Aramid",
    BF: "Bio",
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
    T44: "Twill 4/4"
  }

  // Fiber Code lookup helper (looks in list, falls back to raw ID capitalized)
  function getFiberCodeLabel(codeId: string) {
    if (!codeId) return ""
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
    const mat1 = materialMap[specs.material1] || ""
    const mat2 = materialMap[specs.material2] || ""
    materialStr = mat1 && mat2 ? `${mat1} / ${mat2} Hybrid` : "Hybrid"
  } else {
    materialStr = materialMap[specs.materiál] || ""
  }

  const formStr = formMap[specs.typ] || "Fabric"
  const baseName = materialStr ? `${materialStr} ${formStr}` : formStr

  // 2. Grammage
  const weightStr = specs.gramáž ? `${specs.gramáž}g/m2` : ""

  // 3. Fiber size / Tow
  const towStr = specs.vlákno && specs.vlákno !== "NA" ? specs.vlákno : ""

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
