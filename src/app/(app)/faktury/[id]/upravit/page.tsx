export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { getDokladById } from '@/modules/invoicing/actions/documents'
import { getZakaznici } from '@/modules/invoicing/actions/customers'
import { getProducts } from '@/modules/products/actions'
import { getSuppliers } from '@/modules/sourcing/actions'
import { DocumentForm } from '@/modules/invoicing/components/DocumentForm'

export const metadata = {
  title: 'Upravit Doklad — AZ Composite ERP',
}

interface EditDocumentPageProps {
  params: Promise<{ id: string }>
}

export default async function EditDocumentPage({ params }: EditDocumentPageProps) {
  const { id } = await params

  const [doklad, customers, productsResponse, suppliersResponse] = await Promise.all([
    getDokladById(id),
    getZakaznici(),
    getProducts(),
    getSuppliers(),
  ])

  if (!doklad) {
    redirect('/faktury')
  }

  // Lze upravovat pouze dokumenty ve stavu koncept
  if (doklad.stav !== 'koncept') {
    // Pokud je již doklad odeslán nebo uhrazen, nelze jej přímo upravovat
    redirect('/faktury')
  }

  const products = productsResponse.data || []
  const suppliers = suppliersResponse.data || []

  return (
    <div className="w-full py-4">
      <DocumentForm
        customers={customers}
        suppliers={suppliers}
        products={products}
        initialData={doklad}
      />
    </div>
  )
}
