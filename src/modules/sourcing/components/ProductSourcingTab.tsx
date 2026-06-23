"use client"

import * as React from "react"
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getSortedRowModel,
  SortingState,
} from "@tanstack/react-table"
import { Trash2, Star, Clock, ShoppingCart, ArrowUpDown, Truck } from "lucide-react"
import { toast } from "sonner"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table"
import { Button } from "@/shared/components/ui/button"
import { Checkbox } from "@/shared/components/ui/checkbox"
import { Label } from "@/shared/components/ui/label"
import { Badge } from "@/shared/components/ui/badge"
import { deleteProductSourcing } from "../actions"
import { AddSourcingDialog } from "./AddSourcingDialog"
import { Supplier } from "../types"
import { LogisticsTemplate } from "@/modules/finance/types/logistics"

interface ProductSourcingTabProps {
  productId: string
  sourcingData: any[]
  suppliers: Supplier[]
  templates: LogisticsTemplate[]
  units: any[]
  productUnit?: string
}

export function ProductSourcingTab({ productId, sourcingData, suppliers, templates, units, productUnit = "ks" }: ProductSourcingTabProps) {
  const [sorting, setSorting] = React.useState<SortingState>([{ id: "nakupni_cena", desc: false }])
  const [showHistory, setShowHistory] = React.useState(false)
  
  const handleDelete = async (sourcingId: string) => {
    if (confirm("Opravdu chcete odstranit tento nákupní ceník?")) {
      const { error } = await deleteProductSourcing(sourcingId, productId)
      if (error) {
        toast.error("Chyba při mazání", { description: error.message })
      } else {
        toast.success("Ceník odstraněn")
      }
    }
  }

  const displayedSourcing = React.useMemo(() => {
    if (showHistory) return sourcingData
    return sourcingData.filter(s => !s.deleted_at)
  }, [sourcingData, showHistory])

  const columns: ColumnDef<any>[] = [
    {
      id: "supplier",
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")} className="-ml-4 text-[10px] font-bold uppercase tracking-tighter">
          Dodavatel <ArrowUpDown className="ml-1 h-3 w-3" />
        </Button>
      ),
      accessorFn: (row) => row.dodavatele?.nazev_spolecnosti,
      cell: ({ row }) => {
        const s = row.original.dodavatele;
        const isDeleted = !!row.original.deleted_at;
        return (
          <div className="flex items-center gap-2">
            {row.original.is_primary && !isDeleted && <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />}
            <div className="flex flex-col text-left">
              <div className="flex items-center gap-2">
                <span className={`font-bold text-sm ${isDeleted ? 'text-zinc-500 line-through' : 'text-zinc-200'}`}>
                  {s.nazev_spolecnosti}
                </span>
                {isDeleted && (
                  <Badge variant="outline" className="border-zinc-800 text-zinc-500 bg-transparent text-[8px] py-0 px-1 font-normal">
                    Historie
                  </Badge>
                )}
              </div>
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{s.kod} • {s.zeme_puvodu}</span>
            </div>
          </div>
        )
      }
    },
    {
      id: "logistics",
      header: "Logistická trasa",
      cell: ({ row }) => {
        const tId = row.original.logisticka_sablona_id;
        const template = templates.find(t => t.id === tId);
        const isDeleted = !!row.original.deleted_at;
        return (
          <div className="flex items-center gap-2">
            <Truck className="h-3 w-3 text-zinc-500" />
            <span className={`text-xs font-semibold ${isDeleted ? 'text-zinc-500' : 'text-zinc-300'}`}>
              {template ? template.nazev : "Není vybrána"}
            </span>
          </div>
        )
      }
    },
    {
      accessorKey: "nakupni_cena",
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")} className="-ml-4 text-[10px] font-bold uppercase tracking-tighter">
          Nákupní cena <ArrowUpDown className="ml-1 h-3 w-3" />
        </Button>
      ),
      cell: ({ row }) => {
        const isDeleted = !!row.original.deleted_at;
        const ratio = parseFloat(row.original.prevodni_pomer_na_zakladni) || 1;
        const showUnitCalc = ratio > 1;
        const unitPrice = row.original.nakupni_cena / ratio;
        
        return (
          <div className="flex flex-col text-left">
            <div className={`font-mono font-bold ${isDeleted ? 'text-zinc-500 line-through' : 'text-primary'}`}>
              {row.original.nakupni_cena.toFixed(4)} {row.original.mena}
              <span className="text-[10px] text-zinc-500 font-normal ml-1">
                 / {row.original.c_merne_jednotky?.zkratka || 'MJ'}
              </span>
            </div>
            {showUnitCalc && !isDeleted && (
              <span className="text-[10px] text-zinc-400 font-mono mt-0.5">
                ({unitPrice.toFixed(4)} {row.original.mena} / {productUnit})
              </span>
            )}
          </div>
        )
      }
    },
    {
      accessorKey: "moq",
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")} className="-ml-4 text-[10px] font-bold uppercase tracking-tighter">
          MOQ <ArrowUpDown className="ml-1 h-3 w-3" />
        </Button>
      ),
      cell: ({ row }) => {
        const ratio = parseFloat(row.original.prevodni_pomer_na_zakladni) || 1;
        const hasConversion = ratio > 1;
        const totalBaseUnits = row.original.moq * ratio;
        
        return (
          <div className="flex flex-col text-left">
            <div className="flex items-center gap-1 text-xs font-semibold text-zinc-300">
              <ShoppingCart className="h-3 w-3 text-zinc-500 shrink-0" />
              <span>{row.original.moq} {row.original.c_merne_jednotky?.zkratka || 'MJ'}</span>
            </div>
            {hasConversion && (
              <span className="text-[10px] text-zinc-400 font-mono mt-0.5">
                (= {totalBaseUnits} {productUnit})
              </span>
            )}
          </div>
        )
      }
    },
    {
      accessorKey: "lead_time_tydny",
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")} className="-ml-4 text-[10px] font-bold uppercase tracking-tighter">
          Lead Time <ArrowUpDown className="ml-1 h-3 w-3" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="flex items-center gap-1 text-xs text-zinc-300">
          <Clock className="h-3 w-3 text-zinc-500" /> {row.original.lead_time_tydny || "Dle firmy"} týdnů
        </div>
      )
    },
    {
      id: "audit",
      header: "Změna",
      cell: ({ row }) => {
        const s = row.original;
        const updatedDate = new Date(s.aktualizovano_at).toLocaleDateString('cs-CZ');
        return (
          <div className="text-[10px] text-zinc-500 whitespace-nowrap">
            {s.upravil?.jmeno || 'Systém'} ({updatedDate})
          </div>
        )
      }
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const isDeleted = !!row.original.deleted_at;
        if (isDeleted) return null;
        return (
          <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <AddSourcingDialog 
              productId={productId} 
              suppliers={suppliers} 
              templates={templates} 
              units={units}
              initialData={row.original} 
              productUnit={productUnit}
            />
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => handleDelete(row.original.id)}
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )
      }
    }
  ]

  const table = useReactTable({
    data: displayedSourcing,
    columns,
    getCoreRowModel: getCoreRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    state: {
      sorting,
    },
  })

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-4 border-b border-zinc-800 pb-4">
        <div className="flex items-center gap-6">
          <h2 className="text-xl font-semibold text-white">Nákupní ceníky a Sourcing</h2>
          <div className="flex items-center gap-2 bg-zinc-900/50 px-3 py-1.5 rounded-lg border border-zinc-850">
            <Checkbox 
              id="show-history" 
              checked={showHistory} 
              onCheckedChange={(checked) => setShowHistory(!!checked)}
            />
            <Label htmlFor="show-history" className="text-xs text-zinc-400 cursor-pointer select-none">
              Zobrazit historii změn cen
            </Label>
          </div>
        </div>
        <AddSourcingDialog productId={productId} suppliers={suppliers} templates={templates} units={units} productUnit={productUnit} />
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 overflow-hidden shadow-xl">
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
              table.getRowModel().rows.map((row) => {
                const isDeleted = !!row.original.deleted_at;
                return (
                  <TableRow 
                    key={row.id} 
                    className={`border-zinc-800 transition-colors group ${
                      isDeleted 
                        ? "opacity-55 bg-zinc-950/10 hover:bg-zinc-950/20 text-zinc-500" 
                        : "hover:bg-zinc-900/50"
                    }`}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className="py-2.5">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                )
              })
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-32 text-center text-zinc-500 italic">
                  Tento produkt zatím nemá žádný ceník odpovídající vybranému filtru.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
