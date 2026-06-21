'use client'

import { useState, useRef, useEffect } from 'react'
import { Check, ChevronsUpDown, Search, Package } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import type { Product } from '@/modules/products/types'

interface ProductPickerProps {
  products: Product[]
  onSelect: (item: {
    nazev: string
    cena_bez_dph: number
    jednotka: string
    produkt_id: string | null
    typ: 'produkt' | 'volna_polozka'
  }) => void
}

export function ProductPicker({ products, onSelect }: ProductPickerProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Kliknutí mimo zavře dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const filtered = products.filter(
    (p) =>
      p.nazev.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase())
  ).slice(0, 15) // limit list size

  const handleSelectProduct = (product: Product) => {
    // Získat cenu - zkusíme primárního dodavatele nebo výchozí nákupní cenu, případně 0
    const primarySupplier = product.produkt_dodavatel?.find((s) => s.is_primary)
    const basePrice = primarySupplier?.nakupni_cena ?? product.produkt_dodavatel?.[0]?.nakupni_cena ?? 0

    onSelect({
      nazev: `${product.sku} - ${product.nazev}`,
      cena_bez_dph: basePrice,
      jednotka: product.c_merne_jednotky_zakladni?.zkratka ?? 'ks',
      produkt_id: product.id,
      typ: 'produkt',
    })
    setOpen(false)
    setSearch('')
  }

  const handleSelectCustom = () => {
    if (!search.trim()) return
    onSelect({
      nazev: search,
      cena_bez_dph: 0,
      jednotka: 'ks',
      produkt_id: null,
      typ: 'volna_polozka',
    })
    setOpen(false)
    setSearch('')
  }

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <Button
        type="button"
        variant="outline"
        onClick={() => setOpen(!open)}
        className="w-full justify-between bg-zinc-950 border-zinc-800 text-zinc-300 h-9 px-3 text-left font-normal"
      >
        <span className="truncate flex items-center gap-1.5">
          <Package className="h-4 w-4 text-primary shrink-0" />
          Vybrat produkt z katalogu nebo volný text...
        </span>
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </Button>

      {open && (
        <div className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border border-zinc-800 bg-zinc-950 text-zinc-200 shadow-xl py-1">
          {/* Vyhledávací pole */}
          <div className="flex items-center border-b border-zinc-800 px-3 py-2 gap-2">
            <Search className="h-4 w-4 shrink-0 text-zinc-500" />
            <Input
              placeholder="Hledat dle názvu nebo SKU..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-7 w-full border-0 bg-transparent p-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-xs"
              autoFocus
            />
          </div>

          <div className="py-1 text-xs">
            {filtered.length > 0 ? (
              filtered.map((product) => (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => handleSelectProduct(product)}
                  className="w-full text-left px-3 py-2 hover:bg-zinc-900 flex flex-col gap-0.5 border-b border-zinc-900 last:border-0"
                >
                  <span className="font-bold text-zinc-100">{product.sku}</span>
                  <span className="text-zinc-400 text-[10px] truncate">{product.nazev}</span>
                </button>
              ))
            ) : (
              <div className="px-3 py-2 text-zinc-500 italic">Žádné shody v katalogu.</div>
            )}

            {search.trim().length > 0 && (
              <button
                type="button"
                onClick={handleSelectCustom}
                className="w-full text-left px-3 py-2.5 hover:bg-primary/20 bg-primary/5 text-primary border-t border-zinc-800 flex items-center justify-between"
              >
                <span>Použít jako volný text: "{search}"</span>
                <Check className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
