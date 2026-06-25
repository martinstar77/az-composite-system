'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  SortingState,
  ColumnFiltersState,
} from '@tanstack/react-table'
import {
  MoreHorizontal,
  FileEdit,
  Trash2,
  Mail,
  Phone,
  Globe,
  ArrowUpDown,
  Search,
  FilterX,
  MapPin,
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
import type { Zakaznik } from '../types'
import { deleteZakaznik, getZakazniciPaged } from '../actions/customers'
import { EditCustomerDialog } from './EditCustomerDialog'
import { DataTableFacetedFilter } from '@/shared/components/DataTableFacetedFilter'

interface CustomerDataTableProps {
  initialData: Zakaznik[]
  initialTotalCount: number
  lookups: {
    countries: string[]
  }
}

export function CustomerDataTable({ initialData, initialTotalCount, lookups }: CustomerDataTableProps) {
  const router = useRouter()

  // Infinite Scroll & Client State
  const [customers, setCustomers] = React.useState<Zakaznik[]>(initialData)
  const [totalCount, setTotalCount] = React.useState(initialTotalCount)
  const [page, setPage] = React.useState(0)
  const [isLoading, setIsLoading] = React.useState(false)
  const [hasMore, setHasMore] = React.useState(initialData.length < initialTotalCount)

  // Filtering & Sorting State
  const [sorting, setSorting] = React.useState<SortingState>([{ id: 'nazev_spolecnosti', desc: false }])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [globalFilter, setGlobalFilter] = React.useState("")
  const [debouncedSearch, setDebouncedSearch] = React.useState("")

  const [editingCustomer, setEditingCustomer] = React.useState<Zakaznik | null>(null)
  const [deleteCustomerObj, setDeleteCustomerObj] = React.useState<{ id: string; name: string } | null>(null)
  const [isDeleting, setIsDeleting] = React.useState(false)

  const observerTargetRef = React.useRef<HTMLDivElement>(null)
  const isFirstRender = React.useRef(true)

  // Memoized filters
  const selectedCountries = React.useMemo(() => {
    return columnFilters.find(f => f.id === 'zeme')?.value as string[] | undefined
  }, [columnFilters])

  const selectedPayerStatus = React.useMemo(() => {
    return columnFilters.find(f => f.id === 'je_platce_dph')?.value as string[] | undefined
  }, [columnFilters])

  // Debounce search
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(globalFilter)
    }, 300)
    return () => clearTimeout(timer)
  }, [globalFilter])

  // Sync initialData updates
  React.useEffect(() => {
    const matchesFilters = (c: Zakaznik) => {
      if (debouncedSearch && debouncedSearch.trim()) {
        const term = debouncedSearch.trim().toLowerCase()
        const nameMatch = c.nazev_spolecnosti?.toLowerCase().includes(term)
        const codeMatch = c.kod?.toLowerCase().includes(term)
        if (!nameMatch && !codeMatch) return false
      }
      if (selectedCountries && selectedCountries.length > 0) {
        if (!c.zeme || !selectedCountries.includes(c.zeme)) return false
      }
      if (selectedPayerStatus && selectedPayerStatus.length > 0) {
        if (selectedPayerStatus.length === 1) {
          const isPayer = selectedPayerStatus[0] === 'platce'
          if (c.je_platce_dph !== isPayer) return false
        }
      }
      return true
    }

    const hasActiveFilters = 
      !!debouncedSearch || 
      (selectedCountries && selectedCountries.length > 0) || 
      (selectedPayerStatus && selectedPayerStatus.length > 0)

    setCustomers(prev => {
      const updatedPrev = prev.map(p => {
        const matchingInitial = initialData.find(init => init.id === p.id)
        return matchingInitial ? { ...p, ...matchingInitial } : p
      })

      const existingIds = new Set(updatedPrev.map(p => p.id))
      const brandNew = initialData.filter(init => !existingIds.has(init.id))
      const nextCustomers = [...brandNew, ...updatedPrev].filter(matchesFilters)
      
      if (!hasActiveFilters) {
        setHasMore(nextCustomers.length < initialTotalCount)
      }
      return nextCustomers
    })

    if (!hasActiveFilters) {
      setTotalCount(initialTotalCount)
    }
  }, [initialData, initialTotalCount, debouncedSearch, selectedCountries, selectedPayerStatus])

  // Helper to load paginated data based on filters & sorting
  const loadMore = React.useCallback(async () => {
    if (isLoading || !hasMore) return

    setIsLoading(true)
    try {
      const nextPage = page + 1
      const sortBy = sorting[0]?.id || 'nazev_spolecnosti'
      const sortDesc = sorting[0]?.desc || false

      const res = await getZakazniciPaged({
        page: nextPage,
        limit: 30,
        search: debouncedSearch,
        countries: selectedCountries,
        payerStatus: selectedPayerStatus,
        sortBy,
        sortDesc
      })

      if (res.error) {
        toast.error("Chyba při načítání dalších zákazníků: " + res.error.message)
        return
      }

      const newCustomers = res.data || []
      if (newCustomers.length === 0) {
        setHasMore(false)
        return
      }

      const loadedCount = res.totalCount || 0
      setCustomers(prev => {
        const existingIds = new Set(prev.map(p => p.id))
        const filteredNew = newCustomers.filter(p => !existingIds.has(p.id))
        const nextCustomers = [...prev, ...filteredNew]
        setHasMore(nextCustomers.length < loadedCount)
        return nextCustomers
      })
      setPage(nextPage)
    } catch (e: any) {
      toast.error("Chyba při načítání: " + e.message)
    } finally {
      setIsLoading(false)
    }
  }, [page, isLoading, hasMore, debouncedSearch, selectedCountries, selectedPayerStatus, sorting])

  const resetAndReload = React.useCallback(async () => {
    setIsLoading(true)
    try {
      const sortBy = sorting[0]?.id || 'nazev_spolecnosti'
      const sortDesc = sorting[0]?.desc || false

      const res = await getZakazniciPaged({
        page: 0,
        limit: 30,
        search: debouncedSearch,
        countries: selectedCountries,
        payerStatus: selectedPayerStatus,
        sortBy,
        sortDesc
      })

      if (res.error) {
        toast.error("Chyba při načítání zákazníků: " + res.error.message)
        return
      }

      const loadedCustomers = res.data || []
      setCustomers(loadedCustomers)
      setTotalCount(res.totalCount || 0)
      setPage(0)
      setHasMore(loadedCustomers.length < (res.totalCount || 0))
    } catch (e: any) {
      toast.error("Neočekávaná chyba při načítání: " + e.message)
    } finally {
      setIsLoading(false)
    }
  }, [debouncedSearch, selectedCountries, selectedPayerStatus, sorting])

  // IntersectionObserver to trigger loading when reaching the bottom
  React.useEffect(() => {
    const target = observerTargetRef.current
    if (!target || !hasMore || isLoading) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMore()
        }
      },
      { rootMargin: '200px' }
    )

    observer.observe(target)
    return () => {
      observer.unobserve(target)
    }
  }, [loadMore, hasMore, isLoading])

  // Fetch updated data when filters/sorting/search change
  React.useEffect(() => {
    let active = true

    async function loadInitialData() {
      setIsLoading(true)
      try {
        const sortBy = sorting[0]?.id || 'nazev_spolecnosti'
        const sortDesc = sorting[0]?.desc || false

        const res = await getZakazniciPaged({
          page: 0,
          limit: 30,
          search: debouncedSearch,
          countries: selectedCountries,
          payerStatus: selectedPayerStatus,
          sortBy,
          sortDesc
        })

        if (!active) return

        if (res.error) {
          toast.error("Chyba při načítání zákazníků: " + res.error.message)
          return
        }

        const loadedCustomers = res.data || []
        setCustomers(loadedCustomers)
        setTotalCount(res.totalCount || 0)
        setPage(0)
        setHasMore(loadedCustomers.length < (res.totalCount || 0))
      } catch (e: any) {
        if (active) {
          toast.error("Neočekávaná chyba při načítání: " + e.message)
        }
      } finally {
        if (active) setIsLoading(false)
      }
    }

    if (isFirstRender.current) {
      isFirstRender.current = false
      const hasNoActiveFilters = 
        !debouncedSearch && 
        columnFilters.length === 0 && 
        sorting.length === 1 && sorting[0].id === 'nazev_spolecnosti' && !sorting[0].desc

      if (hasNoActiveFilters) {
        return
      }
    }

    loadInitialData()

    return () => {
      active = false
    }
  }, [debouncedSearch, selectedCountries, selectedPayerStatus, sorting])

  const handleDelete = async () => {
    if (!deleteCustomerObj) return
    setIsDeleting(true)
    try {
      const result = await deleteZakaznik(deleteCustomerObj.id)
      if (result.error) {
        toast.error('Chyba při mazání', { description: result.error })
      } else {
        toast.success('Zákazník byl úspěšně odstraněn')
        setDeleteCustomerObj(null)
        resetAndReload()
      }
    } finally {
      setIsDeleting(false)
    }
  }

  const columns: ColumnDef<Zakaznik>[] = [
    {
      accessorKey: 'kod',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="-ml-4 text-[10px] font-bold uppercase tracking-tighter"
        >
          Kód <ArrowUpDown className="ml-1 h-3 w-3" />
        </Button>
      ),
      cell: ({ row }) => (
        <Badge variant="secondary" className="font-mono text-[10px]">
          {row.getValue('kod')}
        </Badge>
      ),
    },
    {
      accessorKey: 'nazev_spolecnosti',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="-ml-4 text-[10px] font-bold uppercase tracking-tighter"
        >
          Zákazník <ArrowUpDown className="ml-1 h-3 w-3" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="flex flex-col">
          <div className="font-bold text-sm text-zinc-100">{row.getValue('nazev_spolecnosti')}</div>
          <div className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
            <Globe className="h-3 w-3 text-primary" /> {row.original.zeme || 'CZ'}
            {row.original.je_zahranicni && (
              <Badge variant="outline" className="text-[9px] py-0 px-1 border-primary/40 text-primary">
                EU / Zahraničí
              </Badge>
            )}
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'zeme',
      header: 'Země',
      cell: () => null, // Hidden, used for filtering
    },
    {
      id: 'identifikace',
      header: 'IČO / DIČ',
      cell: ({ row }) => {
        const c = row.original
        return (
          <div className="text-[10px] text-zinc-400 font-mono">
            {c.ico ? (
              <div className="flex flex-col">
                <span>IČ: {c.ico}</span>
                {c.dic && <span className="text-zinc-500">DIČ: {c.dic}</span>}
              </div>
            ) : (
              <span className="text-zinc-600 italic">Fyzická osoba</span>
            )}
          </div>
        )
      },
    },
    {
      accessorKey: 'je_platce_dph',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="-ml-4 text-[10px] font-bold uppercase tracking-tighter"
        >
          DPH <ArrowUpDown className="ml-1 h-3 w-3" />
        </Button>
      ),
      cell: ({ row }) => {
        const isPayer = row.getValue('je_platce_dph') as boolean
        return (
          <div className="flex items-center gap-1.5 text-[10px]">
            {isPayer ? (
              <Badge className="bg-primary/20 hover:bg-primary/20 text-primary border-primary/30">
                Plátce
              </Badge>
            ) : (
              <Badge variant="outline" className="text-muted-foreground border-zinc-700">
                Neplátce
              </Badge>
            )}
          </div>
        )
      },
    },
    {
      accessorKey: 'platebni_podminky_splatnost_dni',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="-ml-4 text-[10px] font-bold uppercase tracking-tighter"
        >
          Splatnost <ArrowUpDown className="ml-1 h-3 w-3" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="text-[10px] text-zinc-400 font-medium">
          {row.getValue('platebni_podminky_splatnost_dni')} dní
        </div>
      ),
    },
    {
      id: 'kontakty',
      header: 'Kontakt',
      cell: ({ row }) => {
        const c = row.original
        return (
          <div className="flex flex-col gap-0.5">
            {c.email_fakturace && (
              <div className="flex items-center gap-1 text-[10px] text-zinc-400">
                <Mail className="h-3 w-3 text-primary shrink-0" /> {c.email_fakturace}
              </div>
            )}
            {c.telefon && (
              <div className="flex items-center gap-1 text-[10px] text-zinc-400">
                <Phone className="h-3 w-3 text-primary shrink-0" /> {c.telefon}
              </div>
            )}
            {!c.email_fakturace && !c.telefon && <span className="text-[10px] text-zinc-600 italic">—</span>}
          </div>
        )
      },
    },
    {
      id: 'adresa',
      header: 'Sídlo / Adresa',
      cell: ({ row }) => {
        const a = row.original.adresa
        if (!a?.mesto && !a?.ulice) return <span className="text-[10px] text-zinc-600 italic">—</span>
        const parts = [a.ulice, [a.psc, a.mesto].filter(Boolean).join(' '), a.stat].filter(Boolean)
        return (
          <div className="flex flex-col gap-0.5">
            {parts.map((part, i) => (
              <div key={i} className="flex items-center gap-1 text-[10px] text-zinc-400">
                {i === 0 && <MapPin className="h-3 w-3 text-primary flex-shrink-0" />}
                {i > 0 && <span className="w-3" />}
                {part}
              </div>
            ))}
          </div>
        )
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
        const customer = row.original
        return (
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="ghost" className="h-8 w-8 p-0" />}>
              <span className="sr-only">Otevřít menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-zinc-950 border-zinc-800 text-zinc-200">
              <DropdownMenuGroup>
                <DropdownMenuLabel className="text-zinc-400">Správa zákazníka</DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-zinc-800" />
                <DropdownMenuItem onClick={() => setEditingCustomer(customer)} className="focus:bg-zinc-900 focus:text-white cursor-pointer">
                  <FileEdit className="mr-2 h-4 w-4 text-primary" /> Upravit údaje
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setDeleteCustomerObj({ id: customer.id, name: customer.nazev_spolecnosti })}
                  className="text-destructive focus:bg-destructive/10 focus:text-destructive cursor-pointer"
                >
                  <Trash2 className="mr-2 h-4 w-4" /> Odstranit zákazníka
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]

  const table = useReactTable({
    data: customers,
    columns,
    getCoreRowModel: getCoreRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    state: {
      sorting,
      columnFilters,
    },
  })

  const countries = lookups.countries || []

  return (
    <div className="w-full space-y-4">
      {/* Vyhledávání a Filtry */}
      <div className="flex flex-col md:flex-row gap-3 items-center justify-between bg-zinc-900/50 p-3 rounded-lg border border-zinc-800">
        <div className="flex flex-1 items-center gap-3 w-full">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-500" />
            <Input
              placeholder="Hledat zákazníka..."
              value={globalFilter ?? ''}
              onChange={(event) => setGlobalFilter(String(event.target.value))}
              className="pl-9 bg-zinc-950 border-zinc-800 h-9"
            />
          </div>

          <DataTableFacetedFilter
            column={table.getColumn('zeme')}
            title="Země"
            options={countries.map((c) => ({ label: c, value: c }))}
          />

          <DataTableFacetedFilter
            column={table.getColumn('je_platce_dph')}
            title="DPH Status"
            options={[
              { label: 'Plátce', value: 'platce' },
              { label: 'Neplátce', value: 'neplatce' },
            ]}
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
        <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
          Zobrazeno {customers.length} z {totalCount}
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
                  Žádní zákazníci nenalezeni.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Observer Target & Loading State */}
      <div ref={observerTargetRef} className="h-16 flex items-center justify-center text-xs text-zinc-500 font-medium">
        {isLoading && (
          <div className="flex items-center gap-2">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent" />
            <span>Načítám další zákazníky...</span>
          </div>
        )}
        {!hasMore && customers.length > 0 && (
          <span>Zobrazeno všech {totalCount} zákazníků</span>
        )}
      </div>

      {editingCustomer && (
        <EditCustomerDialog
          customer={editingCustomer}
          open={!!editingCustomer}
          onOpenChange={(open) => !open && setEditingCustomer(null)}
        />
      )}

      <AlertDialog open={!!deleteCustomerObj} onOpenChange={(open) => !open && setDeleteCustomerObj(null)}>
        <AlertDialogContent className="bg-background border-zinc-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive">Potvrdit odstranění</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              Opravdu chcete trvale odstranit zákazníka <strong className="text-white">{deleteCustomerObj?.name}</strong>? Data o vystavených dokladech zůstanou zachována, ale zákazník již nebude aktivní pro tvorbu nových.
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
              {isDeleting ? 'Odstraňuji...' : 'Trvale odstranit'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
