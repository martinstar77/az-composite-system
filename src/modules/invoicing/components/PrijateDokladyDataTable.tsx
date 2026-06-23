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
  ArrowUpDown,
  Search,
  FilterX,
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
import type { PrijatyDoklad, PrijatyDokladStav, PrijatyDokladTyp } from '../types'
import { changePrijatyDokladStav, deletePrijatyDoklad } from '../actions/procurement'
import { PRIJATY_DOKLAD_TYP_LABELS, PRIJATY_DOKLAD_STAV_LABELS } from '../types'
import { formatMena, formatDatum, vypocitejSoucty } from '../utils/calculations'
import { DataTableFacetedFilter } from '@/shared/components/DataTableFacetedFilter'

interface PrijateDokladyDataTableProps {
  data: PrijatyDoklad[]
}

const TYP_COLORS: Record<string, string> = {
  objednavka_dodavateli: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  prijata_faktura: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
}

const STAV_COLORS: Record<string, string> = {
  koncept: 'bg-zinc-800 text-zinc-400 border-zinc-700',
  odeslano: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  doruceno: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
  schvaleno: 'bg-teal-500/10 text-teal-400 border-teal-500/20',
  uhrazeno: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  stornovano: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
}

export function PrijateDokladyDataTable({ data }: PrijateDokladyDataTableProps) {
  const router = useRouter()
  const [sorting, setSorting] = React.useState<SortingState>([{ id: 'datum_vystaveni', desc: true }])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [deleteDocObj, setDeleteDocObj] = React.useState<{ id: string; name: string } | null>(null)
  const [isDeleting, setIsDeleting] = React.useState(false)

  const handleDelete = async () => {
    if (!deleteDocObj) return
    setIsDeleting(true)
    try {
      const result = await deletePrijatyDoklad(deleteDocObj.id)
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

  const handleStatusChange = async (id: string, stav: PrijatyDokladStav) => {
    const result = await changePrijatyDokladStav(id, stav)
    if (result.error) {
      toast.error('Chyba při změně stavu', { description: result.error })
    } else {
      toast.success(`Stav změněn na: ${PRIJATY_DOKLAD_STAV_LABELS[stav]}`)
      router.refresh()
    }
  }

  const columns: ColumnDef<PrijatyDoklad>[] = [
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
      accessorKey: 'externi_cislo_faktury',
      header: 'Faktura dodavatele',
      cell: ({ row }) => <span className="font-mono text-xs">{row.getValue('externi_cislo_faktury') || '—'}</span>,
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
            {PRIJATY_DOKLAD_TYP_LABELS[typ as PrijatyDokladTyp] ?? typ}
          </Badge>
        )
      },
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id))
      },
    },
    {
      id: 'dodavatel',
      header: 'Dodavatel',
      cell: ({ row }) => {
        const doc = row.original
        const name = doc.dodavatel_udaje_snapshot?.nazev_spolecnosti ?? doc.dodavatel?.nazev_spolecnosti ?? '—'
        return <span className="font-bold text-sm text-zinc-100">{name}</span>
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
          Datum vystavení <ArrowUpDown className="ml-1 h-3 w-3" />
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
            {PRIJATY_DOKLAD_STAV_LABELS[stav as PrijatyDokladStav] ?? stav}
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
                <DropdownMenuLabel className="text-zinc-400">Správa nákupního dokladu</DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-zinc-800" />
                
                <DropdownMenuItem
                  onClick={() => window.open(`/api/pdf/${doc.id}`, '_blank')}
                  className="focus:bg-zinc-900 focus:text-white cursor-pointer"
                >
                  <Eye className="mr-2 h-4 w-4 text-zinc-400" /> Náhled a tisk
                </DropdownMenuItem>
 
                {doc.stav === 'koncept' && (
                  <DropdownMenuItem onClick={() => router.push(`/faktury/nakup/${doc.id}/upravit`)} className="focus:bg-zinc-900 focus:text-white cursor-pointer">
                    <FileEdit className="mr-2 h-4 w-4 text-primary" /> Upravit doklad
                  </DropdownMenuItem>
                )}
 
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
                    <DropdownMenuItem onClick={() => handleStatusChange(doc.id, 'doruceno')} disabled={doc.stav === 'doruceno'} className="cursor-pointer">
                      Doručeno
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleStatusChange(doc.id, 'schvaleno')} disabled={doc.stav === 'schvaleno'} className="cursor-pointer">
                      Schváleno
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleStatusChange(doc.id, 'uhrazeno')} disabled={doc.stav === 'uhrazeno'} className="cursor-pointer">
                      Uhrazeno
                    </DropdownMenuItem>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
 
                <DropdownMenuSeparator className="bg-zinc-800" />
 
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

  const documentTypes = ['objednavka_dodavateli', 'prijata_faktura']
  const documentStatuses = ['koncept', 'odeslano', 'doruceno', 'schvaleno', 'uhrazeno', 'stornovano']

  return (
    <div className="w-full space-y-4">
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
            title="Typ nákupu"
            options={documentTypes.map((t) => ({ label: PRIJATY_DOKLAD_TYP_LABELS[t as PrijatyDokladTyp] ?? t, value: t }))}
          />

          <DataTableFacetedFilter
            column={table.getColumn('stav')}
            title="Stav"
            options={documentStatuses.map((s) => ({ label: PRIJATY_DOKLAD_STAV_LABELS[s as PrijatyDokladStav] ?? s, value: s }))}
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
                  Žádné nákupní doklady nenalezeny.
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
              Opravdu chcete stornovat nákupní doklad <strong className="text-white">{deleteDocObj?.name}</strong>? Stornování zapíše změnu do audit logu a změní stav dokladu. Tuto operaci nelze vzít zpět.
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
