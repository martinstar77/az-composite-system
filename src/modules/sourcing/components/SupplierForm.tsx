"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
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
import { supplierFormSchema, type SupplierFormValues } from "@/modules/sourcing/types/formSchema"
import { Supplier } from "@/modules/sourcing/types"

interface SupplierFormProps {
  initialData?: Supplier
  onSubmit: (data: SupplierFormValues) => Promise<void>
  isSubmitting: boolean
  onCancel: () => void
}

export function SupplierForm({ initialData, onSubmit, isSubmitting, onCancel }: SupplierFormProps) {
  const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm<SupplierFormValues>({
    resolver: zodResolver(supplierFormSchema) as any,
    defaultValues: {
      kod: initialData?.kod || "",
      nazev_spolecnosti: initialData?.nazev_spolecnosti || "",
      ico: initialData?.ico || "",
      dic: initialData?.dic || "",
      zeme_puvodu: initialData?.zeme_puvodu || "",
      vychozi_mena: initialData?.vychozi_mena || "EUR",
      platebni_podminky_splatnost_dni: initialData?.platebni_podminky_splatnost_dni || 0,
      vychozi_lead_time_tydny: initialData?.vychozi_lead_time_tydny || 0,
      email_objednavky: initialData?.kontakty?.email_objednavky || "",
      jmeno_zastupce: initialData?.kontakty?.jmeno_zastupce || "",
      telefonni_cislo: initialData?.kontakty?.telefonni_cislo || "",
      adresa_ulice: initialData?.adresa?.ulice || "",
      adresa_mesto: initialData?.adresa?.mesto || "",
      adresa_psc: initialData?.adresa?.psc || "",
      adresa_stat: initialData?.adresa?.stat || "",
    }
  })

  const currentMena = watch("vychozi_mena")

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="kod">Kód dodavatele</Label>
          <Input id="kod" placeholder="např. HITEX" {...register("kod")} className="uppercase" />
          {errors.kod && <p className="text-xs text-destructive">{errors.kod.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="nazev_spolecnosti">Název společnosti</Label>
          <Input id="nazev_spolecnosti" placeholder="HITEX Composites Ltd." {...register("nazev_spolecnosti")} />
          {errors.nazev_spolecnosti && <p className="text-xs text-destructive">{errors.nazev_spolecnosti.message}</p>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="ico">IČO</Label>
          <Input id="ico" placeholder="12345678" {...register("ico")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="dic">DIČ</Label>
          <Input id="dic" placeholder="CZ12345678" {...register("dic")} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="zeme_puvodu">Země původu</Label>
          <Input id="zeme_puvodu" placeholder="Čína / Německo / ČR" {...register("zeme_puvodu")} />
        </div>
        <div className="space-y-2">
          <Label>Výchozí měna</Label>
          <Select onValueChange={(val) => setValue("vychozi_mena", val || "EUR")} value={currentMena || "EUR"}>
            <SelectTrigger>
              <SelectValue>{currentMena || "EUR"}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="EUR">EUR (Euro)</SelectItem>
              <SelectItem value="USD">USD (Dolar)</SelectItem>
              <SelectItem value="CZK">CZK (Koruna)</SelectItem>
              <SelectItem value="GBP">GBP (Libra)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 p-4 bg-zinc-900/30 rounded-lg border border-zinc-800">
        <div className="space-y-2">
          <Label htmlFor="platebni_podminky_splatnost_dni">Splatnost (dny)</Label>
          <Input id="platebni_podminky_splatnost_dni" type="number" {...register("platebni_podminky_splatnost_dni")} />
          <p className="text-[10px] text-muted-foreground italic">0 = Platba předem</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="vychozi_lead_time_tydny">Standardní Lead Time (týdny)</Label>
          <Input id="vychozi_lead_time_tydny" type="number" {...register("vychozi_lead_time_tydny")} />
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-primary uppercase tracking-wider">Kontaktní údaje</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="email_objednavky">E-mail pro objednávky</Label>
            <Input id="email_objednavky" type="email" placeholder="sales@dodavatel.cz" {...register("email_objednavky")} />
            {errors.email_objednavky && <p className="text-xs text-destructive">{errors.email_objednavky.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="telefonni_cislo">Telefon</Label>
            <Input id="telefonni_cislo" placeholder="+420 ..." {...register("telefonni_cislo")} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="jmeno_zastupce">Jméno obchodního zástupce</Label>
            <Input id="jmeno_zastupce" placeholder="Ing. Jan Novák" {...register("jmeno_zastupce")} />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-primary uppercase tracking-wider">Adresa sídla společnosti</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="adresa_ulice">Ulice a č.p.</Label>
            <Input id="adresa_ulice" placeholder="Hlavní 123/4" {...register("adresa_ulice")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="adresa_mesto">Město</Label>
            <Input id="adresa_mesto" placeholder="Praha" {...register("adresa_mesto")} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-2">
              <Label htmlFor="adresa_psc">PSČ</Label>
              <Input id="adresa_psc" placeholder="110 00" {...register("adresa_psc")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="adresa_stat">Stát</Label>
              <Input id="adresa_stat" placeholder="Česká republika" {...register("adresa_stat")} />
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800">
        <Button type="button" variant="outline" onClick={onCancel}>
          Zrušit
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Ukládám..." : initialData ? "Uložit změny" : "Vytvořit dodavatele"}
        </Button>
      </div>
    </form>
  )
}
