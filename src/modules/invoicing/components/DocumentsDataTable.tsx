'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getPaginationRowModel,
  SortingState,
  getSortedRowModel,
  ColumnFiltersState,
  getFilteredRowModel,
} from '@tanstack/react-table'
import {
  MoreHorizontal,
  FileEdit,
  Trash2,
  Download,
  Printer,
  ArrowUpDown,
  Search,
  FilterX,
  Plus,
  Eye,
  CheckSquare,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from '@/shared/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/shared/components/ui/alert-dialog'
import { Button } from '@/shared/components/ui/button'
import { Badge } from '@/shared/components/ui/badge'
import { Input } from '@/shared/components/ui/input'
import type { Doklad, DokladStav, DokladTyp } from '../types'
import { changeDokladStav, deleteDoklad } from '../actions/documents'
import { DOKLAD_TYP_LABELS, DOKLAD_STAV_LABELS } from '../types'
import { formatMena, formatDatum, vypocitejSoucty } from '../utils/calculations'
import { DataTableFacetedFilter } from '@/shared/components/DataTableFacetedFilter'

interface DocumentsDataTableProps {
  data: Doklad[]
}

const TYP_COLORS: Record<string, string> = {
  nabidka: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  objednavka: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  zalohova_faktura: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  faktura: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
}

const STAV_COLORS: Record<string, string> = {
  koncept: 'bg-zinc-800 text-zinc-400 border-zinc-700',
  odeslano: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  uhrazeno: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  castecne_uhrazeno: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  stornovano: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  po_splatnosti: 'bg-red-500/10 text-red-400 border-red-500/20',
}

export function DocumentsDataTable({ data }: DocumentsDataTableProps) {
  const router = useRouter()
  const [sorting, setSorting] = React.useState<SortingState>([{ id: 'datum_vystaveni', desc: true }])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [deleteDocObj, setDeleteDocObj] = React.useState<{ id: string; name: string } | null>(null)
  const [isDeleting, setIsDeleting] = React.useState(false)

  const handleDelete = async () => {
    if (!deleteDocObj) return
    setIsDeleting(true)
    try {
      const result = await deleteDoklad(deleteDocObj.id)
      if (result.error) {
        toast.error('Chyba při stornování dokladu', { description: result.error })
      } else {
        toast.success('Doklad byl úspěšně stornován')
        setDeleteDocObj(null)
        router.refresh()
      }
    } finally {
      setIsDeleting(false)
    }
  }

  const handleStatusChange = async (id: string, stav: DokladStav) => {
    const result = await changeDokladStav(id, stav)
    if (result.error) {
      toast.error('Chyba při změně stavu', { description: result.error })
    } else {
      toast.success(`Stav změněn na: ${DOKLAD_STAV_LABELS[stav]}`)
      router.refresh()
    }
  }

  const columns: ColumnDef<Doklad>[] = [
    {
      accessorKey: 'cislo',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="-ml-4 text-[10px] font-bold uppercase tracking-tighter"
        >
          Číslo dokladu <ArrowUpDown className="ml-1 h-3 w-3" />
        </Button>
      ),
      cell: ({ row }) => (
        <Link
          href={`/api/pdf/${row.original.id}`}
          target="_blank"
          className="font-mono font-bold text-primary hover:underline text-sm"
        >
          {row.getValue('cislo')}
        </Link>
      ),
    },
    {
      accessorKey: 'typ',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="-ml-4 text-[10px] font-bold uppercase tracking-tighter"
        >
          Typ <ArrowUpDown className="ml-1 h-3 w-3" />
        </Button>
      ),
      cell: ({ row }) => {
        const typ = row.getValue('typ') as string
        return (
          <Badge variant="outline" className={`${TYP_COLORS[typ] ?? ''} text-[10px] py-0.5 px-2`}>
            {DOKLAD_TYP_LABELS[typ as DokladTyp] ?? typ}
          </Badge>
        )
      },
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id))
      },
    },
    {
      id: 'zakaznik',
      header: 'Partner',
      cell: ({ row }) => {
        const doc = row.original
        const name = doc.zakaznik_udaje_snapshot?.nazev_spolecnosti ?? doc.zakaznik?.nazev_spolecnosti ?? doc.dodavatel?.nazev_spolecnosti ?? '—'
        const isSupplier = !!doc.dodavatel_id
        return (
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm text-zinc-100">{name}</span>
            {isSupplier && (
              <Badge variant="outline" className="text-[9px] py-0 px-1 bg-zinc-900/50 text-zinc-400 border-zinc-800">
                Dodavatel
              </Badge>
            )}
          </div>
        )
      },
    },
    {
      accessorKey: 'datum_vystaveni',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="-ml-4 text-[10px] font-bold uppercase tracking-tighter"
        >
          Vystaveno <ArrowUpDown className="ml-1 h-3 w-3" />
        </Button>
      ),
      cell: ({ row }) => <span className="text-[11px] text-zinc-400">{formatDatum(row.getValue('datum_vystaveni'))}</span>,
    },
    {
      accessorKey: 'datum_splatnosti',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="-ml-4 text-[10px] font-bold uppercase tracking-tighter"
        >
          Splatnost <ArrowUpDown className="ml-1 h-3 w-3" />
        </Button>
      ),
      cell: ({ row }) => {
        const date = row.getValue('datum_splatnosti') as string | null
        return <span className="text-[11px] text-zinc-400">{date ? formatDatum(date) : '—'}</span>
      },
    },
    {
      id: 'celkem',
      header: () => <div className="text-right text-[10px] font-bold uppercase tracking-tighter pr-4">Částka</div>,
      cell: ({ row }) => {
        const doc = row.original
        const soucty = vypocitejSoucty(doc.polozky ?? [])
        return (
          <div className="text-right pr-4 font-mono">
            <span className="font-bold text-zinc-100">{formatMena(soucty.k_uhrade, doc.mena)}</span>
            {doc.reverse_charge && (
              <span className="block text-[8px] text-primary italic font-sans">Reverse charge</span>
            )}
          </div>
        )
      },
    },
    {
      accessorKey: 'stav',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="-ml-4 text-[10px] font-bold uppercase tracking-tighter"
        >
          Stav <ArrowUpDown className="ml-1 h-3 w-3" />
        </Button>
      ),
      cell: ({ row }) => {
        const stav = row.getValue('stav') as string
        return (
          <Badge variant="outline" className={`${STAV_COLORS[stav] ?? ''} text-[10px] py-0.5 px-2`}>
            {DOKLAD_STAV_LABELS[stav as DokladStav] ?? stav}
          </Badge>
        )
      },
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id))
      },
    },
    {
      id: 'audit',
      header: 'Autor / Změna',
      cell: ({ row }) => {
        const s = row.original
        const updatedDate = new Date(s.aktualizovano_at).toLocaleDateString('cs-CZ')
        return (
          <div className="text-[10px] text-zinc-500 whitespace-nowrap">
            {s.upravil?.jmeno || 'Systém'} ({updatedDate})
          </div>
        )
      },
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const doc = row.original
        return (
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="ghost" className="h-8 w-8 p-0" />}>
              <span className="sr-only">Otevřít menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-zinc-950 border-zinc-800 text-zinc-200">
              <DropdownMenuGroup>
                <DropdownMenuLabel className="text-zinc-400">Správa dokladu</DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-zinc-800" />
                
                {/* Otevřít / stáhnout PDF */}
                <DropdownMenuItem
                  onClick={() => window.open(`/api/pdf/${doc.id}`, '_blank')}
                  className="focus:bg-zinc-900 focus:text-white cursor-pointer"
                >
                  <Eye className="mr-2 h-4 w-4 text-zinc-400" /> Náhled a tisk
                </DropdownMenuItem>

                {doc.stav === 'koncept' && (
                  <DropdownMenuItem onClick={() => router.push(`/faktury/${doc.id}/upravit`)} className="focus:bg-zinc-900 focus:text-white cursor-pointer">
                    <FileEdit className="mr-2 h-4 w-4 text-primary" /> Upravit doklad
                  </DropdownMenuItem>
                )}

                {/* Změny stavu dokladu */}
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger className="focus:bg-zinc-900 focus:text-white cursor-pointer">
                    <CheckSquare className="mr-2 h-4 w-4 text-zinc-400" /> Změnit stav
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent className="bg-zinc-950 border-zinc-800 text-zinc-200">
                    <DropdownMenuItem onClick={() => handleStatusChange(doc.id, 'koncept')} disabled={doc.stav === 'koncept'} className="cursor-pointer">
                      Koncept
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleStatusChange(doc.id, 'odeslano')} disabled={doc.stav === 'odeslano'} className="cursor-pointer">
                      Odesláno
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleStatusChange(doc.id, 'uhrazeno')} disabled={doc.stav === 'uhrazeno'} className="cursor-pointer">
                      Uhrazeno
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleStatusChange(doc.id, 'castecne_uhrazeno')} disabled={doc.stav === 'castecne_uhrazeno'} className="cursor-pointer">
                      Částečně uhrazeno
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleStatusChange(doc.id, 'po_splatnosti')} disabled={doc.stav === 'po_splatnosti'} className="cursor-pointer">
                      Po splatnosti
                    </DropdownMenuItem>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>

                <DropdownMenuSeparator className="bg-zinc-800" />

                {/* Storno / Smazání */}
                <DropdownMenuItem
                  onClick={() => setDeleteDocObj({ id: doc.id, name: doc.cislo })}
                  className="text-destructive focus:bg-destructive/10 focus:text-destructive cursor-pointer"
                  disabled={doc.stav === 'stornovano'}
                >
                  <Trash2 className="mr-2 h-4 w-4" /> Stornovat doklad
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    state: {
      sorting,
      columnFilters,
    },
  })

  // Získání unikátních hodnot pro filtry
  const documentTypes = ['nabidka', 'objednavka', 'zalohova_faktura', 'faktura']
  const documentStatuses = ['koncept', 'odeslano', 'uhrazeno', 'castecne_uhrazeno', 'po_splatnosti', 'stornovano']

  return (
    <div className="w-full space-y-4">
      {/* Vyhledávání a Filtry */}
      <div className="flex flex-col md:flex-row gap-3 items-center justify-between bg-zinc-900/50 p-3 rounded-lg border border-zinc-800">
        <div className="flex flex-1 items-center gap-3 w-full">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-500" />
            <Input
              placeholder="Hledat číslo dokladu..."
              value={(table.getColumn('cislo')?.getFilterValue() as string) ?? ''}
              onChange={(event) => {
                table.getColumn('cislo')?.setFilterValue(event.target.value)
              }}
              className="pl-9 bg-zinc-950 border-zinc-800 h-9"
            />
          </div>

          <DataTableFacetedFilter
            column={table.getColumn('typ')}
            title="Typ dokladu"
            options={documentTypes.map((t) => ({ label: DOKLAD_TYP_LABELS[t as DokladTyp] ?? t, value: t }))}
          />

          <DataTableFacetedFilter
            column={table.getColumn('stav')}
            title="Stav dokladu"
            options={documentStatuses.map((s) => ({ label: DOKLAD_STAV_LABELS[s as DokladStav] ?? s, value: s }))}
          />

          {columnFilters.length > 0 && (
            <Button
              variant="ghost"
              onClick={() => setColumnFilters([])}
              className="h-9 px-2 text-zinc-500 hover:text-zinc-200"
            >
              <FilterX className="h-4 w-4 mr-2" /> Reset
            </Button>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 overflow-hidden shadow-2xl">
        <Table>
          <TableHeader className="bg-zinc-900/80">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="hover:bg-transparent border-zinc-800">
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className="h-10 text-zinc-500">
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} className="hover:bg-zinc-900/50 border-zinc-800 transition-colors">
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="py-2.5">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-32 text-center text-zinc-500 italic">
                  Žádné doklady nenalezeny.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={!!deleteDocObj} onOpenChange={(open) => !open && setDeleteDocObj(null)}>
        <AlertDialogContent className="bg-background border-zinc-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive">Potvrdit stornování dokladu</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              Opravdu chcete stornovat doklad <strong className="text-white">{deleteDocObj?.name}</strong>? Stornování zapíše změnu do audit logu a změní stav dokladu. Tuto operaci nelze vzít zpět.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="border-t border-zinc-800 pt-4 mt-4">
            <AlertDialogCancel>Zrušit</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                handleDelete()
              }}
              className="bg-destructive text-white hover:bg-destructive/90"
              disabled={isDeleting}
            >
              {isDeleting ? 'Stornuji...' : 'Stornovat doklad'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
