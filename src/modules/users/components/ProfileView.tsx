'use client'

import * as React from 'react'
import { useState } from 'react'
import { toast } from 'sonner'
import { KeyRound, Check, X, Shield, Mail, Calendar } from 'lucide-react'
import { updateSelfPassword } from '../actions'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'

interface ProfileViewProps {
  profile: {
    id: string
    jmeno: string
    role_id: string
    vytvoreno_at: string
    c_role_uzivatelu?: {
      nazev: string | null
    } | null
  }
  email: string
}

export function ProfileView({ profile, email }: ProfileViewProps) {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)

  // Password criteria checks
  const hasMinLength = password.length >= 8
  const hasUppercase = /[A-Z]/.test(password)
  const hasLowercase = /[a-z]/.test(password)
  const hasDigit = /\d/.test(password)
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password)
  const matchesConfirm = password === confirmPassword && confirmPassword !== ''

  const isFormValid = hasMinLength && hasUppercase && hasLowercase && hasDigit && hasSpecial && matchesConfirm

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault()
    if (!isFormValid) return

    setLoading(true)
    const result = await updateSelfPassword(password)
    setLoading(false)

    if (result.success) {
      toast.success('Heslo bylo úspěšně změněno.')
      setPassword('')
      setConfirmPassword('')
    } else {
      toast.error(result.error || 'Chyba při změně hesla.')
    }
  }

  // Get initials for profile avatar
  const initials = profile.jmeno
    ? profile.jmeno.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
    : 'U'

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
      {/* Profil details card */}
      <div className="lg:col-span-1 border border-zinc-200 dark:border-zinc-800 rounded-xl bg-card/60 p-6 flex flex-col items-center text-center shadow-sm">
        <div className="h-20 w-20 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-2xl font-bold text-zinc-50 mb-4 select-none">
          {initials}
        </div>
        <h2 className="text-xl font-bold text-foreground">{profile.jmeno || 'Uživatel'}</h2>
        <div className="mt-1 flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900/40 text-[10px] font-bold text-muted-foreground tracking-wider uppercase select-none">
          <Shield className="h-3 w-3 text-primary shrink-0" />
          <span>{profile.c_role_uzivatelu?.nazev || profile.role_id}</span>
        </div>

        <div className="w-full border-t border-zinc-200 dark:border-zinc-800 my-6" />

        <div className="w-full flex flex-col gap-4 text-left text-xs">
          <div className="flex items-center gap-3">
            <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
            <div className="flex flex-col min-w-0">
              <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider select-none">E-mail</span>
              <span className="text-foreground font-medium truncate">{email}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
            <div className="flex flex-col">
              <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider select-none">Členem od</span>
              <span className="text-foreground font-medium">
                {new Date(profile.vytvoreno_at).toLocaleDateString('cs-CZ')}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Password change card */}
      <div className="lg:col-span-2 border border-zinc-200 dark:border-zinc-800 rounded-xl bg-card/60 p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
            <KeyRound className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-bold text-foreground">Změna hesla</h3>
            <p className="text-xs text-muted-foreground">Pro změnu Vašeho přístupového hesla vyplňte níže uvedená pole.</p>
          </div>
        </div>

        <form onSubmit={handlePasswordChange} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="new-password">Nové heslo</Label>
              <Input
                id="new-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Zadejte nové heslo"
                className="bg-background border-zinc-200 dark:border-zinc-800 focus-visible:ring-primary h-9 text-xs"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="confirm-password">Potvrzení hesla</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Zopakujte nové heslo"
                className="bg-background border-zinc-200 dark:border-zinc-800 focus-visible:ring-primary h-9 text-xs"
              />
            </div>
          </div>

          {/* Validation Checklist */}
          <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl bg-zinc-100/40 dark:bg-zinc-950/20 p-4 space-y-3">
            <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider select-none">
              Požadavky na bezpečnost hesla
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-2 select-none">
                {hasMinLength ? (
                  <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                ) : (
                  <X className="h-4 w-4 text-muted-foreground/60 shrink-0" />
                )}
                <span className={hasMinLength ? 'text-emerald-500 font-medium' : 'text-muted-foreground'}>
                  Minimálně 8 znaků
                </span>
              </div>
              <div className="flex items-center gap-2 select-none">
                {hasUppercase ? (
                  <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                ) : (
                  <X className="h-4 w-4 text-muted-foreground/60 shrink-0" />
                )}
                <span className={hasUppercase ? 'text-emerald-500 font-medium' : 'text-muted-foreground'}>
                  Alespoň jedno velké písmeno (A-Z)
                </span>
              </div>
              <div className="flex items-center gap-2 select-none">
                {hasLowercase ? (
                  <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                ) : (
                  <X className="h-4 w-4 text-muted-foreground/60 shrink-0" />
                )}
                <span className={hasLowercase ? 'text-emerald-500 font-medium' : 'text-muted-foreground'}>
                  Alespoň jedno malé písmeno (a-z)
                </span>
              </div>
              <div className="flex items-center gap-2 select-none">
                {hasDigit ? (
                  <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                ) : (
                  <X className="h-4 w-4 text-muted-foreground/60 shrink-0" />
                )}
                <span className={hasDigit ? 'text-emerald-500 font-medium' : 'text-muted-foreground'}>
                  Alespoň jedno číslo (0-9)
                </span>
              </div>
              <div className="flex items-center gap-2 select-none">
                {hasSpecial ? (
                  <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                ) : (
                  <X className="h-4 w-4 text-muted-foreground/60 shrink-0" />
                )}
                <span className={hasSpecial ? 'text-emerald-500 font-medium' : 'text-muted-foreground'}>
                  Speciální znak (např. !@#$%)
                </span>
              </div>
              <div className="flex items-center gap-2 select-none">
                {matchesConfirm ? (
                  <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                ) : (
                  <X className="h-4 w-4 text-muted-foreground/60 shrink-0" />
                )}
                <span className={matchesConfirm ? 'text-emerald-500 font-medium' : 'text-muted-foreground'}>
                  Hesla se shodují
                </span>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button
              type="submit"
              disabled={!isFormValid || loading}
              className="bg-primary hover:bg-primary/90 text-white font-semibold text-xs py-2 px-4 rounded-lg shadow-sm"
            >
              {loading ? 'Ukládám...' : 'Změnit heslo'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
