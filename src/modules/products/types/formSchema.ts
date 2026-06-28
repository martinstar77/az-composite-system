import { z } from "zod"

export const productFormSchema = z.object({
  sku: z.string().min(2, { message: "SKU musí mít alespoň 2 znaky." }),
  nazev: z.string().min(3, { message: "Název musí mít alespoň 3 znaky." }),
  nazev_en: z.string().optional().or(z.literal("")),
  
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

  // Sales MOQ
  moq_prodejni: z.coerce.number().int().min(1).default(1),
  moq_poznamka: z.string().optional(),
  poznamka: z.string().optional(),

  // Pricing & Margins
  cilova_marze_retail_procenta: z.coerce.number().min(0).default(30),
  cilova_marze_partner_procenta: z.coerce.number().min(0).default(20),
  clo_procenta: z.coerce.number().min(0).default(0),

  // Packaging & Shipping Engine v2
  balici_profil_id: z.preprocess(v => v === "" ? null : v, z.string().nullable().optional()),
  balik_delka_cm_override: z.preprocess(v => v === "" || v === undefined ? null : v, z.coerce.number().nullable().optional()),
  balik_sirka_cm_override: z.preprocess(v => v === "" || v === undefined ? null : v, z.coerce.number().nullable().optional()),
  balik_vyska_cm_override: z.preprocess(v => v === "" || v === undefined ? null : v, z.coerce.number().nullable().optional()),

  // Generator
  is_name_generated: z.boolean().default(true),
})

export type ProductFormValues = z.infer<typeof productFormSchema>
