"use client"

import * as React from "react"
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  SortingState,
  ColumnFiltersState,
  RowSelectionState,
} from "@tanstack/react-table"
import Link from "next/link"
import { ArrowUpDown, MoreHorizontal, FileEdit, Search, FilterX, ExternalLink, Settings2, Copy, Trash2 } from "lucide-react"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/components/ui/alert-dialog"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { Badge } from "@/shared/components/ui/badge"
import { Checkbox } from "@/shared/components/ui/checkbox"
import { Product } from "../types"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
} from "@/shared/components/ui/dropdown-menu"
import { EditProductDialog } from "./forms/EditProductDialog"
import { DataTableFacetedFilter } from "@/shared/components/DataTableFacetedFilter"
import { BulkEditMarginsDialog } from "./forms/BulkEditMarginsDialog"
import { BulkEditLogisticsDialog } from "./forms/BulkEditLogisticsDialog"
import { LogisticsTemplate } from "@/modules/finance/types/logistics"
import { cloneProduct, deleteProduct, getProductsPaged, getCategoryFacets } from "../actions"
import { toast } from "sonner"

interface ProductDataTableProps {
  initialData: Product[]
  initialTotalCount: number
  lookups: {
    categories: any[]
    units: any[]
    statuses: any[]
    labels: any[]
    processes: any[]
    templates: LogisticsTemplate[]
  }
}

const CATEGORY_SPEC_MAP: Record<string, { key: string; label: string }[]> = {
  vyztuzne_materialy: [
    { key: 'typ', label: 'Typ' },
    { key: 'materiál', label: 'Materiál' },
    { key: 'vlákno', label: 'Vlákno' },
    { key: 'použití', label: 'Použití' },
    { key: 'výrobce_vlákna', label: 'Výrobce' },
    { key: 'kód_vlákna', label: 'Kód vlákna' },
    { key: 'vazba', label: 'Vazba' },
    { key: 'gramáž', label: 'Gramáž' }
  ],
  consumables: [
    { key: 'podkategorie', label: 'Podkategorie' },
    { key: 'format', label: 'Formát' },
    { key: 'teplotni_odolnost', label: 'Teplotní odolnost' },
    { key: 'perforace', label: 'Perforace' }
  ],
  pryskyrice: [
    { key: 'typ', label: 'Typ' },
    { key: 'chemie', label: 'Chemie' },
    { key: 'technologie', label: 'Technologie' },
    { key: 'pouziti', label: 'Použití' }
  ],
  lepidla: [
    { key: 'chemie', label: 'Chemie' },
    { key: 'open_time_min', label: 'Zpracovatelnost' }
  ],
  spotrebni_chemie: [
    { key: 'typ', label: 'Typ' },
    { key: 'značka', label: 'Značka' },
    { key: 'mnozstvi', label: 'Množství' }
  ],
  naradi: [
    { key: 'podkategorie', label: 'Podkategorie' },
    { key: 'objem_l', label: 'Objem' }
  ]
}

