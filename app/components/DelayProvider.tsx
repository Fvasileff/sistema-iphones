'use client'

import { useEffect, useState } from 'react'

const DELAY_MS = 10000
const GRACE_MS = 2000
const SLOW_MODE = process.env.NEXT_PUBLIC_SLOW_MODE === '1'

export default function DelayProvider({ children }: { children: React.ReactNode }) {
  const [activo, setActivo] = useState(false)
  const [restante, setRestante] = useState(Math.ceil(DELAY_MS / 1000))

  useEffect(() => {
    if (!SLOW_MODE) return

    let gate: { promise: Promise<void>; resolver: () => void } | null = null
    let ultimoResuelto = 0
    let bypass = false
    let contador: ReturnType<typeof setInterval> | null = null
    let temporizador: ReturnType<typeof setTimeout> | null = null

    const iniciarOverlay = () => {
      setActivo(true)
      setRestante(Math.ceil(DELAY_MS / 1000))
      if (contador) clearInterval(contador)
      contador = setInterval(() => {
        setRestante(prev => (prev > 0 ? prev - 1 : 0))
      }, 1000)
    }

    const detenerOverlay = () => {
      if (contador) {
        clearInterval(contador)
        contador = null
      }
      setActivo(false)
    }

    const esperar = (): Promise<void> => {
      if (gate) return gate.promise
      if (Date.now() - ultimoResuelto < GRACE_MS) return Promise.resolve()

      iniciarOverlay()
      let resolver!: () => void
      const promise = new Promise<void>(r => {
        resolver = r
      })
      gate = { promise, resolver }
      temporizador = setTimeout(() => {
        gate = null
        ultimoResuelto = Date.now()
        temporizador = null
        detenerOverlay()
        resolver()
      }, DELAY_MS)
      return promise
    }

    const esFetchDeNext = (input: RequestInfo | URL, init?: RequestInit) => {
      try {
        const url =
          typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
        if (url.includes('_rsc=')) return true
        const headers = new Headers(
          init?.headers ?? (input instanceof Request ? input.headers : undefined),
        )
        return (
          headers.has('RSC') ||
          headers.has('Next-Router-Prefetch') ||
          headers.has('Next-Router-State-Tree')
        )
      } catch {
        return false
      }
    }

    const esSesion = (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
      return url.includes('/api/auth/session')
    }

    const onDocumentClick = (event: MouseEvent) => {
      if (bypass || event.button !== 0) return
      const target = event.target as Element | null
      const el = target?.closest('button, a, [role="button"]') as HTMLElement | null
      if (!el) return
      if (el.hasAttribute('data-delay-skip')) return
      if (el.hasAttribute('disabled') || el.getAttribute('aria-disabled') === 'true') return

      event.preventDefault()
      event.stopPropagation()
      event.stopImmediatePropagation()

      void esperar().then(() => {
        bypass = true
        try {
          el.click()
        } finally {
          bypass = false
        }
      })
    }

    const onDocumentSubmit = (event: Event) => {
      if (bypass) return
      const form = event.target
      if (!(form instanceof HTMLFormElement)) return
      if (form.hasAttribute('data-delay-skip')) return

      event.preventDefault()
      event.stopPropagation()
      event.stopImmediatePropagation()

      void esperar().then(() => {
        bypass = true
        try {
          form.requestSubmit()
        } finally {
          bypass = false
        }
      })
    }

    const fetchOriginal = window.fetch
    const fetchConDemora: typeof window.fetch = async (input, init) => {
      if (!esFetchDeNext(input, init) && !esSesion(input)) {
        await esperar()
      }
      return fetchOriginal(input, init)
    }
    window.fetch = fetchConDemora

    document.addEventListener('click', onDocumentClick, true)
    document.addEventListener('submit', onDocumentSubmit, true)

    return () => {
      document.removeEventListener('click', onDocumentClick, true)
      document.removeEventListener('submit', onDocumentSubmit, true)
      if (window.fetch === fetchConDemora) window.fetch = fetchOriginal
      if (contador) clearInterval(contador)
      if (temporizador) clearTimeout(temporizador)
    }
  }, [])

  if (!SLOW_MODE) return <>{children}</>

  return (
    <>
      {children}
      {activo && (
        <div
          role="status"
          aria-live="polite"
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-4 bg-black/60 backdrop-blur-sm"
        >
          <span className="h-10 w-10 animate-spin rounded-full border-4 border-white/20 border-t-white" />
          <p className="text-sm font-semibold tracking-wide text-white">
            Procesando... {restante}s
          </p>
        </div>
      )}
    </>
  )
}
