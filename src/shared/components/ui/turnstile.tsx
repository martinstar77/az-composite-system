'use client'

import { useEffect, useRef } from 'react'

interface TurnstileProps {
  siteKey?: string
}

export function Turnstile({ siteKey }: TurnstileProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  
  useEffect(() => {
    let script = document.getElementById('cloudflare-turnstile-script') as HTMLScriptElement | null

    const renderWidget = () => {
      if (containerRef.current && window.turnstile) {
        // Clear container to prevent duplicate renders during dev reload/re-renders
        containerRef.current.innerHTML = ''
        
        const finalSiteKey = siteKey || process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '1x00000000000000000000AA'
        
        window.turnstile.render(containerRef.current, {
          sitekey: finalSiteKey,
          theme: 'dark',
        })
      }
    }

    if (!script) {
      script = document.createElement('script')
      script.id = 'cloudflare-turnstile-script'
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onloadTurnstileCallback'
      script.async = true
      script.defer = true
      document.head.appendChild(script)
      
      window.onloadTurnstileCallback = () => {
        renderWidget()
      }
    } else {
      if (window.turnstile) {
        renderWidget()
      } else {
        const prevCallback = window.onloadTurnstileCallback
        window.onloadTurnstileCallback = () => {
          if (prevCallback) prevCallback()
          renderWidget()
        }
      }
    }
  }, [siteKey])

  return (
    <div className="flex justify-center my-4">
      <div ref={containerRef} />
    </div>
  )
}

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: {
          sitekey: string
          theme?: 'light' | 'dark' | 'auto'
          callback?: (token: string) => void
        }
      ) => string
      reset: (widgetId: string) => void
      remove: (widgetId: string) => void
    }
    onloadTurnstileCallback?: () => void
  }
}
