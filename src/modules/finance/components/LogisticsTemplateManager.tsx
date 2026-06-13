"use client"

import { useState } from "react"
import { Plus, Trash2, Edit2, Truck, Ruler, Calculator, Banknote, ShieldAlert } from "lucide-react"
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
import { LogisticsTemplate } from "../types/logistics"
import { createLogisticsTemplate, updateLogisticsTemplate, deleteLogisticsTemplate } from "../actions"

interface LogisticsTemplateManagerProps {
  templates: LogisticsTemplate[]
}

export function LogisticsTemplateManager({ templates }: LogisticsTemplateManagerProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<LogisticsTemplate | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [formData, setFormData] = useState<Partial<LogisticsTemplate>>({
    nazev: "",
    typ_vypoctu_dopravy: "procentualni",
    sazba_dopravy: 0,
    poplatek_banka_czk: 190,
    poplatek_procleni_czk: 0,
    poplatek_odpady_czk: 0,
    poplatek_balne_czk: 0,
    vychozi_clo_procenta: 0,
  })

  const handleOpenCreate = () => {
    setEditingTemplate(null)
    setFormData({
      nazev: "",
      typ_vypoctu_dopravy: "procentualni",
      sazba_dopravy: 0,
      poplatek_banka_czk: 190,
      poplatek_procleni_czk: 0,
      poplatek_odpady_czk: 0,
      poplatek_balne_czk: 0,
      vychozi_clo_procenta: 0,
    })
    setIsDialogOpen(true)
  }

  const handleOpenEdit = (template: LogisticsTemplate) => {
    setEditingTemplate(template)
    setFormData(template)
    setIsDialogOpen(true)
  }

  const handleSubmit = async () => {
    if (!formData.nazev) {
      toast.error("Zadejte název šablony")
      return
    }

    setIsSubmitting(true)
    try {
      if (editingTemplate) {
        const { error } = await updateLogisticsTemplate(editingTemplate.id!, formData)
        if (error) throw error
        toast.success("Šablona aktualizována")
      } else {
        const { error } = await createLogisticsTemplate(formData)
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

  return (
    <div className="space-y-6">
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
              <TableHead className="text-zinc-400 font-bold uppercase text-[10px] tracking-wider">Doprava</TableHead>
              <TableHead className="text-zinc-400 font-bold uppercase text-[10px] tracking-wider text-right">Poplatky (CZK)</TableHead>
              <TableHead className="text-zinc-400 font-bold uppercase text-[10px] tracking-wider text-center">Clo (%)</TableHead>
              <TableHead className="text-zinc-400 font-bold uppercase text-[10px] tracking-wider text-right">Akce</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {templates.length > 0 ? templates.map((t) => (
              <TableRow key={t.id} className="border-zinc-800 hover:bg-zinc-900/30 transition-colors group">
                <TableCell className="font-bold text-zinc-200">{t.nazev}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px] uppercase border-zinc-700 bg-zinc-900/50">
                      {t.typ_vypoctu_dopravy === 'procentualni' ? 'Procentuální' : t.typ_vypoctu_dopravy === 'vaha_kg' ? 'Dle váhy' : 'Fixní'}
                    </Badge>
                    <span className="font-mono text-primary font-black">
                      {t.typ_vypoctu_dopravy === 'procentualni' ? `${(t.sazba_dopravy * 100).toFixed(0)}%` : `${t.sazba_dopravy} ${t.typ_vypoctu_dopravy === 'vaha_kg' ? 'EUR/kg' : 'EUR'}`}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-xs font-mono text-zinc-400">Banka: {t.poplatek_banka_czk}</span>
                    <span className="text-[10px] text-zinc-500">Odpady: {t.poplatek_odpady_czk} | Balné: {t.poplatek_balne_czk}</span>
                  </div>
                </TableCell>
                <TableCell className="text-center font-bold text-zinc-300">
                  {t.vychozi_clo_procenta}%
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
                          <AlertDialogAction onClick={() => handleDelete(t.id!)} className="bg-red-600 text-white hover:bg-red-700">Smazat</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </TableCell>
              </TableRow>
            )) : (
              <TableRow>
                <TableCell colSpan={5} className="h-32 text-center text-zinc-500 italic border-zinc-800">
                  Zatím nejsou definovány žádné logistické šablony.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl bg-zinc-950 border-zinc-800 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5 text-primary" />
              {editingTemplate ? 'Upravit logistickou šablonu' : 'Nová logistická šablona'}
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-6 py-4">
            <div className="col-span-2 space-y-2">
              <Label>Název šablony (např. Dovoz Čína - Letecky)</Label>
              <Input 
                value={formData.nazev} 
                onChange={(e) => setFormData({...formData, nazev: e.target.value})}
                placeholder="Název trasy"
                className="bg-zinc-900 border-zinc-800"
              />
            </div>

            <div className="space-y-4 p-4 bg-zinc-900/50 border border-zinc-800 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Ruler className="h-4 w-4 text-primary" />
                <h4 className="text-xs font-bold uppercase tracking-widest text-zinc-400">Výpočet dopravy</h4>
              </div>
              
              <div className="space-y-2">
                <Label className="text-[10px] uppercase">Typ výpočtu</Label>
                <Select 
                  value={formData.typ_vypoctu_dopravy} 
                  onValueChange={(v: any) => setFormData({...formData, typ_vypoctu_dopravy: v})}
                >
                  <SelectTrigger className="bg-zinc-950 border-zinc-800">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-950 border-zinc-800 text-white">
                    <SelectItem value="procentualni">Procentuální (% z nákupu)</SelectItem>
                    <SelectItem value="vaha_kg">Dle váhy (EUR/kg)</SelectItem>
                    <SelectItem value="fixni">Fixní částka (EUR/zásilka)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] uppercase">Sazba (v EUR nebo koeficient)</Label>
                <div className="relative">
                  <Input 
                    type="number" 
                    step="0.0001"
                    value={formData.sazba_dopravy} 
                    onChange={(e) => setFormData({...formData, sazba_dopravy: parseFloat(e.target.value) || 0})}
                    className="bg-zinc-950 border-zinc-800 pr-12"
                  />
                  <span className="absolute right-3 top-2 text-[10px] font-bold text-zinc-600 uppercase">
                    {formData.typ_vypoctu_dopravy === 'procentualni' ? 'Koef' : 'EUR'}
                  </span>
                </div>
                <p className="text-[10px] text-zinc-500 italic">
                  {formData.typ_vypoctu_dopravy === 'procentualni' ? 'Zadejte např. 0.41 pro 41% tarif dopravy.' : 'Zadejte částku v EUR.'}
                </p>
              </div>
            </div>

            <div className="space-y-4 p-4 bg-zinc-900/50 border border-zinc-800 rounded-lg">
               <div className="flex items-center gap-2 mb-2">
                <Banknote className="h-4 w-4 text-primary" />
                <h4 className="text-xs font-bold uppercase tracking-widest text-zinc-400">Fixní poplatky (CZK)</h4>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase">Banka / SWIFT</Label>
                  <Input 
                    type="number" 
                    value={formData.poplatek_banka_czk} 
                    onChange={(e) => setFormData({...formData, poplatek_banka_czk: parseFloat(e.target.value) || 0})}
                    className="bg-zinc-950 border-zinc-800"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase">Proclení</Label>
                  <Input 
                    type="number" 
                    value={formData.poplatek_procleni_czk} 
                    onChange={(e) => setFormData({...formData, poplatek_procleni_czk: parseFloat(e.target.value) || 0})}
                    className="bg-zinc-950 border-zinc-800"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase">Odpady</Label>
                  <Input 
                    type="number" 
                    value={formData.poplatek_odpady_czk} 
                    onChange={(e) => setFormData({...formData, poplatek_odpady_czk: parseFloat(e.target.value) || 0})}
                    className="bg-zinc-950 border-zinc-800"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase">Balné</Label>
                  <Input 
                    type="number" 
                    value={formData.poplatek_balne_czk} 
                    onChange={(e) => setFormData({...formData, poplatek_balne_czk: parseFloat(e.target.value) || 0})}
                    className="bg-zinc-950 border-zinc-800"
                  />
                </div>
              </div>
            </div>

            <div className="col-span-2 space-y-2">
              <Label className="text-[10px] uppercase">Výchozí clo (%) pro tuto trasu</Label>
              <Input 
                type="number" 
                step="0.1"
                value={formData.vychozi_clo_procenta} 
                onChange={(e) => setFormData({...formData, vychozi_clo_procenta: parseFloat(e.target.value) || 0})}
                className="bg-zinc-900 border-zinc-800"
              />
            </div>
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
