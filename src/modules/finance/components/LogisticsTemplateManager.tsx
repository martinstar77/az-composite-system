"use client"

import { useState, useMemo } from "react"
import { Plus, Trash2, Edit2, Truck, Ruler, Calculator, Banknote, ShieldAlert, Scale, ChevronRight } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { Label } from "@/shared/components/ui/label"
import { Switch } from "@/shared/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/shared/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/shared/components/ui/alert-dialog"
import { Badge } from "@/shared/components/ui/badge"
import { LogisticsTemplate, LogisticsSegment } from "../types/logistics"
import { createLogisticsTemplate, updateLogisticsTemplate, deleteLogisticsTemplate } from "../actions"

interface LogisticsTemplateManagerProps {
  templates: LogisticsTemplate[]
}

const ENGINE_V2_TYPES: Record<string, string> = {
  legacy: "Starý výpočet (Legacy)",
  linear_czk: "Lineární regrese (a * kg + b) [CZK]",
  segmented_czk: "Vícesegmentová regrese [CZK]",
  fixed_eur: "Fixní EUR poplatek (Přepočet ČNB)",
  pallet_alloc: "Paletová alokace (EUR / počet)",
}

const ZEME_LIST = [
  { val: "CZ", label: "Česká republika" },
  { val: "CN", label: "Čína" },
  { val: "IT", label: "Itálie" },
  { val: "DE", label: "Německo" },
  { val: "PL", label: "Polsko" },
  { val: "NL", label: "Nizozemsko" },
  { val: "ES", label: "Španělsko" },
  { val: "FR", label: "Francie" },
  { val: "other", label: "Jiné / Vlastní" },
]

const DOPRAVA_LIST = [
  { val: "balik_standard", label: "Standardní krabice / balík" },
  { val: "balik_dlouhy", label: "Dlouhý / nadrozměrný balík" },
  { val: "sacek_lq", label: "LQ Sáček / Malý karton" },
  { val: "paleta", label: "Paleta" },
  { val: "custom", label: "Vlastní / Ostatní" },
]

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
      poplatek_banka_czk: 0,
      bezpecnostni_koeficient: 1.05
    },
    balik_dlouhy: {
      typ_vypoctu_dopravy_v2: "segmented_czk",
      poplatek_banka_czk: 0,
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
      poplatek_banka_czk: 0,
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
      poplatek_banka_czk: 0,
      bezpecnostni_koeficient: 1.05,
      segmenty_dopravy: [
        { od_kg: 0, do_kg: 30.9, a: 15.771, b: 216.52, dopravce: "GLS" },
        { od_kg: 31, do_kg: 9999, a: 8.375, b: 918, dopravce: "UPS Economy" }
      ]
    },
    balik_dlouhy: {
      typ_vypoctu_dopravy_v2: "segmented_czk",
      poplatek_banka_czk: 0,
      bezpecnostni_koeficient: 1.05,
      segmenty_dopravy: [
        { od_kg: 0, do_kg: 30.9, a: 15.16, b: 229.56, dopravce: "GLS" },
        { od_kg: 31, do_kg: 60.9, a: 27.777, b: 144.67, dopravce: "UPS Economy" },
        { od_kg: 61, do_kg: 9999, a: 8.1, b: 2487.8, dopravce: "FedEx Economy Freight" }
      ]
    },
    paleta: {
      typ_vypoctu_dopravy_v2: "pallet_alloc",
      pallet_cena_eur: 225.02,
      pallet_pocet_produktu: 30,
      poplatek_banka_czk: 0,
      bezpecnostni_koeficient: 1.05
    }
  },
  PL: {
    balik_standard: {
      typ_vypoctu_dopravy_v2: "segmented_czk",
      poplatek_banka_czk: 0,
      bezpecnostni_koeficient: 1.05,
      segmenty_dopravy: [
        { od_kg: 0, do_kg: 30.9, a: 14.039, b: 153.3, dopravce: "GLS" },
        { od_kg: 31, do_kg: 9999, a: 9.8, b: 874.4, dopravce: "UPS Economy" }
      ]
    },
    sacek_lq: {
      typ_vypoctu_dopravy_v2: "fixed_eur",
      fixni_cena_eur: 50.00,
      poplatek_banka_czk: 0,
      bezpecnostni_koeficient: 1.05
    }
  },
  NL: {
    balik_standard: {
      typ_vypoctu_dopravy_v2: "segmented_czk",
      poplatek_banka_czk: 0,
      bezpecnostni_koeficient: 1.05,
      segmenty_dopravy: [
        { od_kg: 0, do_kg: 30.9, a: 18.929, b: 245.81, dopravce: "GLS" },
        { od_kg: 31, do_kg: 9999, a: 12.1, b: 1204.8, dopravce: "UPS Economy" }
      ]
    }
  },
  ES: {
    paleta: {
      typ_vypoctu_dopravy_v2: "pallet_alloc",
      pallet_cena_eur: 225.02,
      pallet_pocet_produktu: 30,
      poplatek_banka_czk: 0,
      bezpecnostni_koeficient: 1.05
    }
  },
  FR: {
    balik_standard: {
      typ_vypoctu_dopravy_v2: "segmented_czk",
      poplatek_banka_czk: 0,
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
      poplatek_banka_czk: 0,
      bezpecnostni_koeficient: 1.05
    }
  }
}

