import Image from 'next/image'
import { login } from './actions'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ message: string }>
}) {
  const resolvedSearchParams = await searchParams;

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Left side: Branding */}
      <div className="hidden lg:flex bg-zinc-950 flex-col items-center justify-center p-12 text-center relative overflow-hidden">
        {/* Subtle decorative purple glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/20 rounded-full blur-[100px]" />
        
        <div className="relative z-10 max-w-md">
          <Image 
            src="/brand/logo.png" 
            alt="AZ Composite Logo" 
            width={120} 
            height={120} 
            className="mx-auto mb-8 drop-shadow-lg"
          />
          <h1 className="text-3xl font-bold text-white mb-4">Enterprise ERP & CRM</h1>
          <p className="text-zinc-400">
            Profesionální informační systém pro správu produktů, nákupů a financí. Přihlašte se pro pokračování do zabezpečené zóny.
          </p>
        </div>
      </div>

      {/* Right side: Login Form */}
      <div className="flex flex-col justify-center items-center p-8 bg-background">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex justify-center mb-8">
             <Image 
              src="/brand/logo.png" 
              alt="AZ Composite Logo" 
              width={80} 
              height={80} 
            />
          </div>
          
          <div className="text-center mb-8">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">
              Vítejte zpět
            </h2>
            <p className="text-sm text-muted-foreground mt-2">
              Zadejte svůj e-mail a heslo pro přístup do systému.
            </p>
          </div>

          {resolvedSearchParams?.message && (
            <div className="p-4 mb-6 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg text-center font-medium">
              {resolvedSearchParams.message}
            </div>
          )}

          <form className="space-y-6" action={login}>
            <div className="space-y-2">
              <Label htmlFor="email">E-mailová adresa</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="vase.jmeno@az-composites.cz"
                required
                className="bg-muted/50"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Heslo</Label>
              </div>
              <Input
                id="password"
                name="password"
                type="password"
                required
                className="bg-muted/50"
              />
            </div>

            <Button type="submit" className="w-full font-semibold">
              Přihlásit se do systému
            </Button>
          </form>
          
          <p className="text-center text-xs text-muted-foreground mt-8">
            Přístup je povolen pouze autorizovaným zaměstnancům AZ Composite.
          </p>
        </div>
      </div>
    </div>
  )
}
