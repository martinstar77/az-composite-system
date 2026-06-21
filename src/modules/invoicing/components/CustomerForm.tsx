'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Building2, Mail, Phone, CreditCard, FileText, Globe } from 'lucide-react'

import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { Switch } from '@/shared/components/ui/switch'
import { Textarea } from '@/shared/components/ui/textarea'
import { Separator } from '@/shared/components/ui/separator'

import { zakaznikSchema, type ZakaznikFormValues } from '../types/formSchema'
import type { Zakaznik } from '../types'

interface CustomerFormProps {
  initialData?: Zakaznik | null
  onSubmit: (data: ZakaznikFormValues) => Promise<void>
  isSubmitting: boolean
  onCancel: () => void
}

export function CustomerForm({ initialData, onSubmit, isSubmitting, onCancel }: CustomerFormProps) {
  const form = useForm<ZakaznikFormValues>({
    resolver: zodResolver(zakaznikSchema) as any,
    defaultValues: {
      kod:                                initialData?.kod ?? '',
      nazev_spolecnosti:                  initialData?.nazev_spolecnosti ?? '',
      ico:                                initialData?.ico ?? '',
      dic:                                initialData?.dic ?? '',
      je_platce_dph:                      initialData?.je_platce_dph ?? true,
      zeme:                               initialData?.zeme ?? 'CZ',
      je_zahranicni:                      initialData?.je_zahranicni ?? false,
      email_fakturace:                    initialData?.email_fakturace ?? '',
      telefon:                            initialData?.telefon ?? '',
      adresa: {
        ulice: initialData?.adresa?.ulice ?? '',
        mesto: initialData?.adresa?.mesto ?? '',
        psc:   initialData?.adresa?.psc ?? '',
        stat:  initialData?.adresa?.stat ?? 'Česká republika',
      },
      platebni_podminky_splatnost_dni:    initialData?.platebni_podminky_splatnost_dni ?? 14,
      poznamky:                           initialData?.poznamky ?? '',
    },
  })

  const jePlatceDph = form.watch('je_platce_dph')
  const jeZahranicni = form.watch('je_zahranicni')

  return (
    <form onSubmit={form.handleSubmit(onSubmit as any)} className="space-y-6 text-foreground">
      
      {/* ── ZÁKLADNÍ ÚDAJE ── */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Základní údaje
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="kod">Kód zákazníka *</Label>
            <Input
              id="kod"
              {...form.register('kod')}
              placeholder="např. ZAK-001"
              className="uppercase font-mono"
            />
            {form.formState.errors.kod && (
              <p className="text-xs text-destructive">{form.formState.errors.kod.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="nazev_spolecnosti">Název společnosti / Jméno *</Label>
            <Input
              id="nazev_spolecnosti"
              {...form.register('nazev_spolecnosti')}
              placeholder="Firma s.r.o. nebo Jméno Příjmení"
            />
            {form.formState.errors.nazev_spolecnosti && (
              <p className="text-xs text-destructive">{form.formState.errors.nazev_spolecnosti.message}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="ico">IČO</Label>
            <Input
              id="ico"
              {...form.register('ico')}
              placeholder="12345678"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Plátce DPH</Label>
            <div className="flex items-center gap-3 h-10">
              <Switch
                id="je_platce_dph"
                checked={jePlatceDph}
                onCheckedChange={(v) => form.setValue('je_platce_dph', v)}
              />
              <span className="text-xs text-muted-foreground">
                {jePlatceDph ? 'Ano' : 'Ne'}
              </span>
            </div>
          </div>

          {jePlatceDph && (
            <div className="space-y-1.5">
              <Label htmlFor="dic">DIČ</Label>
              <Input
                id="dic"
                {...form.register('dic')}
                placeholder="CZ12345678"
              />
            </div>
          )}
        </div>
      </div>

      <Separator />

      {/* ── URČENÍ ZEMĚ A PŘESHRANIČNÍ REŽIM ── */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Globe className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Lokalizace a DPH Režim
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="zeme">Kód země (ISO 2-místný) *</Label>
            <Input
              id="zeme"
              {...form.register('zeme')}
              placeholder="CZ, SK, DE, atd."
              maxLength={2}
              className="uppercase font-mono"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Zahraniční klient</Label>
            <div className="flex items-center gap-3 h-10">
              <Switch
                id="je_zahranicni"
                checked={jeZahranicni}
                onCheckedChange={(v) => form.setValue('je_zahranicni', v)}
              />
              <span className="text-xs text-muted-foreground">
                {jeZahranicni ? 'Zahraniční / Přeshraniční fakturace (Reverse Charge)' : 'Tuzemský klient'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <Separator />

      {/* ── FAKTURAČNÍ ADRESA ── */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Adresa sídla
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2 space-y-1.5">
            <Label htmlFor="ulice">Ulice a číslo popisné</Label>
            <Input
              id="ulice"
              {...form.register('adresa.ulice')}
              placeholder="Vodičkova 123/4"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="mesto">Město</Label>
            <Input
              id="mesto"
              {...form.register('adresa.mesto')}
              placeholder="Praha"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label htmlFor="psc">PSČ</Label>
              <Input
                id="psc"
                {...form.register('adresa.psc')}
                placeholder="110 00"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="stat">Stát</Label>
              <Input
                id="stat"
                {...form.register('adresa.stat')}
                placeholder="Česká republika"
              />
            </div>
          </div>
        </div>
      </div>

      <Separator />

      {/* ── PLATEBNÍ PODMÍNKY A KONTAKT ── */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <CreditCard className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Podmínky a Kontakty
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="platebni_podminky_splatnost_dni">Splatnost faktur (dny) *</Label>
            <Input
              id="platebni_podminky_splatnost_dni"
              type="number"
              {...form.register('platebni_podminky_splatnost_dni')}
              placeholder="14"
            />
            {form.formState.errors.platebni_podminky_splatnost_dni && (
              <p className="text-xs text-destructive">
                {form.formState.errors.platebni_podminky_splatnost_dni.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email_fakturace">E-mail pro faktury</Label>
            <Input
              id="email_fakturace"
              type="email"
              {...form.register('email_fakturace')}
              placeholder="ucetni@klient.cz"
            />
            {form.formState.errors.email_fakturace && (
              <p className="text-xs text-destructive">{form.formState.errors.email_fakturace.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="telefon">Telefon</Label>
            <Input
              id="telefon"
              {...form.register('telefon')}
              placeholder="+420 ..."
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <Label htmlFor="poznamky">Poznámky k zákazníkovi</Label>
          </div>
          <Textarea
            id="poznamky"
            {...form.register('poznamky')}
            placeholder="Specifické požadavky, kontaktní osoby, interní poznámky..."
            rows={3}
          />
        </div>
      </div>

      {/* ── TLAČÍTKA ── */}
      <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800">
        <Button type="button" variant="outline" onClick={onCancel}>
          Zrušit
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Ukládám...' : initialData ? 'Uložit změny' : 'Vytvořit zákazníka'}
        </Button>
      </div>
    </form>
  )
}
