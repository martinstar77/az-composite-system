import { z } from 'zod'

// ─────────────────────────────────────────────
// Firemní Nastavení
// ─────────────────────────────────────────────
export const firemniAdresaSchema = z.object({
  ulice: z.string().min(1, 'Ulice je povinná'),
  mesto: z.string().min(1, 'Město je povinné'),
  psc:   z.string().min(1, 'PSČ je povinné'),
  stat:  z.string().min(1, 'Stát je povinný'),
})

export const firemniProfilSchema = z.object({
  obchodni_jmeno:  z.string().min(1, 'Obchodní jméno je povinné'),
  ico:             z.string().min(6, 'IČO musí mít alespoň 6 znaků'),
  dic:             z.string().optional().or(z.literal('')),
  platce_dph:      z.boolean().default(true),
  adresa:          firemniAdresaSchema,
  typ_spojeni:     z.enum(['uctu', 'iban']).default('iban'),
  iban:            z.string().optional().or(z.literal('')),
  cislo_uctu:      z.string().optional().or(z.literal('')),
  banka_nazev:     z.string().optional().or(z.literal('')),
  email_fakturace: z.string().email('Neplatný e-mail').optional().or(z.literal('')),
  telefon:         z.string().optional().or(z.literal('')),
  web:             z.string().optional().or(z.literal('')),
  logo_url:        z.string().optional().or(z.literal('')),
}).superRefine((data, ctx) => {
  if (data.typ_spojeni === 'iban' && (!data.iban || data.iban.trim() === '')) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Při volbě IBAN je nutné IBAN vyplnit',
      path: ['iban'],
    })
  }
  if (data.typ_spojeni === 'uctu' && (!data.cislo_uctu || data.cislo_uctu.trim() === '')) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Při volbě čísla účtu je nutné číslo účtu vyplnit',
      path: ['cislo_uctu'],
    })
  }
})

export type FiremniProfilFormValues = z.infer<typeof firemniProfilSchema>

// ─────────────────────────────────────────────
// Zákazník
// ─────────────────────────────────────────────
export const zakaznikSchema = z.object({
  kod:                                z.string().min(1, 'Kód zákazníka je povinný'),
  nazev_spolecnosti:                  z.string().min(1, 'Název je povinný'),
  ico:                                z.string().optional().or(z.literal('')),
  dic:                                z.string().optional().or(z.literal('')),
  je_platce_dph:                      z.boolean().default(true),
  zeme:                               z.string().min(1).default('CZ'),
  je_zahranicni:                      z.boolean().default(false),
  email_fakturace:                    z.string().email('Neplatný e-mail').optional().or(z.literal('')),
  telefon:                            z.string().optional().or(z.literal('')),
  adresa:                             z.object({
    ulice:  z.string().optional().or(z.literal('')),
    mesto:  z.string().optional().or(z.literal('')),
    psc:    z.string().optional().or(z.literal('')),
    stat:   z.string().optional().or(z.literal('')),
  }).default({}),
  platebni_podminky_splatnost_dni:    z.coerce.number().int().min(0).default(14),
  poznamky:                           z.string().optional().or(z.literal('')),
})

export type ZakaznikFormValues = z.infer<typeof zakaznikSchema>

// ─────────────────────────────────────────────
// Položka Dokladu
// ─────────────────────────────────────────────
export const dokladPolozkaSchema = z.object({
  id:           z.string().uuid().optional(), // undefined pro nové
  poradi:       z.number().int().default(0),
  typ:          z.enum(['produkt', 'volna_polozka', 'sleva', 'zalohovy_odpocet', 'text_radek', 'zaokrouhleni']).default('volna_polozka'),
  produkt_id:   z.string().uuid().nullable().optional(),
  nazev:        z.string().min(1, 'Název položky je povinný'),
  popis:        z.string().optional().or(z.literal('')),
  jednotka:     z.string().default('ks'),
  mnozstvi:     z.coerce.number().positive('Množství musí být kladné').default(1),
  cena_bez_dph: z.coerce.number().default(0),
  sazba_dph:    z.coerce.number().refine(v => [0, 12, 21].includes(v), 'Neplatná sazba DPH').default(21),
  sleva_procent: z.coerce.number().min(0).max(100).default(0),
})