export function LogisticsTemplateManager({ templates }: LogisticsTemplateManagerProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<LogisticsTemplate | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [manualOverride, setManualOverride] = useState(false)

  // Live tester state
  const [testWeight, setTestWeight] = useState<number>(10)
  const [testEurRate] = useState<number>(25.10) // Representative rate for UI demo

  const [formData, setFormData] = useState<Partial<LogisticsTemplate>>({
    nazev: "",
    typ_vypoctu_dopravy: "procentualni",
    sazba_dopravy: 0,
    poplatek_banka_czk: 190,
    poplatek_procleni_czk: 0,
    poplatek_odpady_czk: 0,
    poplatek_balne_czk: 0,
    vychozi_clo_procenta: 0,
    
    // v2 engine fields
    typ_vypoctu_dopravy_v2: "legacy",
    koeficient_a: null,
    koeficient_b: null,
    segmenty_dopravy: [],
    fixni_cena_eur: null,
    pallet_cena_eur: null,
    pallet_pocet_produktu: null,
    bezpecnostni_koeficient: 1.05,
    zeme_puvodu: "",
    typ_dopravy: "",
  })

  // Segment inputs management
  const [segments, setSegments] = useState<LogisticsSegment[]>([])

  const handleOpenCreate = () => {
    setEditingTemplate(null)
    setManualOverride(false)
    setFormData({
      nazev: "",
      typ_vypoctu_dopravy: "procentualni",
      sazba_dopravy: 0,
      poplatek_banka_czk: 190,
      poplatek_procleni_czk: 0,
      poplatek_odpady_czk: 0,
      poplatek_balne_czk: 0,
      vychozi_clo_procenta: 0,
      typ_vypoctu_dopravy_v2: "legacy",
      koeficient_a: null,
      koeficient_b: null,
      segmenty_dopravy: [],
      fixni_cena_eur: null,
      pallet_cena_eur: null,
      pallet_pocet_produktu: null,
      bezpecnostni_koeficient: 1.05,
      zeme_puvodu: "",
      typ_dopravy: "",
    })
    setSegments([])
    setIsDialogOpen(true)
  }

  const hasPreset = useMemo(() => {
    const zeme = formData.zeme_puvodu
    const typ = formData.typ_dopravy
    return !!(zeme && typ && SCENARIO_PRESETS[zeme]?.[typ])
  }, [formData.zeme_puvodu, formData.typ_dopravy])

  const applyScenarioPreset = (zeme: string, typ: string) => {
    if (!zeme || !typ) return
    const preset = SCENARIO_PRESETS[zeme]?.[typ]
    if (preset) {
      setFormData(prev => ({
        ...prev,
        ...preset,
        koeficient_a: preset.koeficient_a !== undefined ? preset.koeficient_a : null,
        koeficient_b: preset.koeficient_b !== undefined ? preset.koeficient_b : null,
        fixni_cena_eur: preset.fixni_cena_eur !== undefined ? preset.fixni_cena_eur : null,
        pallet_cena_eur: preset.pallet_cena_eur !== undefined ? preset.pallet_cena_eur : null,
        pallet_pocet_produktu: preset.pallet_pocet_produktu !== undefined ? preset.pallet_pocet_produktu : null,
      }))
      if (preset.segmenty_dopravy) {
        setSegments(preset.segmenty_dopravy)
      } else {
        setSegments([])
      }
      toast.success(`Načteny výchozí parametry z doprava-vypocet-ceny.md pro tento scénář`)
    }
  }

  const handleCountryChange = (val: string) => {
    const zeme = val === "none" ? "" : val
    setFormData(prev => {
      const nextData = { ...prev, zeme_puvodu: zeme }
      
      // Auto-name if empty or previous auto-named pattern
      const prevName = prev.nazev || ""
      const isAutoName = !prevName || prevName.includes(" - ") || prevName === "Nová šablona"
      let newName = prevName
      if (isAutoName) {
        const countryLabel = ZEME_LIST.find(z => z.val === zeme)?.label || zeme
        const transportLabel = DOPRAVA_LIST.find(d => d.val === prev.typ_dopravy)?.label || prev.typ_dopravy
        if (zeme && prev.typ_dopravy) {
          newName = `${countryLabel} - ${transportLabel}`
        } else if (zeme) {
          newName = `${countryLabel}`
        }
      }

      const updated = { ...nextData, nazev: newName }
      
      const preset = SCENARIO_PRESETS[zeme]?.[nextData.typ_dopravy || ""]
      if (preset && !manualOverride) {
        const finalData = {
          ...updated,
          ...preset,
          koeficient_a: preset.koeficient_a !== undefined ? preset.koeficient_a : null,
          koeficient_b: preset.koeficient_b !== undefined ? preset.koeficient_b : null,
          fixni_cena_eur: preset.fixni_cena_eur !== undefined ? preset.fixni_cena_eur : null,
          pallet_cena_eur: preset.pallet_cena_eur !== undefined ? preset.pallet_cena_eur : null,
          pallet_pocet_produktu: preset.pallet_pocet_produktu !== undefined ? preset.pallet_pocet_produktu : null,
        }
        if (preset.segmenty_dopravy) {
          setSegments(preset.segmenty_dopravy)
        } else {
          setSegments([])
        }
        return finalData
      }
      return updated
    })
  }

  const handleTransportTypeChange = (typ: string) => {
    const mapping: Record<string, string> = {
      balik_standard: "linear_czk",
      balik_dlouhy: "segmented_czk",
      sacek_lq: "fixed_eur",
      paleta: "pallet_alloc",
      custom: "legacy"
    }
    setFormData(prev => {
      const nextData = {
        ...prev,
        typ_dopravy: typ,
        typ_vypoctu_dopravy_v2: (mapping[typ] || "legacy") as any
      }

      // Auto-name if empty or previous auto-named pattern
      const prevName = prev.nazev || ""
      const isAutoName = !prevName || prevName.includes(" - ") || prevName === "Nová šablona"
      let newName = prevName
      if (isAutoName) {
        const countryLabel = ZEME_LIST.find(z => z.val === prev.zeme_puvodu)?.label || prev.zeme_puvodu
        const transportLabel = DOPRAVA_LIST.find(d => d.val === typ)?.label || typ
        if (prev.zeme_puvodu && typ) {
          newName = `${countryLabel} - ${transportLabel}`
        } else if (typ) {
          newName = `${transportLabel}`
        }
      }

      const updated = { ...nextData, nazev: newName }

      const preset = SCENARIO_PRESETS[prev.zeme_puvodu || ""]?.[typ]
      if (preset && !manualOverride) {
        const finalData = {
          ...updated,
          ...preset,
          koeficient_a: preset.koeficient_a !== undefined ? preset.koeficient_a : null,
          koeficient_b: preset.koeficient_b !== undefined ? preset.koeficient_b : null,
          fixni_cena_eur: preset.fixni_cena_eur !== undefined ? preset.fixni_cena_eur : null,
          pallet_cena_eur: preset.pallet_cena_eur !== undefined ? preset.pallet_cena_eur : null,
          pallet_pocet_produktu: preset.pallet_pocet_produktu !== undefined ? preset.pallet_pocet_produktu : null,
        }
        if (preset.segmenty_dopravy) {
          setSegments(preset.segmenty_dopravy)
        } else {
          setSegments([])
        }
        return finalData
      }
      return updated
    })
  }

  const handleManualOverrideChange = (checked: boolean) => {
    setManualOverride(checked)
    if (!checked && formData.zeme_puvodu && formData.typ_dopravy) {
      const preset = SCENARIO_PRESETS[formData.zeme_puvodu]?.[formData.typ_dopravy]
      if (preset) {
        setFormData(prev => ({
          ...prev,
          ...preset,
          koeficient_a: preset.koeficient_a !== undefined ? preset.koeficient_a : null,
          koeficient_b: preset.koeficient_b !== undefined ? preset.koeficient_b : null,
          fixni_cena_eur: preset.fixni_cena_eur !== undefined ? preset.fixni_cena_eur : null,
          pallet_cena_eur: preset.pallet_cena_eur !== undefined ? preset.pallet_cena_eur : null,
          pallet_pocet_produktu: preset.pallet_pocet_produktu !== undefined ? preset.pallet_pocet_produktu : null,
        }))
        if (preset.segmenty_dopravy) {
          setSegments(preset.segmenty_dopravy)
        } else {
          setSegments([])
        }
        toast.info("Matematické parametry byly resetovány na standardní hodnoty scénáře")
      }
    }
  }

  const handleOpenEdit = (template: LogisticsTemplate) => {
    setEditingTemplate(template)
    setFormData(template)
    setSegments(template.segmenty_dopravy || [])
    
    // Check if the saved template differs from the preset
    const zeme = template.zeme_puvodu
    const typ = template.typ_dopravy
    if (zeme && typ && SCENARIO_PRESETS[zeme]?.[typ]) {
      const preset = SCENARIO_PRESETS[zeme][typ]
      let hasDiff = false
      if (template.typ_vypoctu_dopravy_v2 !== preset.typ_vypoctu_dopravy_v2) hasDiff = true
      if (template.koeficient_a !== (preset.koeficient_a ?? null)) hasDiff = true
      if (template.koeficient_b !== (preset.koeficient_b ?? null)) hasDiff = true
      if (template.fixni_cena_eur !== (preset.fixni_cena_eur ?? null)) hasDiff = true
      if (template.pallet_cena_eur !== (preset.pallet_cena_eur ?? null)) hasDiff = true
      if (template.pallet_pocet_produktu !== (preset.pallet_pocet_produktu ?? null)) hasDiff = true
      
      const presetSegs = preset.segmenty_dopravy || []
      const templateSegs = template.segmenty_dopravy || []
      if (presetSegs.length !== templateSegs.length) {
        hasDiff = true
      } else {
        for (let i = 0; i < presetSegs.length; i++) {
          if (presetSegs[i].od_kg !== templateSegs[i].od_kg ||
              presetSegs[i].do_kg !== templateSegs[i].do_kg ||
              presetSegs[i].a !== templateSegs[i].a ||
              presetSegs[i].b !== templateSegs[i].b ||
              presetSegs[i].dopravce !== templateSegs[i].dopravce) {
            hasDiff = true
            break
          }
        }
      }
      setManualOverride(hasDiff)
    } else {
      setManualOverride(true)
    }
    setIsDialogOpen(true)
  }

  const handleAddSegment = () => {
    setSegments(prev => [
      ...prev,
      { od_kg: prev.length > 0 ? (prev[prev.length - 1].do_kg ?? 0) : 0, do_kg: null, a: 0, b: 0, dopravce: "" }
    ])
  }

  const handleRemoveSegment = (index: number) => {
    setSegments(prev => prev.filter((_, i) => i !== index))
  }

  const handleSegmentChange = (index: number, field: keyof LogisticsSegment, value: any) => {
    setSegments(prev => prev.map((s, i) => {
      if (i === index) {
        return { ...s, [field]: value }
      }
      return s
    }))
  }

  const handleSubmit = async () => {
    if (!formData.nazev) {
      toast.error("Zadejte název šablony")
      return
    }

    setIsSubmitting(true)
    try {
      const submissionData = {
        ...formData,
        segmenty_dopravy: formData.typ_vypoctu_dopravy_v2 === 'segmented_czk' ? segments : null
      }

      if (editingTemplate) {
        const { error } = await updateLogisticsTemplate(editingTemplate.id!, submissionData)
        if (error) throw error
        toast.success("Šablona aktualizována")
      } else {
        const { error } = await createLogisticsTemplate(submissionData)
        if (error) throw error
        toast.success("Šablona vytvořena")
      }
      setIsDialogOpen(false)
    } catch (error: any) {
      toast.error("Chyba při ukládání", { description: error.message })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const { error } = await deleteLogisticsTemplate(id)
      if (error) throw error
      toast.success("Šablona smazána")
    } catch (error: any) {
      toast.error("Chyba při mazání", { description: error.message })
    }
  }

  // Calculate live cost for a template at testWeight
  const getTestCost = (t: LogisticsTemplate) => {
    const safety = t.bezpecnostni_koeficient ?? 1.05
    if (t.typ_vypoctu_dopravy_v2 && t.typ_vypoctu_dopravy_v2 !== 'legacy') {
      switch (t.typ_vypoctu_dopravy_v2) {
        case 'linear_czk':
          return ((t.koeficient_a ?? 0) * testWeight + (t.koeficient_b ?? 0)) * safety
        case 'segmented_czk': {
          const segs = t.segmenty_dopravy || []
          const seg = segs.find(s => testWeight >= s.od_kg && (s.do_kg === null || testWeight <= s.do_kg)) ?? segs[segs.length - 1]
          if (!seg) return 0
          return (seg.a * testWeight + seg.b) * safety
        }
        case 'fixed_eur':
          return (t.fixni_cena_eur ?? 0) * testEurRate * safety
        case 'pallet_alloc':
          return (((t.pallet_cena_eur ?? 0) * testEurRate) / (t.pallet_pocet_produktu ?? 1)) * safety
        default:
          return 0
      }
    } else {
      // legacy fallback
      if (t.typ_vypoctu_dopravy === 'procentualni') {
        return 0 // dependent on purchase price
      } else if (t.typ_vypoctu_dopravy === 'vaha_kg') {
        return testWeight * t.sazba_dopravy * testEurRate
      } else {
        return t.sazba_dopravy * testEurRate
      }
    }
  }

  return (
    <div className="space-y-6">
      {/* Interactive Live Preview Slider */}
      <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-xl flex flex-col md:flex-row items-center justify-between gap-6 shadow-md">
        <div className="space-y-1.5 w-full md:w-1/2">
          <div className="flex justify-between items-center">
            <Label className="text-xs uppercase font-bold text-zinc-400 flex items-center gap-1.5">
              <Scale className="h-4 w-4 text-primary" /> Live Testovací Hmotnost
            </Label>
            <span className="font-mono text-sm font-black text-white">{testWeight} kg</span>
          </div>
          <input
            type="range"
            min="0.1"
            max="100"
            step="0.5"
            value={testWeight}
            onChange={(e) => setTestWeight(parseFloat(e.target.value))}
            className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-primary"
          />
        </div>
        <div className="bg-zinc-900 border border-zinc-850 px-4 py-2.5 rounded-lg flex items-center gap-6 text-xs text-zinc-400 font-mono">
          <div>
            Modelový kurz: <span className="text-white font-bold">{testEurRate} CZK/EUR</span>
          </div>
          <p className="text-[10px] text-zinc-500 italic max-w-[250px] leading-snug">
            Ceny níže se přepočítávají automaticky dle posuvníku (včetně koeficientu).
          </p>
        </div>
      </div>

      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Truck className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-bold uppercase tracking-tight text-zinc-100">Logistické Šablony (Trasy)</h2>
        </div>
        <Button onClick={handleOpenCreate} className="gap-2">
          <Plus className="h-4 w-4" /> Nová šablona
        </Button>
      </div>

      <div className="border border-zinc-800 rounded-xl overflow-hidden bg-zinc-950 shadow-2xl">
        <Table>
          <TableHeader className="bg-zinc-900/50">
            <TableRow className="hover:bg-transparent border-zinc-800">
              <TableHead className="text-zinc-400 font-bold uppercase text-[10px] tracking-wider">Název trasy</TableHead>
              <TableHead className="text-zinc-400 font-bold uppercase text-[10px] tracking-wider">Engine Typ</TableHead>
              <TableHead className="text-zinc-400 font-bold uppercase text-[10px] tracking-wider">Detaily vzorce</TableHead>
              <TableHead className="text-zinc-400 font-bold uppercase text-[10px] tracking-wider text-center">Buffer</TableHead>
              <TableHead className="text-zinc-400 font-bold uppercase text-[10px] tracking-wider text-center">Live Test ({testWeight}kg)</TableHead>
              <TableHead className="text-zinc-400 font-bold uppercase text-[10px] tracking-wider text-right">Akce</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {templates.length > 0 ? templates.map((t) => {
              const testCost = getTestCost(t)
              const isV2 = t.typ_vypoctu_dopravy_v2 && t.typ_vypoctu_dopravy_v2 !== 'legacy'
              return (
                <TableRow key={t.id} className="border-zinc-800 hover:bg-zinc-900/30 transition-colors group">
                  <TableCell className="font-bold text-zinc-200">
                    <div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span>{t.nazev}</span>
                        {t.zeme_puvodu && (
                          <Badge variant="outline" className="bg-zinc-900 border-zinc-800 text-[10px] text-zinc-300 font-mono py-0 px-1.5 h-4.5">
                            {ZEME_LIST.find(z => z.val === t.zeme_puvodu)?.label || t.zeme_puvodu}
                          </Badge>
                        )}
                        {t.typ_dopravy && (
                          <Badge variant="outline" className="bg-zinc-900 border-zinc-800 text-[10px] text-zinc-300 font-mono py-0 px-1.5 h-4.5">
                            {DOPRAVA_LIST.find(d => d.val === t.typ_dopravy)?.label || t.typ_dopravy}
                          </Badge>
                        )}
                      </div>
                      <p className="text-[10px] text-zinc-500 font-normal mt-0.5">
                        Clo: {t.vychozi_clo_procenta}% | Swift: {t.poplatek_banka_czk} CZK
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={isV2 ? "bg-primary/5 border-primary/20 text-white font-bold" : "bg-zinc-900 border-zinc-850 text-zinc-400"}>
                      {ENGINE_V2_TYPES[t.typ_vypoctu_dopravy_v2 || 'legacy']}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-zinc-400">
                    {t.typ_vypoctu_dopravy_v2 === 'linear_czk' && `CENA = ${t.koeficient_a} * kg + ${t.koeficient_b} CZK`}
                    {t.typ_vypoctu_dopravy_v2 === 'fixed_eur' && `CENA = ${t.fixni_cena_eur} EUR`}
                    {t.typ_vypoctu_dopravy_v2 === 'pallet_alloc' && `CENA = ${t.pallet_cena_eur} EUR / ${t.pallet_pocet_produktu} ks`}
                    {t.typ_vypoctu_dopravy_v2 === 'segmented_czk' && `${t.segmenty_dopravy?.length || 0} pásem (segmenty)`}
                    {(!t.typ_vypoctu_dopravy_v2 || t.typ_vypoctu_dopravy_v2 === 'legacy') && (
                      <span>{t.typ_vypoctu_dopravy === 'procentualni' ? `${(t.sazba_dopravy * 100).toFixed(0)}% z nákupu` : `${t.sazba_dopravy} ${t.typ_vypoctu_dopravy === 'vaha_kg' ? 'EUR/kg' : 'EUR'}`}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center font-mono text-xs text-zinc-400">
                    {isV2 ? `${t.bezpecnostni_koeficient ?? 1.05}x` : "-"}
                  </TableCell>
                  <TableCell className="text-center">
                    {testCost > 0 ? (
                      <span className="font-mono text-primary font-black text-sm">
                        {Math.ceil(testCost)} CZK
                      </span>
                    ) : (
                      <span className="text-zinc-600 text-xs italic">N/A (Procentní)</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(t)} className="h-8 w-8 text-zinc-400 hover:text-white hover:bg-zinc-800">
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      
                      <AlertDialog>
                        <AlertDialogTrigger render={
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-red-500 hover:bg-red-500/10">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        } />
                        <AlertDialogContent className="bg-zinc-950 border-zinc-800">
                           <AlertDialogHeader>
                            <AlertDialogTitle className="text-white">Opravdu smazat šablonu?</AlertDialogTitle>
                            <AlertDialogDescription className="text-zinc-400">
                              Tato akce ovlivní výpočty u všech produktů, které tuto šablonu využívají.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel className="bg-zinc-900 border-zinc-800 text-white hover:bg-zinc-800">Zrušit</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(t.id!)} className="bg-red-650 text-white hover:bg-red-700">Smazat</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              )
            }) : (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-zinc-500 italic border-zinc-800">
                  Zatím nejsou definovány žádné logistické šablony.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl bg-zinc-950 border border-zinc-800 text-white overflow-y-auto max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5 text-primary" />
              {editingTemplate ? 'Upravit logistickou šablonu' : 'Nová logistická šablona'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label>Název šablony</Label>
              <Input 
                value={formData.nazev || ""} 
                onChange={(e) => setFormData({...formData, nazev: e.target.value})}
                placeholder="Např. Itálie - UPS/FedEx Dlouhé"
                className="bg-zinc-900 border-zinc-800"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Země původu (Odkud)</Label>
                <Select
                  value={formData.zeme_puvodu || "other"}
                  onValueChange={(v) => handleCountryChange(v || "")}
                >
                  <SelectTrigger className="bg-zinc-900 border-zinc-800 text-zinc-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="min-w-[320px] md:min-w-[380px]">
                    {ZEME_LIST.map((z) => (
                      <SelectItem key={z.val} value={z.val}>{z.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Typ dopravy / zásilky</Label>
                <Select
                  value={formData.typ_dopravy || "custom"}
                  onValueChange={(val) => handleTransportTypeChange(val || "")}
                >
                  <SelectTrigger className="bg-zinc-900 border-zinc-800 text-zinc-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="min-w-[320px] md:min-w-[380px]">
                    {DOPRAVA_LIST.map((d) => (
                      <SelectItem key={d.val} value={d.val}>{d.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {hasPreset && (
              <div className="flex items-center justify-between p-3 bg-zinc-900/30 rounded-lg border border-zinc-850">
                <div className="space-y-0.5">
                  <Label className="text-sm font-semibold text-zinc-200">Upravit výpočetní parametry ručně</Label>
                  <p className="text-[10px] text-zinc-500">
                    Odemkne ruční úpravu vzorce a váhových pásem (přepíše výchozí hodnoty z doprava-vypocet-ceny.md).
                  </p>
                </div>
                <Switch 
                  checked={manualOverride} 
                  onCheckedChange={handleManualOverrideChange}
                  className="data-[state=checked]:bg-primary"
                />
              </div>
            )}

            {hasPreset && !manualOverride && (
              <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg text-xs leading-relaxed flex items-start gap-2.5 text-zinc-300">
                <Calculator className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-white block mb-0.5">Automaticky řízená trasa</span>
                  Všechny koeficienty, váhová pásma (segmenty) a fixní poplatky jsou automaticky přednastaveny na základě kombinace <strong>{ZEME_LIST.find(z => z.val === formData.zeme_puvodu)?.label}</strong> a <strong>{DOPRAVA_LIST.find(d => d.val === formData.typ_dopravy)?.label}</strong>. Nemusíte nic ručně konfigurovat.
                </div>
              </div>
            )}

            {(!hasPreset || manualOverride) && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Bezpečnostní koeficient (Buffer)</Label>
                  <Input 
                    type="number" 
                    step="0.01"
                    value={formData.bezpecnostni_koeficient ?? 1.05} 
                    onChange={(e) => setFormData({...formData, bezpecnostni_koeficient: parseFloat(e.target.value) || 1.05})}
                    className="bg-zinc-900 border-zinc-800"
                    placeholder="Výchozí 1.05 (+5%)"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Pokročilý matematický model</Label>
                  <Select 
                    value={formData.typ_vypoctu_dopravy_v2} 
                    onValueChange={(v: any) => setFormData({...formData, typ_vypoctu_dopravy_v2: v})}
                  >
                    <SelectTrigger className="bg-zinc-900 border-zinc-800 text-zinc-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="min-w-[320px] md:min-w-[380px]">
                      {Object.entries(ENGINE_V2_TYPES).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* DYNAMIC FORM FIELDS BASED ON v2 SELECTION */}
            {(!hasPreset || manualOverride) && (
              <>
                {formData.typ_vypoctu_dopravy_v2 === "legacy" && (
                  <div className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-lg grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Sazba dopravy (Legacy)</Label>
                      <Select 
                        value={formData.typ_vypoctu_dopravy} 
                        onValueChange={(v: any) => setFormData({...formData, typ_vypoctu_dopravy: v})}
                      >
                        <SelectTrigger className="bg-zinc-950 border-zinc-800">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-950 border-zinc-850 text-white">
                          <SelectItem value="procentualni">Procentuální (% z nákupu)</SelectItem>
                          <SelectItem value="vaha_kg">Dle váhy (EUR/kg)</SelectItem>
                          <SelectItem value="fixni">Fixní částka (EUR/zásilka)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Sazba / Hodnota</Label>
                      <Input 
                        type="number" 
                        step="0.0001"
                        value={formData.sazba_dopravy ?? 0} 
                        onChange={(e) => setFormData({...formData, sazba_dopravy: parseFloat(e.target.value) || 0})}
                        className="bg-zinc-950 border-zinc-850"
                      />
                    </div>
                  </div>
                )}

                {formData.typ_vypoctu_dopravy_v2 === "linear_czk" && (
                  <div className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-lg grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Koeficient A (Sklon - CZK / kg)</Label>
                      <Input 
                        type="number" 
                        step="0.001"
                        value={formData.koeficient_a ?? ""} 
                        onChange={(e) => setFormData({...formData, koeficient_a: parseFloat(e.target.value) || 0})}
                        className="bg-zinc-950 border-zinc-800"
                        placeholder="Např. 18.804"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Koeficient B (Fixní poplatek CZK)</Label>
                      <Input 
                        type="number" 
                        step="0.01"
                        value={formData.koeficient_b ?? ""} 
                        onChange={(e) => setFormData({...formData, koeficient_b: parseFloat(e.target.value) || 0})}
                        className="bg-zinc-950 border-zinc-800"
                        placeholder="Např. 349.38"
                      />
                    </div>
                  </div>
                )}

                {formData.typ_vypoctu_dopravy_v2 === "fixed_eur" && (
                  <div className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-lg space-y-2">
                    <Label>Fixní cena za zásilku (EUR)</Label>
                    <div className="relative">
                      <Input 
                        type="number" 
                        step="0.01"
                        value={formData.fixni_cena_eur ?? ""} 
                        onChange={(e) => setFormData({...formData, fixni_cena_eur: parseFloat(e.target.value) || 0})}
                        className="bg-zinc-950 border-zinc-800 pr-12"
                        placeholder="Např. 50.00"
                      />
                      <span className="absolute right-3 top-2 text-xs font-bold text-zinc-650 font-mono">EUR</span>
                    </div>
                    <p className="text-[10px] text-zinc-500 italic">
                      Přepočítává se na CZK automaticky pomocí aktuálního kurzu ČNB z měnového engine.
                    </p>
                  </div>
                )}

                {formData.typ_vypoctu_dopravy_v2 === "pallet_alloc" && (
                  <div className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-lg grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Cena za paletu (EUR)</Label>
                      <div className="relative">
                        <Input 
                          type="number" 
                          step="0.01"
                          value={formData.pallet_cena_eur ?? ""} 
                          onChange={(e) => setFormData({...formData, pallet_cena_eur: parseFloat(e.target.value) || 0})}
                          className="bg-zinc-950 border-zinc-800 pr-12"
                          placeholder="Např. 225.02"
                        />
                        <span className="absolute right-3 top-2 text-xs font-bold text-zinc-650 font-mono">EUR</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Počet produktů na paletě</Label>
                      <Input 
                        type="number" 
                        value={formData.pallet_pocet_produktu ?? ""} 
                        onChange={(e) => setFormData({...formData, pallet_pocet_produktu: parseInt(e.target.value) || 1})}
                        className="bg-zinc-950 border-zinc-800"
                        placeholder="Např. 30"
                      />
                    </div>
                  </div>
                )}

                {formData.typ_vypoctu_dopravy_v2 === "segmented_czk" && (
                  <div className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-lg space-y-4">
                    <div className="flex justify-between items-center border-b border-zinc-800 pb-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Pásma segmentového výpočtu</span>
                      <Button type="button" variant="outline" size="sm" onClick={handleAddSegment} className="h-7 text-[10px] bg-zinc-950 border-zinc-800 text-zinc-300">
                        <Plus className="h-3 w-3 mr-1" /> Přidat pásmo
                      </Button>
                    </div>

                    <div className="space-y-3">
                      {segments.map((seg, idx) => (
                        <div key={idx} className="flex flex-wrap items-center gap-2 bg-zinc-950/80 p-2.5 rounded-lg border border-zinc-850">
                          <div className="w-[85px]">
                            <Label className="text-[9px] uppercase block text-zinc-500 mb-0.5">Od (kg)</Label>
                            <Input
                              type="number"
                              step="0.1"
                              value={seg.od_kg}
                              onChange={(e) => handleSegmentChange(idx, "od_kg", parseFloat(e.target.value) || 0)}
                              className="h-7 text-xs bg-zinc-900 border-zinc-800 px-2"
                            />
                          </div>
                          <div className="w-[85px]">
                            <Label className="text-[9px] uppercase block text-zinc-500 mb-0.5">Do (kg - nebo prázdné)</Label>
                            <Input
                              type="number"
                              step="0.1"
                              value={seg.do_kg ?? ""}
                              onChange={(e) => handleSegmentChange(idx, "do_kg", e.target.value ? parseFloat(e.target.value) : null)}
                              className="h-7 text-xs bg-zinc-900 border-zinc-800 px-2"
                              placeholder="∞"
                            />
                          </div>
                          <div className="w-[60px]">
                            <Label className="text-[9px] uppercase block text-zinc-500 mb-0.5">A (CZK/kg)</Label>
                            <Input
                              type="number"
                              step="0.001"
                              value={seg.a}
                              onChange={(e) => handleSegmentChange(idx, "a", parseFloat(e.target.value) || 0)}
                              className="h-7 text-xs bg-zinc-900 border-zinc-800 px-2 font-mono"
                            />
                          </div>
                          <div className="w-[80px]">
                            <Label className="text-[9px] uppercase block text-zinc-500 mb-0.5">B (CZK fix)</Label>
                            <Input
                              type="number"
                              step="0.1"
                              value={seg.b}
                              onChange={(e) => handleSegmentChange(idx, "b", parseFloat(e.target.value) || 0)}
                              className="h-7 text-xs bg-zinc-900 border-zinc-800 px-2 font-mono"
                            />
                          </div>
                          <div className="flex-1 min-w-[100px]">
                            <Label className="text-[9px] uppercase block text-zinc-500 mb-0.5">Dopravce</Label>
                            <Input
                              type="text"
                              value={seg.dopravce || ""}
                              onChange={(e) => handleSegmentChange(idx, "dopravce", e.target.value)}
                              className="h-7 text-xs bg-zinc-900 border-zinc-800 px-2"
                              placeholder="Např. UPS Economy"
                            />
                          </div>
                          <div className="self-end pb-0.5">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemoveSegment(idx)}
                              className="h-7 w-7 text-red-400 hover:text-red-500 hover:bg-red-500/10"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      ))}

                      {segments.length === 0 && (
                        <p className="text-xs text-zinc-500 italic text-center py-4">Nebyly definovány žádné segmenty. Klikněte na Přidat pásmo.</p>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Standard fees inputs */}
            {(!hasPreset || manualOverride) && (
              <div className="space-y-4 p-4 bg-zinc-900/50 border border-zinc-800 rounded-lg">
                <div className="flex items-center gap-2 mb-2 border-b border-zinc-800 pb-1.5">
                  <Banknote className="h-4 w-4 text-primary" />
                  <h4 className="text-xs font-bold uppercase tracking-widest text-zinc-400">Fixní poplatky (CZK) & CLO</h4>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase text-zinc-400">Banka / SWIFT (CZK)</Label>
                    <Input 
                      type="number" 
                      value={formData.poplatek_banka_czk ?? 190} 
                      onChange={(e) => setFormData({...formData, poplatek_banka_czk: parseFloat(e.target.value) || 0})}
                      className="bg-zinc-950 border-zinc-800 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase text-zinc-400">Proclení (CZK)</Label>
                    <Input 
                      type="number" 
                      value={formData.poplatek_procleni_czk ?? 0} 
                      onChange={(e) => setFormData({...formData, poplatek_procleni_czk: parseFloat(e.target.value) || 0})}
                      className="bg-zinc-950 border-zinc-800 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase text-zinc-400">Odpady (CZK)</Label>
                    <Input 
                      type="number" 
                      value={formData.poplatek_odpady_czk ?? 0} 
                      onChange={(e) => setFormData({...formData, poplatek_odpady_czk: parseFloat(e.target.value) || 0})}
                      className="bg-zinc-950 border-zinc-800 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase text-zinc-400">Balné (CZK)</Label>
                    <Input 
                      type="number" 
                      value={formData.poplatek_balne_czk ?? 0} 
                      onChange={(e) => setFormData({...formData, poplatek_balne_czk: parseFloat(e.target.value) || 0})}
                      className="bg-zinc-950 border-zinc-800 text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <Label className="text-[10px] uppercase text-zinc-400">Výchozí importní clo (%)</Label>
                  <Input 
                    type="number" 
                    step="0.1"
                    value={formData.vychozi_clo_procenta ?? 0} 
                    onChange={(e) => setFormData({...formData, vychozi_clo_procenta: parseFloat(e.target.value) || 0})}
                    className="bg-zinc-950 border-zinc-800 text-sm"
                  />
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="border-t border-zinc-800 pt-4">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="bg-zinc-900 border-zinc-800 text-white hover:bg-zinc-800">
              Zrušit
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? 'Ukládám...' : editingTemplate ? 'Uložit změny' : 'Vytvořit šablonu'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
