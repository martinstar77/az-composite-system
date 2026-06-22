export const dynamic = 'force-dynamic'

import { getLatestRates, getGlobalFinanceSettings, getLogisticsTemplates, getCategoriesWithDefaults, getPackagingProfiles, getStandardBoxSizes } from '@/modules/finance/actions'
import { FinanceDashboard } from '@/modules/finance/components/FinanceDashboard'
import { LogisticsTemplateManager } from '@/modules/finance/components/LogisticsTemplateManager'
import { CategoryMarginManager } from '@/modules/finance/components/CategoryMarginManager'
import { PackagingProfileManager } from '@/modules/finance/components/PackagingProfileManager'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs"
import { Landmark, Truck, ShieldCheck, Package } from "lucide-react"

export default async function FinancePage() {
  const [
    { data: rates },
    { data: settings },
    { data: templates },
    { data: categories },
    { data: profiles },
    { data: boxSizes }
  ] = await Promise.all([
    getLatestRates(),
    getGlobalFinanceSettings(),
    getLogisticsTemplates(),
    getCategoriesWithDefaults(),
    getPackagingProfiles(),
    getStandardBoxSizes()
  ])

  if (!settings) {
    return <div>Chyba při načítání finančního nastavení.</div>
  }

  return (
    <div className="w-full max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground tracking-tight text-white">Finance a Měnový Engine</h1>
        <p className="text-muted-foreground mt-1">Správa aktuálních kurzů ČNB, poplatků, logistických tras a balicích profilů.</p>
      </div>

      <Tabs defaultValue="rates" className="w-full">
        <TabsList className="bg-zinc-900 border border-zinc-800 p-1 mb-8 flex flex-wrap h-auto">
          <TabsTrigger value="rates" className="gap-2 data-[state=active]:bg-zinc-800">
            <Landmark className="h-4 w-4" /> Kurzy a Nastavení
          </TabsTrigger>
          <TabsTrigger value="templates" className="gap-2 data-[state=active]:bg-zinc-800">
            <Truck className="h-4 w-4" /> Logistické Šablony
          </TabsTrigger>
          <TabsTrigger value="margins" className="gap-2 data-[state=active]:bg-zinc-800">
            <ShieldCheck className="h-4 w-4" /> Správce Marží (Kategorie)
          </TabsTrigger>
          <TabsTrigger value="packaging" className="gap-2 data-[state=active]:bg-zinc-800">
            <Package className="h-4 w-4" /> Balicí Profily & Krabice
          </TabsTrigger>
        </TabsList>

        <TabsContent value="rates">
          <FinanceDashboard rates={rates || []} settings={settings} />
        </TabsContent>

        <TabsContent value="templates">
          <LogisticsTemplateManager templates={templates || []} />
        </TabsContent>

        <TabsContent value="margins">
          <CategoryMarginManager categories={categories || []} templates={templates || []} />
        </TabsContent>

        <TabsContent value="packaging">
          <PackagingProfileManager profiles={profiles || []} boxSizes={boxSizes || []} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

