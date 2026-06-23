export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { getPrijatyDokladById } from '@/modules/invoicing/actions/procurement'
import { getProducts } from '@/modules/products/actions'
import { getSuppliers } from '@/modules/sourcing/actions'
import { PrijatyDokladForm } from '@/modules/invoicing/components/PrijatyDokladForm'

export const metadata = {
  title: 'Upravit Nákupní Doklad — AZ Composite ERP',
}

interface EditProcurementPageProps {
  params: Promise<{ id: string }>
}

export default async function EditProcurementPage({ params }: EditProcurementPageProps) {
  const { id } = await params

  const [doklad, productsResponse, suppliersResponse] = await Promise.all([
    getPrijatyDokladById(id),
    getProducts(),
    getSuppliers(),
  ])

  if (!doklad) {
    redirect('/faktury/nakup')
  }

  // Lze upravovat pouze dokumenty ve stavu koncept
  if (doklad.stav !== 'koncept') {
    redirect('/faktury/nakup')
  }

  const products = productsResponse.data || []
  const suppliers = suppliersResponse.data || []

  return (
    <div className="w-full py-4">
      <PrijatyDokladForm
        suppliers={suppliers}
        products={products}
        initialData={doklad}
      />
    </div>
  )
}
