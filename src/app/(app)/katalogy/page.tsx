export const dynamic = 'force-dynamic'

import { getProducts } from '@/modules/products/actions'
import { getLatestRates, getGlobalFinanceSettings, getLogisticsTemplates } from '@/modules/finance/actions'
import { CatalogDashboard } from '@/modules/catalogs/components/CatalogDashboard'
import { notFound } from 'next/navigation'

export default async function KatalogyPage() {
  const [
    { data: products },
    { data: rates },
    { data: settings },
    { data: templates }
  ] = await Promise.all([
    getProducts(),
    getLatestRates(),
    getGlobalFinanceSettings(),
    getLogisticsTemplates()
  ])

  if (!settings || !products) {
    notFound()
  }

  return (
    <div className="w-full space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white tracking-tight">Katalogy a Price Matrix</h1>
        <p className="text-muted-foreground mt-1">Interní přehled ziskovosti a generování firemních B2B/B2C ceníků.</p>
      </div>

      <CatalogDashboard 
        products={products} 
        rates={rates || []} 
        settings={settings} 
        templates={templates || []} 
      />
    </div>
  )
}
