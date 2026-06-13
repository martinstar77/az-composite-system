"use client"

import { Bell, Search, UserCircle } from "lucide-react"
import { SidebarTrigger } from "@/shared/components/ui/sidebar"
import { Input } from "@/shared/components/ui/input"
import { Button } from "@/shared/components/ui/button"
import { LogoutButton } from "./LogoutButton"
import { CurrencyHeaderPreview } from "./CurrencyHeaderPreview"

export function AppHeader() {
  return (
    <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-4 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-background px-6">
      <SidebarTrigger className="-ml-2" />
      
      <div className="flex flex-1 items-center gap-4 lg:gap-6">
        <form className="flex-1 lg:max-w-xs" onSubmit={(e) => e.preventDefault()}>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-500" />
            <Input
              type="search"
              placeholder="Hledat..."
              className="w-full bg-zinc-50 dark:bg-zinc-950 pl-9 border-zinc-200 dark:border-zinc-800 focus-visible:ring-primary h-9 text-xs"
            />
          </div>
        </form>
        
        <CurrencyHeaderPreview />
      </div>

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-50 relative">
          <Bell className="h-5 w-5" />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-primary" />
          <span className="sr-only">Notifikace</span>
        </Button>
        <div className="h-6 w-px bg-zinc-200 dark:bg-zinc-800 mx-2" />
        <LogoutButton />
      </div>
    </header>
  )
}
