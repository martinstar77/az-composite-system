import { generateDokladPDF } from '@/modules/invoicing/actions/pdf'
import { getDokladById } from '@/modules/invoicing/actions/documents'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    let doklad = await getDokladById(id) as any
    if (!doklad) {
      const { getPrijatyDokladById } = await import('@/modules/invoicing/actions/procurement')
      doklad = await getPrijatyDokladById(id)
    }
    
    if (!doklad) {
      return new NextResponse('Doklad nenalezen', { status: 404 })
    }

    const buffer = await generateDokladPDF(id)
    if (!buffer) {
      return new NextResponse('Chyba při generování PDF', { status: 500 })
    }

    // Nastavíme headers pro inline zobrazení (browser PDF viewer)
    return new Response(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${doklad.cislo}.pdf"`,
        'Cache-Control': 'no-store, max-age=0',
      },
    })
  } catch (error: any) {
    console.error('[API PDF GET]', error)
    return new NextResponse('Interní chyba serveru: ' + error.message, { status: 500 })
  }
}
