"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"

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

interface ProductFormProps {
  initialData?: Product
  lookups: {
    categories: any[]
    units: any[]
    statuses: any[]
    labels: any[]
    processes: any[]
  }
  onSubmit: (data: ProductFormValues) => Promise<void>
  isSubmitting: boolean
  onCancel: () => void
}

export function ProductForm({ initialData, lookups, onSubmit, isSubmitting, onCancel }: ProductFormProps) {
  const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema) as any,
    defaultValues: {
      sku: initialData?.sku || "",
      nazev: initialData?.nazev || "",
      kategorie_id: initialData?.kategorie_id || "",
      zakladni_mj_id: initialData?.zakladni_mj_id || "m2",
      jednotka_baleni_id: initialData?.jednotka_baleni_id || "bm",
      stav_katalogu_id: initialData?.stav_katalogu_id || "draft",
      def_typ_skladovani: initialData?.def_typ_skladovani || "sklad",
      mnozstvi_v_baleni: initialData?.mnozstvi_v_baleni || 1,
      hmotnost_baliku_kg: initialData?.hmotnost_baliku_kg || 0,
      shelf_life_mesice: initialData?.shelf_life_mesice || 0,
      def_proces_odeslani_id: initialData?.def_proces_odeslani_id || "",
      def_typ_labelu_id: initialData?.def_typ_labelu_id || "",
      specifikace_json: initialData?.specifikace ? JSON.stringify(initialData.specifikace, null, 2) : "{}",
      min_skladova_zasoba: initialData?.min_skladova_zasoba || 0,
      opt_skladova_zasoba: initialData?.opt_skladova_zasoba || 0,
      cilova_marze_retail_procenta: initialData?.cilova_marze_retail_procenta || 30,
      cilova_marze_partner_procenta: initialData?.cilova_marze_partner_procenta || 20,
      clo_procenta: initialData?.clo_procenta || 0,
    }
  })

  const kategorieId = watch("kategorie_id")
  const zakladniMjId = watch("zakladni_mj_id")
  const jednotkaBaleniId = watch("jednotka_baleni_id")
  const stavId = watch("stav_katalogu_id")
  const labelId = watch("def_typ_labelu_id")
  const procesId = watch("def_proces_odeslani_id")
  const defTypSkladovani = watch("def_typ_skladovani")
  const currentSku = watch("sku")

  // Live Validation State
  const [skuExists, setSkuExists] = useState(false)

  // --- Omni-Generator State ---
  const specs = (initialData?.specifikace as any) || {}
  // Fabrics
  const [fabMat, setFabMat] = useState(specs.materiál || "CF")
  const [fabForm, setFabForm] = useState(specs.typ || "WF")
  const [fabWeight, setFabWeight] = useState(String(specs.gramáž || "200"))
  const [fabTow, setFabTow] = useState(specs.vlákno || "3K")
  const [fabWeave, setFabWeave] = useState(specs.vazba || "T22")
  const [fabUse, setFabUse] = useState(specs.použití || "E") // Economy, Visual, Industry (E, V, I)
  const [fabBrand, setFabBrand] = useState(specs.výrobce_vlákna && specs.materiál !== "HF" ? specs.výrobce_vlákna : "TO")

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

  // Fabric Packaging & Dimensions
  const [fabPackType, setFabPackType] = useState<string>(specs.typ_baleni || "role") // role, krabice, metraz
  const [fabWidth, setFabWidth] = useState<string>(specs.sirka_m !== undefined ? String(specs.sirka_m) : "1.25")
  const [fabLength, setFabLength] = useState<string>(specs.delka_m !== undefined ? String(specs.delka_m) : "100")
  const [fabPieces, setFabPieces] = useState<string>(specs.pocet_kusu !== undefined ? String(specs.pocet_kusu) : "10")
  // Prepregs
  const [prepBase, setPrepBase] = useState(specs.base_materiál || "CF")
  const [prepWeight, setPrepWeight] = useState(String(specs.gramáž || "300"))
  const [prepResin, setPrepResin] = useState(specs.pryskyřice || "EPX")
  // Chemicals (Resins, Adhesives)
  const [chemType, setChemType] = useState(specs.typ || "RES")
  const [chemBase, setChemBase] = useState(specs.chemie || "EP")
  const [chemVariant, setChemVariant] = useState(specs.varianta || "MED")
  const [chemColor, setChemColor] = useState(specs.barva_id || "CLR")
  // Cleaners
  const [clnBrand, setClnBrand] = useState(specs.značka || "RST5")
  const [clnPack, setClnPack] = useState(specs.balení || "5L")
  // Cores
  const [coreMat, setCoreMat] = useState(specs.materiál || "PVC")
  const [coreDens, setCoreDens] = useState(String(specs.hustota_kgm3 || "80"))
  const [coreThick, setCoreThick] = useState(specs.tloušťka || "10MM")
  const [coreFinish, setCoreFinish] = useState(specs.úprava || "PL")
  // Polish/Abrasives
  const [polBrand, setPolBrand] = useState(specs.značka || "REX")
  const [polCont, setPolCont] = useState(specs.obal || "CAN")
  const [polSize, setPolSize] = useState(specs.velikost || "1KG")
  // Fasteners (Spojovací materiál pro kompozity)
  const [fasType, setFasType] = useState(specs.typ_spoje || "BFAST") // Bonding Fastener
  const [fasBase, setFasBase] = useState(specs.zakladna || "STUD") // Závitová tyč / Matice
  const [fasSize, setFasSize] = useState(specs.zavit_prumer || "M8")
  const [fasMat, setFasMat] = useState(specs.material || "A4")
  // Tools (Nářadí)
  const [toolSub, setToolSub] = useState(specs.podkategorie || "BU")
  const [toolId, setToolId] = useState(specs.identifikátor || "50MM")
  // Consumables (Spotřební materiál)
  const [conSub, setConSub] = useState(specs.podkategorie || "BF")
  const [conId, setConId] = useState(specs.identifikátor || "50MM")

  useEffect(() => {
    let generatedSku = ""
    let generatedSpecs = {}

    switch (kategorieId) {
      case 'vyztuzne_materialy':
        const w = parseFloat(fabWidth) || 0
        const l = parseFloat(fabLength) || 0
        const pcs = parseInt(fabPieces) || 0
        let area = 0
        let uom = "role"

        if (fabPackType === "role") {
          area = w * l
          uom = "role"
        } else if (fabPackType === "krabice") {
          area = w * l * pcs
          uom = "ks"
        } else {
          area = w * l
          uom = "ks"
        }

        setValue("mnozstvi_v_baleni", parseFloat(area.toFixed(2)), { shouldValidate: true })
        setValue("jednotka_baleni_id", uom, { shouldValidate: true })

        if (fabMat === "HF") {
          generatedSku = `${fabForm}-${fabMat1}${fabMat2}-${fabWeight}-${fabTow}-${fabWeave}-${fabUse}-${fabBrand1}${fabBrand2}`
          generatedSpecs = {
            typ: fabForm,
            materiál: fabMat,
            materiál_složení: [fabMat1, fabMat2],
            gramáž: parseInt(fabWeight) || 0,
            vlákno: fabTow,
            vazba: fabWeave,
            použití: fabUse,
            výrobce_vlákna: `${fabBrand1}${fabBrand2}`,
            výrobci_složení: [fabBrand1, fabBrand2],
            typ_baleni: fabPackType,
            sirka_m: w,
            delka_m: l,
            ...(fabPackType === "krabice" ? { pocet_kusu: pcs } : {})
          }
        } else {
          generatedSku = `${fabForm}-${fabMat}-${fabWeight}-${fabTow}-${fabWeave}-${fabUse}-${fabBrand}`
          generatedSpecs = { 
            typ: fabForm, 
            materiál: fabMat, 
            gramáž: parseInt(fabWeight) || 0, 
            vlákno: fabTow, 
            vazba: fabWeave, 
            použití: fabUse, 
            výrobce_vlákna: fabBrand,
            typ_baleni: fabPackType,
            sirka_m: w,
            delka_m: l,
            ...(fabPackType === "krabice" ? { pocet_kusu: pcs } : {})
          }
        }
        break;
      case 'prepregy':
        generatedSku = `PP-${prepBase}-${prepWeight}-${prepResin}`
        generatedSpecs = { base_materiál: prepBase, gramáž: parseInt(prepWeight) || 0, pryskyřice: prepResin }
        break;
      case 'pryskyrice':
      case 'lepidla':
        generatedSku = `${chemType}-${chemBase}-${chemVariant}-${chemColor}`
        generatedSpecs = { typ: chemType, chemie: chemBase, varianta: chemVariant, barva_id: chemColor }
        break;
      case 'spotrebni_chemie':
        generatedSku = `CLN-${clnBrand}-${clnPack}`
        generatedSpecs = { značka: clnBrand, balení: clnPack }
        break;
      case 'cores_standard':
      case 'cores_active':
        const prefix = kategorieId === 'cores_active' ? 'ACT' : 'COR'
        generatedSku = `${prefix}-${coreMat}-${coreDens}-${coreThick}-${coreFinish}`
        generatedSpecs = { materiál: coreMat, hustota_kgm3: parseInt(coreDens) || 0, tloušťka: coreThick, úprava: coreFinish }
        break;
      case 'brouseni_a_lesteni':
        generatedSku = `POL-${polBrand}-${polCont}-${polSize}`
        generatedSpecs = { značka: polBrand, obal: polCont, velikost: polSize }
        break;
      case 'spojovaci_material':
        generatedSku = `FAS-${fasType}-${fasBase}-${fasSize}-${fasMat}`
        generatedSpecs = { typ_spoje: fasType, zakladna: fasBase, zavit_prumer: fasSize, material: fasMat }
        break;
      case 'naradi':
        generatedSku = `TOL-${toolSub}-${toolId}`
        generatedSpecs = { podkategorie: toolSub, identifikátor: toolId }
        break;
      case 'consumables':
        generatedSku = `CON-${conSub}-${conId}`
        generatedSpecs = { podkategorie: conSub, identifikátor: conId }
        break;
      default:
        return;
    }

    if (generatedSku) {
      setValue("sku", generatedSku, { shouldValidate: true })
      setValue("specifikace_json", JSON.stringify(generatedSpecs, null, 2))
    }
  }, [kategorieId, fabMat, fabForm, fabWeight, fabTow, fabWeave, fabUse, fabBrand, fabMat1, fabMat2, fabBrand1, fabBrand2, fabPackType, fabWidth, fabLength, fabPieces, prepBase, prepWeight, prepResin, chemType, chemBase, chemVariant, chemColor, clnBrand, clnPack, coreMat, coreDens, coreThick, coreFinish, polBrand, polCont, polSize, fasType, fasBase, fasSize, fasMat, toolSub, toolId, conSub, conId, setValue])

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
        case 'pryskyrice':
        case 'lepidla':
          setValue("zakladni_mj_id", "kg")
          setValue("jednotka_baleni_id", "ks")
          setValue("mnozstvi_v_baleni", 1)
          break
        case 'spotrebni_chemie':
          setValue("zakladni_mj_id", "l")
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
      } else if (catId === 'spotrebni_chemie') {
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
        <SelectTrigger className="h-8">
          <SelectValue>
            {options.find(o => o.val === value)?.label}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {options.map(o => <SelectItem key={o.val} value={o.val}>{o.label}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  )

  const isChemicalCategory = kategorieId === 'prepregy' || kategorieId === 'pryskyrice' || kategorieId === 'lepidla' || kategorieId === 'spotrebni_chemie';

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      
      {/* 1. Hlavní klasifikace (Kategorie a Název) */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Kategorie</Label>
          <Select onValueChange={handleCategoryChange} value={kategorieId || ""}>
            <SelectTrigger>
              <SelectValue placeholder="Vyberte kategorii">
                {lookups.categories.find(c => c.id === kategorieId)?.nazev}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {lookups.categories.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.nazev}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.kategorie_id && <p className="text-xs text-destructive">{errors.kategorie_id.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="nazev">Název produktu</Label>
          <Input id="nazev" placeholder="Carbon 200g Twill" {...register("nazev")} />
          {errors.nazev && <p className="text-xs text-destructive">{errors.nazev.message}</p>}
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
            {val:"BF", label:"BF (Bio)"},
            {val:"OF", label:"OF (Other)"}
          ])}
          {fabMat === "HF" && (
            <>
              {renderSelect("Materiál 1", fabMat1, setFabMat1, [
                {val:"CF", label:"CF (Carbon)"},
                {val:"GF", label:"GF (Glass)"},
                {val:"AF", label:"AF (Aramid)"},
                {val:"BF", label:"BF (Bio)"},
                {val:"OF", label:"OF (Other)"}
              ])}
              {renderSelect("Materiál 2", fabMat2, setFabMat2, [
                {val:"CF", label:"CF (Carbon)"},
                {val:"GF", label:"GF (Glass)"},
                {val:"AF", label:"AF (Aramid)"},
                {val:"BF", label:"BF (Bio)"},
                {val:"OF", label:"OF (Other)"}
              ])}
            </>
          )}
          <div className="space-y-2"><Label className="text-xs text-muted-foreground">Gramáž (g)</Label><Input type="number" value={fabWeight} onChange={(e) => setFabWeight(e.target.value)} className="h-8 bg-background" /></div>
          {renderSelect("Vlákno", fabTow, setFabTow, [{val:"1K", label:"1K"}, {val:"3K", label:"3K"}, {val:"6K", label:"6K"}, {val:"12K", label:"12K"}, {val:"NA", label:"N/A"}])}
          {renderSelect("Vazba", fabWeave, setFabWeave, [{val:"P", label:"P (Plain)"}, {val:"T22", label:"T22 (Twill)"}, {val:"T44", label:"T44 (Twill)"}])}
          {renderSelect("Použití", fabUse, setFabUse, [{val:"E", label:"E (Economy)"}, {val:"V", label:"V (Visual)"}, {val:"I", label:"I (Industry)"}])}
          {fabMat === "HF" ? (
            <>
              {renderSelect("Výrobce 1", fabBrand1, setFabBrand1, [
                {val:"ZH", label:"ZH (Zhongfu)"},
                {val:"TN", label:"TN (Tenax)"},
                {val:"TA", label:"TA (Tayrifil)"},
                {val:"HY", label:"HY (Hyosung)"},
                {val:"MI", label:"MI (Mitsubishi)"},
                {val:"HX", label:"HX (Hexcel)"},
                {val:"TO", label:"TO (Toray)"},
                {val:"DP", label:"DP (Dupont)"}
              ])}
              {renderSelect("Výrobce 2", fabBrand2, setFabBrand2, [
                {val:"ZH", label:"ZH (Zhongfu)"},
                {val:"TN", label:"TN (Tenax)"},
                {val:"TA", label:"TA (Tayrifil)"},
                {val:"HY", label:"HY (Hyosung)"},
                {val:"MI", label:"MI (Mitsubishi)"},
                {val:"HX", label:"HX (Hexcel)"},
                {val:"TO", label:"TO (Toray)"},
                {val:"DP", label:"DP (Dupont)"}
              ])}
            </>
          ) : (
            renderSelect("Výrobce vlákna", fabBrand, setFabBrand, [
              {val:"ZH", label:"ZH (Zhongfu)"},
              {val:"TN", label:"TN (Tenax)"},
              {val:"TA", label:"TA (Tayrifil)"},
              {val:"HY", label:"HY (Hyosung)"},
              {val:"MI", label:"MI (Mitsubishi)"},
              {val:"HX", label:"HX (Hexcel)"},
              {val:"TO", label:"TO (Toray)"},
              {val:"DP", label:"DP (Dupont)"}
            ])
          )}
        </>
      )) : kategorieId === 'prepregy' ? renderGeneratorWrapper("Prepregy", (
        <>
          {renderSelect("Base Materiál", prepBase, setPrepBase, [{val:"CF", label:"CF (Carbon)"}, {val:"GF", label:"GF (Glass)"}, {val:"AF", label:"AF (Aramid)"}])}
          <div className="space-y-2"><Label className="text-xs text-muted-foreground">Gramáž (g)</Label><Input type="number" value={prepWeight} onChange={(e) => setPrepWeight(e.target.value)} className="h-8 bg-background" /></div>
          {renderSelect("Pryskyřice", prepResin, setPrepResin, [{val:"EPX", label:"EPX (Epoxy)"}, {val:"PHN", label:"PHN (Phenolic)"}])}
        </>
      )) : (kategorieId === 'pryskyrice' || kategorieId === 'lepidla') ? renderGeneratorWrapper("Pryskyřice / Lepidla", (
        <>
          {renderSelect("Typ", chemType, setChemType, [{val:"RES", label:"RES (Resin)"}, {val:"GEL", label:"GEL (Gelcoat)"}, {val:"ADH", label:"ADH (Adhesive)"}])}
          {renderSelect("Chemie", chemBase, setChemBase, [{val:"EP", label:"EP (Epoxy)"}, {val:"VE", label:"VE (Vinylester)"}, {val:"PU", label:"PU (Poly)"}])}
          {renderSelect("Varianta", chemVariant, setChemVariant, [{val:"FAST", label:"FAST"}, {val:"MED", label:"MED"}, {val:"SLOW", label:"SLOW"}, {val:"INF", label:"INF (Infusion)"}, {val:"LAM", label:"LAM (Laminating)"}])}
          <div className="space-y-2"><Label className="text-xs text-muted-foreground">ID/Barva</Label><Input value={chemColor} onChange={(e) => setChemColor(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))} className="h-8 bg-background" placeholder="CLR" /></div>
        </>
      )) : kategorieId === 'spotrebni_chemie' ? renderGeneratorWrapper("Spotřební chemie", (
        <>
          <div className="space-y-2"><Label className="text-xs text-muted-foreground">Značka/Typ</Label><Input value={clnBrand} onChange={(e) => setClnBrand(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))} className="h-8 bg-background" placeholder="RST5" /></div>
          {renderSelect("Obal", clnPack, setClnPack, [{val:"5L", label:"5L"}, {val:"200L", label:"200L"}, {val:"1000L", label:"1000L"}])}
        </>
      )) : (kategorieId === 'cores_standard' || kategorieId === 'cores_active') ? renderGeneratorWrapper("Jádrové materiály", (
        <>
          {renderSelect("Materiál", coreMat, setCoreMat, [{val:"PVC", label:"PVC"}, {val:"PET", label:"PET"}, {val:"BAL", label:"BAL (Balsa)"}, {val:"HON", label:"HON (Honeycomb)"}])}
          <div className="space-y-2"><Label className="text-xs text-muted-foreground">Hustota (kg/m3)</Label><Input type="number" value={coreDens} onChange={(e) => setCoreDens(e.target.value)} className="h-8 bg-background" /></div>
          <div className="space-y-2"><Label className="text-xs text-muted-foreground">Tloušťka (např. 10MM)</Label><Input value={coreThick} onChange={(e) => setCoreThick(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))} className="h-8 bg-background" /></div>
          {renderSelect("Úprava", coreFinish, setCoreFinish, [{val:"PL", label:"PL (Plain)"}, {val:"GS", label:"GS (Grid Scored)"}, {val:"PERF", label:"PERF (Perforated)"}])}
        </>
      )) : kategorieId === 'brouseni_a_lesteni' ? renderGeneratorWrapper("Broušení a Leštění", (
        <>
          <div className="space-y-2"><Label className="text-xs text-muted-foreground">Značka/Typ</Label><Input value={polBrand} onChange={(e) => setPolBrand(e.target.value.toUpperCase().replace(/[^A-Fa-f0-9]/g, ''))} className="h-8 bg-background" placeholder="REX" /></div>
          {renderSelect("Nádoba", polCont, setPolCont, [{val:"CAN", label:"CAN (Canister)"}, {val:"BOT", label:"BOT (Bottle)"}, {val:"PAD", label:"PAD"}])}
          <div className="space-y-2"><Label className="text-xs text-muted-foreground">Velikost/Váha</Label><Input value={polSize} onChange={(e) => setPolSize(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))} className="h-8 bg-background" placeholder="1KG" /></div>
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
            {val:"SQ", label:"SQ (Squeezer)"}
          ])}
          <div className="space-y-2"><Label className="text-xs text-muted-foreground">Identifikátor</Label><Input value={toolId} onChange={(e) => setToolId(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))} className="h-8 bg-background" placeholder="50MM" /></div>
        </>
      )) : kategorieId === 'consumables' ? renderGeneratorWrapper("Spotřební materiál (Consumables)", (
        <>
          {renderSelect("Podkategorie", conSub, setConSub, [
            {val:"BF", label:"BF (Bagging film)"},
            {val:"RF", label:"RF (Release film)"},
            {val:"PP", label:"PP (Peel ply)"},
            {val:"BC", label:"BC (Breather)"},
            {val:"ST", label:"ST (Sealing tape)"},
            {val:"FT", label:"FT (Flash tape)"},
            {val:"FM", label:"FM (Flow mesh)"},
            {val:"FCH", label:"FCH (Flow channel)"},
            {val:"T", label:"T (Tube)"},
            {val:"C", label:"C (Connectors)"}
          ])}
          <div className="space-y-2"><Label className="text-xs text-muted-foreground">Identifikátor</Label><Input value={conId} onChange={(e) => setConId(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))} className="h-8 bg-background" placeholder="50MM" /></div>
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
              <Label htmlFor="fabWidth" className="text-xs text-muted-foreground">Šířka (m)</Label>
              <Input 
                id="fabWidth" 
                type="number" 
                step="0.01" 
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
              <strong>Vypočtená plocha:</strong> {((parseFloat(fabWidth) || 0) * (parseFloat(fabLength) || 0) * (fabPackType === "krabice" ? (parseInt(fabPieces) || 0) : 1)).toFixed(2)} m²
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

      {/* 3. Katalogový stav a Měrná jednotka */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Stav v katalogu</Label>
          <Select onValueChange={(val: string | null) => setValue("stav_katalogu_id", val || "")} value={stavId || ""}>
            <SelectTrigger>
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
            <SelectTrigger>
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
            <SelectTrigger>
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
            <SelectTrigger>
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
            <Input id="cilova_marze_retail_procenta" type="number" step="0.1" {...register("cilova_marze_retail_procenta")} className="bg-zinc-950 border-zinc-800" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cilova_marze_partner_procenta">Partner Marže (B2B)</Label>
            <Input id="cilova_marze_partner_procenta" type="number" step="0.1" {...register("cilova_marze_partner_procenta")} className="bg-zinc-950 border-zinc-800" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="clo_procenta">Clo (Produkt)</Label>
            <Input id="clo_procenta" type="number" step="0.1" {...register("clo_procenta")} className="bg-zinc-950 border-zinc-800" />
            <p className="text-[10px] text-zinc-500 italic">Přebije globální clo.</p>
          </div>
        </div>
      </div>

      {/* 8. Logistické balení */}
      <div className="grid grid-cols-3 gap-4 p-4 bg-muted/30 rounded-lg border border-zinc-800">
        <div className="space-y-2">
          <Label htmlFor="mnozstvi_v_baleni">Množství v bal.</Label>
          <Input 
            id="mnozstvi_v_baleni" 
            type="number" 
            step="0.01" 
            readOnly={kategorieId === "vyztuzne_materialy"}
            className={kategorieId === "vyztuzne_materialy" ? "bg-muted text-muted-foreground border-zinc-850" : ""}
            {...register("mnozstvi_v_baleni")} 
          />
        </div>
        <div className="space-y-2">
          <Label>Jednotka balení</Label>
          <Select 
            onValueChange={(val: string | null) => setValue("jednotka_baleni_id", val || "")} 
            value={jednotkaBaleniId || ""}
            disabled={kategorieId === "vyztuzne_materialy"}
          >
            <SelectTrigger className={kategorieId === "vyztuzne_materialy" ? "bg-muted text-muted-foreground opacity-90 cursor-not-allowed" : ""}>
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
          <Label htmlFor="hmotnost_baliku_kg">Hmotnost (kg)</Label>
          <Input id="hmotnost_baliku_kg" type="number" step="0.1" {...register("hmotnost_baliku_kg")} />
        </div>
      </div>

      {/* 9. Technické specifikace (JSON) */}
      <div className="space-y-2">
        <Label htmlFor="specifikace_json">Technické specifikace (Data pro filtry e-shopu)</Label>
        <Textarea 
          id="specifikace_json" 
          placeholder='{"vazba": "Twill 2/2", "gramaz": 200}' 
          className={`font-mono text-xs h-24 ${kategorieId && kategorieId !== '' && kategorieId !== 'draft' ? 'bg-muted/50 text-muted-foreground' : ''}`}
          readOnly={kategorieId === 'vyztuzne_materialy' || kategorieId === 'prepregy' || kategorieId === 'pryskyrice' || kategorieId === 'lepidla' || kategorieId === 'spotrebni_chemie' || kategorieId === 'cores_standard' || kategorieId === 'cores_active' || kategorieId === 'brouseni_a_lesteni' || kategorieId === 'spojovaci_material' || kategorieId === 'naradi' || kategorieId === 'consumables'}
          {...register("specifikace_json")}
        />
        <p className="text-[10px] text-muted-foreground italic">
          {kategorieId === 'vyztuzne_materialy' || kategorieId === 'prepregy' || kategorieId === 'pryskyrice' || kategorieId === 'lepidla' || kategorieId === 'spotrebni_chemie' || kategorieId === 'cores_standard' || kategorieId === 'cores_active' || kategorieId === 'brouseni_a_lesteni' || kategorieId === 'spojovaci_material' || kategorieId === 'naradi' || kategorieId === 'consumables' 
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
