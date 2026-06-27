import { createAdminClient } from '@/shared/lib/supabase/admin'

export async function verifyTurnstileToken(token: string, ip?: string): Promise<boolean> {
  const secretKey = process.env.TURNSTILE_SECRET_KEY || '1x00000000000000000000000000000000'

  // If we are using the test secret key, let it pass automatically (useful for dev and testing)
  if (secretKey === '1x00000000000000000000000000000000' && (!token || token === '1x00000000000000000000AA')) {
    return true
  }

  if (!token) return false

  try {
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        secret: secretKey,
        response: token,
        remoteip: ip,
      }),
    })

    const data = await response.json()
    return !!data.success
  } catch (error) {
    console.error('Turnstile verification failed:', error)
    // Fail closed in production, fail open in development
    return process.env.NODE_ENV !== 'production'
  }
}

export async function checkLoginAttempts(email: string, ip?: string): Promise<{ allowed: boolean; waitSeconds: number }> {
  const adminClient = createAdminClient()
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  
  // 1. Fetch attempts by email
  const emailQuery = adminClient
    .from('failed_logins')
    .select('success, attempted_at')
    .eq('email', email.toLowerCase())
    .gte('attempted_at', oneHourAgo)
    .order('attempted_at', { ascending: false })

  // 2. Fetch attempts by IP (if available)
  const ipQuery = ip
    ? adminClient
        .from('failed_logins')
        .select('success, attempted_at')
        .eq('ip_address', ip)
        .gte('attempted_at', oneHourAgo)
        .order('attempted_at', { ascending: false })
    : Promise.resolve({ data: [], error: null })

  const [emailRes, ipRes] = await Promise.all([emailQuery, ipQuery])

  if (emailRes.error) {
    console.error('Error checking login attempts by email:', emailRes.error)
  }
  if (ipRes.error) {
    console.error('Error checking login attempts by IP:', ipRes.error)
  }

  const emailAttempts = emailRes.data || []
  const ipAttempts = ipRes.data || []

  // Helper to count consecutive failures and find last failure time
  const analyzeAttempts = (attempts: { success: boolean; attempted_at: string }[]) => {
    let consecutiveFailures = 0
    let lastFailureTime: Date | null = null
    
    for (const att of attempts) {
      if (att.success) {
        break
      } else {
        consecutiveFailures++
        if (!lastFailureTime) {
          lastFailureTime = new Date(att.attempted_at)
        }
      }
    }
    return { consecutiveFailures, lastFailureTime }
  }

  const emailStats = analyzeAttempts(emailAttempts)
  const ipStats = analyzeAttempts(ipAttempts)

  // Use the worst-case statistics (maximum consecutive failures)
  const stats = emailStats.consecutiveFailures >= ipStats.consecutiveFailures ? emailStats : ipStats
  const consecutiveFailures = stats.consecutiveFailures
  const lastFailureTime = stats.lastFailureTime

  if (consecutiveFailures < 3) {
    return { allowed: true, waitSeconds: 0 }
  }

  // Calculate delay based on consecutive failures:
  // 3 failures: 30 seconds
  // 4 failures: 5 minutes (300 seconds)
  // 5+ failures: 30 minutes (1800 seconds)
  let delaySeconds = 30
  if (consecutiveFailures === 4) {
    delaySeconds = 5 * 60
  } else if (consecutiveFailures >= 5) {
    delaySeconds = 30 * 60
  }

  if (lastFailureTime) {
    const elapsedSeconds = Math.floor((Date.now() - lastFailureTime.getTime()) / 1000)
    const remainingSeconds = delaySeconds - elapsedSeconds
    if (remainingSeconds > 0) {
      return { allowed: false, waitSeconds: remainingSeconds }
    }
  }

  return { allowed: true, waitSeconds: 0 }
}

export async function logLoginAttempt(email: string, success: boolean, ip?: string): Promise<void> {
  const adminClient = createAdminClient()
  const { error } = await adminClient
    .from('failed_logins')
    .insert({
      email: email.toLowerCase(),
      ip_address: ip || null,
      success
    })
    
  if (error) {
    console.error('Error logging login attempt:', error)
  }
}

