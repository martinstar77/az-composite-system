export const dynamic = 'force-dynamic'

import { getProducts } from '@/modules/products/actions'
import { getSuppliers } from '@/modules/sourcing/actions'
import { PrijatyDokladForm } from '@/modules/invoicing/components/PrijatyDokladForm'

export const metadata = {
  title: 'Nový Nákupní Doklad — AZ Composite ERP',
  description: 'Vytvořit novou objednávku dodavateli nebo zaevidovat přijatou fakturu.',
}

export default async function NewProcurementPage() {
  const [productsResponse, suppliersResponse] = await Promise.all([
    getProducts(),
    getSuppliers(),
  ])

  const products = productsResponse.data || []
  const suppliers = suppliersResponse.data || []

  return (
    <div className="w-full py-4">
      <PrijatyDokladForm
        suppliers={suppliers}
        products={products}
      />
    </div>
  )
}
