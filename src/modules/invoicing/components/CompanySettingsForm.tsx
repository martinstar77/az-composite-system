'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Save, Building2, CreditCard, Mail, Globe, Phone, Shield } from 'lucide-react'

import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { Switch } from '@/shared/components/ui/switch'
import { Separator } from '@/shared/components/ui/separator'

import { upsertFiremniProfil } from '../actions/settings'
import { firemniProfilSchema, type FiremniProfilFormValues } from '../types/formSchema'
import type { FiremniProfil } from '../types'

interface CompanySettingsFormProps {
  initialData: FiremniProfil | null
}

export function CompanySettingsForm({ initialData }: CompanySettingsFormProps) {
  const [isSaving, setIsSaving] = useState(false)

  const form = useForm<FiremniProfilFormValues>({
    resolver: zodResolver(firemniProfilSchema) as any,
    defaultValues: {
      obchodni_jmeno:  initialData?.obchodni_jmeno  ?? '',
      ico:             initialData?.ico              ?? '',
      dic:             initialData?.dic              ?? '',
      platce_dph:      initialData?.platce_dph       ?? true,
      adresa: {
        ulice: initialData?.adresa?.ulice ?? '',
        mesto: initialData?.adresa?.mesto ?? '',
        psc:   initialData?.adresa?.psc   ?? '',
        stat:  initialData?.adresa?.stat  ?? 'Česká republika',
      },
      typ_spojeni:     initialData?.typ_spojeni      ?? 'iban',
      iban:            initialData?.iban             ?? '',
      cislo_uctu:      initialData?.cislo_uctu       ?? '',
      banka_nazev:     initialData?.banka_nazev      ?? '',
      email_fakturace: initialData?.email_fakturace  ?? '',
      telefon:         initialData?.telefon          ?? '',
      web:             initialData?.web              ?? '',
      logo_url:        initialData?.logo_url         ?? '',
    },
  })

  const platceDph = form.watch('platce_dph')
  const typSpojeni = form.watch('typ_spojeni')

  async function onSubmit(data: FiremniProfilFormValues) {
    setIsSaving(true)
    const result = await upsertFiremniProfil(data)
    setIsSaving(false)

    if (result.success) {
      toast.success('Firemní profil byl uložen')
    } else {
      toast.error(result.error ?? 'Chyba při ukládání')
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit as any)} className="space-y-8">

      {/* ── IDENTIFIKACE ── */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Building2 className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Identifikace firmy
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2 space-y-1.5">
            <Label htmlFor="obchodni_jmeno">Obchodní jméno *</Label>
            <Input
              id="obchodni_jmeno"
              {...form.register('obchodni_jmeno')}
              placeholder="Ing. Filip Klier"
            />
            {form.formState.errors.obchodni_jmeno && (
              <p className="text-xs text-destructive">{form.formState.errors.obchodni_jmeno.message}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ico">IČO *</Label>
            <Input
              id="ico"
              {...form.register('ico')}
              placeholder="23048255"
              maxLength={10}
            />
            {form.formState.errors.ico && (
              <p className="text-xs text-destructive">{form.formState.errors.ico.message}</p>
            )}
          </div>

          {/* DPH přepínač */}
          <div className="space-y-1.5">
            <Label>Plátce DPH</Label>
            <div className="flex items-center gap-3 h-10">
              <Switch
                id="platce_dph"
                checked={platceDph}
                onCheckedChange={(v) => form.setValue('platce_dph', v)}
              />
              <span className="text-sm text-muted-foreground">
                {platceDph ? 'Plátce DPH — DIČ bude zobrazeno na fakturách' : 'Neplátce DPH'}
              </span>
            </div>
          </div>

          {platceDph && (
            <div className="space-y-1.5">
              <Label htmlFor="dic">DIČ</Label>
              <Input
                id="dic"
                {...form.register('dic')}
                placeholder="CZ9906261937"
              />
            </div>
          )}
        </div>
      </section>

      <Separator />

      {/* ── ADRESA ── */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Building2 className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Adresa sídla
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2 space-y-1.5">
            <Label htmlFor="ulice">Ulice a číslo popisné *</Label>
            <Input
              id="ulice"
              {...form.register('adresa.ulice')}
              placeholder="Jankovcova 1587/8"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="mesto">Město *</Label>
            <Input
              id="mesto"
              {...form.register('adresa.mesto')}
              placeholder="Praha"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="psc">PSČ *</Label>
            <Input
              id="psc"
              {...form.register('adresa.psc')}
              placeholder="17000"
              maxLength={6}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="stat">Stát *</Label>
            <Input
              id="stat"
              {...form.register('adresa.stat')}
              placeholder="Česká republika"
            />
          </div>
        </div>
      </section>

      <Separator />

      {/* ── BANKOVNÍ SPOJENÍ (QR PLATBA) ── */}
      <section>
        <div className="flex items-center gap-2 mb-1">
          <CreditCard className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Bankovní spojení
          </h2>
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          Zvolte typ bankovního spojení. Pokud zadáte standardní číslo účtu, systém na faktuře vygeneruje QR kód tak, že číslo účtu automaticky převede na IBAN.
        </p>

        {/* Přepínač typu bankovního spojení */}
        <div className="mb-4 space-y-2">
          <Label>Typ bankovního spojení</Label>
          <div className="flex items-center gap-6 h-10">
            <label className="flex items-center gap-2 cursor-pointer text-sm text-zinc-300">
              <input
                type="radio"
                value="iban"
                checked={typSpojeni === 'iban'}
                onChange={() => form.setValue('typ_spojeni', 'iban')}
                className="accent-primary h-4 w-4"
              />
              IBAN
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-sm text-zinc-300">
              <input
                type="radio"
                value="uctu"
                checked={typSpojeni === 'uctu'}
                onChange={() => form.setValue('typ_spojeni', 'uctu')}
                className="accent-primary h-4 w-4"
              />
              Číslo účtu
            </label>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {typSpojeni === 'iban' ? (
            <div className="space-y-1.5">
              <Label htmlFor="iban">IBAN *</Label>
              <Input
                id="iban"
                {...form.register('iban')}
                placeholder="CZ00 0000 0000 0000 0000 0000"
                className="font-mono"
              />
              {form.formState.errors.iban && (
                <p className="text-xs text-destructive">{form.formState.errors.iban.message}</p>
              )}
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label htmlFor="cislo_uctu">Číslo účtu / kód banky *</Label>
              <Input
                id="cislo_uctu"
                {...form.register('cislo_uctu')}
                placeholder="123456-7890123456/2010"
                className="font-mono"
              />
              {form.formState.errors.cislo_uctu && (
                <p className="text-xs text-destructive">{form.formState.errors.cislo_uctu.message}</p>
              )}
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="banka_nazev">Název banky</Label>
            <Input
              id="banka_nazev"
              {...form.register('banka_nazev')}
              placeholder="Fio banka, a.s."
            />
          </div>
        </div>
      </section>

      <Separator />

      {/* ── KONTAKTY ── */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Mail className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Kontaktní informace
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="email_fakturace">E-mail (fakturace)</Label>
            <Input
              id="email_fakturace"
              type="email"
              {...form.register('email_fakturace')}
              placeholder="fakturace@azcomposite.cz"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="telefon">Telefon</Label>
            <Input
              id="telefon"
              type="tel"
              {...form.register('telefon')}
              placeholder="+420 000 000 000"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="web">Web</Label>
            <Input
              id="web"
              {...form.register('web')}
              placeholder="www.azcomposite.cz"
            />
          </div>
        </div>
      </section>

      {/* ── ULOŽIT ── */}
      <div className="flex justify-end pt-2">
        <Button
          type="submit"
          disabled={isSaving}
          className="gap-2 min-w-32"
        >
          <Save className="h-4 w-4" />
          {isSaving ? 'Ukládám...' : 'Uložit nastavení'}
        </Button>
      </div>
    </form>
  )
}
