"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { MoreHorizontal, Key, Trash2, UserCog } from "lucide-react"
import { toast } from "sonner"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table"
import { UserProfile, Role } from "../types"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu"
import { Button } from "@/shared/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/shared/components/ui/dialog"
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
import { Input } from "@/shared/components/ui/input"
import { Label } from "@/shared/components/ui/label"
import { updateUserRole, deleteUser, adminResetPassword, updateUserProfile } from "../actions"

interface UserDataTableProps {
  data: UserProfile[]
  roles: Role[]
}

export function UserDataTable({ data, roles }: UserDataTableProps) {
  const router = useRouter()
  
  // States for various dialogs
  const [resetUserId, setResetUserId] = React.useState<string | null>(null)
  const [deleteUserObj, setDeleteUserObj] = React.useState<{id: string, email: string} | null>(null)
  const [editUserObj, setEditUserObj] = React.useState<{id: string, nickname: string} | null>(null)
  
  const [newPassword, setNewPassword] = React.useState("")
  const [newNickname, setNewNickname] = React.useState("")
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  
  const handleRoleChange = async (userId: string, newRoleId: string) => {
    const { error } = await updateUserRole(userId, newRoleId)
    if (error) {
      toast.error("Chyba při změně role", { description: error.message })
    } else {
      toast.success("Role aktualizována")
      router.refresh()
    }
  }

  const handleDelete = async () => {
    if (!deleteUserObj) return
    setIsSubmitting(true)
    try {
      const { error } = await deleteUser(deleteUserObj.id)
      if (error) {
        toast.error("Chyba při mazání", { description: error.message })
      } else {
        toast.success("Uživatel odstraněn")
        setDeleteUserObj(null)
        router.refresh()
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!resetUserId || !newPassword || newPassword.length < 6) return
    setIsSubmitting(true)
    try {
      const { error } = await adminResetPassword(resetUserId, newPassword)
      if (error) {
        toast.error("Chyba při změně hesla", { description: error.message })
      } else {
        toast.success("Heslo úspěšně změněno")
        setResetUserId(null)
        setNewPassword("")
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleUpdateNickname = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editUserObj || !newNickname) return
    setIsSubmitting(true)
    try {
      const { error } = await updateUserProfile(editUserObj.id, { jmeno: newNickname })
      if (error) {
        toast.error("Chyba při aktualizaci", { description: error.message })
      } else {
        toast.success("Přezdívka aktualizována")
        setEditUserObj(null)
        setNewNickname("")
        router.refresh()
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const columns: ColumnDef<UserProfile>[] = [
    {
      accessorKey: "jmeno",
      header: "Přezdívka (Nickname)",
      cell: ({ row }) => (
        <div className="font-bold text-primary">
          {row.getValue("jmeno") || "—"}
        </div>
      ),
    },
    {
      accessorKey: "email",
      header: "E-mail",
      cell: ({ row }) => <div className="text-sm font-medium text-zinc-300">{row.getValue("email")}</div>,
    },
    {
      accessorKey: "vytvoreno_at",
      header: "Vytvořeno",
      cell: ({ row }) => {
        const date = new Date(row.getValue("vytvoreno_at"))
        return <div className="text-xs text-muted-foreground">{date.toLocaleDateString('cs-CZ')}</div>
      },
    },
    {
      accessorKey: "role_id",
      header: "Oprávnění (Role)",
      cell: ({ row }) => {
        const user = row.original
        return (
          <div className="w-[180px]">
            <Select 
              defaultValue={user.role_id} 
              onValueChange={(val) => handleRoleChange(user.id, val || "manager")}
              disabled={user.email === 'admin@az-composites.cz'}
            >
              <SelectTrigger className="h-8 bg-zinc-950 border-zinc-800 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {roles.map(r => (
                  <SelectItem key={r.id} value={r.id}>{r.nazev}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const user = row.original
        const isMainAdmin = user.email === 'admin@az-composites.cz'
 
        return (
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="ghost" className="h-8 w-8 p-0" />}>
              <span className="sr-only">Otevřít menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuGroup>
                <DropdownMenuLabel>Správa uživatele</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => {
                    setEditUserObj({ id: user.id, nickname: user.jmeno || "" })
                    setNewNickname(user.jmeno || "")
                  }}
                  className="cursor-pointer"
                >
                  <UserCog className="mr-2 h-4 w-4" /> Upravit identitu (Nickname)
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => setResetUserId(user.id)}
                  className="cursor-pointer"
                >
                  <Key className="mr-2 h-4 w-4" /> Resetovat heslo
                </DropdownMenuItem>
                {!isMainAdmin && (
                  <DropdownMenuItem 
                    onClick={() => setDeleteUserObj({ id: user.id, email: user.email })}
                    className="text-destructive focus:text-destructive cursor-pointer"
                  >
                    <Trash2 className="mr-2 h-4 w-4" /> Odstranit uživatele
                  </DropdownMenuItem>
                )}
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <>
      <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 overflow-hidden shadow-2xl">
        <Table>
          <TableHeader className="bg-zinc-900/80 text-xs uppercase tracking-tighter">
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
                    <TableCell key={cell.id} className="py-2">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-32 text-center text-zinc-500 italic">
                  Žádní uživatelé nenalezeni.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Dialog: Edit Nickname */}
      <Dialog open={!!editUserObj} onOpenChange={(open) => !open && setEditUserObj(null)}>
        <DialogContent className="sm:max-w-[425px] bg-background text-foreground border-zinc-800">
          <DialogHeader>
            <DialogTitle>Upravit identitu</DialogTitle>
            <DialogDescription className="text-zinc-400">
              Změňte systémovou přezdívku uživatele.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateNickname} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="nickname-edit">Systémová přezdívka (Nickname)</Label>
              <Input
                id="nickname-edit"
                placeholder="Přezdívka"
                value={newNickname}
                onChange={(e) => setNewNickname(e.target.value)}
                required
                className="bg-zinc-900 border-zinc-800"
              />
            </div>
            <DialogFooter className="border-t border-zinc-800 pt-4 mt-4">
              <Button type="button" variant="outline" onClick={() => setEditUserObj(null)}>
                Zrušit
              </Button>
              <Button type="submit" disabled={isSubmitting || !newNickname}>
                {isSubmitting ? "Ukládám..." : "Uložit změny"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog: Reset Password */}
      <Dialog open={!!resetUserId} onOpenChange={(open) => !open && setResetUserId(null)}>
        <DialogContent className="sm:max-w-[425px] bg-background text-foreground border-zinc-800">
          <DialogHeader>
            <DialogTitle>Resetovat heslo</DialogTitle>
            <DialogDescription className="text-zinc-400">
              Nastavte uživateli nové heslo. Po uložení se uživatel bude muset přihlásit novým heslem.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleResetPassword} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">Nové heslo</Label>
              <Input
                id="new-password"
                type="password"
                placeholder="Minimálně 6 znaků"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={6}
                className="bg-zinc-900 border-zinc-800"
              />
            </div>
            <DialogFooter className="border-t border-zinc-800 pt-4 mt-4">
              <Button type="button" variant="outline" onClick={() => setResetUserId(null)}>
                Zrušit
              </Button>
              <Button type="submit" disabled={isSubmitting || newPassword.length < 6}>
                {isSubmitting ? "Ukládám..." : "Uložit nové heslo"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog: Delete Confirmation */}
      <AlertDialog open={!!deleteUserObj} onOpenChange={(open) => !open && setDeleteUserObj(null)}>
        <AlertDialogContent className="bg-background text-foreground border-zinc-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive">Potvrdit odstranění</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              Opravdu chcete trvale odstranit uživatele <strong className="text-foreground">{deleteUserObj?.email}</strong>? Tuto akci nelze vrátit.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="border-t border-zinc-800 pt-4 mt-4">
            <AlertDialogCancel className="bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white">Zrušit</AlertDialogCancel>
            <AlertDialogAction 
              onClick={(e) => {
                e.preventDefault()
                handleDelete()
              }}
              className="bg-destructive text-white hover:bg-destructive/90"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Odstraňuji..." : "Trvale odstranit"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
