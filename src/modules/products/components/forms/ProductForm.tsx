"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { Label } from "@/shared/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select"
import { Textarea } from "@/shared/components/ui/textarea"
import { productFormSchema, type ProductFormValues } from "@/modules/products/types/formSchema"
import { createProduct, updateProduct, checkSkuExists } from "@/modules/products/actions"
import { Product } from "../../types"
import { generateProductName, generateProductNames } from "../../utils/nameGenerator"
import { resolvePackageDimensions } from "@/modules/finance/utils/packagingEngine"
import { calculateGrossWeight, resolvePackagingProfile, getPackagingMultiplier } from "@/modules/products/utils/logisticsCalculator"
import { Package, ShoppingCart, Sparkles, RotateCcw } from "lucide-react"

const OBAL_TYPES: Record<string, string> = {
  role: "Role (Válec)",
  krabice_standard: "Standardní krabice (Lookup)",
  krabice_dlouha: "Dlouhá krabice (Fixní délka)",
  krabice_volna: "Custom rozměry",
  paleta: "Paleta",
  sacek: "Sáček / Malý karton",
}

const CARBON_TOW_OPTIONS = [
  { val: "1K", label: "1K" },
  { val: "3K", label: "3K" },
  { val: "6K", label: "6K" },
  { val: "12K", label: "12K" },
  { val: "24K", label: "24K" },
  { val: "48K", label: "48K" },
  { val: "NA", label: "N/A" }
]

const NON_CARBON_TOW_OPTIONS = [
  { val: "220t", label: "220 dtex (220t)" },
  { val: "420t", label: "420 dtex (420t)" },
  { val: "600t", label: "600 dtex (600t)" },
  { val: "610t", label: "610 dtex (610t)" },
  { val: "1200t", label: "1200 dtex (1200t)" },
  { val: "1600t", label: "1600 dtex (1600t)" },
  { val: "2400t", label: "2400 dtex (2400t)" },
  { val: "3200t", label: "3200 dtex (3200t)" },
  { val: "NA", label: "N/A" }
]

interface ProductFormProps {
  initialData?: Product
  lookups: {
    categories: any[]
    units: any[]
    statuses: any[]
    labels: any[]
    processes: any[]
    fiberCodes?: any[]
  }
  onSubmit: (data: ProductFormValues) => Promise<void>
  isSubmitting: boolean
  onCancel: () => void
}

