export const dynamic = 'force-dynamic'

import { getZakaznici } from '@/modules/invoicing/actions/customers'
import { CustomerDataTable } from '@/modules/invoicing/components/CustomerDataTable'
import { CreateCustomerDialog } from '@/modules/invoicing/components/CreateCustomerDialog'

export const metadata = {
  title: 'Zákazníci — AZ Composite ERP',
  description: 'Správa odběratelů, fakturačních kontaktů a platebních podmínek',
}

export default async function CustomersPage() {
  const customers = await getZakaznici()

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

      <CustomerDataTable data={customers} />
    </div>
  )
}
