'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { z } from 'zod'
import { createClient } from '@/shared/lib/supabase/server'
import { verifyTurnstileToken, checkLoginAttempts, logLoginAttempt } from '@/shared/utils/security'

const loginSchema = z.object({
  email: z.string().email('Neplatný formát e-mailové adresy'),
  password: z.string().min(1, 'Heslo musí být vyplněno'),
})

export async function login(formData: FormData) {
  // 1. Honeypot check
  const honeypot = formData.get('website_verification') as string
  if (honeypot) {
    console.warn('[Security] Honeypot triggered by bot!')
    // Artificial delay to waste bot resources
    await new Promise((resolve) => setTimeout(resolve, 2000))
    redirect('/login?message=Chybné jméno nebo heslo')
  }

  // 2. Parse and validate form inputs via Zod
  const rawEmail = formData.get('email') as string
  const rawPassword = formData.get('password') as string

  const parseResult = loginSchema.safeParse({
    email: rawEmail,
    password: rawPassword,
  })

  if (!parseResult.success) {
    const errorMsg = parseResult.error.issues[0]?.message || 'Neplatné vstupní údaje'
    redirect(`/login?message=${encodeURIComponent(errorMsg)}`)
  }

  const { email, password } = parseResult.data

  const headerList = await headers()
  const ip = headerList.get('x-forwarded-for')?.split(',')[0].trim() || undefined

  // 2.5 Check progressive delay for brute-force prevention
  const attemptsCheck = await checkLoginAttempts(email, ip)
  if (!attemptsCheck.allowed) {
    console.warn(`[Security] Login blocked for email: ${email} (cooldown: ${attemptsCheck.waitSeconds}s)`)
    redirect(`/login?message=Příliš mnoho neúspěšných pokusů. Zkuste to prosím znovu za ${attemptsCheck.waitSeconds} sekund.`)
  }

  // 3. Turnstile token check
  const turnstileToken = formData.get('cf-turnstile-response') as string

  const isHuman = await verifyTurnstileToken(turnstileToken, ip)
  if (!isHuman) {
    console.warn(`[Security] Turnstile verification failed for email: ${email}`)
    redirect('/login?message=Ověření bezpečnosti (Turnstile) selhalo. Zkuste to prosím znovu.')
  }

  // 4. Authenticate via Supabase Auth
  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    console.error("Login failed:", error.message)
    try {
      await logLoginAttempt(email, false, ip)
    } catch (logErr) {
      console.error('[Security] Failed to log login attempt:', logErr)
    }
    redirect('/login?message=Chybné jméno nebo heslo')
  }

  // Log successful login to clear failures count
  try {
    await logLoginAttempt(email, true, ip)
  } catch (logErr) {
    console.error('[Security] Failed to log successful login attempt:', logErr)
    // Non-critical – user is authenticated, proceed with redirect
  }

  revalidatePath('/', 'layout')
  redirect('/')
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

