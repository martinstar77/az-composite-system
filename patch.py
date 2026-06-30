import re

with open("src/modules/products/components/ProductDataTable.tsx", "r") as f:
    content = f.read()

# Find the start of the columns array
start_str = "const columns: ColumnDef<Product>[] = ["
end_str = "const table = useReactTable({"
start_idx = content.find(start_str)
end_idx = content.find(end_str)

if start_idx == -1 or end_idx == -1:
    print("Could not find columns definition")
    exit(1)

new_columns = """const columns: ColumnDef<any>[] = React.useMemo(() => {
    const isBasicUnit = unitMode === "basic"

    const getPackMultiplier = (p: any, pr: any) => {
      const primarySourcing = p.produkt_dodavatel?.find((s: any) => s.is_primary) || p.produkt_dodavatel?.[0]
      const isBuyingInBasicUnit = primarySourcing?.nakupni_mj_id === p.zakladni_mj_id &&
        (!primarySourcing?.prevodni_pomer_na_zakladni || primarySourcing.prevodni_pomer_na_zakladni === 1)
      const totalUnits = primarySourcing
        ? ((primarySourcing.prevodni_pomer_na_zakladni && primarySourcing.prevodni_pomer_na_zakladni !== 1)
            ? primarySourcing.prevodni_pomer_na_zakladni
            : (isBuyingInBasicUnit ? 1 : (p.mnozstvi_v_baleni || 1)))
        : 1
      const continuousUnits = ['liter', 'l', 'kg', 'm2', 'm', 'bm', 'g']
      const isContinuous = p.zakladni_mj_id ? continuousUnits.some((u: string) => p.zakladni_mj_id.toLowerCase().includes(u)) : false
      return isContinuous ? totalUnits : (p.mnozstvi_v_baleni || 1)
    }

    const formatCurrency = (val: number | undefined) => val !== undefined ? val.toFixed(2) + " CZK" : "-"

    const baseCols: ColumnDef<any>[] = [
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
        cell: ({ row }) => (
          <div className="font-mono text-[9px] font-medium text-zinc-300 truncate" title={row.getValue("sku")}>
            {row.getValue("sku")}
          </div>
        ),
      },
      {
        accessorKey: "nazev",
        header: ({ column }) => (
          <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")} className="-ml-4 text-[10px] font-bold uppercase tracking-tighter">
            Název <ArrowUpDown className="ml-1 h-3 w-3" />
          </Button>
        ),
        cell: ({ row }) => {
          const nazev = row.getValue("nazev") as string
          return (
            <Link href={`/produkty/${row.original.id}`} className="group flex items-center gap-2 max-w-full" title={nazev}>
              <span className="font-semibold text-sm group-hover:text-primary transition-colors underline-offset-4 group-hover:underline truncate block w-full">
                {nazev}
              </span>
              <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 text-primary transition-all shrink-0" />
            </Link>
          )
        },
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
          const label = product.kategorie_id === 'spotrebni_chemie' ? 'Čističe' : (product.c_kategorie?.nazev || product.kategorie_id);
          return (
            <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 hover:bg-primary/10 text-[10px] py-0 px-2 h-5 max-w-[85px] truncate" title={label}>
              {label}
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
            <div className="flex items-center gap-2 max-w-full">
              <div className={`h-1.5 w-1.5 rounded-full shrink-0 ${status.includes('Aktivní') ? 'bg-green-500' : 'bg-zinc-500'}`} />
              <span className="text-[10px] font-medium text-muted-foreground truncate max-w-[90px]" title={status}>{status}</span>
            </div>
          )
        },
      }
    ]

    if (viewMode === "products") {
      baseCols.push(
        {
          id: "sourcing",
          header: "Nákupní cena",
          cell: ({ row }) => {
            const sourcing = row.original.produkt_dodavatel?.find((s: any) => s.is_primary) || row.original.produkt_dodavatel?.[0]
            if (!sourcing) return <span className="text-[10px] text-zinc-500 italic">Nedefinováno</span>
            return <span className="font-mono text-xs font-bold text-primary">{sourcing.nakupni_cena.toFixed(2)} {sourcing.mena}</span>
          }
        },
        {
          id: "dodavatel",
          header: "Dodavatel",
          cell: ({ row }) => {
            const sourcing = row.original.produkt_dodavatel?.find((s: any) => s.is_primary) || row.original.produkt_dodavatel?.[0]
            const supplierName = sourcing?.dodavatele?.nazev_spolecnosti
            return supplierName ? (
              <span className="text-xs text-zinc-300 font-medium max-w-[100px] truncate block" title={supplierName}>{supplierName}</span>
            ) : <span className="text-[10px] text-zinc-500 italic">Nedefinováno</span>
          }
        },
        {
          id: "logistika",
          header: "Logistika",
          cell: ({ row }) => {
            const sourcing = row.original.produkt_dodavatel?.find((s: any) => s.is_primary) || row.original.produkt_dodavatel?.[0]
            const templateName = sourcing?.logisticke_sablony?.nazev
            return templateName ? (
              <Badge variant="secondary" className="bg-zinc-800 text-zinc-300 border-zinc-700 text-[10px] py-0 px-2 h-5 max-w-[80px] truncate" title={templateName}>🚚 {templateName}</Badge>
            ) : <Badge variant="outline" className="border-yellow-600/30 text-yellow-600 bg-yellow-600/5 text-[10px] py-0 px-2 h-5">Bez šablony</Badge>
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
            return (
              <div className="flex flex-col gap-1">
                <div className="text-xs font-bold text-green-500">0 {p.c_merne_jednotky_zakladni?.zkratka || p.zakladni_mj_id}</div>
                <div className="text-[10px] text-muted-foreground">Balení: {p.mnozstvi_v_baleni} {p.c_merne_jednotky_baleni?.zkratka || p.jednotka_baleni_id} ({p.c_merne_jednotky_zakladni?.zkratka || p.zakladni_mj_id})</div>
              </div>
            )
          },
        },
        {
          id: "packaging_qty",
          header: "Balení",
          cell: ({ row }) => {
            const p = row.original
            return (
              <div className="flex flex-col text-xs font-mono text-zinc-300">
                <span>{p.mnozstvi_v_baleni || 1} <span className="text-zinc-500">{p.c_merne_jednotky_baleni?.zkratka || p.jednotka_baleni_id} ({p.c_merne_jednotky_zakladni?.zkratka || p.zakladni_mj_id})</span></span>
              </div>
            )
          }
        },
        {
          id: "weight",
          header: "Hmotnost",
          cell: ({ row }) => {
            const p = row.original
            const autoWeight = calculateGrossWeight(p.kategorie_id, p.specifikace || {}, p.mnozstvi_v_baleni || 1, p.zakladni_mj_id)
            const isWeightOverridden = autoWeight.weightKg !== null && p.hmotnost_baliku_kg !== null && Math.abs((p.hmotnost_baliku_kg || 0) - (autoWeight.weightKg || 0)) > 0.01
            const primarySourcing = p.produkt_dodavatel?.find((s: any) => s.is_primary) || p.produkt_dodavatel?.[0]
            const isFixedShipping = primarySourcing?.logisticke_sablony?.typ_vypoctu_dopravy === 'fixni'
            return (
              <div className="flex items-center gap-1.5 text-xs font-mono text-zinc-300">
                {p.hmotnost_baliku_kg !== null && p.hmotnost_baliku_kg !== undefined ? <span>{p.hmotnost_baliku_kg.toFixed(2)} kg</span> : <span className="text-zinc-600 italic">-</span>}
                {p.hmotnost_zafixovana ? <span className="text-emerald-400 font-bold cursor-help" title={`Hmotnost je ručně zafixována uživatelem (odhad: ${autoWeight.weightKg?.toFixed(2)} kg)`}>🔒</span> : isWeightOverridden && <span className="text-amber-500 font-bold cursor-help" title={`Ručně upraveno (odhad: ${autoWeight.weightKg?.toFixed(2)} kg)`}>⚠️</span>}
                {isFixedShipping && <span className="text-blue-400 font-bold cursor-help" title={`Fixní doprava`}>🚚</span>}
              </div>
            )
          }
        }
      )
    }

    if (viewMode === "cogs") {
      baseCols.push(
        {
          id: "purchase_price",
          header: () => <div className="text-right">Nákupní cena</div>,
          cell: ({ row }) => {
            const pr = row.original.pricing
            if (!pr) return <div className="text-right text-[10px] text-zinc-500">-</div>
            const mult = isBasicUnit ? 1 : getPackMultiplier(row.original, pr)
            return <div className="text-right font-mono text-xs">{formatCurrency(pr.unitPurchasePriceCzk * mult)}</div>
          }
        },
        {
          id: "shipping",
          header: () => <div className="text-right">Doprava</div>,
          cell: ({ row }) => {
            const pr = row.original.pricing
            if (!pr) return <div className="text-right text-[10px] text-zinc-500">-</div>
            const mult = isBasicUnit ? 1 : getPackMultiplier(row.original, pr)
            return <div className="text-right font-mono text-xs">{formatCurrency(pr.unitShippingCostCzk * mult)}</div>
          }
        },
        {
          id: "customs",
          header: () => <div className="text-right">Clo</div>,
          cell: ({ row }) => {
            const pr = row.original.pricing
            if (!pr) return <div className="text-right text-[10px] text-zinc-500">-</div>
            const mult = isBasicUnit ? 1 : getPackMultiplier(row.original, pr)
            return <div className="text-right font-mono text-xs">{formatCurrency(pr.unitCustomsCostCzk * mult)}</div>
          }
        },
        {
          id: "bank_fees",
          header: () => <div className="text-right">Banka</div>,
          cell: ({ row }) => {
            const pr = row.original.pricing
            if (!pr) return <div className="text-right text-[10px] text-zinc-500">-</div>
            const mult = isBasicUnit ? 1 : getPackMultiplier(row.original, pr)
            return <div className="text-right font-mono text-xs text-zinc-400">{formatCurrency(pr.unitBankFeesCzk * mult)}</div>
          }
        },
        {
          id: "packaging",
          header: () => <div className="text-right">Obaly</div>,
          cell: ({ row }) => {
            const pr = row.original.pricing
            if (!pr) return <div className="text-right text-[10px] text-zinc-500">-</div>
            const mult = isBasicUnit ? 1 : getPackMultiplier(row.original, pr)
            return <div className="text-right font-mono text-xs text-zinc-400">{formatCurrency(pr.unitPackagingFeesCzk * mult)}</div>
          }
        },
        {
          id: "buffer",
          header: () => <div className="text-right">Buffer</div>,
          cell: ({ row }) => {
            const pr = row.original.pricing
            if (!pr) return <div className="text-right text-[10px] text-zinc-500">-</div>
            const mult = isBasicUnit ? 1 : getPackMultiplier(row.original, pr)
            return <div className="text-right font-mono text-xs text-orange-400">{formatCurrency(pr.unitBufferAmount * mult)}</div>
          }
        },
        {
          id: "landed_cost",
          header: () => <div className="text-right text-primary font-bold">Landed Cost</div>,
          cell: ({ row }) => {
            const pr = row.original.pricing
            if (!pr) return <div className="text-right text-[10px] text-zinc-500">-</div>
            const mult = isBasicUnit ? 1 : getPackMultiplier(row.original, pr)
            return <div className="text-right font-mono text-xs font-bold text-primary">{formatCurrency(pr.unitLandedCostWithBuffer * mult)}</div>
          }
        }
      )
    }

    if (viewMode === "sales") {
      baseCols.push(
        {
          id: "landed_cost",
          header: () => <div className="text-right text-primary">Landed Cost</div>,
          cell: ({ row }) => {
            const pr = row.original.pricing
            if (!pr) return <div className="text-right text-[10px] text-zinc-500">-</div>
            const mult = isBasicUnit ? 1 : getPackMultiplier(row.original, pr)
            return <div className="text-right font-mono text-xs font-bold text-primary">{formatCurrency(pr.unitLandedCostWithBuffer * mult)}</div>
          }
        },
        {
          id: "margin_b2b",
          header: () => <div className="text-right">Marže B2B</div>,
          cell: ({ row }) => {
            const p = row.original
            return <div className="text-right font-mono text-xs text-zinc-400">{p.cilova_marze_partner_procenta}%</div>
          }
        },
        {
          id: "margin_b2c",
          header: () => <div className="text-right">Marže B2C</div>,
          cell: ({ row }) => {
            const p = row.original
            return <div className="text-right font-mono text-xs text-zinc-400">{p.cilova_marze_retail_procenta}%</div>
          }
        },
        {
          id: "b2b",
          header: () => <div className="text-right text-green-400 font-bold">Prodej B2B</div>,
          cell: ({ row }) => {
            const pr = row.original.pricing
            if (!pr) return <div className="text-right text-[10px] text-zinc-500">-</div>
            const mult = isBasicUnit ? 1 : getPackMultiplier(row.original, pr)
            return <div className="text-right font-mono text-xs font-bold text-green-400">{formatCurrency(pr.b2bUnitPrice * mult)}</div>
          }
        },
        {
          id: "b2c",
          header: () => <div className="text-right text-green-400 font-bold">Prodej B2C</div>,
          cell: ({ row }) => {
            const pr = row.original.pricing
            if (!pr) return <div className="text-right text-[10px] text-zinc-500">-</div>
            const mult = isBasicUnit ? 1 : getPackMultiplier(row.original, pr)
            return <div className="text-right font-mono text-xs font-bold text-green-400">{formatCurrency(pr.b2cUnitPrice * mult)}</div>
          }
        }
      )
    }

    baseCols.push(
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
            <div className="flex items-center justify-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setEditingProduct(product)}
                className="h-8 w-8 text-zinc-400 hover:text-white hover:bg-zinc-800"
              >
                <Edit2 className="h-4 w-4" />
              </Button>
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
            </div>
          )
        },
      }
    )

    return baseCols
  }, [viewMode, unitMode])
"""

new_content = content[:start_idx] + new_columns + "\n  " + content[end_idx:]

with open("src/modules/products/components/ProductDataTable.tsx", "w") as f:
    f.write(new_content)

print("Replaced columns definition")
