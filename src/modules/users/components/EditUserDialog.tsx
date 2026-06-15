"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { Label } from "@/shared/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/shared/components/ui/dialog"
import { Role, UserProfile } from "../types"
import { updateUserFull } from "../actions"

interface EditUserDialogProps {
  user: UserProfile
  roles: Role[]
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EditUserDialog({ user, roles, open, onOpenChange }: EditUserDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [email, setEmail] = useState(user.email || "")
  const [nickname, setNickname] = useState(user.jmeno || "")
  const [roleId, setRoleId] = useState(user.role_id || "manager")
  const router = useRouter()

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault()
    if (!email || !nickname) {
      toast.error("Email a přezdívka jsou povinné")
      return
    }

    setIsSubmitting(true)
    try {
      const result = await updateUserFull(user.id, {
        email,
        jmeno: nickname,
        role_id: roleId
      })

      if (result.error) {
        toast.error("Chyba při aktualizaci uživatele", {
          description: result.error instanceof Error ? result.error.message : String(result.error)
        })
      } else {
        toast.success("Údaje uživatele aktualizovány")
        onOpenChange(false)
        router.refresh()
      }
    } catch (error: unknown) {
      toast.error("Neočekávaná chyba", {
        description: error instanceof Error ? error.message : String(error)
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const isMainAdmin = user.email === 'admin@az-composites.cz'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-background border-zinc-800">
        <DialogHeader>
          <DialogTitle>Upravit údaje uživatele</DialogTitle>
          <DialogDescription className="text-zinc-400">
            Změňte identitu, e-mail nebo přístupová práva uživatele.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleUpdate} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="nickname-edit">Systémová přezdívka (Nickname)</Label>
            <Input 
              id="nickname-edit" 
              placeholder="např. Martin-Sklad" 
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              required
              className="bg-zinc-900 border-zinc-800"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email-edit">E-mailová adresa</Label>
            <Input 
              id="email-edit" 
              type="email" 
              placeholder="jmeno@az-composites.cz" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="bg-zinc-900 border-zinc-800"
            />
            {isMainAdmin && (
              <p className="text-[10px] text-yellow-500 italic">
                Varování: Měníte e-mail hlavního administrátorského účtu.
              </p>
            )}
          </div>
          
          <div className="space-y-2">
            <Label>Přístupová role (RBAC)</Label>
            <Select 
              value={roleId} 
              onValueChange={(val) => setRoleId(val || "manager")}
              disabled={isMainAdmin}
            >
              <SelectTrigger className="bg-zinc-900 border-zinc-800">
                <SelectValue placeholder="Vyberte roli" />
              </SelectTrigger>
              <SelectContent>
                {roles.map(r => (
                  <SelectItem key={r.id} value={r.id}>{r.nazev}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {isMainAdmin && (
              <p className="text-[10px] text-muted-foreground italic">
                Roli hlavního administrátora nelze změnit.
              </p>
            )}
          </div>

          <DialogFooter className="pt-4 border-t border-zinc-800">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Zrušit
            </Button>
            <Button type="submit" disabled={isSubmitting || !email || !nickname}>
              {isSubmitting ? "Ukládám..." : "Uložit změny"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
