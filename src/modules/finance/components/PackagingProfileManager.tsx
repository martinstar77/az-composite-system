"use client"

import { useState, useMemo } from "react"
import { Plus, Trash2, Edit2, Ruler, Scale, Package, Box, Sparkles, AlertCircle } from "lucide-react"
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
import { BaliciProfil, StandardBoxSize } from "../types"
import {
  createPackagingProfile,
  updatePackagingProfile,
  deletePackagingProfile,
  createStandardBoxSize,
  updateStandardBoxSize,
  deleteStandardBoxSize,
} from "../actions"
import { resolvePackageDimensions } from "../utils/packagingEngine"

interface PackagingProfileManagerProps {
  profiles: BaliciProfil[]
  boxSizes: StandardBoxSize[]
}

const OBAL_TYPES: Record<string, string> = {
  role: "Role (Válec)",
  krabice_standard: "Standardní krabice (Lookup)",
  krabice_dlouha: "Dlouhá krabice (Fixní délka)",
  krabice_volna: "Custom rozměry",
  paleta: "Paleta",
  sacek: "Sáček / Malý karton",
}

export function PackagingProfileManager({ profiles, boxSizes }: PackagingProfileManagerProps) {
  // Tabs within Packaging Manager
  const [activeSubTab, setActiveSubTab] = useState<"profiles" | "boxes" | "calculator">("profiles")

  // Dialog management for Profiles
  const [isProfileDialogOpen, setIsProfileDialogOpen] = useState(false)
  const [editingProfile, setEditingProfile] = useState<BaliciProfil | null>(null)
  const [isProfileSubmitting, setIsProfileSubmitting] = useState(false)
  const [profileFormData, setProfileFormData] = useState<Partial<BaliciProfil>>({
    nazev: "",
    typ_obalu: "krabice_standard",
    delka_cm: null,
    sirka_cm: null,
    vyska_cm: null,
    je_delka_fixni: false,
    je_sirka_fixni: false,
    je_vyska_fixni: false,
    max_hmotnost_kg: null,
    koeficient_objemove_hmotnosti: 5000,
    padding_delka_cm: 0,
    padding_sirka_cm: 0,
    padding_vyska_cm: 0,
    hustota_kg_dm3: 0.45,
    poznamka: "",
  })

  // Dialog management for Box Sizes
  const [isBoxDialogOpen, setIsBoxDialogOpen] = useState(false)
  const [editingBox, setEditingBox] = useState<StandardBoxSize | null>(null)
  const [isBoxSubmitting, setIsBoxSubmitting] = useState(false)
  const [boxFormData, setBoxFormData] = useState<Partial<StandardBoxSize>>({
    nazev: "",
    delka_cm: 0,
    sirka_cm: 0,
    vyska_cm: 0,
    max_hmotnost_kg: null,
    je_dlouha: false,
    poradi: 0,
    poznamka: "",
  })

  // Calculator State
  const [calcProfileId, setCalcProfileId] = useState<string>("")
  const [calcWeight, setCalcWeight] = useState<number>(10)
  const [calcOverrides, setCalcOverrides] = useState({
    delka: "",
    sirka: "",
    vyska: "",
  })

  // Handlers for Profiles
  const handleOpenCreateProfile = () => {
    setEditingProfile(null)
    setProfileFormData({
      nazev: "",
      typ_obalu: "krabice_standard",
      delka_cm: null,
      sirka_cm: null,
      vyska_cm: null,
      je_delka_fixni: false,
      je_sirka_fixni: false,
      je_vyska_fixni: false,
      max_hmotnost_kg: null,
      koeficient_objemove_hmotnosti: 5000,
      padding_delka_cm: 0,
      padding_sirka_cm: 0,
      padding_vyska_cm: 0,
      hustota_kg_dm3: 0.45,
      poznamka: "",
    })
    setIsProfileDialogOpen(true)
  }

  const handleOpenEditProfile = (profile: BaliciProfil) => {
    setEditingProfile(profile)
    setProfileFormData(profile)
    setIsProfileDialogOpen(true)
  }

  const handleProfileSubmit = async () => {
    if (!profileFormData.nazev) {
      toast.error("Zadejte název profilu")
      return
    }

    setIsProfileSubmitting(true)
    try {
      if (editingProfile) {
        const { error } = await updatePackagingProfile(editingProfile.id!, profileFormData)
        if (error) throw error
        toast.success("Balicí profil aktualizován")
      } else {
        const { error } = await createPackagingProfile(profileFormData)
        if (error) throw error
        toast.success("Balicí profil vytvořen")
      }
      setIsProfileDialogOpen(false)
    } catch (error: any) {
      toast.error("Chyba při ukládání profilu", { description: error.message })
    } finally {
      setIsProfileSubmitting(false)
    }
  }

  const handleProfileDelete = async (id: string) => {
    try {
      const { error } = await deletePackagingProfile(id)
      if (error) throw error
      toast.success("Balicí profil smazán")
    } catch (error: any) {
      toast.error("Chyba při mazání profilu", { description: error.message })
    }
  }

  // Handlers for Box Sizes
  const handleOpenCreateBox = () => {
    setEditingBox(null)
    setBoxFormData({
      nazev: "",
      delka_cm: 0,
      sirka_cm: 0,
      vyska_cm: 0,
      max_hmotnost_kg: null,
      je_dlouha: false,
      poradi: 0,
      poznamka: "",
    })
    setIsBoxDialogOpen(true)
  }

  const handleOpenEditBox = (box: StandardBoxSize) => {
    setEditingBox(box)
    setBoxFormData(box)
    setIsBoxDialogOpen(true)
  }

  const handleBoxSubmit = async () => {
    if (!boxFormData.nazev || !boxFormData.delka_cm || !boxFormData.sirka_cm || !boxFormData.vyska_cm) {
      toast.error("Vyplňte název a všechny rozměry krabice")
      return
    }

    setIsBoxSubmitting(true)
    try {
      if (editingBox) {
        const { error } = await updateStandardBoxSize(editingBox.id!, boxFormData)
        if (error) throw error
        toast.success("Krabice aktualizována")
      } else {
        const { error } = await createStandardBoxSize(boxFormData)
        if (error) throw error
        toast.success("Krabice vytvořena")
      }
      setIsBoxDialogOpen(false)
    } catch (error: any) {
      toast.error("Chyba při ukládání krabice", { description: error.message })
    } finally {
      setIsBoxSubmitting(false)
    }
  }

  const handleBoxDelete = async (id: string) => {
    try {
      const { error } = await deleteStandardBoxSize(id)
      if (error) throw error
      toast.success("Standardní velikost smazána")
    } catch (error: any) {
      toast.error("Chyba při mazání krabice", { description: error.message })
    }
  }

  // Live dimensional calculator logic
  const selectedCalcProfile = useMemo(() => {
    return profiles.find((p) => p.id === calcProfileId) || null
  }, [profiles, calcProfileId])

  const calculatedResult = useMemo(() => {
    const overrides = {
      delka: calcOverrides.delka ? parseFloat(calcOverrides.delka) : null,
      sirka: calcOverrides.sirka ? parseFloat(calcOverrides.sirka) : null,
      vyska: calcOverrides.vyska ? parseFloat(calcOverrides.vyska) : null,
    }
    return resolvePackageDimensions(calcWeight, selectedCalcProfile, overrides, boxSizes)
  }, [calcWeight, selectedCalcProfile, calcOverrides, boxSizes])

  return (
    <div className="space-y-6">
      {/* Tab Selectors */}
      <div className="flex flex-wrap justify-between items-center gap-4">
        <div className="flex bg-zinc-900 border border-zinc-800 rounded-lg p-1">
          <button
            onClick={() => setActiveSubTab("profiles")}
            className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all ${
              activeSubTab === "profiles" ? "bg-zinc-800 text-white font-bold" : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Package className="h-3.5 w-3.5 inline mr-1.5" /> Balicí profily
          </button>
          <button
            onClick={() => setActiveSubTab("boxes")}
            className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all ${
              activeSubTab === "boxes" ? "bg-zinc-800 text-white font-bold" : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Box className="h-3.5 w-3.5 inline mr-1.5" /> Katalog krabic
          </button>
          <button
            onClick={() => setActiveSubTab("calculator")}
            className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all ${
              activeSubTab === "calculator" ? "bg-zinc-800 text-white font-bold" : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Ruler className="h-3.5 w-3.5 inline mr-1.5" /> Live Kalkulátor
          </button>
        </div>

        {activeSubTab === "profiles" && (
          <Button onClick={handleOpenCreateProfile} className="gap-2">
            <Plus className="h-4 w-4" /> Nový profil
          </Button>
        )}
        {activeSubTab === "boxes" && (
          <Button onClick={handleOpenCreateBox} className="gap-2">
            <Plus className="h-4 w-4" /> Nová velikost
          </Button>
        )}
      </div>

      {/* SUBTAB CONTENT: PROFILES */}
      {activeSubTab === "profiles" && (
        <div className="border border-zinc-800 rounded-xl overflow-hidden bg-zinc-950 shadow-2xl">
          <Table>
            <TableHeader className="bg-zinc-900/50">
              <TableRow className="hover:bg-transparent border-zinc-800">
                <TableHead className="text-zinc-400 font-bold uppercase text-[10px] tracking-wider">Název profilu</TableHead>
                <TableHead className="text-zinc-400 font-bold uppercase text-[10px] tracking-wider">Typ obalu</TableHead>
                <TableHead className="text-zinc-400 font-bold uppercase text-[10px] tracking-wider">Fixní rozměry</TableHead>
                <TableHead className="text-zinc-400 font-bold uppercase text-[10px] tracking-wider text-center">Koeficient</TableHead>
                <TableHead className="text-zinc-400 font-bold uppercase text-[10px] tracking-wider text-center">Paddings (D/Š/V)</TableHead>
                <TableHead className="text-zinc-400 font-bold uppercase text-[10px] tracking-wider text-center">Hustota role</TableHead>
                <TableHead className="text-zinc-400 font-bold uppercase text-[10px] tracking-wider text-right">Akce</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {profiles.length > 0 ? (
                profiles.map((p) => (
                  <TableRow key={p.id} className="border-zinc-800 hover:bg-zinc-900/30 transition-colors group">
                    <TableCell className="font-bold text-zinc-200">
                      <div>
                        {p.nazev}
                        {p.poznamka && <p className="text-[10px] text-zinc-500 font-normal mt-0.5">{p.poznamka}</p>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-zinc-900 border-zinc-850 text-zinc-300">
                        {OBAL_TYPES[p.typ_obalu] || p.typ_obalu}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-zinc-400">
                      {p.delka_cm !== null || p.sirka_cm !== null || p.vyska_cm !== null ? (
                        <span>
                          {p.delka_cm ?? "?"} × {p.sirka_cm ?? "?"} × {p.vyska_cm ?? "?"} cm
                        </span>
                      ) : (
                        <span className="italic text-zinc-600">Dynamický</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center font-mono text-zinc-300">{p.koeficient_objemove_hmotnosti}</TableCell>
                    <TableCell className="text-center text-xs text-zinc-400 font-mono">
                      +{p.padding_delka_cm}/+{p.padding_sirka_cm}/+{p.padding_vyska_cm} cm
                    </TableCell>
                    <TableCell className="text-center text-xs text-zinc-400 font-mono">
                      {p.typ_obalu === "role" ? `${p.hustota_kg_dm3} kg/dm³` : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenEditProfile(p)}
                          className="h-7 w-7 text-zinc-400 hover:text-white"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>

                        <AlertDialog>
                          <AlertDialogTrigger render={
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-red-400/70 hover:text-red-400 hover:bg-red-500/10"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          } />
                          <AlertDialogContent className="bg-zinc-950 border border-zinc-800">
                            <AlertDialogHeader>
                              <AlertDialogTitle className="text-zinc-100">Smazat balicí profil?</AlertDialogTitle>
                              <AlertDialogDescription className="text-zinc-400">
                                Opravdu chcete smazat balicí profil "{p.nazev}"? Tato akce může ovlivnit produkty, které tento profil používají.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel className="bg-zinc-900 border-zinc-850 hover:bg-zinc-800 text-zinc-200">Storno</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleProfileDelete(p.id!)}
                                className="bg-red-650 hover:bg-red-700 text-white"
                              >
                                Odstranit
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center p-8 text-zinc-500 italic">
                    Nebyly nalezeny žádné balicí profily. Vytvořte nový profil.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* SUBTAB CONTENT: BOX CATALOG */}
      {activeSubTab === "boxes" && (
        <div className="border border-zinc-800 rounded-xl overflow-hidden bg-zinc-950 shadow-2xl">
          <Table>
            <TableHeader className="bg-zinc-900/50">
              <TableRow className="hover:bg-transparent border-zinc-800">
                <TableHead className="text-zinc-400 font-bold uppercase text-[10px] tracking-wider w-[80px]">Pořadí</TableHead>
                <TableHead className="text-zinc-400 font-bold uppercase text-[10px] tracking-wider">Název velikosti</TableHead>
                <TableHead className="text-zinc-400 font-bold uppercase text-[10px] tracking-wider">Rozměry (D × Š × V)</TableHead>
                <TableHead className="text-zinc-400 font-bold uppercase text-[10px] tracking-wider text-center">Max hmotnost</TableHead>
                <TableHead className="text-zinc-400 font-bold uppercase text-[10px] tracking-wider text-center">Typ krabice</TableHead>
                <TableHead className="text-zinc-400 font-bold uppercase text-[10px] tracking-wider text-right">Akce</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {boxSizes.length > 0 ? (
                boxSizes.map((b) => (
                  <TableRow key={b.id} className="border-zinc-800 hover:bg-zinc-900/30 transition-colors group">
                    <TableCell className="font-mono text-zinc-500 text-center font-bold">{b.poradi}</TableCell>
                    <TableCell className="font-bold text-zinc-200">
                      <div>
                        {b.nazev}
                        {b.poznamka && <p className="text-[10px] text-zinc-500 font-normal mt-0.5">{b.poznamka}</p>}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-zinc-400">
                      {b.delka_cm} × {b.sirka_cm} × {b.vyska_cm} cm
                    </TableCell>
                    <TableCell className="text-center font-mono text-zinc-300">
                      {b.max_hmotnost_kg ? `${b.max_hmotnost_kg} kg` : "Bez limitu"}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant="outline"
                        className={
                          b.je_dlouha
                            ? "bg-amber-950/20 border-amber-900/40 text-amber-300"
                            : "bg-zinc-900 border-zinc-850 text-zinc-300"
                        }
                      >
                        {b.je_dlouha ? "Dlouhá (tubus/role)" : "Rovnoměrná"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenEditBox(b)}
                          className="h-7 w-7 text-zinc-400 hover:text-white"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>

                        <AlertDialog>
                          <AlertDialogTrigger render={
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-red-400/70 hover:text-red-400 hover:bg-red-500/10"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          } />
                          <AlertDialogContent className="bg-zinc-950 border border-zinc-800">
                            <AlertDialogHeader>
                              <AlertDialogTitle className="text-zinc-100">Smazat standardní krabici?</AlertDialogTitle>
                              <AlertDialogDescription className="text-zinc-400">
                                Opravdu chcete smazat velikost "{b.nazev}"? To může ovlivnit automatický výběr krabic u stávajících profilů.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel className="bg-zinc-900 border-zinc-850 hover:bg-zinc-800 text-zinc-200">Storno</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleBoxDelete(b.id!)}
                                className="bg-red-650 hover:bg-red-700 text-white"
                              >
                                Odstranit
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center p-8 text-zinc-500 italic">
                    Nebyly nalezeny žádné standardní krabice.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* SUBTAB CONTENT: INTERACTIVE CALCULATOR */}
      {activeSubTab === "calculator" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="p-6 bg-zinc-950 border border-zinc-800 rounded-xl space-y-6">
            <h3 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
              <Scale className="h-5 w-5 text-primary" /> Vstupní parametry
            </h3>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Balicí profil pro testování</Label>
                <Select value={calcProfileId} onValueChange={(val) => setCalcProfileId(val || "")}>
                  <SelectTrigger className="bg-zinc-900 border-zinc-800">
                    <SelectValue placeholder="Vyberte profil..." />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-950 border-zinc-800">
                    {profiles.map((p) => (
                      <SelectItem key={p.id} value={p.id!}>
                        {p.nazev} ({OBAL_TYPES[p.typ_obalu]})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label>Reálná hmotnost balíku (kg)</Label>
                  <span className="text-xs font-mono font-bold text-primary">{calcWeight} kg</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="100"
                  step="0.5"
                  value={calcWeight}
                  onChange={(e) => setCalcWeight(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-primary"
                />
                <div className="flex justify-between text-[10px] text-zinc-500 font-mono">
                  <span>0.1 kg</span>
                  <span>50 kg</span>
                  <span>100 kg</span>
                </div>
              </div>

              <div className="border-t border-zinc-900 pt-4 space-y-4">
                <span className="text-xs uppercase font-bold text-zinc-500 tracking-wider">Overrides (Manuální přepsání)</span>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Délka (cm)</Label>
                    <Input
                      type="number"
                      placeholder="Přepsat D"
                      value={calcOverrides.delka}
                      onChange={(e) => setCalcOverrides((prev) => ({ ...prev, delka: e.target.value }))}
                      className="bg-zinc-900 border-zinc-800 text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Šířka (cm)</Label>
                    <Input
                      type="number"
                      placeholder="Přepsat Š"
                      value={calcOverrides.sirka}
                      onChange={(e) => setCalcOverrides((prev) => ({ ...prev, sirka: e.target.value }))}
                      className="bg-zinc-900 border-zinc-800 text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Výška (cm)</Label>
                    <Input
                      type="number"
                      placeholder="Přepsat V"
                      value={calcOverrides.vyska}
                      onChange={(e) => setCalcOverrides((prev) => ({ ...prev, vyska: e.target.value }))}
                      className="bg-zinc-900 border-zinc-800 text-xs"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="p-6 bg-zinc-950 border border-zinc-850 rounded-xl flex flex-col justify-between shadow-xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <Sparkles className="h-32 w-32 text-primary" />
            </div>

            <div>
              <h3 className="text-lg font-bold text-zinc-100 flex items-center gap-2 mb-6">
                <Sparkles className="h-5 w-5 text-primary" /> Výsledky kalkulace (v2 Engine)
              </h3>

              <div className="space-y-6">
                {/* 3D Dimensions Box */}
                <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 space-y-3">
                  <span className="text-[10px] uppercase font-bold text-zinc-500">Vypočtené rozměry balení</span>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-2.5 bg-zinc-950 border border-zinc-850 rounded-lg">
                      <span className="block text-[10px] text-zinc-500 uppercase">Délka</span>
                      <span className="text-lg font-mono font-black text-white">{calculatedResult.delka_cm} cm</span>
                    </div>
                    <div className="p-2.5 bg-zinc-950 border border-zinc-850 rounded-lg">
                      <span className="block text-[10px] text-zinc-500 uppercase">Šířka</span>
                      <span className="text-lg font-mono font-black text-white">{calculatedResult.sirka_cm} cm</span>
                    </div>
                    <div className="p-2.5 bg-zinc-950 border border-zinc-850 rounded-lg">
                      <span className="block text-[10px] text-zinc-500 uppercase">Výška</span>
                      <span className="text-lg font-mono font-black text-white">{calculatedResult.vyska_cm} cm</span>
                    </div>
                  </div>
                  <div className="flex justify-between text-[11px] text-zinc-400 mt-2 px-1">
                    <span>Metoda určení:</span>
                    <span className="font-bold text-primary">
                      {calculatedResult.resolvedBy === "override" && "Vlastní override na produktu"}
                      {calculatedResult.resolvedBy === "profile_fixed" && "Fixní rozměry z profilu"}
                      {calculatedResult.resolvedBy === "profile_roll_calc" && "Vypočteno z objemu role (hustota)"}
                      {calculatedResult.resolvedBy === "profile_box_lookup" && "Katalog krabic (váhový lookup)"}
                      {calculatedResult.resolvedBy === "fallback" && "Nespecifikováno (Fallback)"}
                    </span>
                  </div>
                </div>

                {/* Weight Comparison */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-zinc-900/30 border border-zinc-800 rounded-xl">
                    <span className="block text-[10px] text-zinc-500 uppercase">Reálná hmotnost</span>
                    <div className="flex items-baseline gap-1 mt-1">
                      <span className="text-2xl font-black text-zinc-300">{calcWeight}</span>
                      <span className="text-xs text-zinc-500 font-bold">kg</span>
                    </div>
                  </div>
                  <div className="p-4 bg-zinc-900/30 border border-zinc-800 rounded-xl relative overflow-hidden">
                    <span className="block text-[10px] text-zinc-500 uppercase">Objemová hmotnost</span>
                    <div className="flex items-baseline gap-1 mt-1">
                      <span className="text-2xl font-black text-zinc-300">{calculatedResult.volumetricWeight_kg}</span>
                      <span className="text-xs text-zinc-500 font-bold">kg</span>
                    </div>
                    <span className="absolute right-3 bottom-2 text-[9px] text-zinc-600 font-mono">
                      koef: {selectedCalcProfile?.koeficient_objemove_hmotnosti ?? 5000}
                    </span>
                  </div>
                </div>

                {/* Billed Weight Highlight */}
                <div className="p-5 bg-primary/5 border border-primary/20 rounded-xl flex items-center justify-between">
                  <div>
                    <span className="block text-[10px] text-primary/70 uppercase font-bold tracking-wider">
                      Fakturovaná hmotnost (Účtovaná)
                    </span>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Větší z reálné a objemové hmotnosti.
                    </p>
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-3xl font-black text-white">{calculatedResult.billedWeight_kg}</span>
                    <span className="text-sm font-bold text-zinc-400">kg</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 text-[11px] text-zinc-500 flex items-start gap-1.5 border-t border-zinc-900 pt-4">
              <AlertCircle className="h-4 w-4 text-zinc-400 mt-0.5 shrink-0" />
              <span>
                Fakturovaná hmotnost se automaticky posílá do logistického v2 engine. Pro role se průměr automaticky dopočítává z
                objemu tkaniny při zadané hustotě materiálu.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* DIALOG FOR CREATING/EDITING PACKAGING PROFILES */}
      <Dialog open={isProfileDialogOpen} onOpenChange={setIsProfileDialogOpen}>
        <DialogContent className="bg-zinc-950 border border-zinc-800 max-w-lg text-zinc-100">
          <DialogHeader>
            <DialogTitle className="text-zinc-200">
              {editingProfile ? `Upravit balicí profil: ${editingProfile.nazev}` : "Nový balicí profil"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="prof-nazev">Název profilu</Label>
              <Input
                id="prof-nazev"
                value={profileFormData.nazev || ""}
                onChange={(e) => setProfileFormData((prev) => ({ ...prev, nazev: e.target.value }))}
                className="bg-zinc-900 border-zinc-800"
                placeholder="Např. Role tkanina 127cm"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="prof-typ">Typ obalu</Label>
                <Select
                  value={profileFormData.typ_obalu}
                  onValueChange={(val: any) => setProfileFormData((prev) => ({ ...prev, typ_obalu: val }))}
                >
                  <SelectTrigger className="bg-zinc-900 border-zinc-800">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-950 border-zinc-800">
                    {Object.entries(OBAL_TYPES).map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="prof-maxweight">Max. hmotnost (kg)</Label>
                <Input
                  id="prof-maxweight"
                  type="number"
                  value={profileFormData.max_hmotnost_kg || ""}
                  onChange={(e) => setProfileFormData((prev) => ({ ...prev, max_hmotnost_kg: parseFloat(e.target.value) || null }))}
                  className="bg-zinc-900 border-zinc-800"
                  placeholder="Bez limitu"
                />
              </div>
            </div>

            {/* Dimensional properties depending on typ_obalu */}
            {profileFormData.typ_obalu !== "krabice_standard" && (
              <div className="border border-zinc-900 rounded-lg p-4 bg-zinc-900/20 space-y-4">
                <span className="text-xs font-bold text-zinc-400">Rozměry balení (cm)</span>
                
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Délka (cm)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={profileFormData.delka_cm || ""}
                      onChange={(e) => setProfileFormData((prev) => ({ ...prev, delka_cm: parseFloat(e.target.value) || null }))}
                      className="bg-zinc-900 border-zinc-800 text-xs"
                      disabled={profileFormData.typ_obalu === "krabice_dlouha" && !profileFormData.je_delka_fixni}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Šířka (cm)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={profileFormData.sirka_cm || ""}
                      onChange={(e) => setProfileFormData((prev) => ({ ...prev, sirka_cm: parseFloat(e.target.value) || null }))}
                      className="bg-zinc-900 border-zinc-800 text-xs"
                      disabled={profileFormData.typ_obalu === "role" || profileFormData.typ_obalu === "krabice_dlouha"}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Výška (cm)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={profileFormData.vyska_cm || ""}
                      onChange={(e) => setProfileFormData((prev) => ({ ...prev, vyska_cm: parseFloat(e.target.value) || null }))}
                      className="bg-zinc-900 border-zinc-800 text-xs"
                      disabled={profileFormData.typ_obalu === "role" || profileFormData.typ_obalu === "krabice_dlouha"}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 items-center pt-2">
                  <div className="flex items-center justify-between bg-zinc-900/50 px-2 py-1.5 rounded border border-zinc-850">
                    <span className="text-[10px] text-zinc-400">D fixní</span>
                    <Switch
                      checked={profileFormData.je_delka_fixni}
                      onCheckedChange={(checked) => setProfileFormData((prev) => ({ ...prev, je_delka_fixni: checked }))}
                    />
                  </div>
                  <div className="flex items-center justify-between bg-zinc-900/50 px-2 py-1.5 rounded border border-zinc-850">
                    <span className="text-[10px] text-zinc-400">Š fixní</span>
                    <Switch
                      checked={profileFormData.je_sirka_fixni}
                      onCheckedChange={(checked) => setProfileFormData((prev) => ({ ...prev, je_sirka_fixni: checked }))}
                      disabled={profileFormData.typ_obalu === "role" || profileFormData.typ_obalu === "krabice_dlouha"}
                    />
                  </div>
                  <div className="flex items-center justify-between bg-zinc-900/50 px-2 py-1.5 rounded border border-zinc-850">
                    <span className="text-[10px] text-zinc-400">V fixní</span>
                    <Switch
                      checked={profileFormData.je_vyska_fixni}
                      onCheckedChange={(checked) => setProfileFormData((prev) => ({ ...prev, je_vyska_fixni: checked }))}
                      disabled={profileFormData.typ_obalu === "role" || profileFormData.typ_obalu === "krabice_dlouha"}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Role specific properties */}
            {profileFormData.typ_obalu === "role" && (
              <div className="space-y-2">
                <Label htmlFor="prof-density">Hustota tkaniny (kg/dm³)</Label>
                <Input
                  id="prof-density"
                  type="number"
                  step="0.001"
                  value={profileFormData.hustota_kg_dm3 || ""}
                  onChange={(e) => setProfileFormData((prev) => ({ ...prev, hustota_kg_dm3: parseFloat(e.target.value) || 0.45 }))}
                  className="bg-zinc-900 border-zinc-800"
                  placeholder="Výchozí 0.450"
                />
                <p className="text-[10px] text-zinc-500 italic">Používá se pro dopočet průměru role (uhlíková tkanina ~0.4, skelná tkanina ~0.5).</p>
              </div>
            )}

            {/* Paddings and volumetric properties */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="prof-koef">Koeficient objemové hm.</Label>
                <Input
                  id="prof-koef"
                  type="number"
                  value={profileFormData.koeficient_objemove_hmotnosti || ""}
                  onChange={(e) => setProfileFormData((prev) => ({ ...prev, koeficient_objemove_hmotnosti: parseInt(e.target.value) || 5000 }))}
                  className="bg-zinc-900 border-zinc-800"
                />
              </div>

              <div className="space-y-2">
                <Label>Paddings - přídavky (D/Š/V cm)</Label>
                <div className="grid grid-cols-3 gap-2">
                  <Input
                    placeholder="D"
                    type="number"
                    value={profileFormData.padding_delka_cm ?? 0}
                    onChange={(e) => setProfileFormData((prev) => ({ ...prev, padding_delka_cm: parseFloat(e.target.value) || 0 }))}
                    className="bg-zinc-900 border-zinc-800 text-xs px-2 text-center"
                  />
                  <Input
                    placeholder="Š"
                    type="number"
                    value={profileFormData.padding_sirka_cm ?? 0}
                    onChange={(e) => setProfileFormData((prev) => ({ ...prev, padding_sirka_cm: parseFloat(e.target.value) || 0 }))}
                    className="bg-zinc-900 border-zinc-800 text-xs px-2 text-center"
                  />
                  <Input
                    placeholder="V"
                    type="number"
                    value={profileFormData.padding_vyska_cm ?? 0}
                    onChange={(e) => setProfileFormData((prev) => ({ ...prev, padding_vyska_cm: parseFloat(e.target.value) || 0 }))}
                    className="bg-zinc-900 border-zinc-800 text-xs px-2 text-center"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="prof-poznamka">Poznámka</Label>
              <textarea
                id="prof-poznamka"
                value={profileFormData.poznamka || ""}
                onChange={(e) => setProfileFormData((prev) => ({ ...prev, poznamka: e.target.value }))}
                className="w-full min-h-[60px] bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-sm focus:outline-none focus:border-primary text-zinc-200"
                placeholder="Popis použití profilu..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsProfileDialogOpen(false)} className="bg-zinc-900 border-zinc-800 hover:bg-zinc-800">
              Zrušit
            </Button>
            <Button onClick={handleProfileSubmit} disabled={isProfileSubmitting}>
              {isProfileSubmitting ? "Ukládám..." : "Uložit profil"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG FOR CREATING/EDITING BOX SIZES */}
      <Dialog open={isBoxDialogOpen} onOpenChange={setIsBoxDialogOpen}>
        <DialogContent className="bg-zinc-950 border border-zinc-800 max-w-md text-zinc-100">
          <DialogHeader>
            <DialogTitle className="text-zinc-200">{editingBox ? "Upravit krabici" : "Nová standardní krabice"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="box-nazev">Název velikosti</Label>
              <Input
                id="box-nazev"
                value={boxFormData.nazev || ""}
                onChange={(e) => setBoxFormData((prev) => ({ ...prev, nazev: e.target.value }))}
                className="bg-zinc-900 border-zinc-800"
                placeholder="Např. Střední 50×40×40"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Délka (cm)</Label>
                <Input
                  type="number"
                  value={boxFormData.delka_cm || ""}
                  onChange={(e) => setBoxFormData((prev) => ({ ...prev, delka_cm: parseFloat(e.target.value) || 0 }))}
                  className="bg-zinc-900 border-zinc-800 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Šířka (cm)</Label>
                <Input
                  type="number"
                  value={boxFormData.sirka_cm || ""}
                  onChange={(e) => setBoxFormData((prev) => ({ ...prev, sirka_cm: parseFloat(e.target.value) || 0 }))}
                  className="bg-zinc-900 border-zinc-800 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Výška (cm)</Label>
                <Input
                  type="number"
                  value={boxFormData.vyska_cm || ""}
                  onChange={(e) => setBoxFormData((prev) => ({ ...prev, vyska_cm: parseFloat(e.target.value) || 0 }))}
                  className="bg-zinc-900 border-zinc-800 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="box-maxweight">Max. hmotnost (kg)</Label>
                <Input
                  id="box-maxweight"
                  type="number"
                  value={boxFormData.max_hmotnost_kg || ""}
                  onChange={(e) => setBoxFormData((prev) => ({ ...prev, max_hmotnost_kg: parseFloat(e.target.value) || null }))}
                  className="bg-zinc-900 border-zinc-800"
                  placeholder="Bez limitu"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="box-order">Pořadí řazení</Label>
                <Input
                  id="box-order"
                  type="number"
                  value={boxFormData.poradi ?? 0}
                  onChange={(e) => setBoxFormData((prev) => ({ ...prev, poradi: parseInt(e.target.value) || 0 }))}
                  className="bg-zinc-900 border-zinc-800"
                />
              </div>
            </div>

            <div className="flex items-center justify-between bg-zinc-900/50 px-3 py-2.5 rounded-lg border border-zinc-800">
              <div>
                <Label className="text-sm">Dlouhá krabice</Label>
                <p className="text-[10px] text-zinc-500">True pro tubusy a podélné balení (např. 120cm+).</p>
              </div>
              <Switch
                checked={boxFormData.je_dlouha}
                onCheckedChange={(checked) => setBoxFormData((prev) => ({ ...prev, je_dlouha: checked }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="box-poznamka">Poznámka</Label>
              <textarea
                id="box-poznamka"
                value={boxFormData.poznamka || ""}
                onChange={(e) => setBoxFormData((prev) => ({ ...prev, poznamka: e.target.value }))}
                className="w-full min-h-[60px] bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-sm focus:outline-none focus:border-primary text-zinc-200"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBoxDialogOpen(false)} className="bg-zinc-900 border-zinc-800 hover:bg-zinc-800">
              Zrušit
            </Button>
            <Button onClick={handleBoxSubmit} disabled={isBoxSubmitting}>
              {isBoxSubmitting ? "Ukládám..." : "Uložit krabici"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
