import { getFiremniProfil } from '@/modules/invoicing/actions/settings'
import { CompanySettingsForm } from '@/modules/invoicing/components/CompanySettingsForm'
import { Building2, Info } from 'lucide-react'

export const metadata = {
  title: 'Nastavení Firmy — AZ Composite ERP',
  description: 'Správa firemních fakturačních údajů — IČO, DIČ, adresa, IBAN pro QR platbu',
}

export default async function FirmaNastaveniPage() {
  const profil = await getFiremniProfil()

  return (
    <div className="max-w-3xl mx-auto space-y-6">

      {/* Hlavička */}
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 shrink-0">
          <Building2 className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Profil firmy</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Tyto údaje se zobrazují na všech vystavených dokladech (fakturách, nabídkách, objednávkách).
            Historické doklady si zachovávají snapshot původních údajů.
          </p>
        </div>
      </div>

      {/* Info box — přechod OSVČ → s.r.o. */}
      <div className="flex gap-3 p-4 rounded-lg border border-primary/20 bg-primary/5">
        <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
        <p className="text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">Přechod OSVČ → s.r.o.:</span>{' '}
          Při změně právní formy stačí aktualizovat IČO, DIČ a název níže.
          Všechny nové doklady automaticky použijí nové údaje. Historické doklady nejsou dotčeny.
        </p>
      </div>

      {/* Formulář */}
      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <CompanySettingsForm initialData={profil} />
      </div>

    </div>
  )
}