export function ProductForm({ initialData, lookups, onSubmit, isSubmitting, onCancel }: ProductFormProps) {
  const { register, handleSubmit, formState: { errors, dirtyFields }, setValue, watch } = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema) as any,
    defaultValues: {
      sku: initialData?.sku || "",
      nazev: initialData?.nazev || "",
      nazev_en: (initialData as any)?.nazev_en || "",
      kategorie_id: initialData?.kategorie_id || "",
      zakladni_mj_id: initialData?.zakladni_mj_id || "m2",
      jednotka_baleni_id: initialData?.jednotka_baleni_id || "bm",
      stav_katalogu_id: initialData?.stav_katalogu_id || "draft",
      def_typ_skladovani: initialData?.def_typ_skladovani || "sklad",
      mnozstvi_v_baleni: initialData?.mnozstvi_v_baleni || 1,
      hmotnost_baliku_kg: initialData?.hmotnost_baliku_kg || 0,
      hmotnost_zafixovana: initialData?.hmotnost_zafixovana || false,
      shelf_life_mesice: initialData?.shelf_life_mesice || 0,
      def_proces_odeslani_id: initialData?.def_proces_odeslani_id || "",
      def_typ_labelu_id: initialData?.def_typ_labelu_id || "",
      specifikace_json: initialData?.specifikace ? JSON.stringify(initialData.specifikace, null, 2) : "{}",
      min_skladova_zasoba: initialData?.min_skladova_zasoba || 0,
      opt_skladova_zasoba: initialData?.opt_skladova_zasoba || 0,
      cilova_marze_retail_procenta: initialData?.cilova_marze_retail_procenta || 30,
      cilova_marze_partner_procenta: initialData?.cilova_marze_partner_procenta || 20,
      clo_procenta: initialData?.clo_procenta || 0,
      moq_prodejni: initialData?.moq_prodejni ?? 1,
      moq_poznamka: initialData?.moq_poznamka || "",
      poznamka: initialData?.poznamka || "",
      is_name_generated: initialData ? (initialData as any).is_name_generated : true,

      // Packaging & Shipping Engine v2
      balici_profil_id: initialData?.balici_profil_id || "",
      balik_delka_cm_override: initialData?.balik_delka_cm_override ?? undefined,
      balik_sirka_cm_override: initialData?.balik_sirka_cm_override ?? undefined,
      balik_vyska_cm_override: initialData?.balik_vyska_cm_override ?? undefined,
    }
  })

  const kategorieId = watch("kategorie_id")
  const isNameGenerated = watch("is_name_generated")
  const zakladniMjId = watch("zakladni_mj_id")
  const jednotkaBaleniId = watch("jednotka_baleni_id")
  const stavId = watch("stav_katalogu_id")
  const labelId = watch("def_typ_labelu_id")
  const procesId = watch("def_proces_odeslani_id")
  const defTypSkladovani = watch("def_typ_skladovani")
  const currentSku = watch("sku")

  // Packaging & Shipping Engine v2 Watches & Computations
  const baliciProfilId = watch("balici_profil_id")
  const overrideDelka = watch("balik_delka_cm_override")
  const overrideSirka = watch("balik_sirka_cm_override")
  const overrideVyska = watch("balik_vyska_cm_override")
  const hmotnostBaliku = watch("hmotnost_baliku_kg")
  const mnozstviVBaleni = watch("mnozstvi_v_baleni")


  // Override tracking — true when the user has manually typed a value
  const [isWeightOverridden, setIsWeightOverridden] = useState(() => {
    if (initialData?.hmotnost_zafixovana) return true
    if (!initialData) return false
    const initWeight = parseFloat(String(initialData.hmotnost_baliku_kg)) || 0
    const calculatedAtLoad = calculateGrossWeight(
      initialData.kategorie_id,
      initialData.specifikace || {},
      initialData.mnozstvi_v_baleni || 1,
      initialData.zakladni_mj_id
    ).weightKg || 0
    return Math.abs(initWeight - calculatedAtLoad) > 0.01
  })
  const [isProfileOverridden, setIsProfileOverridden] = useState(
    () => !!initialData?.balici_profil_id
  )


  const activeProfile = useMemo(() => {
    return (lookups as any).profiles?.find((p: any) => p.id === baliciProfilId) || null
  }, [lookups, baliciProfilId])

  const calculatedPackage = useMemo(() => {
    const w = parseFloat(String(hmotnostBaliku)) || 0
    const overrides = {
      delka: overrideDelka ? parseFloat(String(overrideDelka)) : null,
      sirka: overrideSirka ? parseFloat(String(overrideSirka)) : null,
      vyska: overrideVyska ? parseFloat(String(overrideVyska)) : null
    }
    return resolvePackageDimensions(w, activeProfile, overrides)
  }, [hmotnostBaliku, activeProfile, overrideDelka, overrideSirka, overrideVyska])


  // Live Validation State
  const [skuExists, setSkuExists] = useState(false)

  // --- Omni-Generator State ---
  const specs = (initialData?.specifikace as any) || {}

  const [customHmotnostMj, setCustomHmotnostMj] = useState(specs.vlastni_hmotnost_mj_kg ? String(specs.vlastni_hmotnost_mj_kg) : "")

  // Fabrics
  const [fabMat, setFabMat] = useState(specs.materiál || "CF")
  const [fabForm, setFabForm] = useState(specs.typ || "WF")
  const [fabWeight, setFabWeight] = useState(String(specs.gramáž || "200"))
  const [fabTow, setFabTow] = useState(specs.vlákno || "3K")
  const [fabTow1, setFabTow1] = useState<string>(() => {
    if (specs.materiál === "HF") {
      if (Array.isArray(specs.vlákna_složení)) return specs.vlákna_složení[0] || "3K"
      if (specs.vlákno1) return specs.vlákno1
    }
    return "3K"
  })
  const [fabTow2, setFabTow2] = useState<string>(() => {
    if (specs.materiál === "HF") {
      if (Array.isArray(specs.vlákna_složení)) return specs.vlákna_složení[1] || "2400t"
      if (specs.vlákno2) return specs.vlákno2
    }
    return "2400t"
  })
  const [fabWeave, setFabWeave] = useState(specs.vazba || "T22")
  const [fabUse, setFabUse] = useState(specs.použití || "E") // Economy, Visual, Industry (E, V, I)
  const [fabBrand, setFabBrand] = useState(specs.výrobce_vlákna && specs.materiál !== "HF" ? specs.výrobce_vlákna : "TO")
  const [fabFiberCode, setFabFiberCode] = useState<string>(specs.kód_vlákna && specs.materiál !== "HF" ? specs.kód_vlákna : "syt45")

  // Hybrid Fibre inputs (active only when fabMat === "HF")
  const [fabMat1, setFabMat1] = useState<string>(() => {
    if (specs.materiál === "HF" && Array.isArray(specs.materiál_složení)) {
      return specs.materiál_složení[0] || "CF"
    }
    return "CF"
  })
  const [fabMat2, setFabMat2] = useState<string>(() => {
    if (specs.materiál === "HF" && Array.isArray(specs.materiál_složení)) {
      return specs.materiál_složení[1] || "AF"
    }
    return "AF"
  })
  const [fabBrand1, setFabBrand1] = useState<string>(() => {
    if (specs.materiál === "HF" && Array.isArray(specs.výrobci_složení)) {
      return specs.výrobci_složení[0] || "TO"
    }
    return "TO"
  })
  const [fabBrand2, setFabBrand2] = useState<string>(() => {
    if (specs.materiál === "HF" && Array.isArray(specs.výrobci_složení)) {
      return specs.výrobci_složení[1] || "HY"
    }
    return "HY"
  })
  const [fabFiberCode1, setFabFiberCode1] = useState<string>(() => {
    if (specs.materiál === "HF" && Array.isArray(specs.kódy_vláken_složení)) {
      return specs.kódy_vláken_složení[0] || "syt45"
    }
    return "syt45"
  })
  const [fabFiberCode2, setFabFiberCode2] = useState<string>(() => {
    if (specs.materiál === "HF" && Array.isArray(specs.kódy_vláken_složení)) {
      return specs.kódy_vláken_složení[1] || "tc33"
    }
    return "tc33"
  })

  // Fabric Packaging & Dimensions
  const [fabPackType, setFabPackType] = useState<string>(specs.typ_baleni || "role") // role, krabice, metraz
  const [fabWidth, setFabWidth] = useState<string>(
    specs.sirka_cm !== undefined 
      ? String(specs.sirka_cm) 
      : (specs.sirka_m !== undefined ? String(specs.sirka_m * 100) : "100")
  )
  const [fabLength, setFabLength] = useState<string>(specs.delka_m !== undefined ? String(specs.delka_m) : "100")
  const [fabPieces, setFabPieces] = useState<string>(specs.pocet_kusu !== undefined ? String(specs.pocet_kusu) : "10")
  // Prepregs
  const [prepBase, setPrepBase] = useState(specs.base_materiál || "CF")
  const [prepWeight, setPrepWeight] = useState(String(specs.gramáž || "300"))
  const [prepResin, setPrepResin] = useState(specs.pryskyřice || "EPX")
  // Chemicals (Resins)
  const [chemType, setChemType] = useState(specs.typ || "RES")
  const [chemBase, setChemBase] = useState(specs.chemie || "EP")
  const [chemVariant, setChemVariant] = useState(specs.varianta || "MED")
  const [chemColor, setChemColor] = useState(specs.barva_id || "CLR")
  const [chemTech, setChemTech] = useState(specs.technologie || "INF")
  const [chemCuringTime, setChemCuringTime] = useState(specs.cas_vytvrzeni || "")
  const [chemUse, setChemUse] = useState(specs.pouziti || "FOR")
  // Resins – purchase volume (IBC / drum size)
  const [chemObjemNakup, setChemObjemNakup] = useState<string>(specs.objem_nakup_l ? String(specs.objem_nakup_l) : "200")
  // Adhesives (Lepidla)
  const [adhChem, setAdhChem] = useState(specs.chemie || "EP")
  const [adhOpenTime, setAdhOpenTime] = useState(specs.open_time_min ? String(specs.open_time_min) : "45")
  const [adhColor, setAdhColor] = useState(specs.barva || "black")
  const [adhVolume, setAdhVolume] = useState(specs.objem || "50ML")
  // Cleaners
  const [clnSub, setClnSub] = useState(specs.podkategorie || "standard")
  const [clnBrand, setClnBrand] = useState(specs.značka || "RST5")
  const [clnPack, setClnPack] = useState(specs.balení || "5L")
  const [clnType, setClnType] = useState(specs.typ || "WIP")
  const [clnQty, setClnQty] = useState<string>(() => {
    if (specs.podkategorie === 'pmp') return ""
    return specs.mnozstvi ? String(specs.mnozstvi).replace(/[^0-9]/g, '') : ""
  })
  const [clnPmpType, setClnPmpType] = useState(specs.typ || "liquid")
  const [clnPmpQty, setClnPmpQty] = useState<string>(() => {
    if (specs.podkategorie === 'pmp' && specs.mnozstvi) {
      const match = String(specs.mnozstvi).match(/^(\d+(?:\.\d+)?)/)
      return match ? match[1] : String(specs.mnozstvi)
    }
    return "500"
  })
  // Cores
  const [coreMat, setCoreMat] = useState(specs.materiál || "PVC")
  const [coreDens, setCoreDens] = useState(String(specs.hustota_kgm3 || "80"))
  const [coreThick, setCoreThick] = useState(specs.tloušťka || "10MM")
  const [coreFinish, setCoreFinish] = useState(specs.úprava || "PL")
  // Cores – sheet dimensions (NEW: needed for auto-weight calculation)
  const [coreSirkaCm, setCoreSirkaCm] = useState<number>(specs.sirka_cm ? Number(specs.sirka_cm) : 120)
  const [coreDelkaCm, setCoreDelkaCm] = useState<number>(specs.delka_cm ? Number(specs.delka_cm) : 100)
  // Polish/Abrasives (Overhauled)
  const [polSub, setPolSub] = useState(specs.podkategorie || "pasty")
  const [polPasteType, setPolPasteType] = useState(specs.typ || "rex")
  const [polWaxName, setPolWaxName] = useState(specs.nazev_vosku || "uv_shield")
  const [polWaxState, setPolWaxState] = useState(specs.skupenstvi || "tekuty_vosk")
  const [polWaxQty, setPolWaxQty] = useState<string>(() => {
    if (specs.mnozstvi && (specs.podkategorie === 'vosk' || specs.typ === 'vosk')) {
      const match = String(specs.mnozstvi).match(/^(\d+(?:\.\d+)?)/)
      return match ? match[1] : String(specs.mnozstvi)
    }
    return "1"
  })
  const [polPasteColor, setPolPasteColor] = useState(specs.barva || "white")
  const [polPasteCont, setPolPasteCont] = useState(specs.obal || "BOT")
  const [polPasteWeight, setPolPasteWeight] = useState<string>(() => {
    if (specs.hmotnost) {
      const match = String(specs.hmotnost).match(/^(\d+(?:\.\d+)?)/)
      return match ? match[1] : String(specs.hmotnost)
    }
    return "1"
  })
  const [polDiscType, setPolDiscType] = useState(specs.typ_kotouce || "vlneny")
  const [polDiscCode, setPolDiscCode] = useState(specs.kod_kotouce || "ST1")
  const [polDiscDia, setPolDiscDia] = useState<string>(() => {
    if (specs.prumer && specs.podkategorie === 'brusne_kotouce') {
      const match = String(specs.prumer).match(/^(\d+(?:\.\d+)?)/)
      return match ? match[1] : String(specs.prumer)
    }
    return "160"
  })
  // Polishing Accessories
  const [polAccType, setPolAccType] = useState(specs.typ_prislusenstvi || "backplate")
  const [polAccProp, setPolAccProp] = useState(specs.vlastnost || "rigid")
  const [polAccDia, setPolAccDia] = useState<string>(() => {
    if (specs.prumer && specs.podkategorie === 'prislusenstvi') {
      const match = String(specs.prumer).match(/^(\d+(?:\.\d+)?)/)
      return match ? match[1] : String(specs.prumer)
    }
    return "150"
  })
  // Chemie (Chemie category)
  const [chemSub, setChemSub] = useState(specs.podkategorie || "lepidlo_ve_spreji")
  const [chemAdhProp, setChemAdhProp] = useState(specs.vlastnost || "visual")
  const [chemBaseType, setChemBaseType] = useState(specs.chemie || "waterbased")
  const [chemSealerProp, setChemSealerProp] = useState(specs.vlastnost || "HS")
  const [chemVol, setChemVol] = useState<string>(() => {
    if (specs.objem) {
      const match = String(specs.objem).match(/^(\d+(?:\.\d+)?)/)
      return match ? match[1] : String(specs.objem)
    }
    return "500"
  })
  // Fasteners (Spojovací materiál pro kompozity)
  const [fasType, setFasType] = useState(specs.typ_spoje || "BFAST") // Bonding Fastener
  const [fasBase, setFasBase] = useState(specs.zakladna || "STUD") // Závitová tyč / Matice
  const [fasSize, setFasSize] = useState(specs.zavit_prumer || "M8")
  const [fasMat, setFasMat] = useState(specs.material || "A4")
  // Tools (Nářadí)
  const [toolSub, setToolSub] = useState(specs.podkategorie || "BU")
  const [toolBuTvar, setToolBuTvar] = useState(specs.tvar || "T")
  const [toolBuPrumer, setToolBuPrumer] = useState(
    specs.prumer_mm ? String(specs.prumer_mm) : (specs.tvar === "O" ? "12" : "50")
  )
  const [toolQrTyp, setToolQrTyp] = useState(specs.typ_pripojeni || "PLUG")
  const [toolQrMat, setToolQrMat] = useState(specs.material || "SS")
  const [toolSqPrumer, setToolSqPrumer] = useState(specs.prumer_mm ? String(specs.prumer_mm) : "25")
  const [toolVId, setToolVId] = useState(specs.identifikator || "")
  const [toolCuVolume, setToolCuVolume] = useState(specs.objem_l ? String(specs.objem_l) : "")
  // Consumables (Spotřební materiál)
  const [conSub, setConSub] = useState(() => {
    if (specs.podkategorie === "FCH" && (specs.podtyp_fch === "TUBE" || specs.podtyp_fch === "TTUBE")) {
      return "TUBE"
    }
    return specs.podkategorie || "BF"
  })
  
  // Shared roll dimensions (BF, RF, PP, PP-PTFE, BC, FM)
  const [conRollWidth, setConRollWidth] = useState(specs.sirka_cm !== undefined ? String(specs.sirka_cm) : "100")
  const [conRollLength, setConRollLength] = useState(specs.delka_m !== undefined ? String(specs.delka_m) : "100")

  // BF – Bagging Film
  const [conBfFormat, setConBfFormat] = useState(specs.format || "TUBE")
  const [conBfTloustka, setConBfTloustka] = useState(specs.tloustka_um ? String(specs.tloustka_um) : "50")
  const [conBfTemp, setConBfTemp] = useState(specs.teplotni_odolnost || "LT")

  // RF – Release Film
  const [conRfPerf, setConRfPerf] = useState(specs.perforace || "NP")
  const [conRfTloustka, setConRfTloustka] = useState(specs.tloustka_um ? String(specs.tloustka_um) : "25")
  const [conRfTemp, setConRfTemp] = useState(specs.teplotni_odolnost || "LT120")

  // PP – Peel Ply
  const [conPpPolymer, setConPpPolymer] = useState(specs.polymer || "PE")
  const [conPpGramaz, setConPpGramaz] = useState(specs.gramaz_gm2 ? String(specs.gramaz_gm2) : "100")

  // PP-PTFE – PTFE Peel Ply
  const [conPtfeAdhesive, setConPtfeAdhesive] = useState(specs.je_lepici === true ? "ADH" : "NADH")
  const [conPtfeTloustka, setConPtfeTloustka] = useState(specs.tloustka_um ? String(specs.tloustka_um) : "80")

  // BC – Breather
  const [conBcGramaz, setConBcGramaz] = useState(specs.gramaz_gm2 ? String(specs.gramaz_gm2) : "150")

  // ST – Sealing Tape
  const [conStTemp, setConStTemp] = useState(specs.teplotni_odolnost_c ? String(specs.teplotni_odolnost_c) : "150")
  const [conStSirka, setConStSirka] = useState(specs.sirka_mm ? String(specs.sirka_mm) : "12")
  const [conStDelka, setConStDelka] = useState(specs.delka_m ? String(specs.delka_m) : "15")
  // ST – number of rolls per shipping package (NEW)
  const [conStPocetRoli, setConStPocetRoli] = useState<number>(specs.pocet_roli_v_baleni ? Number(specs.pocet_roli_v_baleni) : 1)

  // FT – Flash Tape
  const [conFtSirka, setConFtSirka] = useState(specs.sirka_mm ? String(specs.sirka_mm) : "25")
  const [conFtTemp, setConFtTemp] = useState(specs.teplotni_odolnost || "HT")
  const [conFtDelka, setConFtDelka] = useState(specs.delka_m ? String(specs.delka_m) : "66")
  // FT – number of rolls per shipping package (NEW)
  const [conFtPocetRoli, setConFtPocetRoli] = useState<number>(specs.pocet_roli_v_baleni ? Number(specs.pocet_roli_v_baleni) : 1)

  // FM – Flow Mesh
  const [conFmTyp, setConFmTyp] = useState(specs.typ_vyroby || "EXT")
  const [conFmMaterial, setConFmMaterial] = useState(specs.material || "PET")
  const [conFmBarva, setConFmBarva] = useState(specs.barva || "CLR")
  const [conFmRychlost, setConFmRychlost] = useState(specs.rychlost_proudeni || "medium")
  const [conFmTloustka, setConFmTloustka] = useState(specs.tloustka_mm ? String(specs.tloustka_mm) : "")
  const [conFmGramaz, setConFmGramaz] = useState(specs.gramaz_gm2 ? String(specs.gramaz_gm2) : "")
  const [conFmTeplota, setConFmTeplota] = useState(specs.teplotni_odolnost || "LT")
  const [conFmFlexibilita, setConFmFlexibilita] = useState<string>(() => {
    if (specs.flexibilita === true || specs.flexibilita === "ANO") return "velka"
    if (specs.flexibilita === false || specs.flexibilita === "NE") return "zadna"
    return specs.flexibilita || "velka"
  })

  // FCH – Flow Channel
  const [conFchSubtyp, setConFchSubtyp] = useState(specs.podtyp_fch === "TTUBE" ? "TUBE" : (specs.podtyp_fch || "TAPE"))
  const [conFchMaterial, setConFchMaterial] = useState(specs.material || "PET")
  const [conFchPrumer, setConFchPrumer] = useState(specs.vnitrni_prumer_mm ? String(specs.vnitrni_prumer_mm) : "10")
  const [conFchSirka, setConFchSirka] = useState(specs.sirka_mm ? String(specs.sirka_mm) : "15")
  const [conFchVyska, setConFchVyska] = useState(specs.vyska_mm ? String(specs.vyska_mm) : "2")
  const [conFchDelka, setConFchDelka] = useState(specs.delka_m ? String(specs.delka_m) : "100")
  const [conFchTemp, setConFchTemp] = useState<string>(() => {
    const raw = specs.teplotni_odolnost || "LT120"
    const num = raw.replace(/\D/g, "")
    return num || (raw === "HT" ? "180" : raw === "MT" ? "150" : "120")
  })

  // K – Konektory
  const [conKTvar, setConKTvar] = useState(() => {
    if (specs.tvar === "U") return "I"
    return specs.tvar || "T"
  })
  const [conKPrumer, setConKPrumer] = useState(specs.vnejsi_prumer_mm ? String(specs.vnejsi_prumer_mm) : "20")

  // MTI
  const [conMtiTyp, setConMtiTyp] = useState(specs.typ_mti || "Hose")
  const [conMtiWidth, setConMtiWidth] = useState(specs.sirka_mm !== undefined ? String(specs.sirka_mm) : "")
  const [conMtiDelka, setConMtiDelka] = useState(specs.delka_m !== undefined ? String(specs.delka_m) : "50")

  // KP – Konektor průchodný (plastový)
  const [conKpTvar, setConKpTvar] = useState(specs.tvar || "O")
  const [conKpPrumer, setConKpPrumer] = useState(specs.prumer_mm ? String(specs.prumer_mm) : "12")

  const isPackagingLocked = false

  // Auto-map packaging profile based on category and package type defaults
  useEffect(() => {
    if (initialData) return // Don't override existing product data on edit

    const profilesList = (lookups as any).profiles || []
    if (profilesList.length === 0) return

    if (kategorieId === "vyztuzne_materialy" || kategorieId === "consumables") {
      if (fabPackType === "role") {
        const found = profilesList.find((p: any) => p.typ_obalu === "role" && p.nazev.includes("127"))
        if (found) setValue("balici_profil_id", found.id)
      } else if (fabPackType === "krabice") {
        const found = profilesList.find((p: any) => p.typ_obalu === "krabice_standard")
        if (found) setValue("balici_profil_id", found.id)
      }
    } else if (kategorieId === "spotrebni_chemie" || kategorieId === "spojovaci_material" || kategorieId === "brouseni_a_lesteni") {
      const found = profilesList.find((p: any) => p.typ_obalu === "krabice_standard")
      if (found) setValue("balici_profil_id", found.id)
    }
  }, [kategorieId, fabPackType, lookups, setValue, initialData])

  // Synchronize weave/fixation/orientation when form type changes to/from MAT or BIAX
  useEffect(() => {
    if (fabForm === "MAT") {
      if (!["NP", "EM", "PB", "ST"].includes(fabWeave)) {
        setFabWeave("NP")
      }
    } else if (fabForm === "BIAX") {
      if (!["090", "45"].includes(fabWeave)) {
        setFabWeave("45")
      }
    } else {
      if (["NP", "EM", "PB", "ST", "090", "45"].includes(fabWeave)) {
        setFabWeave("T22")
      }
    }
  }, [fabForm, fabWeave])

  // Synchronize fiber tow options based on material selection (Carbon vs non-Carbon)
  useEffect(() => {
    if (fabMat !== "HF") {
      const isCarbon = fabMat === "CF"
      const currentOptions = isCarbon ? CARBON_TOW_OPTIONS : NON_CARBON_TOW_OPTIONS
      if (!currentOptions.some(o => o.val === fabTow)) {
        setFabTow(isCarbon ? "3K" : "2400t")
      }
    }
  }, [fabMat, fabTow])

  useEffect(() => {
    const isCarbon = fabMat1 === "CF"
    const currentOptions = isCarbon ? CARBON_TOW_OPTIONS : NON_CARBON_TOW_OPTIONS
    if (!currentOptions.some(o => o.val === fabTow1)) {
      setFabTow1(isCarbon ? "3K" : "2400t")
    }
  }, [fabMat1, fabTow1])

  useEffect(() => {
    const isCarbon = fabMat2 === "CF"
    const currentOptions = isCarbon ? CARBON_TOW_OPTIONS : NON_CARBON_TOW_OPTIONS
    if (!currentOptions.some(o => o.val === fabTow2)) {
      setFabTow2(isCarbon ? "3K" : "2400t")
    }
  }, [fabMat2, fabTow2])

  // Synchronize disc code & diameter based on disc type selection
  useEffect(() => {
    if (kategorieId === 'brouseni_a_lesteni' && polSub === 'brusne_kotouce') {
      if (polDiscType === 'vlneny') {
        if (polDiscCode !== 'ST1Y' && polDiscCode !== 'SL3' && polDiscCode !== 'UNI') {
          setPolDiscCode('ST1Y')
        }
      } else if (polDiscType === 'pena') {
        setPolDiscCode('DA03')
      }
    }
  }, [polDiscType, polSub, kategorieId])

  // Reset chemVol defaults based on subcategory
  useEffect(() => {
    if (kategorieId === 'chemie') {
      if (chemSub === 'lepidlo_ve_spreji' || chemSub === 'blinder') {
        setChemVol(prev => {
          const num = parseFloat(prev) || 0
          return num < 10 ? "500" : prev
        })
      } else {
        setChemVol(prev => {
          const num = parseFloat(prev) || 0
          return num >= 10 ? "5" : prev
        })
      }
    }
  }, [chemSub, kategorieId])

  useEffect(() => {
    let generatedSku = ""
    let generatedSpecs: Record<string, any> = {}

    switch (kategorieId) {
      case 'vyztuzne_materialy':
        const w = parseFloat(fabWidth) || 0
        const l = parseFloat(fabLength) || 0
        const pcs = parseInt(fabPieces) || 0
        let area = 0
        let uom = "role"

        // Divide width by 100 since fabWidth is in cm and length is in m
        if (fabPackType === "role") {
          area = (w / 100) * l
          uom = "role"
        } else if (fabPackType === "krabice") {
          area = (w / 100) * l * pcs
          uom = "ks"
        } else {
          area = (w / 100) * l
          uom = "ks"
        }

        const origPackType = specs.typ_baleni || "role"
        const origWidth = specs.sirka_cm !== undefined ? String(specs.sirka_cm) : (specs.sirka_m !== undefined ? String(specs.sirka_m * 100) : "100")
        const origLength = specs.delka_m !== undefined ? String(specs.delka_m) : "100"
        const origPieces = specs.pocet_kusu !== undefined ? String(specs.pocet_kusu) : "10"
        const hasFabSpecsChanged = fabPackType !== origPackType || fabWidth !== origWidth || fabLength !== origLength || fabPieces !== origPieces

        if (!initialData || hasFabSpecsChanged) {
          if (!dirtyFields.mnozstvi_v_baleni && !initialData) {
            setValue("mnozstvi_v_baleni", parseFloat(area.toFixed(2)), { shouldValidate: true })
          }
          if (!dirtyFields.jednotka_baleni_id) {
            setValue("jednotka_baleni_id", uom, { shouldValidate: true })
          }
        }

        const w_cm = Math.round(w)
        const lenSuffix = (fabPackType === "role" && l > 0) ? `-R${Math.round(l)}` : ""
        
        if (fabMat === "HF") {
          // WF-CFAF-164-T22-3K-SYT45-2400t-TC33-100-E-R100
          generatedSku = `${fabForm}-${fabMat1}${fabMat2}-${fabWeight}-${fabWeave}-${fabTow1}-${fabFiberCode1.toUpperCase()}-${fabTow2}-${fabFiberCode2.toUpperCase()}-${w_cm}-${fabUse}${lenSuffix}`
          generatedSpecs = {
            typ: fabForm,
            materiál: fabMat,
            materiál_složení: [fabMat1, fabMat2],
            gramáž: parseInt(fabWeight) || 0,
            vlákno: `${fabTow1} / ${fabTow2}`,
            vlákno1: fabTow1,
            vlákno2: fabTow2,
            vlákna_složení: [fabTow1, fabTow2],
            vazba: fabWeave,
            použití: fabUse,
            výrobce_vlákna: `${fabBrand1}${fabBrand2}`,
            výrobci_složení: [fabBrand1, fabBrand2],
            kod_vlakna1: fabFiberCode1,
            kod_vlakna2: fabFiberCode2,
            kódy_vláken_složení: [fabFiberCode1, fabFiberCode2],
            typ_baleni: fabPackType,
            sirka_cm: w_cm,
            delka_m: l,
            ...(fabPackType === "krabice" ? { pocet_kusu: pcs } : {})
          }
        } else {
          const fiberCodeSku = fabFiberCode.toUpperCase()
          // WF-CF-160-T22-3K-SYT45-100-E-R100
          generatedSku = `${fabForm}-${fabMat}-${fabWeight}-${fabWeave}-${fabTow}-${fiberCodeSku}-${w_cm}-${fabUse}${lenSuffix}`
          generatedSpecs = { 
            typ: fabForm, 
            materiál: fabMat, 
            gramáž: parseInt(fabWeight) || 0, 
            vlákno: fabTow, 
            vazba: fabWeave, 
            použití: fabUse, 
            výrobce_vlákna: fabBrand,
            kód_vlákna: fabFiberCode,
            typ_baleni: fabPackType,
            sirka_cm: w_cm,
            delka_m: l,
            ...(fabPackType === "krabice" ? { pocet_kusu: pcs } : {})
          }
        }
        break;
      case 'prepregy':
        generatedSku = `PP-${prepBase}-${prepWeight}-${prepResin}`
        generatedSpecs = { base_materiál: prepBase, gramáž: parseInt(prepWeight) || 0, pryskyřice: prepResin }
        break;
      case 'pryskyrice': {
        const cleanCuring = chemCuringTime.trim().toUpperCase().replace(/[^A-Z0-9]/g, '')
        const isCuringType = chemType === 'HRD'
        const thirdSegment = isCuringType ? (cleanCuring || "NA") : chemTech

        const densities: Record<string, number> = { EP: 1.15, VE: 1.12, PE: 1.13 }
        let density = 1.15
        if (chemType === 'HRD') {
          density = 0.95
        } else if (chemType === 'GEL') {
          density = 1.20
        } else {
          density = densities[chemBase] || 1.15
        }
        const volL = parseFloat(chemObjemNakup) || 0
        const calculatedWeight = volL * density

        generatedSku = `${chemType}-${chemBase}-${thirdSegment}-${chemUse}`
        generatedSpecs = {
          typ: chemType,
          chemie: chemBase,
          pouziti: chemUse,
          objem_nakup_l: parseFloat(chemObjemNakup) || 0,
          ...(isCuringType ? { cas_vytvrzeni: chemCuringTime } : { technologie: chemTech })
        }

        const specsEqual = initialData?.specifikace && areSpecsEqual(generatedSpecs, initialData.specifikace)
        if (!initialData || !specsEqual) {
          if (!dirtyFields.zakladni_mj_id) {
            setValue("zakladni_mj_id", "kg", { shouldValidate: true })
          }
          if (!dirtyFields.jednotka_baleni_id) {
            setValue("jednotka_baleni_id", "ks", { shouldValidate: true })
          }
          if (!dirtyFields.mnozstvi_v_baleni && !initialData) {
            setValue("mnozstvi_v_baleni", parseFloat(calculatedWeight.toFixed(2)), { shouldValidate: true })
          }
        }
        break;
      }
      case 'lepidla': {
        if (!dirtyFields.zakladni_mj_id && !initialData) {
          setValue("zakladni_mj_id", "ks", { shouldValidate: true })
        }
        if (!dirtyFields.jednotka_baleni_id && !initialData) {
          setValue("jednotka_baleni_id", "ks", { shouldValidate: true })
        }
        if (!dirtyFields.mnozstvi_v_baleni && !initialData) {
          setValue("mnozstvi_v_baleni", 1, { shouldValidate: true })
        }
        
        const colorMap: Record<string, string> = {
          black: "BLK",
          grey: "GRY",
          white: "WHT",
          clear: "CLR",
          "off-white": "OWH"
        }
        const colorCode = colorMap[adhColor] || "BLK"
        const cleanVolume = adhVolume.trim().toUpperCase().replace(/[^A-Z0-9]/g, '')
        
        generatedSku = `ADH-${adhChem}-${adhOpenTime}M-${colorCode}-${cleanVolume}`
        generatedSpecs = {
          chemie: adhChem,
          open_time_min: parseInt(adhOpenTime) || 0,
          barva: adhColor,
          objem: adhVolume.trim()
        }
        break;
      }
      case 'spotrebni_chemie': {
        if (clnSub === 'standard') {
          const cleanQty = clnQty.trim().toUpperCase().replace(/[^A-Z0-9]/g, '')
          const unitSuffixMap: Record<string, string> = {
            WIP: "KS",
            CON: "L",
            SPR: "ML"
          }
          const unitSuffix = unitSuffixMap[clnType] || ""
          generatedSku = `CLN-${clnBrand}-${clnType}-${cleanQty}${unitSuffix}`
          generatedSpecs = {
            podkategorie: 'standard',
            značka: clnBrand,
            typ: clnType,
            mnozstvi: clnQty
          }
        } else if (clnSub === 'pmp') {
          const cleanQty = clnPmpQty.trim().toUpperCase().replace(/[^0-9]/g, '')
          generatedSku = `CLN-PMP-LIQ-${cleanQty}ML`
          generatedSpecs = {
            podkategorie: 'pmp',
            typ: 'liquid',
            mnozstvi: `${cleanQty} ml`
          }
        }

        const specsEqual = initialData?.specifikace && areSpecsEqual(generatedSpecs, initialData.specifikace)
        if (!initialData || !specsEqual) {
          if (!dirtyFields.jednotka_baleni_id) {
            setValue("jednotka_baleni_id", "ks", { shouldValidate: true })
          }

          if (clnSub === 'standard') {
            if (clnType === 'CON') {
              if (!dirtyFields.zakladni_mj_id) {
                setValue("zakladni_mj_id", "l", { shouldValidate: true })
              }
              if (!dirtyFields.mnozstvi_v_baleni && !initialData) {
                const parsedVol = parseFloat(clnQty.replace(/[^0-9.]/g, '')) || 1
                setValue("mnozstvi_v_baleni", parsedVol, { shouldValidate: true })
              }
            } else {
              if (!dirtyFields.zakladni_mj_id) {
                setValue("zakladni_mj_id", "ks", { shouldValidate: true })
              }
              if (!dirtyFields.mnozstvi_v_baleni && !initialData) {
                setValue("mnozstvi_v_baleni", 1, { shouldValidate: true })
              }
            }
          } else if (clnSub === 'pmp') {
            if (!dirtyFields.zakladni_mj_id) {
              setValue("zakladni_mj_id", "ks", { shouldValidate: true })
            }
            if (!dirtyFields.mnozstvi_v_baleni && !initialData) {
              setValue("mnozstvi_v_baleni", 1, { shouldValidate: true })
            }
          }
        }
        break;
      }
      case 'chemie': {
        const normalizedVol = chemVol.trim().replace(',', '.')
        const cleanVol = normalizedVol.replace(/[^0-9]/g, '')
        const volL = parseFloat(normalizedVol) || 1

        if (chemSub === 'lepidlo_ve_spreji') {
          const vlastnostCode = chemAdhProp === 'visual' ? 'VIS' : 'IND'
          generatedSku = `SAD-${vlastnostCode}-${cleanVol}ML`
          generatedSpecs = {
            podkategorie: chemSub,
            vlastnost: chemAdhProp,
            objem: `${normalizedVol} ml`
          }
        } else if (chemSub === 'blinder') {
          const chemieCode = chemBaseType === 'waterbased' ? 'WB' : 'SOL'
          generatedSku = `BLN-${chemieCode}-${cleanVol}ML`
          generatedSpecs = {
            podkategorie: chemSub,
            chemie: chemBaseType,
            objem: `${normalizedVol} ml`
          }
        } else if (chemSub === 'plnic_poru_sealer') {
          const chemieCode = chemBaseType === 'waterbased' ? 'WB' : 'SOL'
          const vlastnostCode = chemSealerProp
          generatedSku = `SLR-${chemieCode}-${vlastnostCode}-${cleanVol}L`
          generatedSpecs = {
            podkategorie: chemSub,
            chemie: chemBaseType,
            vlastnost: chemSealerProp,
            objem: `${normalizedVol} l`
          }
        } else if (chemSub === 'separatory_release_agent') {
          const chemieCode = chemBaseType === 'waterbased' ? 'WB' : 'SOL'
          const vlastnostCode = chemSealerProp
          generatedSku = `REL-${chemieCode}-${vlastnostCode}-${cleanVol}L`
          generatedSpecs = {
            podkategorie: chemSub,
            chemie: chemBaseType,
            vlastnost: chemSealerProp,
            objem: `${normalizedVol} l`
          }
        }

        const specsEqual = initialData?.specifikace && areSpecsEqual(generatedSpecs, initialData.specifikace)
        if (!initialData || !specsEqual) {
          if (!dirtyFields.jednotka_baleni_id) {
            setValue("jednotka_baleni_id", "ks", { shouldValidate: true })
          }

          if (chemSub === 'lepidlo_ve_spreji' || chemSub === 'blinder') {
            if (!dirtyFields.zakladni_mj_id) {
              setValue("zakladni_mj_id", "ks", { shouldValidate: true })
            }
            if (!dirtyFields.mnozstvi_v_baleni && !initialData) {
              setValue("mnozstvi_v_baleni", 1, { shouldValidate: true })
            }
          } else {
            if (!dirtyFields.zakladni_mj_id) {
              setValue("zakladni_mj_id", "l", { shouldValidate: true })
            }
            if (!dirtyFields.mnozstvi_v_baleni && !initialData) {
              setValue("mnozstvi_v_baleni", volL, { shouldValidate: true })
            }
          }
        }
        break;
      }
      case 'cores_standard':
      case 'cores_active':
        const prefix = kategorieId === 'cores_active' ? 'ACT' : 'COR'
        generatedSku = `${prefix}-${coreMat}-${coreDens}-${coreThick}-${coreFinish}`
        generatedSpecs = {
          materiál: coreMat,
          hustota_kgm3: parseInt(coreDens) || 0,
          tloušťka: coreThick,
          úprava: coreFinish,
          sirka_cm: coreSirkaCm,
          delka_cm: coreDelkaCm,
        }
        break;
      case 'brouseni_a_lesteni': {
        if (!dirtyFields.jednotka_baleni_id && !initialData) {
          setValue("jednotka_baleni_id", "ks", { shouldValidate: true })
        }

        if (!dirtyFields.zakladni_mj_id && !initialData) {
          setValue("zakladni_mj_id", "ks", { shouldValidate: true })
        }
        if (!dirtyFields.mnozstvi_v_baleni && !initialData) {
          setValue("mnozstvi_v_baleni", 1, { shouldValidate: true })
        }

        if (polSub === 'vosk') {
          const waxNameCodeMap: Record<string, string> = {
            uv_shield: 'UV',
            flash_touch: 'FT'
          }
          const stateCodeMap: Record<string, string> = {
            tekuty_vosk: 'LIQ',
            pasta: 'PST'
          }
          const nameCode = waxNameCodeMap[polWaxName] || 'UV'
          const stateCode = stateCodeMap[polWaxState] || 'LIQ'
          const normalizedQty = polWaxQty.trim().replace(',', '.')
          const cleanQty = normalizedQty.replace(/[^0-9]/g, '')

          generatedSku = `POL-WAX-${nameCode}-${stateCode}-${cleanQty}KG`
          generatedSpecs = {
            podkategorie: 'vosk',
            typ: 'vosk',
            nazev_vosku: polWaxName,
            skupenstvi: polWaxState,
            mnozstvi: `${normalizedQty} kg`
          }
        } else if (polSub === 'pasty') {
          const typeCodeMap: Record<string, string> = {
            rex: 'REX',
            perla15: 'PER15',
            top_finish_3: 'TF3'
          }
          const colorCodeMap: Record<string, string> = {
            white: 'WHT',
            black: 'BLK'
          }
          const typeCode = typeCodeMap[polPasteType] || 'REX'
          const colorCode = colorCodeMap[polPasteColor] || 'WHT'
          const normalizedWeight = polPasteWeight.trim().replace(',', '.')
          const cleanWeight = normalizedWeight.replace(/[^0-9]/g, '')
          
          generatedSku = `POL-${typeCode}-${colorCode}-${polPasteCont}-${cleanWeight}KG`
          generatedSpecs = {
            podkategorie: 'pasty',
            typ: polPasteType,
            barva: polPasteColor,
            obal: polPasteCont,
            hmotnost: `${normalizedWeight} kg`
          }
        } else {
          if (!dirtyFields.zakladni_mj_id && !initialData) {
            setValue("zakladni_mj_id", "ks", { shouldValidate: true })
          }
          if (!dirtyFields.mnozstvi_v_baleni && !initialData) {
            setValue("mnozstvi_v_baleni", 1, { shouldValidate: true })
          }

          if (polSub === 'brusne_kotouce') {
            const typeCodeMap: Record<string, string> = {
              vlneny: 'WOOL',
              pena: 'FOAM'
            }
            const codeMap: Record<string, string> = {
              ST1Y: 'ST1Y',
              SL3: 'SL3',
              DA03: 'DA03',
              UNI: 'UNI'
            }
            const typeCode = typeCodeMap[polDiscType] || 'WOOL'
            const code = codeMap[polDiscCode] || 'ST1Y'
            const cleanDia = polDiscDia.trim().toUpperCase().replace(/[^0-9]/g, '')

            generatedSku = `PAD-${typeCode}-${code}-D${cleanDia}`
            generatedSpecs = {
              podkategorie: 'brusne_kotouce',
              typ_kotouce: polDiscType,
              kod_kotouce: polDiscCode,
              prumer: cleanDia
            }
          } else if (polSub === 'prislusenstvi') {
            const typeCodeMap: Record<string, string> = {
              backplate: 'BKP'
            }
            const propCodeMap: Record<string, string> = {
              rigid: 'RIG',
              flexible: 'FLX'
            }
            const typeCode = typeCodeMap[polAccType] || 'BKP'
            const propCode = propCodeMap[polAccProp] || 'RIG'
            const cleanDia = polAccDia.trim().toUpperCase().replace(/[^0-9]/g, '')

            generatedSku = `ACC-${typeCode}-${propCode}-D${cleanDia}`
            generatedSpecs = {
              podkategorie: 'prislusenstvi',
              typ_prislusenstvi: polAccType,
              vlastnost: polAccProp,
              prumer: cleanDia
            }
          }
        }
        break;
      }
      case 'spojovaci_material':
        generatedSku = `FAS-${fasType}-${fasBase}-${fasSize}-${fasMat}`
        generatedSpecs = { typ_spoje: fasType, zakladna: fasBase, zavit_prumer: fasSize, material: fasMat }
        break;
      case 'naradi': {
        if (!dirtyFields.zakladni_mj_id && !initialData) {
          setValue("zakladni_mj_id", "ks", { shouldValidate: true })
        }
        if (!dirtyFields.jednotka_baleni_id && !initialData) {
          setValue("jednotka_baleni_id", "ks", { shouldValidate: true })
        }
        if (!dirtyFields.mnozstvi_v_baleni && !initialData) {
          setValue("mnozstvi_v_baleni", 1, { shouldValidate: true })
        }

        switch (toolSub) {
          case 'BU': {
            generatedSku = `TOL-BU-${toolBuPrumer}`
            generatedSpecs = {
              podkategorie: "BU",
              material: "MET",
              prumer_mm: parseInt(toolBuPrumer) || 0
            }
            break
          }
          case 'QR': {
            generatedSku = `TOL-QR-${toolQrTyp}-${toolQrMat}`
            generatedSpecs = {
              podkategorie: "QR",
              typ_pripojeni: toolQrTyp,
              material: toolQrMat
            }
            break
          }
          case 'SQ': {
            generatedSku = `TOL-SQ-${toolSqPrumer}`
            generatedSpecs = {
              podkategorie: "SQ",
              prumer_mm: parseInt(toolSqPrumer) || 0
            }
            break
          }
          case 'V': {
            const idClean = toolVId.toUpperCase().trim().replace(/[\(\) ]/g, "-").replace(/-+/g, "-").replace(/[^A-Z0-9-]/g, '') || "VAC"
            generatedSku = `TOL-V-${idClean}`
            generatedSpecs = {
              podkategorie: "V",
              identifikator: toolVId
            }
            break
          }
          case 'CU': {
            const cleanVol = toolCuVolume.trim().toUpperCase().replace(/[^A-Z0-9]/g, '')
            const volSku = cleanVol ? `-${cleanVol}L` : ""
            generatedSku = `TOL-CU-RST5${volSku}`
            generatedSpecs = {
              podkategorie: "CU",
              značka: "RST5",
              objem_l: parseInt(toolCuVolume) || toolCuVolume
            }
            break
          }
          case 'SU': {
            generatedSku = `TOL-SU-SPIN-RST5`
            generatedSpecs = {
              podkategorie: "SU",
              model: "Spin",
              značka: "RST5"
            }
            break
          }
        }
        break
      }
      case 'consumables': {
        const rW = parseFloat(conRollWidth) || 0
        const rL = parseFloat(conRollLength) || 0
        
        let targetMj = ""
        let targetUom = ""
        let targetQty: number | undefined = undefined

        switch (conSub) {
          case 'BF': {
            const area = (rW / 100) * rL
            targetMj = "m2"
            targetUom = "role"
            targetQty = parseFloat(area.toFixed(2))
            
            const w_cm = Math.round(rW)
            const lenSuffix = rL > 0 ? `-R${Math.round(rL)}` : ""
            generatedSku = `BF-${conBfFormat}-${conBfTloustka}-${conBfTemp}-${w_cm}${lenSuffix}`
            generatedSpecs = {
              podkategorie: "BF",
              format: conBfFormat,
              tloustka_um: parseFloat(conBfTloustka) || 0,
              teplotni_odolnost: conBfTemp,
              vhodne_do_autoklavu: conBfTemp === 'HT',
              sirka_cm: w_cm,
              delka_m: rL
            }
            break
          }
          case 'RF': {
            const area = (rW / 100) * rL
            targetMj = "m2"
            targetUom = "role"
            targetQty = parseFloat(area.toFixed(2))
            
            const w_cm = Math.round(rW)
            const lenSuffix = rL > 0 ? `-R${Math.round(rL)}` : ""
            generatedSku = `RF-${conRfPerf}-${conRfTloustka}-${conRfTemp}-${w_cm}${lenSuffix}`
            generatedSpecs = {
              podkategorie: "RF",
              perforace: conRfPerf,
              tloustka_um: parseFloat(conRfTloustka) || 0,
              teplotni_odolnost: conRfTemp,
              sirka_cm: w_cm,
              delka_m: rL
            }
            break
          }
          case 'PP': {
            const area = (rW / 100) * rL
            targetMj = "m2"
            targetUom = "role"
            targetQty = parseFloat(area.toFixed(2))
            
            const w_cm = Math.round(rW)
            const lenSuffix = rL > 0 ? `-R${Math.round(rL)}` : ""
            generatedSku = `PP-${conPpPolymer}-${conPpGramaz}-${w_cm}${lenSuffix}`
            generatedSpecs = {
              podkategorie: "PP",
              polymer: conPpPolymer,
              gramaz_gm2: parseInt(conPpGramaz) || 0,
              sirka_cm: w_cm,
              delka_m: rL
            }
            break
          }
          case 'PP-PTFE': {
            const area = (rW / 100) * rL
            targetMj = "m2"
            targetUom = "role"
            targetQty = parseFloat(area.toFixed(2))
            
            const w_cm = Math.round(rW)
            const lenSuffix = rL > 0 ? `-R${Math.round(rL)}` : ""
            generatedSku = `PP-PTFE-${conPtfeAdhesive}-${conPtfeTloustka}-${w_cm}${lenSuffix}`
            generatedSpecs = {
              podkategorie: "PP-PTFE",
              polymer: "PTFE",
              je_teflon: true,
              je_lepici: conPtfeAdhesive === "ADH",
              tloustka_um: parseFloat(conPtfeTloustka) || 0,
              sirka_cm: w_cm,
              delka_m: rL
            }
            break
          }
          case 'BC': {
            const area = (rW / 100) * rL
            targetMj = "m2"
            targetUom = "role"
            targetQty = parseFloat(area.toFixed(2))
            
            const w_cm = Math.round(rW)
            const lenSuffix = rL > 0 ? `-R${Math.round(rL)}` : ""
            generatedSku = `BC-${conBcGramaz}-${w_cm}${lenSuffix}`
            generatedSpecs = {
              podkategorie: "BC",
              gramaz_gm2: parseInt(conBcGramaz) || 0,
              sirka_cm: w_cm,
              delka_m: rL
            }
            break
          }
          case 'ST': {
            const len = parseFloat(conStDelka) || 0
            targetMj = "bm"
            targetUom = "role"
            targetQty = parseFloat((len * conStPocetRoli).toFixed(2))
            
            const lenSuffix = len > 0 ? `-R${Math.round(len)}` : ""
            generatedSku = `ST-${conStTemp}-${conStSirka}${lenSuffix}`
            generatedSpecs = {
              podkategorie: "ST",
              teplotni_odolnost_c: parseInt(conStTemp) || 0,
              sirka_mm: parseInt(conStSirka) || 0,
              tloustka_mm: 3.5,
              delka_m: len,
              pocet_roli_v_baleni: conStPocetRoli,
            }
            break
          }
          case 'FT': {
            const len = parseFloat(conFtDelka) || 0
            targetMj = "bm"
            targetUom = "role"
            targetQty = parseFloat((len * conFtPocetRoli).toFixed(2))
            
            const lenSuffix = len > 0 ? `-R${Math.round(len)}` : ""
            generatedSku = `FT-${conFtSirka}-${conFtTemp}${lenSuffix}`
            generatedSpecs = {
              podkategorie: "FT",
              sirka_mm: parseInt(conFtSirka) || 0,
              teplotni_odolnost: conFtTemp,
              delka_m: len,
              pocet_roli_v_baleni: conFtPocetRoli,
            }
            break
          }
          case 'FM': {
            const area = (rW / 100) * rL
            targetMj = "m2"
            targetUom = "role"
            targetQty = parseFloat(area.toFixed(2))
            
            const lenSuffix = rL > 0 ? `-R${Math.round(rL)}` : ""
            const speedMap: Record<string, string> = {
              low: "LO",
              medium: "MD",
              high: "HI"
            }
            const speedCode = speedMap[conFmRychlost] || "MD"
            generatedSku = `FM-${conFmTyp}-${conFmMaterial}-${speedCode}-${conFmBarva}${lenSuffix}`
            generatedSpecs = {
              podkategorie: "FM",
              typ_vyroby: conFmTyp,
              material: conFmMaterial,
              barva: conFmBarva,
              rychlost_proudeni: conFmRychlost,
              tloustka_mm: parseFloat(conFmTloustka) || 0,
              gramaz_gm2: parseInt(conFmGramaz) || 0,
              teplotni_odolnost: conFmTeplota,
              flexibilita: conFmFlexibilita,
              sirka_cm: Math.round(rW),
              delka_m: rL
            }
            break
          }
          case 'FCH': {
            const tempVal = parseInt(conFchTemp) || 120
            const prefix = tempVal <= 120 ? "LT" : tempVal <= 150 ? "MT" : "HT"
            const fchTempCode = `${prefix}${tempVal}`

            switch (conFchSubtyp) {
              case 'TAPE': {
                const len = parseFloat(conFchDelka) || 0
                targetMj = "bm"
                targetUom = "role"
                targetQty = parseFloat(len.toFixed(2))
                
                const lenSuffix = len > 0 ? `-R${Math.round(len)}` : ""
                generatedSku = `FCH-TAPE-${conFchMaterial}-${conFchSirka}${lenSuffix}`
                generatedSpecs = {
                  podkategorie: "FCH",
                  podtyp_fch: "TAPE",
                  material: conFchMaterial,
                  sirka_mm: parseInt(conFchSirka) || 0,
                  vyska_mm: parseInt(conFchVyska) || 0,
                  teplotni_odolnost: fchTempCode,
                  delka_m: len
                }
                break
              }
              case 'SPRL': {
                const len = parseFloat(conFchDelka) || 0
                targetMj = "bm"
                targetUom = "role"
                targetQty = parseFloat(len.toFixed(2))
                
                const lenSuffix = len > 0 ? `-R${Math.round(len)}` : ""
                generatedSku = `FCH-SPRL-${conFchMaterial}-${conFchPrumer}${lenSuffix}`
                generatedSpecs = {
                  podkategorie: "FCH",
                  podtyp_fch: "SPRL",
                  material: conFchMaterial,
                  vnitrni_prumer_mm: parseInt(conFchPrumer) || 0,
                  teplotni_odolnost: fchTempCode,
                  delka_m: len
                }
                break
              }
              case 'OMEGA': {
                const len = parseFloat(conFchDelka) || 0
                targetMj = "bm"
                targetUom = "role"
                targetQty = parseFloat(len.toFixed(2))
                
                const lenSuffix = len > 0 ? `-R${Math.round(len)}` : ""
                generatedSku = `FCH-OMEGA-${conFchPrumer}${lenSuffix}`
                generatedSpecs = {
                  podkategorie: "FCH",
                  podtyp_fch: "OMEGA",
                  vnitrni_prumer_mm: parseInt(conFchPrumer) || 0,
                  teplotni_odolnost: fchTempCode,
                  delka_m: len
                }
                break
              }
            }
            break
          }
          case 'TUBE': {
            const len = parseFloat(conFchDelka) || 0
            targetMj = "bm"
            targetUom = "role"
            targetQty = parseFloat(len.toFixed(2))
            
            const tempVal = parseInt(conFchTemp) || 120
            const prefix = tempVal <= 120 ? "LT" : tempVal <= 150 ? "MT" : "HT"
            const fchTempCode = `${prefix}${tempVal}`
            
            const lenSuffix = len > 0 ? `-R${Math.round(len)}` : ""
            generatedSku = `TUBE-${conFchMaterial}-${conFchPrumer}${lenSuffix}`
            generatedSpecs = {
              podkategorie: "TUBE",
              material: conFchMaterial,
              vnitrni_prumer_mm: parseInt(conFchPrumer) || 0,
              teplotni_odolnost: fchTempCode,
              delka_m: len
            }
            break
          }
          case 'K': {
            if (!dirtyFields.zakladni_mj_id && !initialData) {
              setValue("zakladni_mj_id", "ks", { shouldValidate: true })
            }
            if (!dirtyFields.jednotka_baleni_id && !initialData) {
              setValue("jednotka_baleni_id", "ks", { shouldValidate: true })
            }
            if (!dirtyFields.mnozstvi_v_baleni && !initialData) {
              setValue("mnozstvi_v_baleni", 1, { shouldValidate: true })
            }
            
            generatedSku = `K-${conKTvar}-${conKPrumer}`
            generatedSpecs = {
              podkategorie: "K",
              tvar: conKTvar,
              vnejsi_prumer_mm: parseInt(conKPrumer) || 0
            }
            break
          }
          case 'MTI': {
            const isRoll = conMtiTyp === 'Hose' || conMtiTyp === 'MVS' || conMtiTyp === 'RBL'
            if (!dirtyFields.zakladni_mj_id && !initialData) {
              setValue("zakladni_mj_id", isRoll ? "bm" : "ks", { shouldValidate: true })
            }
            if (!dirtyFields.jednotka_baleni_id && !initialData) {
              setValue("jednotka_baleni_id", isRoll ? "role" : "ks", { shouldValidate: true })
            }
            
            const lenVal = parseFloat(conMtiDelka) || 0
            if (!dirtyFields.mnozstvi_v_baleni && !initialData) {
              setValue("mnozstvi_v_baleni", isRoll ? parseFloat(lenVal.toFixed(2)) : 1, { shouldValidate: true })
            }

            if (isRoll) {
              targetMj = "bm"
              targetUom = "role"
            }
            
            const wVal = conMtiWidth.trim()
            const wSku = wVal ? `-${wVal}` : ""
            const lenSku = (isRoll && lenVal > 0) ? `-${Math.round(lenVal)}M` : ""
            generatedSku = `MTI-${conMtiTyp.toUpperCase()}${wSku}${lenSku}`
            generatedSpecs = {
              podkategorie: "MTI",
              typ_mti: conMtiTyp,
              ...(conMtiTyp === 'MVS' ? { sirka_mm: parseInt(wVal) || wVal } : {}),
              ...(isRoll ? { delka_m: lenVal } : {})
            }
            break
          }
          case 'KP': {
            if (!dirtyFields.zakladni_mj_id && !initialData) {
              setValue("zakladni_mj_id", "ks", { shouldValidate: true })
            }
            if (!dirtyFields.jednotka_baleni_id && !initialData) {
              setValue("jednotka_baleni_id", "ks", { shouldValidate: true })
            }
            if (!dirtyFields.mnozstvi_v_baleni && !initialData) {
              setValue("mnozstvi_v_baleni", 1, { shouldValidate: true })
            }
            
            generatedSku = `KP-${conKpTvar}-${conKpPrumer}`
            generatedSpecs = {
              podkategorie: "KP",
              tvar: conKpTvar,
              material: "PLA",
              prumer_mm: parseInt(conKpPrumer) || 0
            }
            break
          }
        }

        const specsEqual = initialData?.specifikace && areSpecsEqual(generatedSpecs, initialData.specifikace)
        if (!initialData || !specsEqual) {
          if (targetMj && !dirtyFields.zakladni_mj_id) {
            setValue("zakladni_mj_id", targetMj, { shouldValidate: true })
          }
          if (targetUom && !dirtyFields.jednotka_baleni_id) {
            setValue("jednotka_baleni_id", targetUom, { shouldValidate: true })
          }
          if (targetQty !== undefined && !dirtyFields.mnozstvi_v_baleni && !initialData) {
            setValue("mnozstvi_v_baleni", targetQty, { shouldValidate: true })
          }
        }
        break;
      }
      default:
        return;
    }

    if (generatedSku) {
      if (customHmotnostMj && parseFloat(customHmotnostMj) > 0) {
        generatedSpecs.vlastni_hmotnost_mj_kg = parseFloat(customHmotnostMj)
      }
      setValue("sku", generatedSku, { shouldValidate: true })
      setValue("specifikace_json", JSON.stringify(generatedSpecs, null, 2))
      
      if (isNameGenerated && (kategorieId === 'vyztuzne_materialy' || kategorieId === 'consumables' || kategorieId === 'naradi' || kategorieId === 'lepidla' || kategorieId === 'pryskyrice' || kategorieId === 'spotrebni_chemie' || kategorieId === 'chemie' || kategorieId === 'brouseni_a_lesteni')) {
        const names = generateProductNames(generatedSpecs, kategorieId, lookups.fiberCodes)
        setValue("nazev", names.cs, { shouldValidate: true })
        setValue("nazev_en", names.en, { shouldValidate: true })
      }
    }
  }, [kategorieId, isNameGenerated, customHmotnostMj, fabMat, fabForm, fabWeight, fabTow, fabTow1, fabTow2, fabWeave, fabUse, fabBrand, fabMat1, fabMat2, fabBrand1, fabBrand2, fabFiberCode, fabFiberCode1, fabFiberCode2, fabPackType, fabWidth, fabLength, fabPieces, prepBase, prepWeight, prepResin, chemType, chemBase, chemVariant, chemColor, chemTech, chemCuringTime, chemUse, chemObjemNakup, clnSub, clnBrand, clnPack, clnType, clnQty, clnPmpType, clnPmpQty, coreMat, coreDens, coreThick, coreFinish, coreSirkaCm, coreDelkaCm, polSub, polPasteType, polPasteColor, polPasteCont, polPasteWeight, polWaxName, polWaxState, polWaxQty, polDiscType, polDiscCode, polDiscDia, polAccType, polAccProp, polAccDia, fasType, fasBase, fasSize, fasMat, toolSub, toolBuTvar, toolBuPrumer, toolQrTyp, toolQrMat, toolSqPrumer, toolVId, toolCuVolume, conSub, conRollWidth, conRollLength, conBfFormat, conBfTloustka, conBfTemp, conRfPerf, conRfTloustka, conRfTemp, conPpPolymer, conPpGramaz, conPtfeAdhesive, conPtfeTloustka, conBcGramaz, conStTemp, conStSirka, conStDelka, conStPocetRoli, conFtSirka, conFtTemp, conFtDelka, conFtPocetRoli, conFmTyp, conFmMaterial, conFmBarva, conFmRychlost, conFmTloustka, conFmGramaz, conFmTeplota, conFmFlexibilita, conFchSubtyp, conFchMaterial, conFchSirka, conFchVyska, conFchDelka, conFchPrumer, conFchTemp, conKTvar, conKPrumer, conMtiTyp, conMtiWidth, conMtiDelka, conKpTvar, conKpPrumer, adhChem, adhOpenTime, adhColor, adhVolume, chemSub, chemAdhProp, chemBaseType, chemSealerProp, chemVol, setValue, lookups.fiberCodes])

  // Live SKU Duplicate Check (Debounced)
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (currentSku && currentSku.length > 2) {
        const exists = await checkSkuExists(currentSku, initialData?.id)
        setSkuExists(exists)
      } else {
        setSkuExists(false)
      }
    }, 500)
    return () => clearTimeout(timer)
  }, [currentSku, initialData?.id])

  const specifikaceJsonStr = watch("specifikace_json")

  // Auto-Weight: compute gross weight from specifikace and auto-fill the field
  // when the user has not manually overridden it
  const currentSpecs = useMemo(() => {
    try {
      const parsed = JSON.parse(specifikaceJsonStr || "{}")
      if (customHmotnostMj && parseFloat(customHmotnostMj) > 0) {
        parsed.vlastni_hmotnost_mj_kg = parseFloat(customHmotnostMj)
      }
      return parsed
    } catch {
      return {}
    }
  }, [specifikaceJsonStr, customHmotnostMj])

  const packagingMultiplier = useMemo(() => {
    const uomZkratka = lookups.units.find(u => u.id === jednotkaBaleniId)?.zkratka
    return getPackagingMultiplier(kategorieId, currentSpecs, uomZkratka)
  }, [jednotkaBaleniId, currentSpecs, kategorieId, lookups.units])

  const packageExplanation = useMemo(() => {
    const qty = parseFloat(String(mnozstviVBaleni)) || 0
    if (qty <= 0 || packagingMultiplier <= 1) return null
    const basicUnitZkratka = lookups.units.find(u => u.id === zakladniMjId)?.zkratka || "bm"
    return `Celkem: ${qty.toFixed(2).replace(/\.00$/, "")} ${basicUnitZkratka} (přepočteno z počtu rolí)`
  }, [mnozstviVBaleni, packagingMultiplier, zakladniMjId, lookups.units])

  const autoWeight = useMemo(() =>
    calculateGrossWeight(kategorieId, currentSpecs, Number(mnozstviVBaleni) || 1, zakladniMjId),
    [kategorieId, currentSpecs, mnozstviVBaleni, zakladniMjId]
  )

  const autoProfile = useMemo(() =>
    resolvePackagingProfile(kategorieId, currentSpecs, (lookups as any).profiles || []),
    [kategorieId, currentSpecs, lookups]
  )

  const estimatedNetWeight = useMemo(() => {
    return autoWeight.netWeightKg || 0
  }, [autoWeight.netWeightKg])

  // Sync auto-weight into form field when not overridden
  useEffect(() => {
    if (!isWeightOverridden && autoWeight.weightKg !== null) {
      setValue("hmotnost_baliku_kg", autoWeight.weightKg as any, { shouldDirty: false })
    }
  }, [autoWeight, isWeightOverridden, setValue])



  // handle category select & dynamic defaults
  const handleCategoryChange = (val: string | null) => {
    const catId = val || ""
    setValue("kategorie_id", catId, { shouldValidate: true })

    if (!initialData && catId) {
      const category = lookups.categories.find(c => c.id === catId)
      if (category) {
        if (category.def_marze_retail_procenta !== undefined) setValue("cilova_marze_retail_procenta", category.def_marze_retail_procenta)
        if (category.def_marze_partner_procenta !== undefined) setValue("cilova_marze_partner_procenta", category.def_marze_partner_procenta)
      }

      switch (catId) {
        case 'vyztuzne_materialy':
        case 'prepregy':
          setValue("zakladni_mj_id", "m2")
          setValue("jednotka_baleni_id", "bm")
          setValue("mnozstvi_v_baleni", 100)
          break
        case 'consumables':
          setValue("zakladni_mj_id", "m2")
          setValue("jednotka_baleni_id", "role")
          setValue("mnozstvi_v_baleni", 100)
          break
        case 'pryskyrice':
          setValue("zakladni_mj_id", "kg")
          setValue("jednotka_baleni_id", "ks")
          setValue("mnozstvi_v_baleni", 1)
          break
        case 'lepidla':
          setValue("zakladni_mj_id", "ks")
          setValue("jednotka_baleni_id", "ks")
          setValue("mnozstvi_v_baleni", 1)
          break
        case 'spotrebni_chemie':
          setValue("zakladni_mj_id", "l")
          setValue("jednotka_baleni_id", "ks")
          setValue("mnozstvi_v_baleni", 1)
          break
        case 'chemie':
          setValue("zakladni_mj_id", "ks")
          setValue("jednotka_baleni_id", "ks")
          setValue("mnozstvi_v_baleni", 1)
          break
        case 'brouseni_a_lesteni':
          setValue("zakladni_mj_id", "ks")
          setValue("jednotka_baleni_id", "ks")
          setValue("mnozstvi_v_baleni", 1)
          break
        default:
          setValue("zakladni_mj_id", "ks")
          setValue("jednotka_baleni_id", "ks")
          setValue("mnozstvi_v_baleni", 1)
          break
      }

      if (catId === 'prepregy') {
        setValue("def_typ_skladovani", "mrazak")
        setValue("shelf_life_mesice", 12)
      } else if (catId === 'pryskyrice' || catId === 'lepidla') {
        setValue("def_typ_skladovani", "sklad")
        setValue("shelf_life_mesice", 12)
      } else if (catId === 'spotrebni_chemie' || catId === 'chemie') {
        setValue("def_typ_skladovani", "sklad")
        setValue("shelf_life_mesice", 24)
      } else {
        setValue("def_typ_skladovani", "sklad")
        setValue("shelf_life_mesice", 0)
      }

      setValue("def_typ_labelu_id", "vlastni")
    }
  }

  const handleSkuChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.toUpperCase()
    val = val.replace(/[\(\) ]/g, "-").replace(/-+/g, "-")
    setValue("sku", val, { shouldValidate: true })
  }

  // --- Render Helpers for Generators ---
  const renderGeneratorWrapper = (title: string, children: React.ReactNode) => (
    <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg space-y-4">
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-bold text-primary">Smart SKU: {title}</h3>
        <div className="flex flex-col items-end gap-1">
           <div className={`px-3 py-1 rounded border text-sm font-mono font-bold ${skuExists ? 'bg-red-500/10 border-red-500 text-red-500' : 'bg-background border-zinc-200 dark:border-zinc-800'}`}>
            {watch("sku") || "SKU NÁHLED"}
          </div>
          {skuExists && <p className="text-[10px] text-red-500 font-bold uppercase tracking-tighter">Kód již existuje!</p>}
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-2">
        {children}
      </div>
    </div>
  )

  const renderSelect = (label: string, value: string, setter: (val: string) => void, options: {val: string, label: string}[]) => (
    <div className="space-y-2">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Select onValueChange={(v) => setter(v || "")} value={value}>
        <SelectTrigger className="h-8 w-full">
          <SelectValue>
            {options.find(o => o.val === value)?.label}
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="min-w-[300px]">
          {options.map(o => <SelectItem key={o.val} value={o.val}>{o.label}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  )

  const isChemicalCategory = kategorieId === 'prepregy' || kategorieId === 'pryskyrice' || kategorieId === 'lepidla' || kategorieId === 'spotrebni_chemie' || kategorieId === 'chemie';
  const handleFormSubmit = async (data: ProductFormValues) => {
    await onSubmit(data)
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      
      {/* 1. Hlavní klasifikace (Kategorie a Název) */}
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Kategorie</Label>
            <Select onValueChange={handleCategoryChange} value={kategorieId || ""}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Vyberte kategorii">
                  {kategorieId === 'spotrebni_chemie' ? 'Čističe' : (lookups.categories.find(c => c.id === kategorieId)?.nazev)}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {lookups.categories
                  .filter(c => !['prepregy', 'cores_standard', 'cores_active'].includes(c.id) || c.id === initialData?.kategorie_id)
                  .map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.id === 'spotrebni_chemie' ? 'Čističe' : c.nazev}</SelectItem>
                  ))}
              </SelectContent>
            </Select>
            {errors.kategorie_id && <p className="text-xs text-destructive">{errors.kategorie_id.message}</p>}
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label htmlFor="nazev">Název produktu (CS)</Label>
              {['vyztuzne_materialy', 'consumables', 'naradi', 'lepidla', 'pryskyrice', 'spotrebni_chemie', 'chemie', 'brouseni_a_lesteni'].includes(kategorieId) && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground select-none">
                  <input 
                    type="checkbox" 
                    id="is_name_generated" 
                    {...register("is_name_generated")}
                    className="rounded border-zinc-800 bg-zinc-950 accent-primary size-3.5"
                  />
                  <label htmlFor="is_name_generated" className="cursor-pointer font-medium hover:text-white transition-colors">
                    Generovat automaticky
                  </label>
                </div>
              )}
            </div>
            <Input 
              id="nazev" 
              placeholder="Název produktu (česky)" 
              readOnly={isNameGenerated && ['vyztuzne_materialy', 'consumables', 'naradi', 'lepidla', 'pryskyrice', 'spotrebni_chemie', 'chemie', 'brouseni_a_lesteni'].includes(kategorieId)}
              className={isNameGenerated && ['vyztuzne_materialy', 'consumables', 'naradi', 'lepidla', 'pryskyrice', 'spotrebni_chemie', 'chemie', 'brouseni_a_lesteni'].includes(kategorieId) ? "bg-muted text-muted-foreground cursor-not-allowed font-medium border-zinc-850" : "font-medium"}
              {...register("nazev")} 
            />
            {errors.nazev && <p className="text-xs text-destructive">{errors.nazev.message}</p>}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2 col-start-2">
            <Label htmlFor="nazev_en">Název produktu (EN)</Label>
            <Input 
              id="nazev_en" 
              placeholder="Název produktu (anglicky)" 
              readOnly={isNameGenerated && ['vyztuzne_materialy', 'consumables', 'naradi', 'lepidla', 'pryskyrice', 'spotrebni_chemie', 'chemie', 'brouseni_a_lesteni'].includes(kategorieId)}
              className={isNameGenerated && ['vyztuzne_materialy', 'consumables', 'naradi', 'lepidla', 'pryskyrice', 'spotrebni_chemie', 'chemie', 'brouseni_a_lesteni'].includes(kategorieId) ? "bg-muted text-muted-foreground cursor-not-allowed font-medium border-zinc-850" : "font-medium"}
              {...register("nazev_en")} 
            />
            {errors.nazev_en && <p className="text-xs text-destructive">{errors.nazev_en.message}</p>}
          </div>
        </div>
      </div>

      {kategorieId === 'vyztuzne_materialy' ? renderGeneratorWrapper("Výztužné materiály", (
        <>
          {renderSelect("Typ", fabForm, setFabForm, [{val:"WF", label:"WF (Woven)"}, {val:"UD", label:"UD (Uni)"}, {val:"BIAX", label:"BIAX"}, {val:"MAT", label:"MAT"}])}
          {renderSelect("Materiál", fabMat, setFabMat, [
            {val:"CF", label:"CF (Carbon)"},
            {val:"GF", label:"GF (Glass)"},
            {val:"AF", label:"AF (Aramid)"},
            {val:"HF", label:"HF (Hybrid Fibre)"},
            {val:"BIOF", label:"BIOF (Flax)"},
            {val:"BIOH", label:"BIOH (Hemp)"},
            {val:"PAN", label:"PAN (Polyacrylonitrile)"},
            {val:"PET", label:"PET (Polyethylene Terephthalate)"},
            {val:"OF", label:"OF (Other)"}
          ])}
          {fabMat === "HF" && (
            <>
              {renderSelect("Materiál 1", fabMat1, setFabMat1, [
                {val:"CF", label:"CF (Carbon)"},
                {val:"GF", label:"GF (Glass)"},
                {val:"AF", label:"AF (Aramid)"},
                {val:"BIOF", label:"BIOF (Flax)"},
                {val:"BIOH", label:"BIOH (Hemp)"},
                {val:"PAN", label:"PAN (Polyacrylonitrile)"},
                {val:"PET", label:"PET (Polyethylene Terephthalate)"},
                {val:"OF", label:"OF (Other)"}
              ])}
              {renderSelect("Materiál 2", fabMat2, setFabMat2, [
                {val:"CF", label:"CF (Carbon)"},
                {val:"GF", label:"GF (Glass)"},
                {val:"AF", label:"AF (Aramid)"},
                {val:"BIOF", label:"BIOF (Flax)"},
                {val:"BIOH", label:"BIOH (Hemp)"},
                {val:"PAN", label:"PAN (Polyacrylonitrile)"},
                {val:"PET", label:"PET (Polyethylene Terephthalate)"},
                {val:"OF", label:"OF (Other)"}
              ])}
            </>
          )}
          <div className="space-y-2"><Label className="text-xs text-muted-foreground">Gramáž (g)</Label><Input type="number" value={fabWeight} onChange={(e) => setFabWeight(e.target.value)} className="h-8 bg-background" /></div>
          {fabMat === "HF" ? (
            <>
              {renderSelect(
                "Vlákno 1", 
                fabTow1, 
                setFabTow1, 
                fabMat1 === "CF" ? CARBON_TOW_OPTIONS : NON_CARBON_TOW_OPTIONS
              )}
              {renderSelect(
                "Vlákno 2", 
                fabTow2, 
                setFabTow2, 
                fabMat2 === "CF" ? CARBON_TOW_OPTIONS : NON_CARBON_TOW_OPTIONS
              )}
            </>
          ) : (
            renderSelect(
              "Vlákno", 
              fabTow, 
              setFabTow, 
              fabMat === "CF" ? CARBON_TOW_OPTIONS : NON_CARBON_TOW_OPTIONS
            )
          )}
          {fabForm === "MAT" ? (
            renderSelect("Fixace", fabWeave, setFabWeave, [
              {val:"NP", label:"NP (Needle punched)"},
              {val:"EM", label:"EM (Emulsion)"},
              {val:"PB", label:"PB (Powder binder)"},
              {val:"ST", label:"ST (Stitched)"}
            ])
          ) : fabForm === "BIAX" ? (
            renderSelect("Orientace", fabWeave, setFabWeave, [
              {val:"090", label:"0/90 (0°/90°)"},
              {val:"45", label:"±45 (±45°)"}
            ])
          ) : (
            renderSelect("Vazba", fabWeave, setFabWeave, [
              {val:"P", label:"P (Plain)"},
              {val:"T22", label:"T22 (Twill)"},
              {val:"T44", label:"T44 (Twill)"},
              {val:"NA", label:"N/A"}
            ])
          )}
          {renderSelect("Použití", fabUse, setFabUse, [
            {val:"E", label:"E (Economy)"},
            {val:"V", label:"V (Visual)"},
            {val:"I", label:"I (Industry)"},
            {val:"NA", label:"N/A"}
          ])}
          {fabMat === "HF" ? (
            <>
              {renderSelect("Výrobce 1 (Interní)", fabBrand1, setFabBrand1, [
                {val:"ZH", label:"ZH (Zhongfu)"},
                {val:"TN", label:"TN (Tenax)"},
                {val:"TA", label:"TA (Tayrifil)"},
                {val:"HY", label:"HY (Hyosung)"},
                {val:"MI", label:"MI (Mitsubishi)"},
                {val:"HX", label:"HX (Hexcel)"},
                {val:"TO", label:"TO (Toray)"},
                {val:"DP", label:"DP (Dupont)"},
                {val:"NA", label:"N/A"}
              ])}
              {renderSelect("Výrobce 2 (Interní)", fabBrand2, setFabBrand2, [
                {val:"ZH", label:"ZH (Zhongfu)"},
                {val:"TN", label:"TN (Tenax)"},
                {val:"TA", label:"TA (Tayrifil)"},
                {val:"HY", label:"HY (Hyosung)"},
                {val:"MI", label:"MI (Mitsubishi)"},
                {val:"HX", label:"HX (Hexcel)"},
                {val:"TO", label:"TO (Toray)"},
                {val:"DP", label:"DP (Dupont)"},
                {val:"NA", label:"N/A"}
              ])}
              {renderSelect("Kód vlákna 1", fabFiberCode1, setFabFiberCode1, [
                {val:"na", label:"N/A"},
                ...(lookups.fiberCodes || []).map((f: any) => ({ val: f.id, label: f.nazev }))
              ])}
              {renderSelect("Kód vlákna 2", fabFiberCode2, setFabFiberCode2, [
                {val:"na", label:"N/A"},
                ...(lookups.fiberCodes || []).map((f: any) => ({ val: f.id, label: f.nazev }))
              ])}
            </>
          ) : (
            <>
              {renderSelect("Výrobce vlákna (Interní)", fabBrand, setFabBrand, [
                {val:"ZH", label:"ZH (Zhongfu)"},
                {val:"TN", label:"TN (Tenax)"},
                {val:"TA", label:"TA (Tayrifil)"},
                {val:"HY", label:"HY (Hyosung)"},
                {val:"MI", label:"MI (Mitsubishi)"},
                {val:"HX", label:"HX (Hexcel)"},
                {val:"TO", label:"TO (Toray)"},
                {val:"DP", label:"DP (Dupont)"},
                {val:"NA", label:"N/A"}
              ])}
              {renderSelect("Kód vlákna", fabFiberCode, setFabFiberCode, [
                {val:"na", label:"N/A"},
                ...(lookups.fiberCodes || []).map((f: any) => ({ val: f.id, label: f.nazev }))
              ])}
            </>
          )}
        </>
      )) : kategorieId === 'prepregy' ? renderGeneratorWrapper("Prepregy", (
        <>
          {renderSelect("Base Materiál", prepBase, setPrepBase, [{val:"CF", label:"CF (Carbon)"}, {val:"GF", label:"GF (Glass)"}, {val:"AF", label:"AF (Aramid)"}])}
          <div className="space-y-2"><Label className="text-xs text-muted-foreground">Gramáž (g)</Label><Input type="number" value={prepWeight} onChange={(e) => setPrepWeight(e.target.value)} className="h-8 bg-background" /></div>
          {renderSelect("Pryskyřice", prepResin, setPrepResin, [{val:"EPX", label:"EPX (Epoxy)"}, {val:"PHN", label:"PHN (Phenolic)"}])}
        </>
      )) : kategorieId === 'pryskyrice' ? renderGeneratorWrapper("Pryskyřice", (
        <>
          {renderSelect("Typ", chemType, setChemType, [
            {val:"FIL", label:"FIL (Filler / Tmel)"},
            {val:"HRD", label:"HRD (Hardener / Tužidlo)"},
            {val:"GEL", label:"GEL (Gelcoat)"},
            {val:"COP", label:"COP (Coupling coat / Spojovací vrstva)"},
            {val:"RES", label:"RES (Resin / Pryskyřice)"}
          ])}
          {renderSelect("Chemie", chemBase, setChemBase, [
            {val:"EP", label:"EP (Epoxy / Epoxid)"},
            {val:"VE", label:"VE (Vinylester)"},
            {val:"PE", label:"PE (Polyester)"}
          ])}
          {(chemType === 'FIL' || chemType === 'GEL' || chemType === 'COP' || chemType === 'RES') ? (
            renderSelect("Technologie výroby", chemTech, setChemTech, [
              {val:"INF", label:"INF (Infuze / Infusion)"},
              {val:"WL", label:"WL (Ruční laminace / Wet layup)"}
            ])
          ) : chemType === 'HRD' ? (
            renderSelect("Čas vytvrzení", chemCuringTime, setChemCuringTime, [
              {val:"slow", label:"Slow (Pomalé)"},
              {val:"medium", label:"Medium (Střední)"},
              {val:"fast", label:"Fast (Rychlé)"}
            ])
          ) : null}
          {renderSelect("Použití", chemUse, setChemUse, [
            {val:"FOR", label:"FOR (Formy / Molds)"},
            {val:"DIL", label:"Díly (Parts)"}
          ])}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Nákupní objem balení (L)</Label>
            <div className="flex items-center gap-2">
              <Input 
                type="number"
                step="any"
                value={chemObjemNakup} 
                onChange={(e) => setChemObjemNakup(e.target.value)} 
                className="h-8 bg-background flex-1 text-sm" 
                placeholder="Např. 5, 20, 200"
              />
              <span className="text-sm text-zinc-400 shrink-0">L</span>
            </div>
          </div>
        </>
      )) : kategorieId === 'lepidla' ? renderGeneratorWrapper("Lepidla", (
        <>
          {renderSelect("Chemie", adhChem, setAdhChem, [
            {val:"EP", label:"EP (Epoxid)"},
            {val:"PU", label:"PU (Polyuretan)"},
            {val:"MMA", label:"MMA (Akrylát)"}
          ])}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Doba zpracovatelnosti (min)</Label>
            <Input type="number" value={adhOpenTime} onChange={(e) => setAdhOpenTime(e.target.value)} className="h-8 bg-background" />
          </div>
          {renderSelect("Barva", adhColor, setAdhColor, [
            {val:"black", label:"black (Černá)"},
            {val:"grey", label:"grey (Šedá)"},
            {val:"white", label:"white (Bílá)"},
            {val:"clear", label:"clear (Čirá)"},
            {val:"off-white", label:"off-white (Krémová)"}
          ])}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Objem (ml)</Label>
            <Input value={adhVolume} onChange={(e) => setAdhVolume(e.target.value)} className="h-8 bg-background" placeholder="např. 50, 400" />
          </div>
        </>
      )) : kategorieId === 'spotrebni_chemie' ? renderGeneratorWrapper("Čističe", (
        <>
          {renderSelect("Podkategorie", clnSub, setClnSub, [
            {val:"standard", label:"Standardní čistič"},
            {val:"pmp", label:"PMP"}
          ])}

          {clnSub === 'standard' && (
            <>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Značka</Label>
                <Input 
                  value={clnBrand} 
                  onChange={(e) => setClnBrand(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))} 
                  className="h-8 bg-background" 
                  placeholder="RST5" 
                />
              </div>
              {renderSelect("Typ čističe", clnType, setClnType, [
                {val:"WIP", label:"Ubrousky (Wipes)"},
                {val:"CON", label:"Koncentrát (Concentrate)"},
                {val:"SPR", label:"Sprej (Spray)"}
              ])}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">
                  {clnType === 'WIP' ? "Množství (kusy)" : clnType === 'CON' ? "Množství (litry)" : "Množství (mililitry)"}
                </Label>
                <Input 
                  type="number" 
                  value={clnQty} 
                  onChange={(e) => setClnQty(e.target.value)} 
                  className="h-8 bg-background" 
                  placeholder={clnType === 'WIP' ? "Např. 100" : clnType === 'CON' ? "Např. 5" : "Např. 400"}
                />
              </div>
            </>
          )}

          {clnSub === 'pmp' && (
            <>
              {renderSelect("Typ čističe", clnPmpType, setClnPmpType, [
                {val:"liquid", label:"Liquid (Liquid)"}
              ])}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Množství (ml)</Label>
                <Input 
                  type="number" 
                  value={clnPmpQty} 
                  onChange={(e) => setClnPmpQty(e.target.value)} 
                  className="h-8 bg-background" 
                  placeholder="Např. 500" 
                />
              </div>
            </>
          )}
        </>
      )) : kategorieId === 'chemie' ? renderGeneratorWrapper("Chemie", (
        <>
          {renderSelect("Podkategorie", chemSub, setChemSub, [
            {val:"lepidlo_ve_spreji", label:"Lepidla ve spreji"},
            {val:"blinder", label:"Blinder"},
            {val:"plnic_poru_sealer", label:"Plnič pórů - Sealer"},
            {val:"separatory_release_agent", label:"Separátory/Release agent"}
          ])}

          {chemSub === 'lepidlo_ve_spreji' && (
            <>
              {renderSelect("Vlastnost", chemAdhProp, setChemAdhProp, [
                {val:"visual", label:"Pohledový (Visual)"},
                {val:"industry", label:"Nepohledový (Industry)"}
              ])}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Množství (ml)</Label>
                <Input 
                  type="number" 
                  value={chemVol} 
                  onChange={(e) => setChemVol(e.target.value)} 
                  className="h-8 bg-background" 
                  placeholder="Např. 500" 
                />
              </div>
            </>
          )}

          {chemSub === 'blinder' && (
            <>
              {renderSelect("Chemie", chemBaseType, setChemBaseType, [
                {val:"waterbased", label:"Na vodní bázi (Waterbased)"},
                {val:"solvent", label:"Rozpouštědlový (Solvent)"}
              ])}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Množství (ml)</Label>
                <Input 
                  type="number" 
                  value={chemVol} 
                  onChange={(e) => setChemVol(e.target.value)} 
                  className="h-8 bg-background" 
                  placeholder="Např. 500" 
                />
              </div>
            </>
          )}

          {(chemSub === 'plnic_poru_sealer' || chemSub === 'separatory_release_agent') && (
            <>
              {renderSelect("Chemie", chemBaseType, setChemBaseType, [
                {val:"waterbased", label:"Na vodní bázi (Waterbased)"},
                {val:"solvent", label:"Rozpouštědlový (Solvent)"}
              ])}
              {renderSelect("Vlastnost", chemSealerProp, setChemSealerProp, [
                {val:"HS", label:"HS (High Slip)"},
                {val:"LS", label:"LS (Low Slip)"},
                {val:"EP", label:"EP (Easy Paint)"}
              ])}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Množství (l)</Label>
                <Input 
                  type="number" 
                  value={chemVol} 
                  onChange={(e) => setChemVol(e.target.value)} 
                  className="h-8 bg-background" 
                  placeholder="Např. 5" 
                />
              </div>
            </>
          )}
        </>
      )) : (kategorieId === 'cores_standard' || kategorieId === 'cores_active') ? renderGeneratorWrapper("Jádrové materiály", (
        <>
          {renderSelect("Materiál", coreMat, setCoreMat, [{val:"PVC", label:"PVC"}, {val:"PET", label:"PET"}, {val:"BAL", label:"BAL (Balsa)"}, {val:"HON", label:"HON (Honeycomb)"}])}
          <div className="space-y-2"><Label className="text-xs text-muted-foreground">Hustota (kg/m3)</Label><Input type="number" value={coreDens} onChange={(e) => setCoreDens(e.target.value)} className="h-8 bg-background" /></div>
          <div className="space-y-2"><Label className="text-xs text-muted-foreground">Tloušťka (např. 10MM)</Label><Input value={coreThick} onChange={(e) => setCoreThick(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))} className="h-8 bg-background" /></div>
          {renderSelect("Úprava", coreFinish, setCoreFinish, [{val:"PL", label:"PL (Plain)"}, {val:"GS", label:"GS (Grid Scored)"}, {val:"PERF", label:"PERF (Perforated)"}])}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Šířka desky (cm)</Label>
            <Input type="number" value={coreSirkaCm} onChange={(e) => setCoreSirkaCm(Number(e.target.value))} className="h-8 bg-background" />
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Délka desky (cm)</Label>
            <Input type="number" value={coreDelkaCm} onChange={(e) => setCoreDelkaCm(Number(e.target.value))} className="h-8 bg-background" />
          </div>
        </>
      )) : kategorieId === 'brouseni_a_lesteni' ? renderGeneratorWrapper("Broušení a leštění", (
        <>
          {renderSelect("Podkategorie", polSub, setPolSub, [
            {val:"pasty", label:"Pasty"},
            {val:"brusne_kotouce", label:"Brusné kotouče"},
            {val:"prislusenstvi", label:"Příslušenství"},
            {val:"vosk", label:"Vosk"}
          ])}

          {polSub === 'pasty' && (
            <>
              {renderSelect("Typ pasty", polPasteType, setPolPasteType, [
                {val:"rex", label:"Rex (Brusná pasta)"},
                {val:"perla15", label:"Perla 15 (Brusná pasta)"},
                {val:"top_finish_3", label:"Top Finish 3 (Lešticí pasta)"}
              ])}
              {renderSelect("Barva", polPasteColor, setPolPasteColor, [
                {val:"white", label:"Bílá (White)"},
                {val:"black", label:"Černá (Black)"}
              ])}
              {renderSelect("Nádoba", polPasteCont, setPolPasteCont, [
                {val:"BOT", label:"Láhev (Bottle)"},
                {val:"CAN", label:"Plechovka (Tin / Can)"}
              ])}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Hmotnost (kg)</Label>
                <Input 
                  type="number" 
                  value={polPasteWeight} 
                  onChange={(e) => setPolPasteWeight(e.target.value)} 
                  className="h-8 bg-background" 
                  placeholder="Např. 1" 
                />
              </div>
            </>
          )}

          {polSub === 'vosk' && (
            <>
              {renderSelect("Název vosku", polWaxName, setPolWaxName, [
                {val:"uv_shield", label:"UV shield"},
                {val:"flash_touch", label:"Flash Touch"}
              ])}
              {renderSelect("Skupenství", polWaxState, setPolWaxState, [
                {val:"tekuty_vosk", label:"Tekutý vosk"},
                {val:"pasta", label:"Pasta"}
              ])}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Hmotnost (kg)</Label>
                <Input 
                  type="number" 
                  value={polWaxQty} 
                  onChange={(e) => setPolWaxQty(e.target.value)} 
                  className="h-8 bg-background" 
                  placeholder="Např. 1" 
                />
              </div>
            </>
          )}

          {polSub === 'brusne_kotouce' && (
            <>
              {renderSelect("Typ kotouče", polDiscType, setPolDiscType, [
                {val:"vlneny", label:"Vlněný"},
                {val:"pena", label:"Pěnový (Pěna)"}
              ])}

              {polDiscType === 'vlneny' && (
                <>
                  {renderSelect("Kód kotouče (Pasta)", polDiscCode, setPolDiscCode, [
                    {val:"ST1Y", label:"ST1 Y (pro pastu Rex – žlutý)"},
                    {val:"SL3", label:"SL3 (pro pastu Perla 15)"},
                    {val:"UNI", label:"UNI – vlnové koule (universal)"}
                  ])}
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Průměr (mm)</Label>
                    <Input 
                      type="number" 
                      value={polDiscDia} 
                      onChange={(e) => setPolDiscDia(e.target.value)} 
                      className="h-8 bg-background" 
                      placeholder="Např. 160" 
                    />
                  </div>
                </>
              )}

              {polDiscType === 'pena' && (
                <>
                  {renderSelect("Kód kotouče", polDiscCode, setPolDiscCode, [
                    {val:"DA03", label:"DA03"}
                  ])}
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Průměr (mm)</Label>
                    <Input 
                      type="number" 
                      value={polDiscDia} 
                      onChange={(e) => setPolDiscDia(e.target.value)} 
                      className="h-8 bg-background" 
                      placeholder="Např. 160" 
                    />
                  </div>
                </>
              )}
            </>
          )}

          {polSub === 'prislusenstvi' && (
            <>
              {renderSelect("Typ příslušenství", polAccType, setPolAccType, [
                {val:"backplate", label:"Backplate"}
              ])}
              {renderSelect("Vlastnost", polAccProp, setPolAccProp, [
                {val:"rigid", label:"Rigidní (rigid)"},
                {val:"flexible", label:"Flexibilní (flexible)"}
              ])}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Průměr (mm)</Label>
                <Input 
                  type="number" 
                  value={polAccDia} 
                  onChange={(e) => setPolAccDia(e.target.value)} 
                  className="h-8 bg-background" 
                  placeholder="Např. 150" 
                />
              </div>
            </>
          )}
        </>
      )) : kategorieId === 'spojovaci_material' ? renderGeneratorWrapper("Spojovací materiál pro kompozity", (
        <>
          {renderSelect("Typ spoje", fasType, setFasType, [{val:"BFAST", label:"BFAST (Nalepovací)"}, {val:"RNUT", label:"RNUT (Nýtovací matice)"}, {val:"INSRT", label:"INSRT (Zálitek)"}])}
          {renderSelect("Základna/Typ", fasBase, setFasBase, [{val:"STUD", label:"Závit. tyč"}, {val:"NUT", label:"Matice"}, {val:"PERF", label:"Děrovaná zákl."}, {val:"HEX", label:"Šestihran"}])}
          <div className="space-y-2"><Label className="text-xs text-muted-foreground">Závit (např. M8)</Label><Input value={fasSize} onChange={(e) => setFasSize(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))} className="h-8 bg-background" placeholder="M8" /></div>
          {renderSelect("Materiál", fasMat, setFasMat, [{val:"A2", label:"A2 (Nerez)"}, {val:"A4", label:"A4 (Nerez moř.)"}, {val:"STL", label:"Ocel Pozink"}, {val:"ALU", label:"Hliník"}])}
        </>
      )) : kategorieId === 'naradi' ? renderGeneratorWrapper("Nářadí (Tools)", (
        <>
          {renderSelect("Podkategorie", toolSub, setToolSub, [
            {val:"BU", label:"BU (Breach unit)"},
            {val:"QR", label:"QR (Quick release)"},
            {val:"SQ", label:"SQ (Squeezer)"},
            {val:"V", label:"V (VAC checker)"},
            {val:"CU", label:"CU (Cleaning unit)"},
            {val:"SU", label:"SU (Spinner unit)"}
          ])}

          {toolSub === 'BU' && (
            <>
              {renderSelect("Průměr (kov)", toolBuPrumer, setToolBuPrumer, [
                {val:"50", label:"50 mm"},
                {val:"75", label:"75 mm"}
              ])}
            </>
          )}

          {toolSub === 'QR' && (
            <>
              {renderSelect("Typ připojení", toolQrTyp, setToolQrTyp, [
                {val:"PLUG", label:"PLUG (Samec)"},
                {val:"SOCKET", label:"SOCKET (Samice)"}
              ])}
              {renderSelect("Materiál", toolQrMat, setToolQrMat, [
                {val:"BRS", label:"Mosaz (brass)"},
                {val:"STL", label:"Ocel (steel)"},
                {val:"SS", label:"Nerez (stainless steel)"}
              ])}
            </>
          )}

          {toolSub === 'SQ' && (
            <>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Průměr (mm)</Label>
                <Input 
                  type="number" 
                  value={toolSqPrumer} 
                  onChange={(e) => setToolSqPrumer(e.target.value)} 
                  className="h-8 bg-background" 
                />
              </div>
            </>
          )}

          {toolSub === 'V' && (
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Identifikátor (volný text)</Label>
              <Input
                value={toolVId}
                onChange={(e) => setToolVId(e.target.value)}
                className="h-8 bg-background"
                placeholder="Např. ANALOG, DIGITAL, WIKA..."
              />
            </div>
          )}

          {toolSub === 'CU' && (
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Objem (litry)</Label>
              <Input 
                type="number" 
                value={toolCuVolume} 
                onChange={(e) => setToolCuVolume(e.target.value)} 
                className="h-8 bg-background" 
                placeholder="Např. 10"
              />
            </div>
          )}

          {toolSub === 'SU' && (
            <div className="text-xs text-muted-foreground italic p-2 bg-zinc-950/30 rounded border border-zinc-800/50">
              Spinner unit Spin RST5 (konfigurovaný model, nevyžaduje dodatečné parametry).
            </div>
          )}
        </>
      )) : kategorieId === 'consumables' ? renderGeneratorWrapper("Spotřební materiál (Consumables)", (
        <>
          {renderSelect("Podkategorie", conSub, setConSub, [
            {val:"BF", label:"BF (Vakuová fólie)"},
            {val:"RF", label:"RF (Separační fólie)"},
            {val:"PP", label:"PP (Strhávací tkanina)"},
            {val:"PP-PTFE", label:"PP-PTFE (Teflonová strhávací tkanina)"},
            {val:"BC", label:"BC (Odsávací netkaná textilie)"},
            {val:"ST", label:"ST (Těsnící páska)"},
            {val:"FT", label:"FT (Flash tape páska)"},
            {val:"FM", label:"FM (Distribuční síťka)"},
            {val:"FCH", label:"FCH (Distribuční kanálek)"},
            {val:"TUBE", label:"TUBE (Hadice)"},
            {val:"K", label:"K (Konektory a fitinky)"},
            {val:"MTI", label:"MTI"},
            {val:"KP", label:"KP (Konektor průchodný)"}
          ])}
          
          {conSub === 'BF' && (
            <>
              {renderSelect("Formát", conBfFormat, setConBfFormat, [
                {val:"TUBE", label:"TUBE (Tubus)"},
                {val:"SHT", label:"SHT (Fólie plochá)"},
                {val:"VSHT", label:"VSHT (Fólie V-sklad)"},
                {val:"GSC", label:"GSC (Harmonika)"}
              ])}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Tloušťka (µm)</Label>
                <Input type="number" value={conBfTloustka} onChange={(e) => setConBfTloustka(e.target.value)} className="h-8 bg-background" />
              </div>
              {renderSelect("Teplotní třída", conBfTemp, setConBfTemp, [
                {val:"LT", label:"LT (Low Temp)"},
                {val:"HT", label:"HT (High Temp)"}
              ])}
            </>
          )}

          {conSub === 'RF' && (
            <>
              {renderSelect("Perforace", conRfPerf, setConRfPerf, [
                {val:"NP", label:"NP (Neperforovaná)"},
                {val:"P3", label:"P3 (Perforace P3)"},
                {val:"P6", label:"P6 (Perforace P6)"},
                {val:"P16", label:"P16 (Perforace P16)"},
                {val:"P31", label:"P31 (Perforace P31)"}
              ])}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Tloušťka (µm)</Label>
                <Input type="number" value={conRfTloustka} onChange={(e) => setConRfTloustka(e.target.value)} className="h-8 bg-background" />
              </div>
              {renderSelect("Teplotní odolnost", conRfTemp, setConRfTemp, [
                {val:"LT120", label:"LT120 (120 °C)"},
                {val:"LT150", label:"LT150 (150 °C)"},
                {val:"HT230", label:"HT230 (230 °C)"},
                {val:"HT260", label:"HT260 (260 °C)"}
              ])}
            </>
          )}

          {conSub === 'PP' && (
            <>
              {renderSelect("Polymer", conPpPolymer, setConPpPolymer, [
                {val:"PE", label:"PE (Polyethylen)"},
                {val:"PA66", label:"PA66 (Polyamid 6.6)"}
              ])}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Gramáž (g/m²)</Label>
                <Input type="number" value={conPpGramaz} onChange={(e) => setConPpGramaz(e.target.value)} className="h-8 bg-background" />
              </div>
            </>
          )}

          {conSub === 'PP-PTFE' && (
            <>
              {renderSelect("Povrch / Lepivost", conPtfeAdhesive, setConPtfeAdhesive, [
                {val:"NADH", label:"NADH (Nelepící)"},
                {val:"ADH", label:"ADH (Lepící / Teflon)"}
              ])}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Tloušťka (µm)</Label>
                <Input type="number" value={conPtfeTloustka} onChange={(e) => setConPtfeTloustka(e.target.value)} className="h-8 bg-background" />
              </div>
            </>
          )}

          {conSub === 'BC' && (
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Gramáž (g/m²)</Label>
              <Input 
                type="number" 
                value={conBcGramaz} 
                onChange={(e) => setConBcGramaz(e.target.value)} 
                className="h-8 bg-background" 
              />
            </div>
          )}

          {conSub === 'ST' && (
            <>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Teplota (°C)</Label>
                <Input 
                  type="number" 
                  value={conStTemp} 
                  onChange={(e) => setConStTemp(e.target.value)} 
                  className="h-8 bg-background" 
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Šířka (mm)</Label>
                <Input type="number" value={conStSirka} onChange={(e) => setConStSirka(e.target.value)} className="h-8 bg-background" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Délka (m)</Label>
                <Input type="number" value={conStDelka} onChange={(e) => setConStDelka(e.target.value)} className="h-8 bg-background" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Počet rolí v balení</Label>
                <Input type="number" value={conStPocetRoli} onChange={(e) => setConStPocetRoli(Number(e.target.value))} className="h-8 bg-background" min={1} />
              </div>
            </>
          )}

          {conSub === 'FT' && (
            <>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Šířka (mm)</Label>
                <Input type="number" value={conFtSirka} onChange={(e) => setConFtSirka(e.target.value)} className="h-8 bg-background" />
              </div>
              {renderSelect("Teplotní třída", conFtTemp, setConFtTemp, [
                {val:"HT", label:"HT (High Temp)"},
                {val:"LT", label:"LT (Low Temp)"}
              ])}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Délka (m)</Label>
                <Input type="number" value={conFtDelka} onChange={(e) => setConFtDelka(e.target.value)} className="h-8 bg-background" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Počet rolí v balení</Label>
                <Input type="number" value={conFtPocetRoli} onChange={(e) => setConFtPocetRoli(Number(e.target.value))} className="h-8 bg-background" min={1} />
              </div>
            </>
          )}

          {conSub === 'FM' && (
            <>
              {renderSelect("Typ výroby", conFmTyp, setConFmTyp, [
                {val:"EXT", label:"EXT (Extrudovaná)"},
                {val:"WVN", label:"WVN (Pletená)"}
              ])}
              {renderSelect("Materiál", conFmMaterial, setConFmMaterial, [
                {val:"PET", label:"PET (Polyester)"},
                {val:"HDPE", label:"HDPE (Polyethylen vysokohustotní)"}
              ])}
              {renderSelect("Barva", conFmBarva, setConFmBarva, [
                {val:"CLR", label:"CLR (Čirá / Transparentní)"},
                {val:"BLK", label:"BLK (Černá)"},
                {val:"RED", label:"RED (Červená)"},
                {val:"GRN", label:"GRN (Zelená)"}
              ])}
              {renderSelect("Rychlost proudění", conFmRychlost, setConFmRychlost, [
                {val:"low", label:"Nízká (Low)"},
                {val:"medium", label:"Střední (Medium)"},
                {val:"high", label:"Vysoká (High)"}
              ])}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Tloušťka (mm)</Label>
                <Input type="number" step="0.1" value={conFmTloustka} onChange={(e) => setConFmTloustka(e.target.value)} className="h-8 bg-background" placeholder="např. 0.8" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Gramáž (g/m²)</Label>
                <Input type="number" value={conFmGramaz} onChange={(e) => setConFmGramaz(e.target.value)} className="h-8 bg-background" placeholder="např. 150" />
              </div>
              {renderSelect("Teplotní třída", conFmTeplota, setConFmTeplota, [
                {val:"LT", label:"LT (do 120 °C)"},
                {val:"HT", label:"HT (do 180 °C)"}
              ])}
              {renderSelect("Flexibilita", conFmFlexibilita, setConFmFlexibilita, [
                {val:"velka", label:"Velká"},
                {val:"mala", label:"Malá"},
                {val:"zadna", label:"Žádná"}
              ])}
            </>
          )}

          {conSub === 'FCH' && (
            <>
              {renderSelect("Typ kanálku", conFchSubtyp, setConFchSubtyp, [
                {val:"TAPE", label:"TAPE (Páskový / Plochý)"},
                {val:"SPRL", label:"SPRL (Spirálová hadice)"},
                {val:"OMEGA", label:"OMEGA (Omega profil)"}
              ])}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Teplota (°C)</Label>
                <Input 
                  type="number" 
                  value={conFchTemp} 
                  onChange={(e) => setConFchTemp(e.target.value)} 
                  className="h-8 bg-background" 
                />
              </div>
              
              {conFchSubtyp === 'TAPE' && (
                <>
                  {renderSelect("Materiál", conFchMaterial, setConFchMaterial, [
                    {val:"PET", label:"PET (Polyester)"},
                    {val:"HDPE", label:"HDPE (Polyethylen vysokohustotní)"}
                  ])}
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Šířka (mm)</Label>
                    <Input type="number" value={conFchSirka} onChange={(e) => setConFchSirka(e.target.value)} className="h-8 bg-background" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Výška (mm)</Label>
                    <Input type="number" value={conFchVyska} onChange={(e) => setConFchVyska(e.target.value)} className="h-8 bg-background" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Délka (m)</Label>
                    <Input type="number" value={conFchDelka} onChange={(e) => setConFchDelka(e.target.value)} className="h-8 bg-background" />
                  </div>
                </>
              )}

              {conFchSubtyp === 'SPRL' && (
                <>
                  {renderSelect("Materiál", conFchMaterial, setConFchMaterial, [
                    {val:"PET", label:"PET (Polyester)"},
                    {val:"HDPE", label:"HDPE (Polyethylen vysokohustotní)"}
                  ])}
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Vnitřní průměr (mm)</Label>
                    <Input type="number" value={conFchPrumer} onChange={(e) => setConFchPrumer(e.target.value)} className="h-8 bg-background" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Délka (m)</Label>
                    <Input type="number" value={conFchDelka} onChange={(e) => setConFchDelka(e.target.value)} className="h-8 bg-background" />
                  </div>
                </>
              )}

              {conFchSubtyp === 'OMEGA' && (
                <>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Vnitřní průměr (mm)</Label>
                    <Input type="number" value={conFchPrumer} onChange={(e) => setConFchPrumer(e.target.value)} className="h-8 bg-background" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Délka (m)</Label>
                    <Input type="number" value={conFchDelka} onChange={(e) => setConFchDelka(e.target.value)} className="h-8 bg-background" />
                  </div>
                </>
              )}

            </>
          )}

          {conSub === 'TUBE' && (
            <>
              {renderSelect("Materiál", conFchMaterial, setConFchMaterial, [
                {val:"PET", label:"PET (Polyester)"},
                {val:"HDPE", label:"HDPE (Polyethylen vysokohustotní)"}
              ])}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Vnitřní průměr (mm)</Label>
                <Input type="number" value={conFchPrumer} onChange={(e) => setConFchPrumer(e.target.value)} className="h-8 bg-background" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Teplota (°C)</Label>
                <Input 
                  type="number" 
                  value={conFchTemp} 
                  onChange={(e) => setConFchTemp(e.target.value)} 
                  className="h-8 bg-background" 
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Délka (m)</Label>
                <Input type="number" value={conFchDelka} onChange={(e) => setConFchDelka(e.target.value)} className="h-8 bg-background" />
              </div>
            </>
          )}

          {conSub === 'K' && (
            <>
              {renderSelect("Tvar", conKTvar, setConKTvar, [
                {val:"T", label:"T-spojka"},
                {val:"I", label:"I-spojka / Rovná"},
                {val:"L", label:"L-spojka / Koleno"}
              ])}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Vnější průměr (mm)</Label>
                <Input type="number" value={conKPrumer} onChange={(e) => setConKPrumer(e.target.value)} className="h-8 bg-background" />
              </div>
            </>
          )}

          {conSub === 'MTI' && (
            <>
              {renderSelect("Typ MTI", conMtiTyp, setConMtiTyp, [
                {val:"Hose", label:"Hose (Hadice)"},
                {val:"Valve", label:"Valve (Ventil)"},
                {val:"MVS", label:"MVS (Membrána)"},
                {val:"RBL", label:"RBL (Resin brake line)"}
              ])}
              {conMtiTyp === 'MVS' && (
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Šířka (mm)</Label>
                  <Input 
                    type="number" 
                    value={conMtiWidth} 
                    onChange={(e) => setConMtiWidth(e.target.value)} 
                    className="h-8 bg-background" 
                    placeholder="Např. 50"
                  />
                </div>
              )}
              {(conMtiTyp === 'Hose' || conMtiTyp === 'MVS' || conMtiTyp === 'RBL') && (
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Délka v roli (m)</Label>
                  <Input 
                    type="number" 
                    value={conMtiDelka} 
                    onChange={(e) => setConMtiDelka(e.target.value)} 
                    className="h-8 bg-background" 
                    placeholder="Např. 50"
                  />
                </div>
              )}
            </>
          )}

          {conSub === 'KP' && (
            <>
              {renderSelect("Tvar", conKpTvar, setConKpTvar, [
                {val:"O", label:"Kruhový (plast / plastic)"},
                {val:"T", label:"T-kus (plast / plastic)"}
              ])}
              {renderSelect("Průměr (plast)", conKpPrumer, setConKpPrumer, [
                {val:"12", label:"12 mm"},
                {val:"16", label:"16 mm"}
              ])}
            </>
          )}
        </>
      )) : (
        <div className="p-6 bg-zinc-100 dark:bg-zinc-900 border border-dashed border-zinc-300 dark:border-zinc-700 rounded-lg text-center space-y-3">
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
          </div>
          <h3 className="font-semibold text-foreground">Aktivujte Smart Generátor</h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            Pro automatické složení správného kódu (SKU) a technických parametrů vyberte nejprve <strong className="text-foreground">Kategorii</strong> nahoře ve formuláři.
          </p>
          <div className="pt-4 mt-4 border-t border-zinc-200 dark:border-zinc-800 text-left">
            <Label htmlFor="sku" className={`text-xs ${skuExists ? 'text-red-500' : 'text-muted-foreground'}`}>
              {skuExists ? 'CHYBA: Tento kód již v databázi existuje!' : 'Nebo zadejte specifický kód ručně (Nedoporučeno):'}
            </Label>
            <Input 
              id="sku" 
              className={`mt-1 ${skuExists ? 'border-red-500 ring-red-500 text-red-500' : ''}`}
              placeholder="např. MANUAL-SKU-123" 
              {...register("sku", { onChange: handleSkuChange })} 
            />
          </div>
        </div>
      )}

      {/* Dynamic Dimension Configuration for Fabrics */}
      {kategorieId === 'vyztuzne_materialy' && (
        <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg space-y-4">
          <h3 className="text-sm font-semibold text-primary border-b border-primary/20 pb-2">Konfigurace balení a rozměrů tkaniny</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Typ balení</Label>
              <Select onValueChange={(val: string | null) => setFabPackType(val || "role")} value={fabPackType}>
                <SelectTrigger className="h-9">
                  <SelectValue>
                    {fabPackType === "role" ? "Role (Roll)" :
                     fabPackType === "krabice" ? "Krabice (Box - Skládané)" :
                     fabPackType === "metraz" ? "Stříhaná metráž" : fabPackType}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="role">Role (Roll)</SelectItem>
                  <SelectItem value="krabice">Krabice (Box - Skládané)</SelectItem>
                  <SelectItem value="metraz">Stříhaná metráž</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="fabWidth" className="text-xs text-muted-foreground">Šířka (cm)</Label>
              <Input 
                id="fabWidth" 
                type="number" 
                step="1" 
                value={fabWidth} 
                onChange={(e) => setFabWidth(e.target.value)} 
                className="h-9 bg-background" 
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="fabLength" className="text-xs text-muted-foreground">Délka (m / bm)</Label>
              <Input 
                id="fabLength" 
                type="number" 
                step="0.1" 
                value={fabLength} 
                onChange={(e) => setFabLength(e.target.value)} 
                className="h-9 bg-background" 
              />
            </div>

            {fabPackType === "krabice" && (
              <div className="space-y-2">
                <Label htmlFor="fabPieces" className="text-xs text-muted-foreground">Počet kusů (přířezů)</Label>
                <Input 
                  id="fabPieces" 
                  type="number" 
                  value={fabPieces} 
                  onChange={(e) => setFabPieces(e.target.value)} 
                  className="h-9 bg-background" 
                />
              </div>
            )}
          </div>
          <div className="text-xs text-muted-foreground flex flex-wrap gap-x-6 gap-y-2 bg-primary/5 p-3 rounded border border-primary/10">
            <span>
              <strong>Vypočtená plocha:</strong> {(((parseFloat(fabWidth) || 0) / 100) * (parseFloat(fabLength) || 0) * (fabPackType === "krabice" ? (parseInt(fabPieces) || 0) : 1)).toFixed(2)} m²
            </span>
            <span>
              <strong>Výchozí měrná jednotka:</strong> m² (plocha)
            </span>
            <span>
              <strong>Jednotka balení:</strong> {fabPackType === "role" ? "role" : "ks"}
            </span>
          </div>
        </div>
      )}

      {/* Dynamic Dimension Configuration for Consumables */}
      {kategorieId === 'consumables' && ['BF', 'RF', 'PP', 'PP-PTFE', 'BC', 'FM'].includes(conSub) && (
        <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg space-y-4">
          <h3 className="text-sm font-semibold text-primary border-b border-primary/20 pb-2">Konfigurace rozměrů role spotřebního materiálu</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="conRollWidth" className="text-xs text-muted-foreground">
                {conSub === 'BF' ? "Šířka materiálu (cm)" : "Šířka role (cm)"}
              </Label>
              <Input 
                id="conRollWidth" 
                type="number" 
                step="1" 
                value={conRollWidth} 
                onChange={(e) => setConRollWidth(e.target.value)} 
                className="h-9 bg-background" 
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="conRollLength" className="text-xs text-muted-foreground">Délka role (m)</Label>
              <Input 
                id="conRollLength" 
                type="number" 
                step="0.1" 
                value={conRollLength} 
                onChange={(e) => setConRollLength(e.target.value)} 
                className="h-9 bg-background" 
              />
            </div>
          </div>
          <div className="text-xs text-muted-foreground flex flex-wrap gap-x-6 gap-y-2 bg-primary/5 p-3 rounded border border-primary/10">
            <span>
              <strong>Vypočtená plocha:</strong> {(((parseFloat(conRollWidth) || 0) / 100) * (parseFloat(conRollLength) || 0)).toFixed(2)} m²
            </span>
            <span>
              <strong>Výchozí měrná jednotka:</strong> m² (plocha)
            </span>
            <span>
              <strong>Jednotka balení:</strong> role
            </span>
          </div>
        </div>
      )}

      {/* 3. Katalogový stav a Měrná jednotka */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Stav v katalogu</Label>
          <Select onValueChange={(val: string | null) => setValue("stav_katalogu_id", val || "")} value={stavId || ""}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Vyberte stav">
                {lookups.statuses.find(s => s.id === stavId)?.nazev}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {lookups.statuses.map(s => (
                <SelectItem key={s.id} value={s.id}>{s.nazev}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Základní měrná jednotka</Label>
          <Select onValueChange={(val: string | null) => setValue("zakladni_mj_id", val || "")} value={zakladniMjId || ""}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Vyberte jednotku">
                {(() => {
                  const u = lookups.units.find(u => u.id === zakladniMjId);
                  return u ? `${u.nazev} (${u.zkratka})` : undefined;
                })()}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {lookups.units.map(u => (
                <SelectItem key={u.id} value={u.id}>{u.nazev} ({u.zkratka})</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 4. Typ labelu a Proces odeslání */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Typ labelu</Label>
          <Select onValueChange={(val: string | null) => setValue("def_typ_labelu_id", val || "")} value={labelId || ""}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Vyberte typ labelu">
                {lookups.labels.find(l => l.id === labelId)?.nazev}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {lookups.labels.map(l => (
                <SelectItem key={l.id} value={l.id}>{l.nazev}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.def_typ_labelu_id && <p className="text-xs text-destructive">{errors.def_typ_labelu_id.message}</p>}
        </div>
        <div className="space-y-2">
          <Label>Proces odeslání</Label>
          <Select onValueChange={(val: string | null) => setValue("def_proces_odeslani_id", val || "")} value={procesId || ""}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Vyberte proces">
                {lookups.processes.find(p => p.id === procesId)?.nazev}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {lookups.processes.map(p => (
                <SelectItem key={p.id} value={p.id}>{p.nazev}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.def_proces_odeslani_id && <p className="text-xs text-destructive">{errors.def_proces_odeslani_id.message}</p>}
        </div>
      </div>

      {/* 5. Skladování a Trvanlivost (Kondiciální zobrazení pro vybrané chemické/trvanlivé kategorie) */}
      {isChemicalCategory && (
        <div className="grid grid-cols-2 gap-4 p-4 bg-zinc-900/30 rounded-lg border border-zinc-800">
          <div className="space-y-2">
            <Label>Způsob skladování</Label>
            <Select onValueChange={(val: string | null) => setValue("def_typ_skladovani", val || "sklad")} value={defTypSkladovani || "sklad"}>
              <SelectTrigger>
                <SelectValue placeholder="Vyberte skladování">
                  {defTypSkladovani === "sklad" ? "Standardní sklad" : 
                   defTypSkladovani === "lednice" ? "Lednice (Chlazené)" : 
                   defTypSkladovani === "mrazak" ? "Mrazák (Mražené -18°C)" : undefined}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sklad">Standardní sklad</SelectItem>
                <SelectItem value="lednice">Lednice (Chlazené)</SelectItem>
                <SelectItem value="mrazak">Mrazák (Mražené -18°C)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="shelf_life_mesice">Shelf Life (Trvanlivost v měsících)</Label>
            <Input id="shelf_life_mesice" type="number" {...register("shelf_life_mesice")} />
          </div>
        </div>
      )}



      {/* 7. Cenotvorba a Marže */}
      <div className="p-4 bg-zinc-900/30 rounded-lg border border-zinc-800 space-y-4">
        <h3 className="text-sm font-semibold text-zinc-300 border-b border-zinc-800 pb-2">Cenotvorba a Marže (%)</h3>
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-2">
            <Label htmlFor="cilova_marze_retail_procenta">Retail Marže (B2C)</Label>
            <Input id="cilova_marze_retail_procenta" type="number" step="0.01" {...register("cilova_marze_retail_procenta")} className="bg-zinc-950 border-zinc-800" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cilova_marze_partner_procenta">Partner Marže (B2B)</Label>
            <Input id="cilova_marze_partner_procenta" type="number" step="0.01" {...register("cilova_marze_partner_procenta")} className="bg-zinc-950 border-zinc-800" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="clo_procenta">Clo (Produkt)</Label>
            <Input id="clo_procenta" type="number" step="0.01" {...register("clo_procenta")} className="bg-zinc-950 border-zinc-800" />
            <p className="text-[10px] text-zinc-500 italic">Přebije globální clo.</p>
          </div>
        </div>
      </div>

      {/* 8. Logistické balení */}
      <div className="grid grid-cols-3 gap-4 p-4 bg-muted/30 rounded-lg border border-zinc-800">
        <div className="space-y-2">
          <Label htmlFor="mnozstvi_v_baleni">Počet kusů v balení</Label>
          <div className="flex items-center gap-2">
            <Input 
              id="mnozstvi_v_baleni" 
              type="number" 
              step="any" 
              readOnly={isPackagingLocked}
              className={isPackagingLocked ? "bg-muted text-muted-foreground border-zinc-850" : ""}
              value={(() => {
                const val = parseFloat(String(mnozstviVBaleni)) || 0
                return packagingMultiplier > 1 ? Number((val / packagingMultiplier).toFixed(2)) : val
              })()}
              onChange={(e) => {
                const displayVal = parseFloat(e.target.value) || 0
                const dbVal = displayVal * packagingMultiplier
                setValue("mnozstvi_v_baleni", dbVal, { shouldValidate: true, shouldDirty: true })
              }}
            />
            <span className="text-xs font-semibold text-zinc-400 min-w-[24px]">
              {lookups.units.find(u => u.id === jednotkaBaleniId)?.zkratka}
            </span>
          </div>
          {packageExplanation && (
            <p className="text-[10px] text-zinc-400 italic mt-1 font-medium bg-zinc-900/40 px-1.5 py-0.5 rounded border border-zinc-800/60 block">
              {packageExplanation}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label>Jednotka balení</Label>
          <Select 
            onValueChange={(val: string | null) => setValue("jednotka_baleni_id", val || "")} 
            value={jednotkaBaleniId || ""}
            disabled={isPackagingLocked}
          >
            <SelectTrigger className={`w-full ${isPackagingLocked ? "bg-muted text-muted-foreground opacity-90 cursor-not-allowed" : ""}`}>
              <SelectValue placeholder="Vyberte jednotku">
                {lookups.units.find(u => u.id === jednotkaBaleniId)?.zkratka}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {lookups.units.map(u => (
                <SelectItem key={u.id} value={u.id}>{u.zkratka}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="hmotnost_baliku_kg">Hmotnost balíku (kg)</Label>
            <div className="flex items-center gap-1.5">
              {isWeightOverridden ? (
                <>
                  <span className="text-[10px] bg-amber-500/20 text-amber-400 border border-amber-500/30 px-1.5 py-0.5 rounded font-medium">Přepsáno ⚠️</span>
                  <button
                    type="button"
                    onClick={() => {
                      setIsWeightOverridden(false)
                      if (autoWeight.weightKg !== null) setValue("hmotnost_baliku_kg", autoWeight.weightKg as any)
                    }}
                    className="text-[10px] text-zinc-400 hover:text-primary flex items-center gap-1"
                    title={`Vrátit na ${autoWeight.weightKg} kg`}
                  >
                    <RotateCcw className="h-3 w-3" /> Reset
                  </button>
                </>
              ) : (
                <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.5 rounded font-medium flex items-center gap-1">
                  <Sparkles className="h-2.5 w-2.5" /> Auto
                </span>
              )}
            </div>
          </div>
          <Input
            id="hmotnost_baliku_kg"
            type="number"
            step="0.01"
            {...register("hmotnost_baliku_kg")}
            onChange={(e) => {
              register("hmotnost_baliku_kg").onChange(e)
              setIsWeightOverridden(true)
            }}
          />
          <div className="flex items-center space-x-2 mt-1 mb-3">
            <input
              type="checkbox"
              id="hmotnost_zafixovana"
              {...register("hmotnost_zafixovana")}
              className="h-3.5 w-3.5 rounded border-zinc-700 bg-zinc-800 text-primary focus:ring-primary cursor-pointer"
            />
            <Label htmlFor="hmotnost_zafixovana" className="text-[11px] text-zinc-400 cursor-pointer select-none flex items-center gap-1 hover:text-zinc-300">
              Zafixovat hmotnost (chránit před hromadným přepočtem) 🔒
            </Label>
          </div>
          
          <div className="pt-2 border-t border-zinc-800 space-y-1.5">
            <Label className="text-xs text-zinc-300">Vlastní hmotnost pro 1 MJ (kg)</Label>
            <Input
              type="number"
              step="0.001"
              placeholder="Např. 0.05"
              className="h-8 bg-zinc-900/50 text-sm"
              value={customHmotnostMj}
              onChange={(e) => setCustomHmotnostMj(e.target.value)}
            />
            <p className="text-[10px] text-zinc-500 leading-tight">
              Pokud je tato hodnota vyplněna, ignoruje se standardní výpočet a hmotnost balíku se vypočítá jako: <br/> 
              <span className="text-zinc-400 font-mono">Vlastní hmotnost × Množství v balení</span> + obal.
            </p>
          </div>
          {estimatedNetWeight > 0 && Number(hmotnostBaliku) > 0 && Number(hmotnostBaliku) < (estimatedNetWeight - 0.05) && (
            <p className="text-[11px] text-red-400 font-medium mt-1 flex items-center gap-1">
              ⚠️ Fyzikální paradox: Váha balíku ({Number(hmotnostBaliku).toFixed(2)} kg) je nižší než čistá váha produktu ({estimatedNetWeight.toFixed(2)} kg)!
            </p>
          )}
          {autoWeight.weightKg !== null && (
            <div className="text-[10px] text-zinc-500 space-y-0.5">
              <p className="text-zinc-400">💡 {autoWeight.breakdown}</p>
              <p className="flex items-center gap-1">
                Přesnost:
                <span className={`font-medium ${
                  autoWeight.confidence === 'high' ? 'text-emerald-400' :
                  autoWeight.confidence === 'medium' ? 'text-amber-400' : 'text-red-400'
                }`}>
                  {autoWeight.confidence === 'high' ? '●●● Vysoká' :
                   autoWeight.confidence === 'medium' ? '●●○ Střední' : '●○○ Nízká'}
                </span>
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 8b. Balicí profil a rozměry zásilky (v2 Shipping Engine) */}
      <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-lg space-y-4">
        <div className="flex items-center gap-2 border-b border-zinc-800 pb-2">
          <Package className="h-4 w-4 text-primary" />
          <h4 className="text-sm font-bold text-zinc-200">Balicí profil a rozměry zásilky</h4>
        </div>

        <div className="flex flex-col gap-4">
          {(activeProfile || (overrideDelka && overrideSirka && overrideVyska)) && (
            <div className="p-3 bg-zinc-900/50 border border-zinc-800 rounded-lg space-y-2 text-xs max-w-md">
              <span className="font-bold text-zinc-300 block">Vypočtené rozměry (Live):</span>
              <div className="grid grid-cols-3 gap-2 font-mono text-center text-white">
                <div className="bg-zinc-950 p-1.5 rounded border border-zinc-850">
                  <span className="block text-[9px] text-zinc-500 uppercase">Délka</span>
                  <span>{calculatedPackage.delka_cm} cm</span>
                </div>
                <div className="bg-zinc-950 p-1.5 rounded border border-zinc-850">
                  <span className="block text-[9px] text-zinc-500 uppercase">Šířka</span>
                  <span>{calculatedPackage.sirka_cm} cm</span>
                </div>
                <div className="bg-zinc-950 p-1.5 rounded border border-zinc-850">
                  <span className="block text-[9px] text-zinc-500 uppercase">Výška</span>
                  <span>{calculatedPackage.vyska_cm} cm</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-zinc-900 pt-3 space-y-2">
          <Label className="text-xs uppercase font-bold text-zinc-500 tracking-wider">
            Manuální přepsání rozměrů balíku (Override)
          </Label>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label className="text-[10px] text-zinc-400">Vlastní délka (cm)</Label>
              <Input 
                type="number"
                placeholder="Délka"
                className="bg-zinc-900 border-zinc-850 text-xs h-8 text-zinc-200"
                {...register("balik_delka_cm_override")}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] text-zinc-400">Vlastní šířka (cm)</Label>
              <Input 
                type="number"
                placeholder="Šířka"
                className="bg-zinc-900 border-zinc-850 text-xs h-8 text-zinc-200"
                {...register("balik_sirka_cm_override")}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] text-zinc-400">Vlastní výška (cm)</Label>
              <Input 
                type="number"
                placeholder="Výška"
                className="bg-zinc-900 border-zinc-850 text-xs h-8 text-zinc-200"
                {...register("balik_vyska_cm_override")}
              />
            </div>
          </div>
          <p className="text-[10px] text-zinc-500 italic">
            Použijte pouze v případě, že se tento konkrétní produkt liší od standardních rozměrů balicího profilu.
          </p>
        </div>
      </div>

      {/* 8c. Poznámka k produktu */}
      <div className="space-y-2">
        <Label htmlFor="poznamka">Poznámka k produktu</Label>
        <Textarea 
          id="poznamka" 
          placeholder="Zadejte libovolnou interní poznámku k produktu..." 
          className="bg-zinc-950 border-zinc-800"
          {...register("poznamka")}
        />
      </div>

      {/* 9. Technické specifikace (JSON) */}
      <div className="space-y-2">
        <Label htmlFor="specifikace_json">Technické specifikace (Data pro filtry e-shopu)</Label>
        <Textarea 
          id="specifikace_json" 
          placeholder='{"vazba": "Twill 2/2", "gramaz": 200}' 
          className={`font-mono text-xs h-24 ${kategorieId && kategorieId !== '' && kategorieId !== 'draft' ? 'bg-muted/50 text-muted-foreground' : ''}`}
          readOnly={kategorieId === 'vyztuzne_materialy' || kategorieId === 'prepregy' || kategorieId === 'pryskyrice' || kategorieId === 'lepidla' || kategorieId === 'spotrebni_chemie' || kategorieId === 'cores_standard' || kategorieId === 'cores_active' || kategorieId === 'brouseni_a_lesteni' || kategorieId === 'spojovaci_material' || kategorieId === 'naradi' || kategorieId === 'consumables' || kategorieId === 'chemie'}
          {...register("specifikace_json")}
        />
        <p className="text-[10px] text-muted-foreground italic">
          {kategorieId === 'vyztuzne_materialy' || kategorieId === 'prepregy' || kategorieId === 'pryskyrice' || kategorieId === 'lepidla' || kategorieId === 'spotrebni_chemie' || kategorieId === 'cores_standard' || kategorieId === 'cores_active' || kategorieId === 'brouseni_a_lesteni' || kategorieId === 'spojovaci_material' || kategorieId === 'naradi' || kategorieId === 'consumables' || kategorieId === 'chemie'
            ? "Tato data jsou generována automaticky z vašeho výběru nahoře a nelze je upravovat ručně."
            : "Zadejte ve formátu { \"vlastnost\": \"hodnota\" } pro kategorie bez generátoru."}
        </p>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel}>
          Zrušit
        </Button>
        <Button type="submit" disabled={isSubmitting || skuExists}>
          {isSubmitting ? "Ukládám..." : initialData ? "Uložit změny" : "Vytvořit produkt"}
        </Button>
      </div>
    </form>
  )
}

function areSpecsEqual(a: any, b: any): boolean {
  if (!a || !b) return false
  const keysA = Object.keys(a)
  const keysB = Object.keys(b)
  if (keysA.length !== keysB.length) return false

  const normalize = (val: any) => {
    if (typeof val === 'string') {
      return val.toLowerCase().replace(/\s+/g, '').replace(/(ml|l|kg|ks|m|cm|mm|role|bm)$/i, '')
    }
    if (typeof val === 'number') {
      return String(val)
    }
    return val
  }

  for (const key of keysA) {
    if (Array.isArray(a[key]) && Array.isArray(b[key])) {
      const normA = a[key].map(normalize)
      const normB = b[key].map(normalize)
      if (JSON.stringify(normA) !== JSON.stringify(normB)) return false
    } else {
      if (normalize(a[key]) !== normalize(b[key])) return false
    }
  }
  return true
}
