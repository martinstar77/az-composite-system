'use client'

import { useFieldArray, useFormContext } from 'react-hook-form'
import { Plus, Trash2, AlignLeft, Percent, Calculator } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select'
import { ProductPicker } from './ProductPicker'
import type { Product } from '@/modules/products/types'
import type { DokladFormValues } from '../types/formSchema'
import { vypocitejRadek, vypocitejSoucty, formatMena, round2 } from '../utils/calculations'
import { DPH_SAZBY } from '../types'

interface DocumentLineItemsProps {
  products: Product[]
  isInvoice: boolean
}

export function DocumentLineItems({ products, isInvoice }: DocumentLineItemsProps) {
  const { control, register, setValue, watch } = useFormContext<DokladFormValues>()
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'polozky',
  })

  const polozkyValues = watch('polozky') || []
  const mena = watch('mena') || 'CZK'

  // Přepočítáme kompletní součty pro rekapitulaci na základě sledovaných hodnot
  // Rychlý přepočet řádků před odesláním do vypocitejSoucty
  const prepocitanePolozky = polozkyValues.map((p) => {
    const souctyRadku = vypocitejRadek({
      mnozstvi:     Number(p.mnozstvi || 0),
      cena_bez_dph: Number(p.cena_bez_dph || 0),
      sazba_dph:    Number(p.sazba_dph || 21),
      sleva_procent: Number(p.sleva_procent || 0),
    })
    return {
      ...p,
      radek_bez_dph: souctyRadku.radek_bez_dph,
      radek_dph:     souctyRadku.radek_dph,
      radek_celkem:  souctyRadku.radek_celkem,
    } as any
  })

  const soucty = vypocitejSoucty(prepocitanePolozky)

  const handleAddProduct = (item: {
    nazev: string
    cena_bez_dph: number
    jednotka: string
    produkt_id: string | null
    typ: 'produkt' | 'volna_polozka'
  }) => {
    append({
      poradi: fields.length,
      typ: item.typ,
      produkt_id: item.produkt_id,
      nazev: item.nazev,
      popis: '',
      jednotka: item.jednotka,
      mnozstvi: 1,
      cena_bez_dph: item.cena_bez_dph,
      sazba_dph: 21,
      sleva_procent: 0,
    })
  }

  const handleAddZalohovyOdpocet = () => {
    append({
      poradi: fields.length,
      typ: 'zalohovy_odpocet',
      produkt_id: null,
      nazev: 'Zálohový odpočet (zál. faktura č. ...)',
      popis: '',
      jednotka: 'kpl',
      mnozstvi: 1,
      cena_bez_dph: 0,
      sazba_dph: 21,
      sleva_procent: 0,
    })
  }

  const handleAddZaokrouhleni = () => {
    const rozdil = Math.round(soucty.k_uhrade) - soucty.k_uhrade
    append({
      poradi: fields.length,
      typ: 'zaokrouhleni',
      produkt_id: null,
      nazev: 'Zaokrouhlení',
      popis: '',
      jednotka: '',
      mnozstvi: 1,
      cena_bez_dph: round2(rozdil),
      sazba_dph: 0,
      sleva_procent: 0,
    })
  }

  const handleAddTextRadek = () => {
    append({
      poradi: fields.length,
      typ: 'text_radek',
      produkt_id: null,
      nazev: 'Doplňující textový řádek...',
      popis: '',
      jednotka: 'ks',
      mnozstvi: 0,
      cena_bez_dph: 0,
      sazba_dph: 0,
      sleva_procent: 0,
    })
  }

  const handleAddVolnaPolozka = () => {
    append({
      poradi: fields.length,
      typ: 'volna_polozka',
      produkt_id: null,
      nazev: 'Nová volná položka',
      popis: '',
      jednotka: 'ks',
      mnozstvi: 1,
      cena_bez_dph: 0,
      sazba_dph: 21,
      sleva_procent: 0,
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <Calculator className="h-4 w-4 text-primary" />
          Položky dokladu
        </h3>
        
        {isInvoice && (
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddZalohovyOdpocet}
              className="text-[11px] h-8 bg-zinc-950 border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-900"
            >
              Přidat odpočet zálohy
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddZaokrouhleni}
              className="text-[11px] h-8 bg-zinc-950 border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-900"
            >
              Přidat zaokrouhlení
            </Button>
          </div>
        )}
      </div>

      {/* Volba produktu */}
      <div className="bg-zinc-900/30 p-3 rounded-lg border border-zinc-800/80">
        <Label className="text-xs text-zinc-400 mb-1.5 block">Přidat položku do tabulky</Label>
        <div className="flex gap-2 items-center">
          <div className="flex-1">
            <ProductPicker products={products} onSelect={handleAddProduct} />
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={handleAddVolnaPolozka}
            className="h-9 px-3 bg-zinc-950 border-zinc-800 text-xs text-zinc-300 shrink-0 gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" /> Volná položka
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleAddTextRadek}
            className="h-9 px-3 bg-zinc-950 border-zinc-800 text-xs text-zinc-300 shrink-0 gap-1.5"
          >
            <AlignLeft className="h-3.5 w-3.5" /> Textový řádek
          </Button>
        </div>
      </div>

      {/* Tabulka položek */}
      <div className="border border-zinc-800 rounded-xl bg-zinc-950/20 overflow-hidden shadow-md">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-zinc-900/60 border-b border-zinc-800 text-zinc-500 font-bold uppercase tracking-wider">
              <th className="p-3 w-10">#</th>
              <th className="p-3 min-w-[200px]">Název / Popis položky</th>
              <th className="p-3 w-20 min-w-[80px]">Množství</th>
              <th className="p-3 w-16 min-w-[70px]">Jedn.</th>
              <th className="p-3 w-44 min-w-[140px]">Cena bez DPH</th>
              <th className="p-3 w-28 min-w-[100px]">Sazba DPH</th>
              <th className="p-3 w-20 min-w-[80px]">Sleva %</th>
              <th className="p-3 text-right pr-4 w-32 min-w-[130px]">Celkem s DPH</th>
              <th className="p-3 w-12 text-center"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {fields.map((field, index) => {
              const typ = watch(`polozky.${index}.typ`)
              const isText = typ === 'text_radek'
              const isOdpocet = typ === 'zalohovy_odpocet'

              // Spočteme cenu pro tento řádek pro živý náhled v řádku
              const mnozstvi = watch(`polozky.${index}.mnozstvi`) || 0
              const cenaBezDph = watch(`polozky.${index}.cena_bez_dph`) || 0
              const sazbaDph = watch(`polozky.${index}.sazba_dph`) || 0
              const slevaProcent = watch(`polozky.${index}.sleva_procent`) || 0

              const radekCeny = isText
                ? { radek_celkem: 0 }
                : vypocitejRadek({
                    mnozstvi,
                    cena_bez_dph: isOdpocet ? -Math.abs(cenaBezDph) : cenaBezDph,
                    sazba_dph: sazbaDph,
                    sleva_procent: slevaProcent,
                  })

              return (
                <tr key={field.id} className="hover:bg-zinc-900/30 transition-colors">
                  {/* Pořadí */}
                  <td className="p-3 text-zinc-500 font-mono text-center w-10">{index + 1}</td>

                  {/* Název a Popis */}
                  <td className="p-3 space-y-1 min-w-[200px]">
                    <Input
                      {...register(`polozky.${index}.nazev`)}
                      placeholder={isText ? "Doplňující text nebo komentář" : "Název zboží či služby"}
                      className="bg-zinc-950/80 border-zinc-800 h-8 text-xs font-semibold"
                    />
                    {!isText && (
                      <textarea
                        {...register(`polozky.${index}.popis`)}
                        placeholder="Podrobnější popis položky (volitelné)"
                        rows={2}
                        className="w-full bg-transparent border border-transparent hover:border-zinc-800 focus:border-zinc-700 text-[10px] text-zinc-400 font-normal px-2 py-1 rounded resize-y focus:outline-none"
                      />
                    )}
                  </td>

                  {/* Množství */}
                  <td className="p-3 min-w-[80px]">
                    <Input
                      type="number"
                      step="any"
                      {...register(`polozky.${index}.mnozstvi`)}
                      disabled={isText}
                      className="bg-zinc-950/80 border-zinc-800 h-8 font-mono text-center"
                    />
                  </td>

                  {/* Jednotka */}
                  <td className="p-3 min-w-[70px]">
                    <Input
                      {...register(`polozky.${index}.jednotka`)}
                      disabled={isText}
                      className="bg-zinc-950/80 border-zinc-800 h-8 text-center"
                    />
                  </td>

                  {/* Cena bez DPH */}
                  <td className="p-3 min-w-[140px]">
                    <Input
                      type="number"
                      step="any"
                      {...register(`polozky.${index}.cena_bez_dph`)}
                      disabled={isText}
                      className="bg-zinc-950/80 border-zinc-800 h-8 font-mono text-right"
                    />
                  </td>

                  {/* Sazba DPH */}
                  <td className="p-3 min-w-[100px]">
                    <Select
                      disabled={isText}
                      onValueChange={(v) => setValue(`polozky.${index}.sazba_dph`, Number(v))}
                      value={String(sazbaDph)}
                    >
                      <SelectTrigger className="bg-zinc-950/80 border-zinc-800 h-8 text-[11px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-950 border-zinc-800 text-zinc-200">
                        {DPH_SAZBY.map((rate) => (
                          <SelectItem key={rate} value={String(rate)}>
                            {rate} %
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>

                  {/* Sleva */}
                  <td className="p-3 min-w-[80px]">
                    <div className="relative">
                      <Input
                        type="number"
                        {...register(`polozky.${index}.sleva_procent`)}
                        disabled={isText || isOdpocet || typ === 'zaokrouhleni'}
                        className="bg-zinc-950/80 border-zinc-800 h-8 font-mono text-center pr-5"
                      />
                      <Percent className="absolute right-1.5 top-2.5 h-3 w-3 text-zinc-500" />
                    </div>
                  </td>

                  {/* Celková cena řádku */}
                  <td className="p-3 text-right pr-4 font-mono font-bold text-zinc-300 min-w-[130px]">
                    {isText ? '—' : formatMena(radekCeny.radek_celkem, mena)}
                  </td>

                  {/* Smazání */}
                  <td className="p-3 text-center w-12">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => remove(index)}
                      className="h-8 w-8 hover:bg-red-500/10 hover:text-red-400 text-zinc-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              )
            })}

            {fields.length === 0 && (
              <tr>
                <td colSpan={9} className="p-8 text-center text-zinc-500 italic">
                  Doklad nemá žádné položky. Vyberte produkt nahoře pro vložení.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* REKAPITULACE */}
      {fields.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-zinc-900/15 p-4 rounded-xl border border-zinc-800/60 shadow-inner">
          {/* DPH Rekapitulace */}
          <div className="space-y-3">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Rekapitulace DPH</h4>
            <div className="border border-zinc-800/80 rounded-lg overflow-hidden bg-zinc-950/10">
              <table className="w-full text-left text-[11px] font-mono">
                <thead>
                  <tr className="bg-zinc-900/30 text-zinc-500 font-bold border-b border-zinc-800">
                    <th className="p-2">Sazba DPH</th>
                    <th className="p-2 text-right">Základ</th>
                    <th className="p-2 text-right">Daň</th>
                    <th className="p-2 text-right pr-3">Celkem</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/40 text-zinc-400">
                  {soucty.dph_sazky.map((s) => (
                    <tr key={s.sazba}>
                      <td className="p-2">{s.sazba} %</td>
                      <td className="p-2 text-right">{formatMena(s.zaklad, mena)}</td>
                      <td className="p-2 text-right">{formatMena(s.dph, mena)}</td>
                      <td className="p-2 text-right pr-3 font-semibold text-zinc-300">{formatMena(s.celkem, mena)}</td>
                    </tr>
                  ))}
                  {soucty.dph_sazky.length === 0 && (
                    <tr>
                      <td colSpan={4} className="p-2 text-center italic text-zinc-600">Žádná zdanitelná plnění.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Celkové součty */}
          <div className="flex flex-col justify-end space-y-2 text-sm pr-2">
            <div className="flex justify-between items-center text-xs text-zinc-400">
              <span>Celkem bez DPH:</span>
              <span className="font-mono font-medium">{formatMena(soucty.celkem_bez_dph, mena)}</span>
            </div>
            <div className="flex justify-between items-center text-xs text-zinc-400">
              <span>Celkem DPH:</span>
              <span className="font-mono font-medium">{formatMena(soucty.celkem_dph, mena)}</span>
            </div>
            
            {soucty.zalohovy_odpocet > 0 && (
              <div className="flex justify-between items-center text-xs text-primary font-medium">
                <span>Zálohový odpočet:</span>
                <span className="font-mono">- {formatMena(soucty.zalohovy_odpocet, mena)}</span>
              </div>
            )}

            <div className="h-px bg-zinc-800 my-1" />

            <div className="flex justify-between items-center text-base font-bold">
              <span className="text-zinc-300">K úhradě:</span>
              <span className="font-mono text-primary text-lg">{formatMena(soucty.k_uhrade, mena)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
