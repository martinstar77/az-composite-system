import { z } from "zod"

export const supplierFormSchema = z.object({
  kod: z.string().min(2, { message: "Kód musí mít alespoň 2 znaky." }).toUpperCase(),
  nazev_spolecnosti: z.string().min(3, { message: "Název musí mít alespoň 3 znaky." }),
  zeme_puvodu: z.string().optional().nullable(),
  vychozi_mena: z.string().min(3).max(3).default("EUR"),
  platebni_podminky_splatnost_dni: z.coerce.number().int().min(0).default(0),
  vychozi_lead_time_tydny: z.coerce.number().int().min(0).default(0),
  
  // Contacts (simplified for the form, will be mapped to JSONB)
  email_objednavky: z.string().email({ message: "Neplatný e-mail" }).optional().or(z.literal("")),
  jmeno_zastupce: z.string().optional(),
  telefonni_cislo: z.string().optional(),

  // Address (simplified for the form, will be mapped to JSONB)
  adresa_ulice: z.string().optional(),
  adresa_mesto: z.string().optional(),
  adresa_psc: z.string().optional(),
  adresa_stat: z.string().optional(),
})

export type SupplierFormValues = z.infer<typeof supplierFormSchema>
