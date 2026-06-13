"use client"

import { Button } from "@/shared/components/ui/button"
import { logout } from "@/app/login/actions"
import { LogOut } from "lucide-react"

export function LogoutButton() {
  return (
    <Button 
      variant="ghost" 
      size="sm" 
      className="text-zinc-500 hover:text-destructive gap-2"
      onClick={() => logout()}
    >
      <LogOut className="h-4 w-4" />
      <span className="hidden md:inline">Odhlásit se</span>
    </Button>
  )
}
