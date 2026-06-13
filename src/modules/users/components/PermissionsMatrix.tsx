"use client"

import * as React from "react"
import { Checkbox } from "@/shared/components/ui/checkbox"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table"
import { Role } from "../types"
import { togglePermission } from "../actions"

interface PermissionsMatrixProps {
  roles: Role[]
  permissions: any[]
  initialMatrix: any[]
}

export function PermissionsMatrix({ roles, permissions, initialMatrix }: PermissionsMatrixProps) {
  // Use local state for immediate UI feedback
  const [matrix, setMatrix] = React.useState<Record<string, boolean>>(() => {
    const map: Record<string, boolean> = {}
    initialMatrix.forEach(item => {
      map[`${item.role_id}_${item.opravneni_id}`] = item.povoleno
    })
    return map
  })

  const handleToggle = async (roleId: string, permissionId: string) => {
    const key = `${roleId}_${permissionId}`
    const newValue = !matrix[key]
    
    // Update local state first (Optimistic update)
    setMatrix(prev => ({ ...prev, [key]: newValue }))

    const { error } = await togglePermission(roleId, permissionId, newValue)
    if (error) {
      alert("Chyba při ukládání oprávnění: " + error.message)
      // Revert if error
      setMatrix(prev => ({ ...prev, [key]: !newValue }))
    }
  }

  // Group permissions by module
  const modules = Array.from(new Set(permissions.map(p => p.modul)))

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 overflow-hidden shadow-2xl">
      <Table>
        <TableHeader className="bg-zinc-900/80">
          <TableRow className="hover:bg-transparent border-zinc-800">
            <TableHead className="w-[300px] text-zinc-400">Funkcionalita / Modul</TableHead>
            {roles.map(role => (
              <TableHead key={role.id} className="text-center text-zinc-400 capitalize">
                {role.nazev}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {modules.map(moduleName => (
            <React.Fragment key={moduleName}>
              <TableRow className="bg-zinc-900/30 border-zinc-800 hover:bg-zinc-900/30">
                <TableCell colSpan={roles.length + 1} className="py-2 text-[10px] font-bold uppercase tracking-widest text-primary/70">
                   Modul: {moduleName}
                </TableCell>
              </TableRow>
              {permissions
                .filter(p => p.modul === moduleName)
                .map(permission => (
                  <TableRow key={permission.id} className="border-zinc-800 hover:bg-zinc-900/50 transition-colors">
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium text-sm">{permission.nazev}</span>
                        <span className="text-[10px] font-mono text-zinc-500">{permission.id}</span>
                      </div>
                    </TableCell>
                    {roles.map(role => {
                      const key = `${role.id}_${permission.id}`
                      const isMainAdmin = role.id === 'admin'
                      return (
                        <TableCell key={role.id} className="text-center">
                          <div className="flex justify-center">
                            <Checkbox 
                              checked={matrix[key] || false} 
                              onCheckedChange={() => handleToggle(role.id, permission.id)}
                              disabled={isMainAdmin} // Main Admin always has all permissions
                              className="border-zinc-700 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                            />
                          </div>
                        </TableCell>
                      )
                    })}
                  </TableRow>
                ))}
            </React.Fragment>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
