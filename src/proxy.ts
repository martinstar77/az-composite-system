import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/shared/lib/supabase/middleware'

// Rate limiter stores in memory
interface RateLimitRecord {
  count: number
  resetTime: number
}

const globalStore = new Map<string, RateLimitRecord>()
const sensitiveStore = new Map<string, RateLimitRecord>()

let lastCleanup = Date.now()
const CLEANUP_INTERVAL = 5 * 60 * 1000 // 5 minutes

function cleanupStores() {
  const now = Date.now()
  if (now - lastCleanup < CLEANUP_INTERVAL) return
  lastCleanup = now

  for (const [ip, record] of globalStore.entries()) {
    if (now > record.resetTime) {
      globalStore.delete(ip)
    }
  }
  for (const [ip, record] of sensitiveStore.entries()) {
    if (now > record.resetTime) {
      sensitiveStore.delete(ip)
    }
  }
}

function getClientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get('x-forwarded-for')
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim()
  }
  const realIp = request.headers.get('x-real-ip')
  if (realIp) {
    return realIp
  }
  return (request as NextRequest & { ip?: string }).ip || '127.0.0.1'
}

function rateLimitResponse(resetTime: number, isJson: boolean) {
  const retryAfter = Math.ceil((resetTime - Date.now()) / 1000)
  
  if (isJson) {
    return new NextResponse(
      JSON.stringify({
        error: 'Too Many Requests',
        message: 'Příliš mnoho požadavků. Zkuste to prosím později.',
        retryAfterSeconds: retryAfter
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Retry-After': String(retryAfter)
        }
      }
    )
  }

  const html = `
    <!DOCTYPE html>
    <html lang="cs">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Příliš mnoho požadavků - AZ Composites</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          background-color: #09090b;
          color: #fafafa;
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100vh;
          margin: 0;
        }
        .container {
          text-align: center;
          max-width: 480px;
          padding: 2.5rem;
          border: 1px solid #27272a;
          background-color: #18181b;
          border-radius: 12px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
        }
        h1 {
          font-size: 1.8rem;
          margin-top: 0;
          margin-bottom: 1rem;
          color: #ffffff;
        }
        p {
          color: #a1a1aa;
          line-height: 1.5;
          margin-bottom: 1.5rem;
        }
        .timer-container {
          background-color: rgba(138, 4, 133, 0.1);
          border: 1px solid rgba(138, 4, 133, 0.2);
          padding: 0.75rem;
          border-radius: 8px;
          margin-bottom: 0.5rem;
        }
        .timer {
          font-size: 1.3rem;
          font-weight: bold;
          color: #c92ac4;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>Přístup dočasně omezen</h1>
        <p>Zaznamenali jsme příliš mnoho požadavků z Vaší IP adresy. Z důvodu ochrany systému byl přístup dočasně zablokován.</p>
        <div class="timer-container">
          Zkuste to prosím znovu za <span class="timer" id="countdown">${retryAfter}</span> sekund.
        </div>
      </div>
      <script>
        let seconds = ${retryAfter};
        const el = document.getElementById('countdown');
        const interval = setInterval(() => {
          seconds--;
          if (seconds <= 0) {
            clearInterval(interval);
            window.location.reload();
          } else {
            el.textContent = seconds;
          }
        }, 1000);
      </script>
    </body>
    </html>
  `

  return new NextResponse(html, {
    status: 429,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Retry-After': String(retryAfter)
    }
  })
}

export async function proxy(request: NextRequest) {
  // 1. Clean up expired records
  cleanupStores()

  const ip = getClientIp(request)
  const pathname = request.nextUrl.pathname

  const isDev = process.env.NODE_ENV === 'development' || ip === '127.0.0.1' || ip === '::1'
  if (isDev) {
    return await updateSession(request)
  }

  // 2. Identify if route is sensitive
  const isAction = request.headers.get('next-action') !== null
  const isSensitive = 
    (request.method === 'POST' && !isAction) || 
    pathname.startsWith('/api') || 
    pathname === '/login'

  const isJson = 
    pathname.startsWith('/api') || 
    request.headers.get('accept')?.includes('application/json') ||
    isAction

  const now = Date.now()

  // 3. Apply Rate Limits
  if (isSensitive) {
    const limit = parseInt(process.env.RATE_LIMIT_SENSITIVE_MAX || '15', 10)
    const windowMs = 60 * 1000 // 1 minute
    const record = sensitiveStore.get(ip)

    if (record && now < record.resetTime) {
      record.count += 1
      if (record.count > limit) {
        console.warn(`[RateLimit] IP ${ip} blocked on sensitive path ${pathname} (count: ${record.count}/${limit})`)
        return rateLimitResponse(record.resetTime, isJson)
      }
    } else {
      sensitiveStore.set(ip, { count: 1, resetTime: now + windowMs })
    }
  } else {
    const limit = parseInt(process.env.RATE_LIMIT_GLOBAL_MAX || '120', 10)
    const windowMs = 60 * 1000 // 1 minute
    const record = globalStore.get(ip)

    if (record && now < record.resetTime) {
      record.count += 1
      if (record.count > limit) {
        console.warn(`[RateLimit] IP ${ip} blocked globally on path ${pathname} (count: ${record.count}/${limit})`)
        return rateLimitResponse(record.resetTime, isJson)
      }
    } else {
      globalStore.set(ip, { count: 1, resetTime: now + windowMs })
    }
  }

  // 4. Continue with standard Supabase Session handling
  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
