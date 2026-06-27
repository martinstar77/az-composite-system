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
