export const dynamic = 'force-dynamic'

import { getProductsPaged, getProductLookups } from '@/modules/products/actions'
import { ProductDataTable } from '@/modules/products/components/ProductDataTable'
import { CreateProductDialog } from '@/modules/products/components/forms/CreateProductDialog'

export default async function ProduktyPage() {
  const [{ data: produkty, error, totalCount }, lookups] = await Promise.all([
    getProductsPaged({ page: 0, limit: 30 }),
    getProductLookups()
  ])

  if (error) {
    return <div>Chyba při načítání produktů: {error.message}</div>
  }

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Katalog Produktů</h1>
          <p className="text-muted-foreground mt-1">Správa fyzických materiálů a jejich logistických definicí.</p>
        </div>
        <CreateProductDialog lookups={lookups} />
      </div>
      
      <ProductDataTable 
        initialData={produkty || []} 
        initialTotalCount={totalCount || 0} 
        lookups={lookups} 
      />
    </div>
  )
}
