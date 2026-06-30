export const dynamic = 'force-dynamic'

import { getProductsPaged, getProductLookups } from '@/modules/products/actions'
import { getLatestRates, getGlobalFinanceSettings } from '@/modules/finance/actions'
import { ProductDataTable } from '@/modules/products/components/ProductDataTable'
import { CreateProductDialog } from '@/modules/products/components/forms/CreateProductDialog'
import { BulkRecalculateWeightsButton } from '@/modules/products/components/BulkRecalculateWeightsButton'

export default async function ProduktyPage() {
  const [
    { data: produkty, error, totalCount }, 
    lookups,
    { data: rates },
    { data: settings }
  ] = await Promise.all([
    getProductsPaged({ page: 0, limit: 30 }),
    getProductLookups(),
    getLatestRates(),
    getGlobalFinanceSettings()
  ])

  if (error || !settings) {
    return <div>Chyba při načítání produktů nebo finančního nastavení: {error?.message}</div>
  }

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Katalog Produktů</h1>
          <p className="text-muted-foreground mt-1">Správa fyzických materiálů a jejich logistických definicí.</p>
        </div>
        <div className="flex gap-3 items-center">
          <BulkRecalculateWeightsButton />
          <CreateProductDialog lookups={lookups} />
        </div>
      </div>
      
      <ProductDataTable 
        initialData={produkty || []} 
        initialTotalCount={totalCount || 0} 
        lookups={lookups} 
        rates={rates || []}
        settings={settings}
      />
    </div>
  )
}
