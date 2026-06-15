"use client"

import { useEffect, useState } from "react"
import { createClient } from '@/shared/lib/supabase/client'
import { DollarSign, Euro } from "lucide-react"

export function CurrencyHeaderPreview() {
  const [rates, setRates] = useState<{mena: string, kurz_czk: number}[]>([])

  useEffect(() => {
    async function loadRates() {
      const supabase = createClient()

      // Get the most recent date
      const { data: recentDate } = await supabase
        .from('historie_kurzu')
        .select('datum')
        .order('datum', { ascending: false })
        .limit(1)
        .single()

      if (recentDate) {
        const { data } = await supabase
          .from('historie_kurzu')
          .select('mena, kurz_czk')
          .eq('datum', recentDate.datum)
          .in('mena', ['EUR', 'USD'])
        
        if (data) setRates(data)
      }
    }
    loadRates()
  }, [])


  if (rates.length === 0) return null

  const eur = rates.find(r => r.mena === 'EUR')
  const usd = rates.find(r => r.mena === 'USD')

  return (
    <div className="flex items-center gap-3 bg-zinc-900/50 px-3 py-1 rounded-full border border-zinc-800">
      {eur && (
        <div className="flex items-center gap-1.5 text-[11px] font-bold">
          <Euro className="h-3 w-3 text-primary" />
          <span className="text-zinc-400">EUR</span>
          <span className="text-white">{eur.kurz_czk.toFixed(2)}</span>
        </div>
      )}
      <div className="h-3 w-px bg-zinc-700" />
      {usd && (
        <div className="flex items-center gap-1.5 text-[11px] font-bold">
          <DollarSign className="h-3 w-3 text-primary" />
          <span className="text-zinc-400">USD</span>
          <span className="text-white">{usd.kurz_czk.toFixed(2)}</span>
        </div>
      )}
    </div>
  )
}
