export const dynamic = 'force-dynamic'

import { getProduct, getUnits } from '@/modules/products/actions'
import { getProductSourcing, getSuppliers } from '@/modules/sourcing/actions'
import { getLatestRates, getGlobalFinanceSettings, getLogisticsTemplates } from '@/modules/finance/actions'
import { ProductSourcingTab } from '@/modules/sourcing/components/ProductSourcingTab'
import { ProductPricingTab } from '@/modules/products/components/ProductPricingTab'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs"
import { Badge } from "@/shared/components/ui/badge"
import { ChevronLeft, Package, Truck, DollarSign, Users } from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"

export default async function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  
  const [
    { data: product, error: productError },
    { data: sourcing, error: sourcingError },
    { data: suppliers },
    { data: rates },
    { data: settings },
    { data: templates },
    { data: units }
  ] = await Promise.all([
    getProduct(id),
    getProductSourcing(id),
    getSuppliers(),
    getLatestRates(),
    getGlobalFinanceSettings(),
    getLogisticsTemplates(),
    getUnits()
  ])

  if (productError || !product) {
    notFound()
  }

  if (!settings) {
    return (
      <div className="p-8 text-center bg-red-500/10 border border-red-500/20 rounded-xl text-red-500">
        Chyba: Finanční nastavení nebylo nalezeno. Prosím nastavte globální parametry v sekci Finance.
      </div>
    )
  }

  return (
    <div className="w-full max-w-6xl mx-auto space-y-8 pb-20">
      {/* Navigation & Header */}
      <div className="space-y-4">
        <Link href="/produkty" className="flex items-center gap-1 text-sm text-zinc-500 hover:text-primary transition-colors group">
          <ChevronLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
          Zpět do katalogu
        </Link>
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h1 className="text-4xl font-bold tracking-tight text-white">{product.nazev}</h1>
              <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">
                {product.c_kategorie?.nazev}
              </Badge>
            </div>
            <p className="text-xl font-mono text-zinc-500 uppercase tracking-widest">{product.sku}</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-right">
              <p className="text-[10px] uppercase text-zinc-500 font-bold">Stav katalogu</p>
              <p className="text-sm font-semibold">{product.c_stavy_produktu?.nazev}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Tabs Area */}
      <Tabs defaultValue="sourcing" className="w-full">
        <TabsList className="bg-zinc-900 border border-zinc-800 p-1 mb-8">
          <TabsTrigger value="info" className="gap-2 data-[state=active]:bg-zinc-800">
            <Package className="h-4 w-4" /> Základní údaje
          </TabsTrigger>
          <TabsTrigger value="sourcing" className="gap-2 data-[state=active]:bg-zinc-800">
            <Users className="h-4 w-4" /> Sourcing & Nákup
          </TabsTrigger>
          <TabsTrigger value="pricing" className="gap-2 data-[state=active]:bg-zinc-800">
            <DollarSign className="h-4 w-4" /> Kalkulace ceny (Pricing)
          </TabsTrigger>
          <TabsTrigger value="inventory" className="gap-2 data-[state=active]:bg-zinc-800">
            <Truck className="h-4 w-4" /> Skladové šarže
          </TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div className="p-6 bg-zinc-900/50 border border-zinc-800 rounded-xl space-y-4 shadow-xl">
              <h3 className="text-lg font-semibold border-b border-zinc-800 pb-2 text-primary">Logistické parametry</h3>
              <div className="grid grid-cols-2 gap-y-4">
                <div>
                  <p className="text-xs text-zinc-500 uppercase font-bold">Základní jednotka</p>
                  <p className="text-lg">{product.c_merne_jednotky_zakladni?.nazev} ({product.c_merne_jednotky_zakladni?.zkratka})</p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500 uppercase font-bold">Hmotnost balíku</p>
                  <p className="text-lg">{product.hmotnost_baliku_kg} kg</p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500 uppercase font-bold">Balení</p>
                  <p className="text-lg">{product.mnozstvi_v_baleni} {product.c_merne_jednotky_baleni?.zkratka}</p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500 uppercase font-bold">Shelf Life</p>
                  <p className="text-lg">{product.shelf_life_mesice} měsíců</p>
                </div>
              </div>
            </div>

            <div className="p-6 bg-zinc-900/50 border border-zinc-800 rounded-xl space-y-4 shadow-xl">
              <h3 className="text-lg font-semibold border-b border-zinc-800 pb-2 text-primary">Skladové limity (Digital Twin)</h3>
              <div className="grid grid-cols-2 gap-4 text-center">
                <div className="p-4 bg-red-500/5 border border-red-500/20 rounded-lg">
                  <p className="text-xs text-zinc-500 uppercase font-bold mb-1">Minimum</p>
                  <p className="text-2xl font-bold text-red-500">{product.min_skladova_zasoba || 0} {product.c_merne_jednotky_baleni?.zkratka}</p>
                </div>
                <div className="p-4 bg-zinc-800/50 border border-zinc-800 rounded-lg">
                  <p className="text-xs text-zinc-500 uppercase font-bold mb-1">Optimum</p>
                  <p className="text-2xl font-bold text-zinc-200">{product.opt_skladova_zasoba || 0} {product.c_merne_jednotky_baleni?.zkratka}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="p-6 bg-zinc-900/50 border border-zinc-800 rounded-xl space-y-4 shadow-xl h-fit">
            <h3 className="text-lg font-semibold border-b border-zinc-800 pb-2 text-primary">Technické specifikace (JSONB)</h3>
            <pre className="text-xs bg-zinc-950 p-4 rounded-lg font-mono text-primary/80 overflow-auto border border-zinc-800 shadow-inner">
              {JSON.stringify(product.specifikace, null, 2)}
            </pre>
          </div>
        </TabsContent>

        <TabsContent value="sourcing" className="bg-zinc-900/20 p-6 rounded-xl border border-dashed border-zinc-800">
          <ProductSourcingTab 
            productId={product.id} 
            sourcingData={sourcing || []} 
            suppliers={suppliers || []} 
            templates={templates || []}
            units={units || []}
          />
        </TabsContent>

        <TabsContent value="pricing">
           <ProductPricingTab 
             product={product}
             sourcingData={sourcing || []}
             rates={rates || []}
             settings={settings!}
             templates={templates || []}
           />
        </TabsContent>

        <TabsContent value="inventory" className="py-20 text-center border border-dashed border-zinc-800 rounded-xl">
           <Truck className="h-12 w-12 text-zinc-700 mx-auto mb-4" />
           <h3 className="text-xl font-bold text-zinc-500">Modul Skladové šarže</h3>
           <p className="text-zinc-600 max-w-sm mx-auto">Tento modul bude implementován v rámci Fáze 4 Master Plánu.</p>
        </TabsContent>
      </Tabs>
    </div>
  )
}
