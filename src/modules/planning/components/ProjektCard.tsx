'use client'

import * as React from 'react'
import Link from 'next/link'
import { Calendar, Flag, CheckCircle2, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useTransition } from 'react'
import { Projekt, STAV_PROJEKTU_CONFIG } from '../types'
import { deleteProjekt } from '../actions/projekty'
import { ProjektFormDialog } from './ProjektFormDialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu'
import { Button } from '@/shared/components/ui/button'

interface ProjektCardProps {
  projekt: Projekt
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return null
  return new Date(dateStr).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function ProjektCard({ projekt }: ProjektCardProps) {
  const [isPending, startTransition] = useTransition()
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false)
  const stavCfg = STAV_PROJEKTU_CONFIG[projekt.stav]
  const progres = projekt.prumerne_progres ?? 0
  const pocet = projekt.pocet_milniku ?? 0
  const dokonceno = projekt.dokonceno_milniku ?? 0

  function handleDelete() {
    if (!confirm(`Opravdu smazat projekt „${projekt.nazev}"? Všechny jeho milníky budou odstraněny.`)) return
    startTransition(async () => {
      const result = await deleteProjekt(projekt.id)
      if (result.success) {
        toast.success('Projekt byl odstraněn.')
      } else {
        toast.error(result.error ?? 'Chyba při mazání projektu.')
      }
    })
  }

  return (
    <div className="group relative flex flex-col rounded-xl border bg-card transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 overflow-hidden">
      {/* Barevný akcent pruh na vrchu */}
      <div
        className="h-1 w-full flex-shrink-0"
        style={{ backgroundColor: projekt.barva }}
      />

      <div className="flex flex-col gap-3 p-4 flex-1">
        {/* Hlavička — název + menu */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-col gap-1">
            <Link
              href={`/planovani/${projekt.id}`}
              className="font-semibold text-sm leading-snug hover:text-primary transition-colors line-clamp-2"
            >
              {projekt.nazev}
            </Link>
            {projekt.popis && (
              <p className="text-xs text-muted-foreground line-clamp-2">{projekt.popis}</p>
            )}
          </div>

          <div className="flex items-center gap-1 flex-shrink-0">
            <DropdownMenu>
              <DropdownMenuTrigger render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="opacity-0 group-hover:opacity-100 transition-opacity h-7 w-7"
                  id={`projekt-menu-${projekt.id}`}
                />
              }>
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">Akce projektu</span>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => setIsEditDialogOpen(true)}>
                  <Pencil className="h-3.5 w-3.5 mr-2" />
                  Upravit projekt
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onSelect={handleDelete}
                  disabled={isPending}
                >
                  <Trash2 className="h-3.5 w-3.5 mr-2" />
                  Smazat projekt
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Stav badge */}
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${stavCfg.bg} ${stavCfg.color}`}>
            {stavCfg.label}
          </span>
          {pocet > 0 && (
            <span className="text-xs text-muted-foreground">
              <CheckCircle2 className="inline h-3 w-3 mr-0.5 mb-0.5" />
              {dokonceno}/{pocet} milníků
            </span>
          )}
        </div>

        {/* Progress bar */}
        {pocet > 0 && (
          <div className="flex flex-col gap-1">
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">Celkový progres</span>
              <span className="text-xs font-semibold tabular-nums" style={{ color: projekt.barva }}>
                {progres}%
              </span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${progres}%`, backgroundColor: projekt.barva }}
              />
            </div>
          </div>
        )}

        {/* Spodní metadata — datumy */}
        {(projekt.datum_zahajeni || projekt.datum_ukonceni) && (
          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-auto pt-1 border-t">
            <Flag className="h-3 w-3 flex-shrink-0" />
            <span>
              {formatDate(projekt.datum_zahajeni)} {projekt.datum_ukonceni && `→ ${formatDate(projekt.datum_ukonceni)}`}
            </span>
          </div>
        )}
        {!projekt.datum_zahajeni && !projekt.datum_ukonceni && pocet === 0 && (
          <div className="mt-auto pt-1 border-t">
            <Link
              href={`/planovani/${projekt.id}`}
              className="text-xs text-primary hover:underline"
            >
              Přidat první milník →
            </Link>
          </div>
        )}
      </div>

      <ProjektFormDialog
        projekt={projekt}
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        trigger={null}
      />
    </div>
  )
}
