'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, FormProvider } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { FileText, Calendar, Building2, Save, ArrowLeft } from 'lucide-react'

import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select'
import { Switch } from '@/shared/components/ui/switch'
import { Textarea } from '@/shared/components/ui/textarea'

import { createPrijatyDoklad, updatePrijatyDoklad } from '../actions/procurement'
import { getRateForCurrencyAndDate } from '../actions/documents'
import { prijatyDokladSchema, type PrijatyDokladFormValues } from '../types/formSchema'
import type { PrijatyDoklad } from '../types'
import type { Supplier } from '@/modules/sourcing/types'
import type { Product } from '@/modules/products/types'
import { PrijateDocumentLineItems } from './PrijateDocumentLineItems'
import { dnesISO, addDays } from '../utils/calculations'

interface PrijatyDokladFormProps {
  suppliers: Supplier[]
  products: Product[]
  initialData?: PrijatyDoklad | null
}

export function PrijatyDokladForm({ suppliers, products, initialData }: PrijatyDokladFormProps) {
  const router = useRouter()
  const [isSaving, setIsSaving] = useState(false)
  const [isFirstMount, setIsFirstMount] = useState(true)

  const isEdit = !!initialData

  const methods = useForm<PrijatyDokladFormValues>({
    resolver: zodResolver(prijatyDokladSchema) as any,
    defaultValues: {
      typ:                   initialData?.typ ?? 'objednavka_dodavateli',
      cislo:                 initialData?.cislo ?? '',
      externi_cislo_faktury: initialData?.externi_cislo_faktury ?? '',
      dodavatel_id:          initialData?.dodavatel_id ?? '',
      rodic_id:              initialData?.rodic_id ?? null,
      datum_vystaveni:        initialData?.datum_vystaveni ?? dnesISO(),
      datum_prijeti:          initialData?.datum_prijeti ?? dnesISO(),
      datum_splatnosti:       initialData?.datum_splatnosti ?? addDays(14),
      duzp:                   initialData?.duzp ?? dnesISO(),
      jazyk:                  initialData?.jazyk ?? 'cs',
      mena:                   initialData?.mena ?? 'EUR',
      kurz_k_czk:             initialData?.kurz_k_czk ?? 1,
      platce_dph:             initialData?.platce_dph ?? true,
      zpusob_uhrady:          initialData?.zpusob_uhrady ?? 'prevod',
      poznamky:               initialData?.poznamky ?? '',
      interni_poznamky:       initialData?.interni_poznamky ?? '',
      polozky:                initialData?.polozky?.map(p => ({
        id: p.id,
        poradi: p.poradi,
        typ: p.typ as any,
        produkt_id: p.produkt_id,
        nazev: p.nazev,
        popis: p.popis ?? '',
        jednotka: p.jednotka,
        mnozstvi: p.mnozstvi,
        cena_bez_dph: p.cena_bez_dph,
        sazba_dph: p.sazba_dph,
        sleva_procent: p.sleva_procent,
      })) ?? [],
    },
  })

  const { register, handleSubmit, watch, setValue, formState: { errors } } = methods

  const selectedTyp = watch('typ')
  const selectedDodavatelId = watch('dodavatel_id')
  const selectedMena = watch('mena')
  const selectedDatumVystaveni = watch('datum_vystaveni')

  const selectedSupplier = suppliers.find(s => s.id === selectedDodavatelId)

  // Automatické přednastavení splatnosti podle dodavatele
  useEffect(() => {
    if (isEdit || !selectedDodavatelId) return
    const supplier = suppliers.find(s => s.id === selectedDodavatelId)
    if (supplier) {
      const splatnostDni = supplier.platebni_podminky_splatnost_dni ?? 14
      setValue('datum_splatnosti', addDays(splatnostDni))
      setValue('platce_dph', true)
    }
  }, [selectedDodavatelId, suppliers, setValue, isEdit])

  // Načtení měnového kurzu
  useEffect(() => {
    if (isEdit && isFirstMount) {
      setIsFirstMount(false)
      return
    }

    if (isFirstMount) {
      setIsFirstMount(false)
    }

    if (selectedMena === 'CZK') {
      setValue('kurz_k_czk', 1)
      return
    }

    const fetchRate = async () => {
      const datum = selectedDatumVystaveni || dnesISO()
      try {
        const rate = await getRateForCurrencyAndDate(selectedMena, datum)
        setValue('kurz_k_czk', rate)
      } catch (err) {
        console.error('Chyba při načítání kurzu:', err)
      }
    }

    fetchRate()
  }, [selectedMena, selectedDatumVystaveni, setValue, isEdit, isFirstMount])

  const handleSetSplatnost = (days: number) => {
    const vystaveni = watch('datum_vystaveni') || dnesISO()
    const date = new Date(vystaveni)
    date.setDate(date.getDate() + days)
    setValue('datum_splatnosti', date.toISOString().split('T')[0])
  }

  async function onSubmit(data: PrijatyDokladFormValues) {
    setIsSaving(true)
    try {
      let result
      if (isEdit && initialData) {
        result = await updatePrijatyDoklad(initialData.id, data as any)
      } else {
        result = await createPrijatyDoklad(data as any)
      }

      if (result.success) {
        toast.success(isEdit ? 'Nákupní doklad byl uložen' : 'Nákupní doklad byl vytvořen')
        router.push('/faktury/nakup')
        router.refresh()
      } else {
        toast.error(result.error ?? 'Chyba při ukládání dokladu')
      }
    } catch (e: any) {
      console.error(e)
      toast.error('Chyba serveru: ' + e.message)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <FormProvider {...methods}>
      <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-8 text-foreground max-w-[1600px] mx-auto w-full">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => router.push('/faktury/nakup')}
              className="bg-zinc-950 border-zinc-800"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                {isEdit ? `Upravit nákupní doklad ${initialData?.cislo}` : 'Nový nákupní doklad'}
              </h1>
              <p className="text-xs text-muted-foreground">
                {isEdit ? 'Úprava rozpracovaného konceptu nákupního dokladu.' : 'Vytvoření objednávky dodavateli nebo zaevidování přijaté faktury.'}
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/faktury/nakup')}
              className="bg-zinc-950 border-zinc-800 h-9"
            >
              Zrušit
            </Button>
            <Button
              type="submit"
              disabled={isSaving}
              className="gap-2 h-9"
            >
              <Save className="h-4 w-4" />
              {isSaving ? 'Ukládám...' : 'Uložit doklad'}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            <div className="bg-card border border-zinc-800 rounded-xl p-5 shadow-sm space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Building2 className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Základní určení nákupu
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5 col-span-1">
                  <Label>Typ dokladu *</Label>
                  <Select
                    disabled={isEdit}
                    onValueChange={(v) => setValue('typ', v as any)}
                    value={selectedTyp}
                  >
                    <SelectTrigger className="bg-zinc-950 border-zinc-800 h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-950 border-zinc-800 text-zinc-200">
                      <SelectItem value="objednavka_dodavateli">Objednávka dodavateli (PO)</SelectItem>
                      <SelectItem value="prijata_faktura">Přijatá faktura (Bill)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5 col-span-1">
                  <Label>Interní číslo (pořadové)</Label>
                  <Input
                    placeholder="Generuje se automaticky"
                    disabled={!isEdit}
                    {...register('cislo')}
                    className="bg-zinc-950 border-zinc-800 h-9 font-mono"
                  />
                </div>

                {selectedTyp === 'prijata_faktura' && (
                  <div className="space-y-1.5 col-span-1 md:col-span-2">
                    <Label htmlFor="externi_cislo_faktury">Číslo faktury dodavatele *</Label>
                    <Input
                      id="externi_cislo_faktury"
                      placeholder="e.g. FV-2026/123"
                      {...register('externi_cislo_faktury')}
                      className="bg-zinc-950 border-zinc-800 h-9"
                    />
                  </div>
                )}

                <div className="space-y-1.5 md:col-span-2">
                  <Label>Dodavatel *</Label>
                  <Select
                    onValueChange={(v) => setValue('dodavatel_id', v ?? '')}
                    value={selectedDodavatelId ?? ''}
                  >
                    <SelectTrigger className="bg-zinc-950 border-zinc-800 h-9">
                      <SelectValue placeholder="Vyberte dodavatele...">
                        {selectedSupplier ? `${selectedSupplier.nazev_spolecnosti} (${selectedSupplier.kod})` : undefined}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-950 border-zinc-800 text-zinc-200">
                      {suppliers.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.nazev_spolecnosti} ({s.kod})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.dodavatel_id && (
                    <p className="text-xs text-destructive">{errors.dodavatel_id.message}</p>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-card border border-zinc-800 rounded-xl p-5 shadow-sm">
              <PrijateDocumentLineItems
                products={products}
                isBill={selectedTyp === 'prijata_faktura'}
              />
            </div>

            <div className="bg-card border border-zinc-800 rounded-xl p-5 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="poznamky">Poznámky na dokladu (zobrazí se dodavateli)</Label>
                <Textarea
                  id="poznamky"
                  {...register('poznamky')}
                  placeholder="Poznámky, pokyny k doručení, dodací lhůty..."
                  rows={4}
                  className="bg-zinc-950 border-zinc-800 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="interni_poznamky">Interní poznámky (ERP)</Label>
                <Textarea
                  id="interni_poznamky"
                  {...register('interni_poznamky')}
                  placeholder="Interní pokyny, účetní zařazení..."
                  rows={4}
                  className="bg-zinc-950 border-zinc-800 text-xs"
                />
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-card border border-zinc-800 rounded-xl p-5 shadow-sm space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Termíny a nákupní data
                </h2>
              </div>

              <div className="space-y-3">
                <div className="space-y-1">
                  <Label htmlFor="datum_vystaveni">Datum vystavení *</Label>
                  <Input
                    id="datum_vystaveni"
                    type="date"
                    {...register('datum_vystaveni')}
                    className="bg-zinc-950 border-zinc-800 h-9 font-mono"
                  />
                </div>

                {selectedTyp === 'prijata_faktura' && (
                  <>
                    <div className="space-y-1">
                      <Label htmlFor="datum_prijeti">Datum doručení / přijetí *</Label>
                      <Input
                        id="datum_prijeti"
                        type="date"
                        {...register('datum_prijeti')}
                        className="bg-zinc-950 border-zinc-800 h-9 font-mono"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="datum_splatnosti">Datum splatnosti</Label>
                      <Input
                        id="datum_splatnosti"
                        type="date"
                        {...register('datum_splatnosti')}
                        className="bg-zinc-950 border-zinc-800 h-9 font-mono"
                      />
                      <div className="flex flex-wrap gap-1 mt-1">
                        <Button type="button" variant="outline" size="sm" onClick={() => handleSetSplatnost(7)} className="text-[10px] h-6 px-2 bg-zinc-950 border-zinc-800 text-zinc-400 font-mono">+7d</Button>
                        <Button type="button" variant="outline" size="sm" onClick={() => handleSetSplatnost(14)} className="text-[10px] h-6 px-2 bg-zinc-950 border-zinc-800 text-zinc-400 font-mono">+14d</Button>
                        <Button type="button" variant="outline" size="sm" onClick={() => handleSetSplatnost(30)} className="text-[10px] h-6 px-2 bg-zinc-950 border-zinc-800 text-zinc-400 font-mono">+30d</Button>
                        <Button type="button" variant="outline" size="sm" onClick={() => handleSetSplatnost(60)} className="text-[10px] h-6 px-2 bg-zinc-950 border-zinc-800 text-zinc-400 font-mono">+60d</Button>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="duzp">DUZP</Label>
                      <Input
                        id="duzp"
                        type="date"
                        {...register('duzp')}
                        className="bg-zinc-950 border-zinc-800 h-9 font-mono"
                      />
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="bg-card border border-zinc-800 rounded-xl p-5 shadow-sm space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Měna a účtování DPH
                </h2>
              </div>

              <div className="space-y-3">
                <div className="space-y-1">
                  <Label>Měna *</Label>
                  <Select
                    onValueChange={(v) => setValue('mena', v as any)}
                    value={selectedMena}
                  >
                    <SelectTrigger className="bg-zinc-950 border-zinc-800 h-9 font-mono">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-950 border-zinc-800 text-zinc-200">
                      <SelectItem value="CZK">CZK</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="GBP">GBP</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="kurz_k_czk">Kurz k CZK *</Label>
                  <Input
                    id="kurz_k_czk"
                    type="number"
                    step="any"
                    {...register('kurz_k_czk')}
                    className="bg-zinc-950 border-zinc-800 h-9 font-mono text-right"
                  />
                </div>

                <div className="flex items-center justify-between p-2 rounded-lg bg-zinc-900/30 border border-zinc-800/80">
                  <div className="space-y-0.5">
                    <Label htmlFor="platce-dph">Dodavatel je plátce DPH</Label>
                    <p className="text-[10px] text-muted-foreground">Ovlivňuje připočítání DPH u položek.</p>
                  </div>
                  <Switch
                    id="platce-dph"
                    checked={watch('platce_dph')}
                    onCheckedChange={(checked) => setValue('platce_dph', checked)}
                  />
                </div>

                <div className="space-y-1">
                  <Label>Způsob úhrady *</Label>
                  <Select
                    onValueChange={(v) => setValue('zpusob_uhrady', v as any)}
                    value={watch('zpusob_uhrady')}
                  >
                    <SelectTrigger className="bg-zinc-950 border-zinc-800 h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-950 border-zinc-800 text-zinc-200">
                      <SelectItem value="prevod">Bankovní převod</SelectItem>
                      <SelectItem value="hotovost">Hotovost</SelectItem>
                      <SelectItem value="karta">Platební karta</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label>Jazyk dokladu *</Label>
                  <Select
                    onValueChange={(v) => setValue('jazyk', v as any)}
                    value={watch('jazyk')}
                  >
                    <SelectTrigger className="bg-zinc-950 border-zinc-800 h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-950 border-zinc-800 text-zinc-200">
                      <SelectItem value="cs">Čeština</SelectItem>
                      <SelectItem value="en">English</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>
        </div>
      </form>
    </FormProvider>
  )
}