const SPEC_VALUE_LABELS: Record<string, Record<string, string>> = {
  chemie: {
    EP: 'Epoxid (EP)',
    PU: 'Polyuretan (PU)',
    MMA: 'Akrylát (MMA)',
    VE: 'Vinylester (VE)',
    PE: 'Polyester (PE)'
  },
  typ: {
    RES: 'Pryskyřice (Resin)',
    HRD: 'Tužidlo (Hardener)',
    GEL: 'Gelcoat',
    COP: 'Coupling coat',
    FIL: 'Tmel (Filler)',
    WIP: 'Ubrousky (Wipes)',
    CON: 'Koncentrát',
    SPR: 'Sprej (Spray)',
    WF: 'WF (Tkanina / Woven)',
    UD: 'UD (Jednosměrná / Uni)',
    BIAX: 'BIAX (Biaxiální)',
    MAT: 'MAT (Rohož)'
  },
  technologie: {
    INF: 'Infuze (Infusion)',
    WL: 'Ruční laminace (Wet layup)'
  },
  pouziti: {
    FOR: 'Formy (Molds)',
    DIL: 'Díly (Parts)'
  },
  použití: {
    E: 'Economy (E)',
    V: 'Visual (V)',
    I: 'Industry (I)',
    NA: 'N/A'
  },
  vazba: {
    P: 'Plátno (Plain)',
    T22: 'Kepr 2/2 (Twill 2/2)',
    T44: 'Kepr 4/4 (Twill 4/4)',
    NP: 'Vpichovaná (Needle punched)',
    EM: 'Emulzní (Emulsion)',
    PB: 'Prášková (Powder binder)',
    ST: 'Prošívaná (Stitched)',
    '090': '0/90°',
    '45': '±45°'
  },
  materiál: {
    CF: 'Uhlík (Carbon)',
    GF: 'Sklo (Glass)',
    AF: 'Aramid',
    HF: 'Hybrid',
    BIOF: 'Len (Flax)',
    BIOH: 'Konopí (Hemp)',
    PAN: 'Polyakrylonitril',
    PET: 'Polyester (PET)',
    OF: 'Jiné vlákno'
  },
  format: {
    TUBE: 'Tubus',
    SHT: 'Fólie plochá',
    VSHT: 'Fólie V-sklad',
    GSC: 'Harmonika'
  },
  perforace: {
    NP: 'Neperforovaná',
    P3: 'Perforace P3',
    P6: 'Perforace P6',
    P16: 'Perforace P16',
    P31: 'Perforace P31'
  },
  podkategorie: {
    BF: 'Vakuová fólie (BF)',
    RF: 'Separační fólie (RF)',
    PP: 'Strhávací tkanina (PP)',
    'PP-PTFE': 'Teflonová strhávací tkanina (PP-PTFE)',
    BC: 'Odsávací netkaná textilie (BC)',
    ST: 'Těsnící páska (ST)',
    FT: 'Flash tape páska (FT)',
    FM: 'Distribuční síťka (FM)',
    FCH: 'Distribuční kanálek (FCH)',
    TUBE: 'Hadice (TUBE)',
    K: 'Konektory a fitinky (K)',
    MTI: 'MTI',
    KP: 'Konektor průchodný (KP)',
    BU: 'Průchodky (BU)',
    QR: 'Rychlospojky (QR)',
    SQ: 'Hadice a spirály (SQ)',
    V: 'Ventily (V)',
    CU: 'Mycí stanice (CU)',
    SU: 'Spinner unit (SU)'
  }
}

