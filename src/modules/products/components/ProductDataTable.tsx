"use client"

import * as React from "react"
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
import { cloneProduct, deleteProduct } from "../actions"
import { toast } from "sonner"

interface ProductDataTableProps {
  data: Product[]
  lookups: {
    categories: any[]
    units: any[]
    statuses: any[]
    labels: any[]
    processes: any[]
    templates: LogisticsTemplate[]
  }
}

export function ProductDataTable({ data, lookups }: ProductDataTableProps) {
  const [sorting, setSorting] = React.useState<SortingState>([{ id: "nazev", desc: false }])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [globalFilter, setGlobalFilter] = React.useState("")
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({})
  const [editingProduct, setEditingProduct] = React.useState<Product | null>(null)
  const [productToDelete, setProductToDelete] = React.useState<Product | null>(null)

  // Bulk Actions State
  const [isBulkMarginsOpen, setIsBulkMarginsOpen] = React.useState(false)
  const [isBulkLogisticsOpen, setIsBulkLogisticsOpen] = React.useState(false)


  const handleCloneProduct = async (product: Product) => {
    try {
      toast.loading("Duplikuji produkt...", { id: "clone" })
      const result = await cloneProduct(product.id)
      if (result.error) throw result.error
      toast.success("Produkt úspěšně zduplikován", { id: "clone" })
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
          checked={table.getIsAllPageRowsSelected()}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
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
            {product.c_kategorie?.nazev || product.kategorie_id}
          </Badge>
        )
      },
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id))
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
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id))
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
        // In Phase 4 this will be actual physical stock. For now, 0 as placeholder.
        const inStock = 0; 
        const isLowStock = p.min_skladova_zasoba !== null && inStock <= p.min_skladova_zasoba;
        
        return (
          <div className="flex flex-col gap-1">
            <div className={`text-xs font-bold ${isLowStock ? 'text-red-500' : 'text-green-500'}`}>
              {inStock} {p.c_merne_jednotky_zakladni?.zkratka || p.zakladni_mj_id}
            </div>
            <div className="text-[10px] text-muted-foreground flex gap-1 items-center">
              <span>Min: {p.min_skladova_zasoba || 0}</span>
              <span className="text-zinc-700">|</span>
              <span>Balení: {p.mnozstvi_v_baleni} {p.c_merne_jednotky_baleni?.zkratka}</span>
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
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    onGlobalFilterChange: setGlobalFilter,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      globalFilter,
      rowSelection,
    },
  })

  const selectedRows = table.getFilteredSelectedRowModel().rows
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
        onSuccess={() => table.toggleAllRowsSelected(false)}
      />

      {/* Bulk Logistics Dialog */}
      <BulkEditLogisticsDialog 
        open={isBulkLogisticsOpen}
        onOpenChange={setIsBulkLogisticsOpen}
        selectedProductIds={selectedProductIds}
        onSuccess={() => table.toggleAllRowsSelected(false)}
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
            options={lookups.categories.map(c => ({ label: c.nazev, value: c.id }))}
          />

          <DataTableFacetedFilter 
            column={table.getColumn("stav_katalogu_id")}
            title="Stav"
            options={lookups.statuses.map(s => ({ label: s.nazev, value: s.id }))}
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
          Zobrazeno {table.getFilteredRowModel().rows.length} z {data.length}
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

      {/* Pagination Controls */}
      <div className="flex items-center justify-between px-2">
        <div className="text-[10px] text-zinc-500 font-bold uppercase">
          Strana {table.getState().pagination.pageIndex + 1} z {table.getPageCount()}
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            className="h-7 text-[10px] uppercase font-bold border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-zinc-100"
          >
            Předchozí
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            className="h-7 text-[10px] uppercase font-bold border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-zinc-100"
          >
            Další
          </Button>
        </div>
      </div>

      {/* Edit Dialog - Lazy loaded when a product is clicked */}
      {editingProduct && (
        <EditProductDialog 
          product={editingProduct} 
          open={!!editingProduct} 
          onOpenChange={(open) => !open && setEditingProduct(null)}
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
