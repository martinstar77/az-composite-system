import { z } from "zod"

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
  vytvoril_id: z.string().optional(),
  upravil_id: z.string().optional(),
  vytvoreno_at: z.string().optional(),
  aktualizovano_at: z.string().optional(),
})

export type LogisticsTemplate = z.infer<typeof logisticsTemplateSchema> & {
  vytvoril?: { jmeno: string }
  upravil?: { jmeno: string }
}
