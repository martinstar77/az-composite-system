import { z } from "zod"

export const productFormSchema = z.object({
  sku: z.string().min(2, { message: "SKU musí mít alespoň 2 znaky." }),
  nazev: z.string().min(3, { message: "Název musí mít alespoň 3 znaky." }),
  
  // Relations
  kategorie_id: z.string().min(1, { message: "Vyberte kategorii." }),
  zakladni_mj_id: z.string().min(1, { message: "Vyberte základní měrnou jednotku." }),
  
  // Logistics
  mnozstvi_v_baleni: z.coerce.number().min(0.01, { message: "Množství musí být větší než 0." }),
  jednotka_baleni_id: z.string().min(1, { message: "Vyberte jednotku balení." }),
  hmotnost_baliku_kg: z.coerce.number().min(0),
  shelf_life_mesice: z.coerce.number().int().min(0).default(0),
  
  // Workflow Defaults
  def_typ_skladovani: z.string().default("sklad"),
  def_proces_odeslani_id: z.string().min(1, { message: "Vyberte proces odeslání." }),
  def_typ_labelu_id: z.string().min(1, { message: "Vyberte typ labelu." }),
  stav_katalogu_id: z.string().default("draft"),
  
  // Flexible Attributes (JSONB)
  specifikace_json: z.string().default("{}"),
  
  // Stock Levels
  min_skladova_zasoba: z.coerce.number().min(0).default(0),
  opt_skladova_zasoba: z.coerce.number().min(0).default(0),

  // Pricing & Margins
  cilova_marze_retail_procenta: z.coerce.number().min(0).default(30),
  cilova_marze_partner_procenta: z.coerce.number().min(0).default(20),
  clo_procenta: z.coerce.number().min(0).default(0),

  // Generator
  is_name_generated: z.boolean().default(true),
})

export type ProductFormValues = z.infer<typeof productFormSchema>
