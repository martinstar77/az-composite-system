export const dynamic = 'force-dynamic'

import { getSuppliers } from '@/modules/sourcing/actions'
import { SupplierDataTable } from '@/modules/sourcing/components/SupplierDataTable'
import { CreateSupplierDialog } from '@/modules/sourcing/components/CreateSupplierDialog'

export default async function SuppliersPage() {
  const { data: suppliers, error } = await getSuppliers()

  if (error) {
    return <div>Chyba při načítání dodavatelů.</div>
  }

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Databáze Dodavatelů</h1>
          <p className="text-muted-foreground mt-1">Správa obchodních partnerů, kontaktů a nákupních měn.</p>
        </div>
        <CreateSupplierDialog />
      </div>

      <SupplierDataTable data={suppliers || []} />
    </div>
  )
}
