'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, FormProvider } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { FileText, Calendar, Building2, CreditCard, DollarSign, ArrowLeft, Save } from 'lucide-react'

import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select'
import { Switch } from '@/shared/components/ui/switch'
import { Textarea } from '@/shared/components/ui/textarea'
import { Separator } from '@/shared/components/ui/separator'

import { createDoklad, updateDoklad, getRateForCurrencyAndDate } from '../actions/documents'
import { dokladSchema, type DokladFormValues } from '../types/formSchema'
import type { Zakaznik, Doklad } from '../types'
import type { Product } from '@/modules/products/types'
import { DocumentLineItems } from './DocumentLineItems'
import { dnesISO, addDays } from '../utils/calculations'

interface DocumentFormProps {
  customers: Zakaznik[]
  products: Product[]
  initialData?: Doklad | null
}

export function DocumentForm({ customers, products, initialData }: DocumentFormProps) {
  const router = useRouter()
  const [isSaving, setIsSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<'editor' | 'preview'>('editor')

  const isEdit = !!initialData
  const [isFirstMount, setIsFirstMount] = useState(true)

  const methods = useForm<DokladFormValues>({
    resolver: zodResolver(dokladSchema) as any,
    defaultValues: {
      typ:                   initialData?.typ ?? 'faktura',
      zakaznik_id:           initialData?.zakaznik_id ?? '',
      rodic_id:              initialData?.rodic_id ?? null,
      datum_vystaveni:        initialData?.datum_vystaveni ?? dnesISO(),
      datum_splatnosti:       initialData?.datum_splatnosti ?? addDays(14),
      duzp:                   initialData?.duzp ?? dnesISO(),
      datum_platnosti:        initialData?.datum_platnosti ?? '',
      jazyk:                  initialData?.jazyk ?? 'cs',
      mena:                   initialData?.mena ?? 'CZK',
      kurz_k_czk:             initialData?.kurz_k_czk ?? 1,
      platce_dph:             initialData?.platce_dph ?? true,
      reverse_charge:         initialData?.reverse_charge ?? false,
      tisk_podpisu:           initialData?.tisk_podpisu ?? true,
      zpusob_uhrady:          initialData?.zpusob_uhrady ?? 'prevod',
      zalohova_castka:        initialData?.zalohova_castka ?? null,
      zalohova_procento:      initialData?.zalohova_procento ?? null,
      poznamky:               initialData?.poznamky ?? '',
      interni_poznamky:       initialData?.interni_poznamky ?? '',
      polozky:                initialData?.polozky?.map(p => ({
        id: p.id,
        poradi: p.poradi,
        typ: p.typ,
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
  const selectedZakaznikId = watch('zakaznik_id')
  const selectedMena = watch('mena')
  const isReverseCharge = watch('reverse_charge')

  const selectedCustomer = customers.find(c => c.id === selectedZakaznikId)

  // Nastaví výchozí splatnost partnera při změně
  useEffect(() => {
    if (isEdit || !selectedZakaznikId) return

    const customer = customers.find(c => c.id === selectedZakaznikId)
    if (customer) {
      const splatnostDni = customer.platebni_podminky_splatnost_dni ?? 14
      setValue('datum_splatnosti', addDays(splatnostDni))
      setValue('platce_dph', customer.je_platce_dph)
      setValue('reverse_charge', customer.je_zahranicni)
    }
  }, [selectedZakaznikId, customers, setValue, isEdit])

  const handleSetSplatnost = (days: number) => {
    const vystaveni = watch('datum_vystaveni') || dnesISO()
    const date = new Date(vystaveni)
    date.setDate(date.getDate() + days)
    const formatted = date.toISOString().split('T')[0]
    setValue('datum_splatnosti', formatted)
  }

  const handleSetPlatnost = (days: number) => {
    const vystaveni = watch('datum_vystaveni') || dnesISO()
    const date = new Date(vystaveni)
    date.setDate(date.getDate() + days)
    const formatted = date.toISOString().split('T')[0]
    setValue('datum_platnosti', formatted)
  }

  const selectedDatumVystaveni = watch('datum_vystaveni')

  // Načtení kurzu z databáze při změně měny nebo data vystavení
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

  async function onSubmit(data: DokladFormValues) {
    setIsSaving(true)
    try {
      let result
      if (isEdit && initialData) {
        result = await updateDoklad(initialData.id, data as any)
      } else {
        result = await createDoklad(data as any)
      }

      if (result.success) {
        toast.success(isEdit ? 'Doklad byl úspěšně uložen' : 'Doklad byl úspěšně vytvořen')
        const resultAny = result as any
        if (isEdit) {
          router.refresh()
        } else if (resultAny.id) {
          router.push(`/faktury/${resultAny.id}/upravit`)
          router.refresh()
        }
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
        
        {/* Hlavička s navigací zpět */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => router.push('/faktury')}
              className="bg-zinc-950 border-zinc-800"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                {isEdit ? `Upravit doklad ${initialData?.cislo}` : 'Nový doklad'}
              </h1>
              <p className="text-xs text-muted-foreground">
                {isEdit ? 'Úprava rozpracovaného konceptu dokladu.' : 'Vytvoření nabídky, objednávky nebo faktury.'}
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/faktury')}
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
              {isSaving ? 'Ukládám...' : 'Uložit rozpracované'}
            </Button>
          </div>
        </div>

        {/* Tab Switcher */}
        {isEdit && (
          <div className="flex border-b border-zinc-800 gap-4 mb-2">
            <button
              type="button"
              onClick={() => setActiveTab('editor')}
              className={`pb-2.5 text-xs font-semibold uppercase tracking-wider transition-colors border-b-2 px-1 ${
                activeTab === 'editor'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-zinc-200'
              }`}
            >
              Editor dokladu
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('preview')}
              className={`pb-2.5 text-xs font-semibold uppercase tracking-wider transition-colors border-b-2 px-1 ${
                activeTab === 'preview'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-zinc-200'
              }`}
            >
              Náhled PDF
            </button>
          </div>
        )}

        {/* ── HLAVNÍ BLOKY / PREVIEW ── */}
        {activeTab === 'editor' ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Levý sloupec (2/3) - Hlavní informace */}
          <div className="md:col-span-2 space-y-6">
            
            {/* 1. TYP A ODBĚRATEL */}
            <div className="bg-card border border-zinc-800 rounded-xl p-5 shadow-sm space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Building2 className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Základní určení
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Typ dokladu */}
                <div className="space-y-1.5 col-span-1">
                  <Label>Typ dokladu *</Label>
                  <Select
                    disabled={isEdit}
                    onValueChange={(v) => setValue('typ', v as any)}
                    value={selectedTyp}
                  >
                    <SelectTrigger className="bg-zinc-950 border-zinc-800 h-9">
                      <SelectValue>
                        {selectedTyp === 'nabidka' ? 'Cenová nabídka' :
                         selectedTyp === 'objednavka' ? 'Přijatá objednávka' :
                         selectedTyp === 'zalohova_faktura' ? 'Zálohová faktura' :
                         selectedTyp === 'faktura' ? 'Faktura (daňový doklad)' :
                         selectedTyp === 'opravny_doklad' ? 'Opravný daňový doklad (Dobropis)' : undefined}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-950 border-zinc-800 text-zinc-200">
                      <SelectItem value="nabidka">Cenová nabídka</SelectItem>
                      <SelectItem value="objednavka">Přijatá objednávka</SelectItem>
                      <SelectItem value="zalohova_faktura">Zálohová faktura</SelectItem>
                      <SelectItem value="faktura">Faktura (daňový doklad)</SelectItem>
                      <SelectItem value="opravny_doklad">Opravný daňový doklad (Dobropis)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Konkrétní partner (Odběratel) */}
                <div className="space-y-1.5 col-span-1">
                  <Label>Odběratel *</Label>
                  <Select
                    onValueChange={(v) => setValue('zakaznik_id', v ?? '')}
                    value={selectedZakaznikId ?? ''}
                  >
                    <SelectTrigger className="bg-zinc-950 border-zinc-800 h-9">
                      <SelectValue placeholder="Vyberte zákazníka...">
                        {selectedCustomer ? `${selectedCustomer.nazev_spolecnosti} (${selectedCustomer.kod})` : undefined}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-950 border-zinc-800 text-zinc-200">
                      {customers.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.nazev_spolecnosti} ({c.kod})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.zakaznik_id && (
                    <p className="text-xs text-destructive">{errors.zakaznik_id.message}</p>
                  )}
                </div>
              </div>
            </div>

            {/* 2. POLOŽKY DOKLADU */}
            <div className="bg-card border border-zinc-800 rounded-xl p-5 shadow-sm">
              <DocumentLineItems
                products={products}
                isInvoice={selectedTyp === 'faktura'}
              />
            </div>

            {/* 3. VEŘEJNÉ A INTERNÍ POZNÁMKY */}
            <div className="bg-card border border-zinc-800 rounded-xl p-5 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="poznamky">Poznámky na dokladu (viditelné pro klienta)</Label>
                <Textarea
                  id="poznamky"
                  {...register('poznamky')}
                  placeholder="Platební detaily, doplňující informace pro klienta..."
                  rows={4}
                  className="bg-zinc-950 border-zinc-800 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="interni_poznamky">Interní poznámky (pouze pro náš ERP)</Label>
                <Textarea
                  id="interni_poznamky"
                  {...register('interni_poznamky')}
                  placeholder="Poznámky pro expedici, interní pokyny..."
                  rows={4}
                  className="bg-zinc-950 border-zinc-800 text-xs"
                />
              </div>
            </div>

          </div>

          {/* Pravý sloupec (1/3) - Detaily, Termíny a Měna */}
          <div className="space-y-6">
            
            {/* DATUMY A TERMÍNY */}
            <div className="bg-card border border-zinc-800 rounded-xl p-5 shadow-sm space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Termíny a data
                </h2>
              </div>

              <div className="space-y-3">
                {/* Datum vystavení */}
                <div className="space-y-1">
                  <Label htmlFor="datum_vystaveni">Datum vystavení *</Label>
                  <Input
                    id="datum_vystaveni"
                    type="date"
                    {...register('datum_vystaveni')}
                    className="bg-zinc-950 border-zinc-800 h-9 font-mono"
                  />
                </div>

                 {/* Datum splatnosti (pro faktury / zálohy) */}
                 {(selectedTyp === 'faktura' || selectedTyp === 'zalohova_faktura' || selectedTyp === 'opravny_doklad') && (
                  <div className="space-y-1.5">
                    <Label htmlFor="datum_splatnosti">Datum splatnosti</Label>
                    <Input
                      id="datum_splatnosti"
                      type="date"
                      {...register('datum_splatnosti')}
                      className="bg-zinc-950 border-zinc-800 h-9 font-mono"
                    />
                    <div className="flex flex-wrap gap-1 pt-1">
                      {[7, 14, 30, 45, 60, 90].map((days) => (
                        <Button
                          key={days}
                          type="button"
                          variant="outline"
                          onClick={() => handleSetSplatnost(days)}
                          className="text-[10px] h-6 px-2 bg-zinc-950 border-zinc-800 hover:bg-zinc-900 text-zinc-400 hover:text-zinc-200"
                        >
                          +{days} dní
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                {/* DUZP (daňové plnění - pro faktury) */}
                {(selectedTyp === 'faktura' || selectedTyp === 'opravny_doklad') && (
                  <div className="space-y-1">
                    <Label htmlFor="duzp">Datum uskutečnění zdanit. plnění (DUZP)</Label>
                    <Input
                      id="duzp"
                      type="date"
                      {...register('duzp')}
                      className="bg-zinc-950 border-zinc-800 h-9 font-mono"
                    />
                  </div>
                )}

                {/* Platnost nabídky (pro nabídky) */}
                {selectedTyp === 'nabidka' && (
                  <div className="space-y-1.5">
                    <Label htmlFor="datum_platnosti">Platnost nabídky do</Label>
                    <Input
                      id="datum_platnosti"
                      type="date"
                      {...register('datum_platnosti')}
                      className="bg-zinc-950 border-zinc-800 h-9 font-mono"
                    />
                    <div className="flex flex-wrap gap-1 pt-1">
                      {[7, 14, 30, 45, 60].map((days) => (
                        <Button
                          key={days}
                          type="button"
                          variant="outline"
                          onClick={() => handleSetPlatnost(days)}
                          className="text-[10px] h-6 px-2 bg-zinc-950 border-zinc-800 hover:bg-zinc-900 text-zinc-400 hover:text-zinc-200"
                        >
                          +{days} dní
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* MĚNA A FINANCE */}
            <div className="bg-card border border-zinc-800 rounded-xl p-5 shadow-sm space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Měna a Daně
                </h2>
              </div>

              <div className="space-y-4">
                {/* Měna */}
                <div className="space-y-1.5">
                  <Label>Měna dokladu</Label>
                  <Select
                    onValueChange={(v) => setValue('mena', v ?? 'CZK')}
                    value={selectedMena ?? 'CZK'}
                  >
                    <SelectTrigger className="bg-zinc-950 border-zinc-800 h-9">
                      <SelectValue>
                        {selectedMena === 'CZK' ? 'CZK (Kč)' :
                         selectedMena === 'EUR' ? 'EUR (€)' :
                         selectedMena === 'USD' ? 'USD ($)' :
                         selectedMena === 'GBP' ? 'GBP (£)' : undefined}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-950 border-zinc-800 text-zinc-200">
                      <SelectItem value="CZK">CZK (Kč)</SelectItem>
                      <SelectItem value="EUR">EUR (€)</SelectItem>
                      <SelectItem value="USD">USD ($)</SelectItem>
                      <SelectItem value="GBP">GBP (£)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Jazyk dokladu */}
                <div className="space-y-1.5">
                  <Label>Jazyk dokladu</Label>
                  <Select
                    onValueChange={(v) => setValue('jazyk', v as any)}
                    value={watch('jazyk') ?? 'cs'}
                  >
                    <SelectTrigger className="bg-zinc-950 border-zinc-800 h-9">
                      <SelectValue>
                        {watch('jazyk') === 'en' ? 'English (EN)' : 'Čeština (CS)'}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-950 border-zinc-800 text-zinc-200">
                      <SelectItem value="cs">Čeština (CS)</SelectItem>
                      <SelectItem value="en">English (EN)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Kurz k CZK */}
                {selectedMena !== 'CZK' && (
                  <div className="space-y-1.5">
                    <Label htmlFor="kurz_k_czk">Kurz k CZK (za 1 jednotku)</Label>
                    <Input
                      id="kurz_k_czk"
                      type="number"
                      step="any"
                      {...register('kurz_k_czk')}
                      className="bg-zinc-950 border-zinc-800 h-9 font-mono text-right"
                    />
                  </div>
                )}

                {/* Způsob úhrady */}
                {(selectedTyp === 'faktura' || selectedTyp === 'zalohova_faktura' || selectedTyp === 'opravny_doklad') && (
                  <div className="space-y-1.5">
                    <Label>Způsob úhrady</Label>
                    <Select
                      onValueChange={(v) => setValue('zpusob_uhrady', v as any)}
                      value={watch('zpusob_uhrady')}
                    >
                      <SelectTrigger className="bg-zinc-950 border-zinc-800 h-9">
                        <SelectValue>
                          {watch('zpusob_uhrady') === 'prevod' ? 'Bankovní převod' :
                           watch('zpusob_uhrady') === 'hotovost' ? 'Hotovost' :
                           watch('zpusob_uhrady') === 'karta' ? 'Platební karta' : undefined}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-950 border-zinc-800 text-zinc-200">
                        <SelectItem value="prevod">Bankovní převod</SelectItem>
                        <SelectItem value="hotovost">Hotovost</SelectItem>
                        <SelectItem value="karta">Platební karta</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <Separator className="bg-zinc-800" />

                {/* DPH plátce přepínač */}
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="platce_dph">Fakturovat s DPH</Label>
                    <p className="text-[10px] text-muted-foreground">Pokud vypnete, DPH bude 0%</p>
                  </div>
                  <Switch
                    id="platce_dph"
                    checked={watch('platce_dph')}
                    onCheckedChange={(v) => setValue('platce_dph', v)}
                  />
                </div>

                {/* Reverse charge (přenesená daňová povinnost) */}
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="reverse_charge">Reverse charge</Label>
                    <p className="text-[10px] text-muted-foreground">Přenesená daňová povinnost (EU)</p>
                  </div>
                  <Switch
                    id="reverse_charge"
                    checked={isReverseCharge}
                    onCheckedChange={(v) => setValue('reverse_charge', v)}
                  />
                </div>

                {/* Tisknout razítko a podpis */}
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="tisk_podpisu">Tisknout razítko a podpis</Label>
                    <p className="text-[10px] text-muted-foreground">Vložit naskenovaný podpis do PDF</p>
                  </div>
                  <Switch
                    id="tisk_podpisu"
                    checked={watch('tisk_podpisu')}
                    onCheckedChange={(v) => setValue('tisk_podpisu', v)}
                  />
                </div>
              </div>
            </div>

          </div>

          </div>
        ) : (
          isEdit && initialData && (
            <div className="bg-card border border-zinc-800 rounded-xl p-5 shadow-sm h-[850px] flex flex-col">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="text-sm font-semibold text-zinc-200">Náhled dokumentu v PDF</h3>
                  <p className="text-[10px] text-muted-foreground">Aktuálně uložená verze dokumentu v databázi.</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => window.open(`/api/pdf/${initialData.id}`, '_blank')}
                    className="text-xs h-8 bg-zinc-950 border-zinc-800"
                  >
                    Otevřít v novém okně
                  </Button>
                </div>
              </div>
              <iframe
                src={`/api/pdf/${initialData.id}#toolbar=0&navpanes=0`}
                className="w-full flex-1 rounded-lg border border-zinc-850 bg-zinc-950"
              />
            </div>
          )
        )}
      </form>
    </FormProvider>
  )
}