export type DokladPolozkaFormValues = z.infer<typeof dokladPolozkaSchema>

// ─────────────────────────────────────────────
// Hlavní Doklad (Vydaný / Sales)
// ─────────────────────────────────────────────
export const dokladSchema = z.object({
  typ:                   z.enum(['nabidka', 'objednavka', 'zalohova_faktura', 'faktura']),
  zakaznik_id:           z.string().uuid().min(1, 'Odběratel je povinný'),
  rodic_id:              z.string().uuid().nullable().optional(),

  datum_vystaveni:       z.string().min(1, 'Datum vystavení je povinné'),
  datum_splatnosti:      z.string().nullable().optional(),
  duzp:                  z.string().nullable().optional(),
  datum_platnosti:       z.string().nullable().optional(),

  mena:                  z.string().default('CZK'),
  kurz_k_czk:            z.coerce.number().positive().default(1),

  platce_dph:            z.boolean().default(true),
  reverse_charge:        z.boolean().default(false),
  zpusob_uhrady:         z.enum(['prevod', 'hotovost', 'karta']).default('prevod'),
  jazyk:                 z.enum(['cs', 'en']).default('cs'),
  tisk_podpisu:          z.boolean().default(true),

  zalohova_castka:       z.coerce.number().nullable().optional(),
  zalohova_procento:     z.coerce.number().min(0).max(100).nullable().optional(),

  poznamky:              z.string().optional().or(z.literal('')),
  interni_poznamky:      z.string().optional().or(z.literal('')),

  polozky:               z.array(dokladPolozkaSchema).default([]),
})

export type DokladFormValues = z.infer<typeof dokladSchema>

// ─────────────────────────────────────────────
// Položka Přijatého Dokladu
// ─────────────────────────────────────────────
export const prijatyDokladPolozkaSchema = z.object({
  id:           z.string().uuid().optional(),
  poradi:       z.number().int().default(0),
  typ:          z.enum(['produkt', 'volna_polozka', 'sleva', 'text_radek']).default('volna_polozka'),
  produkt_id:   z.string().uuid().nullable().optional(),
  nazev:        z.string().min(1, 'Název položky je povinný'),
  popis:        z.string().optional().or(z.literal('')),
  jednotka:     z.string().default('ks'),
  mnozstvi:     z.coerce.number().positive('Množství musí být kladné').default(1),
  cena_bez_dph: z.coerce.number().default(0),
  sazba_dph:    z.coerce.number().refine(v => [0, 12, 21].includes(v), 'Neplatná sazba DPH').default(21),
  sleva_procent: z.coerce.number().min(0).max(100).default(0),
})

export type PrijatyDokladPolozkaFormValues = z.infer<typeof prijatyDokladPolozkaSchema>

// ─────────────────────────────────────────────
// Přijatý Doklad (Nákupní / Procurement)
// ─────────────────────────────────────────────
export const prijatyDokladSchema = z.object({
  typ:                   z.enum(['objednavka_dodavateli', 'prijata_faktura']),
  cislo:                 z.string().optional(),
  externi_cislo_faktury: z.string().optional().or(z.literal('')),
  dodavatel_id:          z.string().uuid().min(1, 'Dodavatel je povinný'),
  rodic_id:              z.string().uuid().nullable().optional(),

  datum_vystaveni:       z.string().min(1, 'Datum vystavení je povinné'),
  datum_prijeti:         z.string().nullable().optional(),
  datum_splatnosti:      z.string().nullable().optional(),
  duzp:                  z.string().nullable().optional(),

  mena:                  z.string().default('CZK'),
  kurz_k_czk:            z.coerce.number().positive().default(1),

  platce_dph:            z.boolean().default(true),
  zpusob_uhrady:         z.enum(['prevod', 'hotovost', 'karta']).default('prevod'),
  jazyk:                 z.enum(['cs', 'en']).default('cs'),

  poznamky:              z.string().optional().or(z.literal('')),
  interni_poznamky:      z.string().optional().or(z.literal('')),

  polozky:               z.array(prijatyDokladPolozkaSchema).default([]),
})

export type PrijatyDokladFormValues = z.infer<typeof prijatyDokladSchema>
