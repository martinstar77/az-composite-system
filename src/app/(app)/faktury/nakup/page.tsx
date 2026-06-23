export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { Plus, Receipt } from 'lucide-react'
import { getPrijateDoklady } from '@/modules/invoicing/actions/procurement'
import { PrijateDokladyDataTable } from '@/modules/invoicing/components/PrijateDokladyDataTable'
import { Button } from '@/shared/components/ui/button'

export const metadata = {
  title: 'Přijaté doklady a Nákup — AZ Composite ERP',
  description: 'Správa objednávek dodavatelům a přijatých faktur.',
}

export default async function ProcurementPage() {
  const doklady = await getPrijateDoklady()

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      
      {/* Hlavička */}
      <div className="flex justify-between items-center">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Receipt className="h-5 w-5 text-primary" />
            </div>
            <h1 className="text-3xl font-bold text-foreground tracking-tight">Přijaté doklady (Nákup)</h1>
          </div>
          <p className="text-muted-foreground mt-1.5 text-sm">
            Tvorba a správa objednávek dodavatelům a evidence přijatých faktur.
          </p>
        </div>
        
        <Link href="/faktury/nakup/novy" passHref>
          <Button className="gap-2 h-9">
            <Plus className="h-4 w-4" />
            Nový nákupní doklad
          </Button>
        </Link>
      </div>

      {/* Datová tabulka */}
      <PrijateDokladyDataTable data={doklady} />

    </div>
  )
}
