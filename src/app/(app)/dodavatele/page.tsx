export const dynamic = 'force-dynamic'

import { getSuppliersPaged, getSupplierLookups } from '@/modules/sourcing/actions'
import { SupplierDataTable } from '@/modules/sourcing/components/SupplierDataTable'
import { CreateSupplierDialog } from '@/modules/sourcing/components/CreateSupplierDialog'

export default async function SuppliersPage() {
  const [{ data: suppliers, error, totalCount }, lookups] = await Promise.all([
    getSuppliersPaged({ page: 0, limit: 30 }),
    getSupplierLookups()
  ])

  if (error) {
    return <div>Chyba při načítání dodavatelů: {error.message}</div>
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

      <SupplierDataTable 
        initialData={suppliers || []} 
        initialTotalCount={totalCount || 0}
        lookups={lookups}
      />
    </div>
  )
}
