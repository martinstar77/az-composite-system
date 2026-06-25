export const dynamic = 'force-dynamic'

import { getZakazniciPaged, getCustomerLookups } from '@/modules/invoicing/actions/customers'
import { CustomerDataTable } from '@/modules/invoicing/components/CustomerDataTable'
import { CreateCustomerDialog } from '@/modules/invoicing/components/CreateCustomerDialog'

export const metadata = {
  title: 'Zákazníci — AZ Composite ERP',
  description: 'Správa odběratelů, fakturačních kontaktů a platebních podmínek',
}

export default async function CustomersPage() {
  const [{ data: customers, error, totalCount }, lookups] = await Promise.all([
    getZakazniciPaged({ page: 0, limit: 30 }),
    getCustomerLookups()
  ])

  if (error) {
    return <div>Chyba při načítání zákazníků: {error.message}</div>
  }

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Databáze Zákazníků</h1>
          <p className="text-muted-foreground mt-1">
            Správa odběratelů, fakturačních údajů, sídel a platebních lhůt.
          </p>
        </div>
        <CreateCustomerDialog />
      </div>

      <CustomerDataTable 
        initialData={customers || []} 
        initialTotalCount={totalCount || 0}
        lookups={lookups}
      />
    </div>
  )
}
