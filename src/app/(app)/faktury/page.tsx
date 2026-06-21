export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { Plus, Receipt } from 'lucide-react'
import { getDoklady } from '@/modules/invoicing/actions/documents'
import { DocumentsDataTable } from '@/modules/invoicing/components/DocumentsDataTable'
import { Button } from '@/shared/components/ui/button'

export const metadata = {
  title: 'Doklady a Faktury — AZ Composite ERP',
  description: 'Správa faktur, nabídek, záloh a přijatých objednávek.',
}

export default async function InvoicesPage() {
  const doklady = await getDoklady()

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      
      {/* Hlavička */}
      <div className="flex justify-between items-center">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Receipt className="h-5 w-5 text-primary" />
            </div>
            <h1 className="text-3xl font-bold text-foreground tracking-tight">Doklady a Fakturace</h1>
          </div>
          <p className="text-muted-foreground mt-1.5 text-sm">
            Tvorba a správa daňových dokladů, zálohových faktur, nabídek a objednávek odběratelům.
          </p>
        </div>
        
        <Link href="/faktury/novy" passHref>
          <Button className="gap-2 h-9">
            <Plus className="h-4 w-4" />
            Nový doklad
          </Button>
        </Link>
      </div>

      {/* Datová tabulka */}
      <DocumentsDataTable data={doklady} />

    </div>
  )
}
