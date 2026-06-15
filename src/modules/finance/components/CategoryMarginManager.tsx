"use client"

import { useState } from "react"
import { ShieldCheck, Truck, ArrowRightLeft, Save, AlertTriangle, RefreshCcw } from "lucide-react"
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table"
import { Badge } from "@/shared/components/ui/badge"
import { updateCategoryDefaults, pushCategoryDefaultsToProducts } from "../actions"
import { LogisticsTemplate } from "../types/logistics"

interface CategoryMarginManagerProps {
  categories: any[]
  templates: LogisticsTemplate[]
}

export function CategoryMarginManager({ categories, templates }: CategoryMarginManagerProps) {
  const [isSubmitting, setIsSubmitting] = useState<string | null>(null)
  const [isPushing, setIsPushing] = useState<string | null>(null)
  
  // Lokální stav pro editaci řádků
  const [editedData, setEditedData] = useState<Record<string, any>>({})

  const handleUpdateField = (categoryId: string, field: string, value: any) => {
    setEditedData(prev => ({
      ...prev,
      [categoryId]: {
        ...(prev[categoryId] || categories.find(c => c.id === categoryId)),
        [field]: value
      }
    }))
  }

  const handleSave = async (categoryId: string) => {
    const data = editedData[categoryId]
    if (!data) return

    setIsSubmitting(categoryId)
    try {
      const { error } = await updateCategoryDefaults(categoryId, {
        def_marze_retail_procenta: parseFloat(data.def_marze_retail_procenta),
        def_marze_partner_procenta: parseFloat(data.def_marze_partner_procenta),
        def_marze_vip_procenta: parseFloat(data.def_marze_vip_procenta),
        def_marze_premarket_open_procenta: parseFloat(data.def_marze_premarket_open_procenta),
        def_logisticka_sablona_id: data.def_logisticka_sablona_id || null
      })

      if (error) throw error
      toast.success("Výchozí hodnoty kategorie uloženy")
      
      // Vyčistit lokální stav pro tento řádek
      const newEditedData = { ...editedData }
      delete newEditedData[categoryId]
      setEditedData(newEditedData)
    } catch (e: any) {
      toast.error("Chyba při ukládání", { description: e.message })
    } finally {
      setIsSubmitting(null)
    }
  }

  const handlePushToProducts = async (categoryId: string) => {
    if (!confirm("Opravdu chcete přepsat marže u všech existujících produktů v této kategorii? Tato akce je nevratná.")) return

    setIsPushing(categoryId)
    try {
      const result = await pushCategoryDefaultsToProducts(categoryId)
      if (result.error) throw result.error
      toast.success("Marže byly plošně aktualizovány u všech produktů v kategorii")
    } catch (e: any) {
      toast.error("Chyba při plošné aktualizaci", { description: e.message })
    } finally {
      setIsPushing(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-bold uppercase tracking-tight text-zinc-100">Správce Marží a Pravidel dle Kategorii</h2>
      </div>

      <div className="p-4 bg-blue-500/5 border border-blue-500/20 rounded-lg flex gap-3">
        <AlertTriangle className="h-5 w-5 text-blue-500 shrink-0" />
        <p className="text-xs text-zinc-400 leading-relaxed">
          Zde definujete <strong>globální pravidla</strong> pro celé kategorie. Tyto hodnoty se automaticky předvyplní při zakládání nového produktu. 
          Pomocí tlačítka "Aplikovat" můžete tyto hodnoty vynutit i u všech již existujících produktů v dané kategorii (např. při plošném zdražování).
        </p>
      </div>

      <div className="border border-zinc-800 rounded-xl overflow-hidden bg-zinc-950 shadow-2xl">
        <Table>
          <TableHeader className="bg-zinc-900/50">
            <TableRow className="hover:bg-transparent border-zinc-800">
              <TableHead className="text-zinc-400 font-bold uppercase text-[10px] tracking-wider">Kategorie</TableHead>
              <TableHead className="text-zinc-400 font-bold uppercase text-[10px] tracking-wider text-center">Retail (B2C) %</TableHead>
              <TableHead className="text-zinc-400 font-bold uppercase text-[10px] tracking-wider text-center">Partner (B2B) %</TableHead>
              <TableHead className="text-zinc-400 font-bold uppercase text-[10px] tracking-wider">Výchozí Logistika</TableHead>
              <TableHead className="text-zinc-400 font-bold uppercase text-[10px] tracking-wider text-right">Akce</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.map((cat) => {
              const current = editedData[cat.id] || cat
              const isChanged = !!editedData[cat.id]

              return (
                <TableRow key={cat.id} className="border-zinc-800 hover:bg-zinc-900/30 transition-colors group">
                  <TableCell className="font-bold text-zinc-200">
                    {cat.nazev}
                    <p className="text-[9px] text-zinc-500 font-normal uppercase">{cat.id}</p>
                  </TableCell>
                  
                  <TableCell className="w-24">
                    <Input 
                      type="number" 
                      value={current.def_marze_retail_procenta}
                      onChange={(e) => handleUpdateField(cat.id, 'def_marze_retail_procenta', e.target.value)}
                      className="bg-zinc-900 border-zinc-800 h-8 text-center text-xs"
                    />
                  </TableCell>

                  <TableCell className="w-24">
                    <Input 
                      type="number" 
                      value={current.def_marze_partner_procenta}
                      onChange={(e) => handleUpdateField(cat.id, 'def_marze_partner_procenta', e.target.value)}
                      className="bg-zinc-900 border-zinc-800 h-8 text-center text-xs"
                    />
                  </TableCell>

                <TableCell className="min-w-[200px]">
                    <Select 
                      value={current.def_logisticka_sablona_id || "none"} 
                      onValueChange={(v) => handleUpdateField(cat.id, 'def_logisticka_sablona_id', v === "none" ? null : v)}
                    >
                      <SelectTrigger className="bg-zinc-900 border-zinc-800 h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-950 border-zinc-800">
                        <SelectItem value="none">Není definováno</SelectItem>
                        {templates.map(t => (
                          <SelectItem key={t.id} value={t.id!}>{t.nazev}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>

                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button 
                        size="sm" 
                        variant={isChanged ? "default" : "ghost"}
                        disabled={!isChanged || isSubmitting === cat.id}
                        onClick={() => handleSave(cat.id)}
                        className="h-8 gap-1.5 text-[10px] uppercase font-bold"
                      >
                        <Save className="h-3 w-3" />
                        {isSubmitting === cat.id ? 'Ukládám...' : 'Uložit'}
                      </Button>
                      
                      <Button 
                        size="sm" 
                        variant="outline"
                        disabled={isPushing === cat.id}
                        onClick={() => handlePushToProducts(cat.id)}
                        className="h-8 gap-1.5 text-[10px] uppercase font-bold border-zinc-800 hover:bg-primary/10 hover:text-primary"
                      >
                        <RefreshCcw className={`h-3 w-3 ${isPushing === cat.id ? 'animate-spin' : ''}`} />
                        Aplikovat na produkty
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
