import { z } from "zod"

export const logisticsSegmentSchema = z.object({
  od_kg: z.coerce.number().min(0),
  do_kg: z.coerce.number().nullable(),
  a: z.coerce.number(),
  b: z.coerce.number(),
  dopravce: z.string().optional()
})

export type LogisticsSegment = z.infer<typeof logisticsSegmentSchema>

export const logisticsTemplateSchema = z.object({
  id: z.string().uuid().optional(),
  nazev: z.string().min(3, { message: "Název musí mít alespoň 3 znaky." }),
  typ_vypoctu_dopravy: z.enum(['procentualni', 'vaha_kg', 'fixni']),
  sazba_dopravy: z.coerce.number().min(0),
  poplatek_banka_czk: z.coerce.number().min(0),
  poplatek_procleni_czk: z.coerce.number().min(0),
  poplatek_odpady_czk: z.coerce.number().min(0),
  poplatek_balne_czk: z.coerce.number().min(0),
  vychozi_clo_procenta: z.coerce.number().min(0).max(100),
  
  // Shipping Engine v2 columns
  typ_vypoctu_dopravy_v2: z.enum(['legacy', 'linear_czk', 'segmented_czk', 'fixed_eur', 'pallet_alloc']).default('legacy'),
  koeficient_a: z.coerce.number().nullable().optional(),
  koeficient_b: z.coerce.number().nullable().optional(),
  segmenty_dopravy: z.array(logisticsSegmentSchema).nullable().optional(),
  fixni_cena_eur: z.coerce.number().nullable().optional(),
  pallet_cena_eur: z.coerce.number().nullable().optional(),
  pallet_pocet_produktu: z.coerce.number().int().nullable().optional(),
  bezpecnostni_koeficient: z.coerce.number().min(1.0).default(1.05),
  zeme_puvodu: z.preprocess(v => v === "" ? null : v, z.string().nullable().optional()),
  typ_dopravy: z.preprocess(v => v === "" ? null : v, z.string().nullable().optional()),
  
  vytvoril_id: z.string().optional(),
  upravil_id: z.string().optional(),
  vytvoreno_at: z.string().optional(),
  aktualizovano_at: z.string().optional(),
})

export type LogisticsTemplate = z.infer<typeof logisticsTemplateSchema> & {
  vytvoril?: { jmeno: string }
  upravil?: { jmeno: string }
}

export const baliciProfilSchema = z.object({
  id: z.string().uuid().optional(),
  nazev: z.string().min(3, { message: "Název musí mít alespoň 3 znaky." }),
  typ_obalu: z.enum(['role', 'krabice_standard', 'krabice_dlouha', 'krabice_volna', 'paleta', 'sacek']),
  delka_cm: z.coerce.number().nullable().optional(),
  sirka_cm: z.coerce.number().nullable().optional(),
  vyska_cm: z.coerce.number().nullable().optional(),
  je_delka_fixni: z.boolean().default(true),
  je_sirka_fixni: z.boolean().default(false),
  je_vyska_fixni: z.boolean().default(false),
  max_hmotnost_kg: z.coerce.number().nullable().optional(),
  koeficient_objemove_hmotnosti: z.coerce.number().default(5000),
  padding_delka_cm: z.coerce.number().default(0),
  padding_sirka_cm: z.coerce.number().default(0),
  padding_vyska_cm: z.coerce.number().default(0),
  hustota_kg_dm3: z.coerce.number().default(0.45),
  poznamka: z.string().nullable().optional(),
  vytvoril_id: z.string().optional(),
  upravil_id: z.string().optional(),
  vytvoreno_at: z.string().optional(),
  aktualizovano_at: z.string().optional(),
})

export type BaliciProfil = z.infer<typeof baliciProfilSchema> & {
  vytvoril?: { jmeno: string }
  upravil?: { jmeno: string }
}

export const standardBoxSizeSchema = z.object({
  id: z.string().uuid().optional(),
  nazev: z.string().min(1),
  delka_cm: z.coerce.number().min(0),
  sirka_cm: z.coerce.number().min(0),
  vyska_cm: z.coerce.number().min(0),
  max_hmotnost_kg: z.coerce.number().nullable().optional(),
  je_dlouha: z.boolean().default(false),
  poradi: z.coerce.number().default(0),
  poznamka: z.string().nullable().optional(),
  vytvoril_id: z.string().optional(),
  upravil_id: z.string().optional(),
  vytvoreno_at: z.string().optional(),
  aktualizovano_at: z.string().optional(),
})

export type StandardBoxSize = z.infer<typeof standardBoxSizeSchema>

