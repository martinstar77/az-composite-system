export const dynamic = 'force-dynamic'

import { getZakaznici } from '@/modules/invoicing/actions/customers'
import { getProducts } from '@/modules/products/actions'
import { DocumentForm } from '@/modules/invoicing/components/DocumentForm'

export const metadata = {
  title: 'Nový Doklad — AZ Composite ERP',
  description: 'Vytvořit nový daňový doklad, zálohovou fakturu, nabídku nebo objednávku.',
}

export default async function NewDocumentPage() {
  const [customers, productsResponse] = await Promise.all([
    getZakaznici(),
    getProducts(),
  ])

  const products = productsResponse.data || []

  return (
    <div className="w-full py-4">
      <DocumentForm
        customers={customers}
        products={products}
      />
    </div>
  )
}
