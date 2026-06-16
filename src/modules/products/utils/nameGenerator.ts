export function generateProductName(specs: any, categoryId: string): string {
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

  const brandMap: Record<string, string> = {
    ZH: "Zhongfu",
    TN: "Tenax",
    TA: "Tayrifil",
    HY: "Hyosung",
    MI: "Mitsubishi",
    HX: "Hexcel",
    TO: "Toray",
    DP: "Dupont"
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

  // 5. Brand (Manufacturer)
  let brandStr = ""
  if (specs.materiál === "HF") {
    const b1 = brandMap[specs.vyrobce1] || ""
    const b2 = brandMap[specs.vyrobce2] || ""
    brandStr = b1 && b2 ? `${b1} / ${b2}` : (b1 || b2 || "")
  } else {
    brandStr = brandMap[specs.výrobce_vlákna] || ""
  }

  // 6. Quality Tier
  const useStr = useMap[specs.použití] || ""

  // Join sections
  const nameParts = [baseName, weightStr, towStr, weaveStr].filter(Boolean)
  let fullName = nameParts.join(" ")

  const brandParts = [brandStr, useStr].filter(Boolean)
  if (brandParts.length > 0) {
    fullName += ` - ${brandParts.join(" ")}`
  }

  return fullName
}
