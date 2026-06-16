"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Plus } from "lucide-react"
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
  DialogTrigger,
} from "@/shared/components/ui/dialog"
import { Role } from "../types"
import { createUserWithPassword } from "../actions"

interface CreateUserDialogProps {
  roles: Role[]
}

export function CreateUserDialog({ roles }: CreateUserDialogProps) {
  const [open, setOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [email, setEmail] = useState("")
  const [nickname, setNickname] = useState("")
  const [password, setPassword] = useState("")
  const [roleId, setRoleId] = useState("manager") // Default
  const router = useRouter()

  // Auto-suggest nickname from email
  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newEmail = e.target.value
    setEmail(newEmail)
    
    // Only suggest if nickname was empty or already looks like a suggestion
    if (newEmail.includes("@")) {
      const part = newEmail.split("@")[0]
      const suggested = part
        .split(/[.\-_]/)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join("-")
      
      if (!nickname || nickname.toLowerCase() === suggested.toLowerCase() || suggested.startsWith(nickname)) {
        setNickname(suggested)
      }
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!email || !password || !nickname) {
      toast.error("Všechna pole jsou povinná")
      return
    }

    setIsSubmitting(true)
    try {
      const { error } = await createUserWithPassword(email, password, roleId, nickname)
      if (error) {
        toast.error("Chyba při vytváření uživatele", {
          description: error.message
        })
      } else {
        toast.success("Uživatel úspěšně vytvořen", {
          description: `Účet pro ${nickname} (${email}) je připraven.`
        })
        setOpen(false)
        setEmail("")
        setNickname("")
        setPassword("")
        router.refresh()
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button className="gap-2" />}>
        <Plus className="h-4 w-4" />
        Vytvořit uživatele
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] bg-background border-zinc-800">
        <DialogHeader>
          <DialogTitle>Vytvořit nového uživatele</DialogTitle>
          <DialogDescription className="text-zinc-400">
            Založte účet novému zaměstnanci a nastavte mu identitu v systému.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleCreate} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="nickname">Systémová přezdívka (Nickname)</Label>
            <Input 
              id="nickname" 
              placeholder="např. Martin-Sklad" 
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              required
              className="bg-zinc-900 border-zinc-800"
            />
            <p className="text-[10px] text-muted-foreground italic">
              Toto jméno se bude zobrazovat v historii změn (Audit Log).
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">E-mailová adresa</Label>
            <Input 
              id="email" 
              type="email" 
              placeholder="jmeno@az-composites.cz" 
              value={email}
              onChange={handleEmailChange}
              required
              className="bg-zinc-900 border-zinc-800"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Počáteční heslo</Label>
            <Input 
              id="password" 
              type="password" 
              placeholder="Minimálně 6 znaků" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="bg-zinc-900 border-zinc-800"
            />
          </div>
          
          <div className="space-y-2">
            <Label>Přístupová role (RBAC)</Label>
            <Select value={roleId} onValueChange={(val) => setRoleId(val || "manager")}>
              <SelectTrigger className="bg-zinc-900 border-zinc-800">
                <SelectValue placeholder="Vyberte roli">
                  {roles.find(r => r.id === roleId)?.nazev}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {roles.map(r => (
                  <SelectItem key={r.id} value={r.id}>{r.nazev}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Zrušit
            </Button>
            <Button type="submit" disabled={isSubmitting || !email || !password || !nickname}>
              {isSubmitting ? "Vytvářím..." : "Vytvořit účet"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