export function ProductDataTable({ initialData, initialTotalCount, lookups }: ProductDataTableProps) {
  // Infinite Scroll & Client State
  const [products, setProducts] = React.useState<Product[]>(initialData)
  const [totalCount, setTotalCount] = React.useState(initialTotalCount)
  const [page, setPage] = React.useState(0)
  const [isLoading, setIsLoading] = React.useState(false)
  const [hasMore, setHasMore] = React.useState(initialData.length < initialTotalCount)

  // Filtering & Sorting State
  const [sorting, setSorting] = React.useState<SortingState>([{ id: "nazev", desc: false }])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [globalFilter, setGlobalFilter] = React.useState("")
  const [debouncedSearch, setDebouncedSearch] = React.useState("")
  
  // Dynamic spec filters state
  const [specFilters, setSpecFilters] = React.useState<Record<string, string[]>>({})
  const [facets, setFacets] = React.useState<Record<string, { value: string, count: number }[]>>({})
  const [isFacetsLoading, setIsFacetsLoading] = React.useState(false)
  
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({})
  const [editingProduct, setEditingProduct] = React.useState<Product | null>(null)
  const [productToDelete, setProductToDelete] = React.useState<Product | null>(null)

  // Bulk Actions State
  const [isBulkMarginsOpen, setIsBulkMarginsOpen] = React.useState(false)
  const [isBulkLogisticsOpen, setIsBulkLogisticsOpen] = React.useState(false)

  const observerTargetRef = React.useRef<HTMLDivElement>(null)
  const isFirstRender = React.useRef(true)

  // Memoized filters
  const selectedCategories = React.useMemo(() => {
    return columnFilters.find(f => f.id === 'kategorie_id')?.value as string[] | undefined
  }, [columnFilters])

  const selectedStatuses = React.useMemo(() => {
    return columnFilters.find(f => f.id === 'stav_katalogu_id')?.value as string[] | undefined
  }, [columnFilters])

  // Load facets on category / search change
  React.useEffect(() => {
    const activeCategory = selectedCategories && selectedCategories.length === 1 ? selectedCategories[0] : null
    
    if (!activeCategory) {
      setFacets({})
      setSpecFilters({})
      return
    }

    const catId = activeCategory
    let active = true
    async function loadFacets() {
      setIsFacetsLoading(true)
      try {
        const res = await getCategoryFacets(catId, debouncedSearch)
        if (active && res.data) {
          setFacets(res.data)
        }
      } catch (err) {
        console.error("Error loading facets:", err)
      } finally {
        if (active) setIsFacetsLoading(false)
      }
    }

    // Reset filters of other categories when changing categories
    setSpecFilters(prev => {
      const next: Record<string, string[]> = {}
      const allowedKeys = CATEGORY_SPEC_MAP[activeCategory]?.map(s => s.key) || []
      Object.entries(prev).forEach(([k, v]) => {
        if (allowedKeys.includes(k)) {
          next[k] = v
        }
      })
      return next
    })

    loadFacets()

    return () => {
      active = false
    }
  }, [selectedCategories, debouncedSearch])

  // Debounce search input to avoid database overload
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(globalFilter)
    }, 300)
    return () => clearTimeout(timer)
  }, [globalFilter])

  // Merge server-rendered initial data updates without shrinking the list or resetting page to 0
  React.useEffect(() => {
    const matchesFilters = (p: Product) => {
      if (debouncedSearch && debouncedSearch.trim()) {
        const s = debouncedSearch.trim().toLowerCase()
        const nameMatch = p.nazev?.toLowerCase().includes(s)
        const skuMatch = p.sku?.toLowerCase().includes(s)
        if (!nameMatch && !skuMatch) return false
      }
      if (selectedCategories && selectedCategories.length > 0) {
        if (!p.kategorie_id || !selectedCategories.includes(p.kategorie_id)) return false
      }
      if (selectedStatuses && selectedStatuses.length > 0) {
        if (!p.stav_katalogu_id || !selectedStatuses.includes(p.stav_katalogu_id)) return false
      }
      if (specFilters && Object.keys(specFilters).length > 0) {
        for (const [key, values] of Object.entries(specFilters)) {
          if (values && values.length > 0) {
            const pVal = p.specifikace?.[key]
            if (!pVal || !values.includes(String(pVal))) return false
          }
        }
      }
      return true
    }

    const hasActiveFilters = 
      !!debouncedSearch || 
      (selectedCategories && selectedCategories.length > 0) || 
      (selectedStatuses && selectedStatuses.length > 0) || 
      Object.values(specFilters).some(v => v.length > 0)

    setProducts(prev => {
      // Update existing products with new data from initialData if they exist, or preserve them
      const updatedPrev = prev.map(p => {
        const matchingInitial = initialData.find(init => init.id === p.id)
        return matchingInitial ? { ...p, ...matchingInitial } : p
      })

      // Add any new products from initialData that are not in the current list
      const existingIds = new Set(updatedPrev.map(p => p.id))
      const brandNew = initialData.filter(init => !existingIds.has(init.id))
      const nextProducts = [...brandNew, ...updatedPrev].filter(matchesFilters)
      
      if (!hasActiveFilters) {
        setHasMore(nextProducts.length < initialTotalCount)
      }
      return nextProducts
    })

    if (!hasActiveFilters) {
      setTotalCount(initialTotalCount)
    }
  }, [initialData, initialTotalCount, debouncedSearch, selectedCategories, selectedStatuses, specFilters])

  // Helper to load paginated data based on filters & sorting
  const loadMore = React.useCallback(async () => {
    if (isLoading || !hasMore) return

    setIsLoading(true)
    try {
      const nextPage = page + 1
      const sortBy = sorting[0]?.id || 'nazev'
      const sortDesc = sorting[0]?.desc || false

      const res = await getProductsPaged({
        page: nextPage,
        limit: 30,
        search: debouncedSearch,
        categories: selectedCategories,
        statuses: selectedStatuses,
        specs: specFilters,
        sortBy,
        sortDesc
      })

      if (res.error) {
        toast.error("Chyba při načítání dalších produktů: " + res.error.message)
        if (res.error.code === 'PGRST103' || String(res.error.message).includes('satisfiable')) {
          setHasMore(false)
        }
        return
      }

      const newProducts = res.data || []
      if (newProducts.length === 0) {
        setHasMore(false)
        return
      }

      const loadedCount = res.totalCount || 0
      setProducts(prev => {
        const existingIds = new Set(prev.map(p => p.id))
        const filteredNew = newProducts.filter(p => !existingIds.has(p.id))
        const nextProducts = [...prev, ...filteredNew]
        setHasMore(nextProducts.length < loadedCount)
        return nextProducts
      })
      setPage(nextPage)
    } catch (e: any) {
      toast.error("Chyba při načítání: " + e.message)
    } finally {
      setIsLoading(false)
    }
  }, [page, isLoading, hasMore, debouncedSearch, selectedCategories, selectedStatuses, specFilters, sorting])

  // Reset to page 0 and load fresh data when filters/search/sorting change
  const resetAndReload = React.useCallback(async () => {
    setIsLoading(true)
    try {
      const sortBy = sorting[0]?.id || 'nazev'
      const sortDesc = sorting[0]?.desc || false

      const res = await getProductsPaged({
        page: 0,
        limit: 30,
        search: debouncedSearch,
        categories: selectedCategories,
        statuses: selectedStatuses,
        specs: specFilters,
        sortBy,
        sortDesc
      })

      if (res.error) {
        toast.error("Chyba při načítání produktů: " + res.error.message)
        return
      }

      const loadedProducts = res.data || []
      setProducts(loadedProducts)
      setTotalCount(res.totalCount || 0)
      setPage(0)
      setHasMore(loadedProducts.length < (res.totalCount || 0))
    } catch (e: any) {
      toast.error("Neočekávaná chyba při načítání: " + e.message)
    } finally {
      setIsLoading(false)
    }
  }, [debouncedSearch, selectedCategories, selectedStatuses, specFilters, sorting])

  // IntersectionObserver to trigger loading when reaching the bottom margin
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
        const sortBy = sorting[0]?.id || 'nazev'
        const sortDesc = sorting[0]?.desc || false

        const res = await getProductsPaged({
          page: 0,
          limit: 30,
          search: debouncedSearch,
          categories: selectedCategories,
          statuses: selectedStatuses,
          specs: specFilters,
          sortBy,
          sortDesc
        })

        if (!active) return

        if (res.error) {
          toast.error("Chyba při načítání produktů: " + res.error.message)
          return
        }

        const loadedProducts = res.data || []
        setProducts(loadedProducts)
        setTotalCount(res.totalCount || 0)
        setPage(0)
        setHasMore(loadedProducts.length < (res.totalCount || 0))
      } catch (e: any) {
        if (active) {
          toast.error("Neočekávaná chyba při načítání: " + e.message)
        }
      } finally {
        if (active) setIsLoading(false)
      }
    }

    // Skip the very first run on mount if the filters/sorting are at their default values
    if (isFirstRender.current) {
      isFirstRender.current = false
      const hasNoActiveFilters = 
        !debouncedSearch && 
        columnFilters.length === 0 && 
        Object.keys(specFilters).length === 0 &&
        sorting.length === 1 && sorting[0].id === 'nazev' && !sorting[0].desc

      if (hasNoActiveFilters) {
        return
      }
    }

    loadInitialData()

    return () => {
      active = false
    }
  }, [debouncedSearch, selectedCategories, selectedStatuses, specFilters, sorting])

  const handleCloneProduct = async (product: Product) => {
    try {
      toast.loading("Duplikuji produkt...", { id: "clone" })
      const result = await cloneProduct(product.id)
      if (result.error) throw result.error
      toast.success("Produkt úspěšně zduplikován", { id: "clone" })
      
      const newProduct = result.data as Product
      if (newProduct) {
        setProducts(prev => {
          const originalIndex = prev.findIndex(p => p.id === product.id)
          if (originalIndex === -1) {
            return [newProduct, ...prev]
          }
          const nextProducts = [...prev]
          nextProducts.splice(originalIndex + 1, 0, newProduct)
          return nextProducts
        })
        setTotalCount(prev => prev + 1)
      }
    } catch (e: any) {
      toast.error("Chyba při duplikaci", { description: e.message, id: "clone" })
    }
  }

  const handleDeleteProduct = async () => {
    if (!productToDelete) return
    try {
      toast.loading("Odstraňuji produkt...", { id: "delete" })
      const { error } = await deleteProduct(productToDelete.id)
      if (error) throw error
      toast.success("Produkt úspěšně odstraněn", { id: "delete" })
      setProducts(prev => prev.filter(p => p.id !== productToDelete.id))
      setTotalCount(prev => Math.max(0, prev - 1))
    } catch (e: any) {
      toast.error("Chyba při odstraňování", { description: e.message, id: "delete" })
    } finally {
      setProductToDelete(null)
    }
  }

  const columns: ColumnDef<Product>[] = [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllRowsSelected()}
          onCheckedChange={(value) => table.toggleAllRowsSelected(!!value)}
          aria-label="Vybrat vše"
          className="translate-y-[2px]"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Vybrat řádek"
          className="translate-y-[2px]"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "sku",
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")} className="-ml-4 text-[10px] font-bold uppercase tracking-tighter">
          SKU <ArrowUpDown className="ml-1 h-3 w-3" />
        </Button>
      ),
      cell: ({ row }) => <div className="font-mono text-xs font-medium text-zinc-400">{row.getValue("sku")}</div>,
    },
    {
      accessorKey: "nazev",
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")} className="-ml-4 text-[10px] font-bold uppercase tracking-tighter">
          Název <ArrowUpDown className="ml-1 h-3 w-3" />
        </Button>
      ),
      cell: ({ row }) => (
        <Link href={`/produkty/${row.original.id}`} className="group flex items-center gap-2">
          <span className="font-semibold text-sm group-hover:text-primary transition-colors underline-offset-4 group-hover:underline">{row.getValue("nazev")}</span>
          <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 text-primary transition-all" />
        </Link>
      ),
    },
    {
      accessorKey: "kategorie_id",
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")} className="-ml-4 text-[10px] font-bold uppercase tracking-tighter">
          Kategorie <ArrowUpDown className="ml-1 h-3 w-3" />
        </Button>
      ),
      cell: ({ row }) => {
        const product = row.original;
        return (
          <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 hover:bg-primary/10 text-[10px] py-0 px-2 h-5">
            {product.kategorie_id === 'spotrebni_chemie' ? 'Čističe' : (product.c_kategorie?.nazev || product.kategorie_id)}
          </Badge>
        )
      },
    },
    {
      accessorKey: "stav_katalogu_id",
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")} className="-ml-4 text-[10px] font-bold uppercase tracking-tighter">
          Stav <ArrowUpDown className="ml-1 h-3 w-3" />
        </Button>
      ),
      cell: ({ row }) => {
        const product = row.original;
        const status = product.c_stavy_produktu?.nazev || product.stav_katalogu_id || "";
        return (
          <div className="flex items-center gap-2">
            <div className={`h-1.5 w-1.5 rounded-full ${status.includes('Aktivní') ? 'bg-green-500' : 'bg-zinc-500'}`} />
            <span className="text-[10px] font-medium text-muted-foreground">{status}</span>
          </div>
        )
      },
    },
    {
      id: "sourcing",
      header: "Nákupní cena / Trasa",
      cell: ({ row }) => {
        const sourcing = row.original.produkt_dodavatel?.find(s => s.is_primary) || row.original.produkt_dodavatel?.[0]
        if (!sourcing) return <span className="text-[10px] text-zinc-500 italic">Nedefinováno</span>
        
        return (
          <div className="flex flex-col gap-1">
            <span className="font-mono text-xs font-bold text-primary">
              {sourcing.nakupni_cena.toFixed(2)} {sourcing.mena}
            </span>
            {sourcing.logisticke_sablony ? (
              <span className="text-[10px] text-zinc-400 max-w-[120px] truncate" title={sourcing.logisticke_sablony.nazev}>
                🚚 {sourcing.logisticke_sablony.nazev}
              </span>
            ) : (
              <span className="text-[10px] text-yellow-600">Bez logistické trasy</span>
            )}
          </div>
        )
      }
    },
    {
      id: "margins",
      header: "Cílové Marže",
      cell: ({ row }) => {
        const p = row.original
        return (
          <div className="flex flex-col gap-1 text-[10px] font-mono">
            <div className="flex justify-between w-28"><span className="text-zinc-500">B2C (Retail):</span><span className="text-zinc-200">{p.cilova_marze_retail_procenta}%</span></div>
            <div className="flex justify-between w-28"><span className="text-zinc-500">B2B (Partner):</span><span className="text-zinc-200">{p.cilova_marze_partner_procenta}%</span></div>
          </div>
        )
      }
    },
    {
      id: "stock",
      header: "Skladem",
      cell: ({ row }) => {
        const p = row.original;
        const inStock = 0; 
        
        return (
          <div className="flex flex-col gap-1">
            <div className="text-xs font-bold text-green-500">
              {inStock} {p.c_merne_jednotky_zakladni?.zkratka || p.zakladni_mj_id}
            </div>
            <div className="text-[10px] text-muted-foreground">
              Balení: {p.mnozstvi_v_baleni} {p.c_merne_jednotky_baleni?.zkratka}
            </div>
          </div>
        )
      },
    },
    {
      id: "audit",
      header: "Autor / Změna",
      cell: ({ row }) => {
        const p = row.original;
        const createdDate = new Date(p.vytvoreno_at).toLocaleDateString('cs-CZ');
        const updatedDate = new Date(p.aktualizovano_at).toLocaleDateString('cs-CZ');
        
        return (
          <div className="flex flex-col gap-1 text-[10px]">
            <div className="flex gap-1 items-center text-zinc-400">
              <span className="font-semibold text-primary">Vytvořil:</span>
              <span>{p.vytvoril?.jmeno || 'Systém'}</span>
              <span>({createdDate})</span>
            </div>
            <div className="flex gap-1 items-center text-zinc-500">
              <span className="font-semibold">Upravil:</span>
              <span>{p.upravil?.jmeno || 'Systém'}</span>
              <span>({updatedDate})</span>
            </div>
          </div>
        )
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const product = row.original
        return (
          <>
            <DropdownMenu>
              <DropdownMenuTrigger render={<Button variant="ghost" className="h-8 w-8 p-0" />}>
                <span className="sr-only">Otevřít menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuGroup>
                  <DropdownMenuLabel>Akce s produktem</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setEditingProduct(product)}>
                    <FileEdit className="mr-2 h-4 w-4" /> Upravit produkt
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleCloneProduct(product)}>
                    <Copy className="mr-2 h-4 w-4" /> Duplikovat produkt
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigator.clipboard.writeText(product.sku)}>
                    Kopírovat SKU
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setProductToDelete(product)} className="text-red-500 hover:text-red-600 focus:text-red-600 focus:bg-red-500/10">
                    <Trash2 className="mr-2 h-4 w-4" /> Odstranit produkt
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        )
      },
    },
  ]

  const table = useReactTable({
    data: products,
    columns,
    getCoreRowModel: getCoreRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    onRowSelectionChange: setRowSelection,
    getRowId: (row) => row.id,
    state: {
      sorting,
      columnFilters,
      globalFilter,
      rowSelection,
    },
  })

  const selectedRows = table.getSelectedRowModel().rows
  const selectedProductIds = selectedRows.map(row => row.original.id)

  return (
    <div className="w-full space-y-4 relative">
      {/* Floating Action Bar for Bulk Operations */}
      {selectedRows.length > 0 && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 bg-zinc-900 border border-zinc-700 shadow-2xl p-4 rounded-full animate-in slide-in-from-bottom-5">
          <Badge className="bg-primary/20 text-primary border-primary/50 text-sm">
            Vybráno {selectedRows.length} produktů
          </Badge>
          <div className="h-6 w-px bg-zinc-700 mx-2" />
          <Button size="sm" onClick={() => setIsBulkMarginsOpen(true)} className="gap-2 bg-zinc-800 hover:bg-zinc-700 text-white">
            <Settings2 className="h-4 w-4" /> Hromadně upravit marže
          </Button>
          <Button size="sm" onClick={() => setIsBulkLogisticsOpen(true)} className="gap-2 bg-zinc-800 hover:bg-zinc-700 text-white">
            <Settings2 className="h-4 w-4" /> Hromadně upravit logistiku
          </Button>
          <Button size="sm" variant="ghost" onClick={() => table.toggleAllRowsSelected(false)} className="text-zinc-400 hover:text-white">
            Zrušit výběr
          </Button>
        </div>
      )}

      {/* Bulk Margins Dialog */}
      <BulkEditMarginsDialog 
        open={isBulkMarginsOpen}
        onOpenChange={setIsBulkMarginsOpen}
        selectedProductIds={selectedProductIds}
        onSuccess={() => {
          table.toggleAllRowsSelected(false)
          resetAndReload()
        }}
      />

      {/* Bulk Logistics Dialog */}
      <BulkEditLogisticsDialog 
        open={isBulkLogisticsOpen}
        onOpenChange={setIsBulkLogisticsOpen}
        selectedProductIds={selectedProductIds}
        onSuccess={() => {
          table.toggleAllRowsSelected(false)
          resetAndReload()
        }}
        templates={lookups.templates || []}
      />

      {/* Search and Filters Bar */}
      <div className="flex flex-col md:flex-row gap-3 items-center justify-between bg-zinc-900/50 p-3 rounded-lg border border-zinc-800">
        <div className="flex flex-1 items-center gap-3 w-full">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-500" />
            <Input
              placeholder="Hledat podle názvu nebo SKU..."
              value={globalFilter ?? ""}
              onChange={(event) => setGlobalFilter(String(event.target.value))}
              className="pl-9 bg-zinc-950 border-zinc-800 h-9"
            />
          </div>
          
          <DataTableFacetedFilter 
            column={table.getColumn("kategorie_id")}
            title="Kategorie"
            options={lookups.categories
              .filter(c => !['prepregy', 'cores_standard', 'cores_active'].includes(c.id))
              .map(c => ({ label: c.id === 'spotrebni_chemie' ? 'Čističe' : c.nazev, value: c.id }))}
          />

          <DataTableFacetedFilter 
            column={table.getColumn("stav_katalogu_id")}
            title="Stav"
            options={lookups.statuses.map(s => ({ label: s.nazev, value: s.id }))}
          />
          
          {/* Dynamic specification filters based on category */}
          {selectedCategories && selectedCategories.length === 1 && (
            (() => {
              const catId = selectedCategories[0]
              const specs = CATEGORY_SPEC_MAP[catId] || []
              return specs.map(spec => {
                const options = (facets[spec.key] || []).map(f => {
                  const label = SPEC_VALUE_LABELS[spec.key]?.[f.value] || f.value
                  return {
                    label: `${label} (${f.count})`,
                    value: f.value
                  }
                })

                if (options.length === 0) return null

                const mockColumn = {
                  getFilterValue: () => specFilters[spec.key] || [],
                  setFilterValue: (val: any) => {
                    setSpecFilters(prev => {
                      const next = { ...prev }
                      if (!val || val.length === 0) {
                        delete next[spec.key]
                      } else {
                        next[spec.key] = val
                      }
                      return next
                    })
                  }
                }

                return (
                  <DataTableFacetedFilter 
                    key={spec.key}
                    column={mockColumn as any}
                    title={spec.label}
                    options={options}
                  />
                )
              })
            })()
          )}

          {(columnFilters.length > 0 || Object.keys(specFilters).length > 0) && (
            <Button 
              variant="ghost" 
              onClick={() => {
                setColumnFilters([])
                setSpecFilters({})
              }}
              className="h-9 px-2 text-zinc-500 hover:text-zinc-200"
            >
              <FilterX className="h-4 w-4 mr-2" /> Reset
            </Button>
          )}
        </div>
        
        <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
          Zobrazeno {products.length} z {totalCount}
        </div>
      </div>

      {/* Table Area */}
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
                  Nebyly nalezeny žádné produkty odpovídající filtrům.
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
            <span>Načítám další produkty...</span>
          </div>
        )}
        {!hasMore && products.length > 0 && (
          <span>Zobrazeno všech {totalCount} produktů</span>
        )}
      </div>

      {/* Edit Dialog - Lazy loaded when a product is clicked */}
      {editingProduct && (
        <EditProductDialog 
          product={editingProduct} 
          open={!!editingProduct} 
          onOpenChange={(open) => !open && setEditingProduct(null)}
          onSuccess={resetAndReload}
          lookups={lookups}
        />
      )}

      {/* Delete Alert Dialog */}
      <AlertDialog open={!!productToDelete} onOpenChange={(open) => !open && setProductToDelete(null)}>
        <AlertDialogContent className="bg-zinc-950 border-zinc-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Opravdu odstranit produkt?</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              Tato akce odstraní produkt <strong className="text-white">{productToDelete?.nazev} ({productToDelete?.sku})</strong> z katalogu. Jedná se o "soft delete", data zůstanou v databázi pro historické záznamy, ale produkt již nebude nikde viditelný.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-zinc-900 border-zinc-800 text-white hover:bg-zinc-800">Zrušit</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteProduct} className="bg-red-600 text-white hover:bg-red-700">Odstranit produkt</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
