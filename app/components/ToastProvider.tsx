'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

type ToastTipo = 'success' | 'error' | 'info'

interface ToastItem {
  id: string
  tipo: ToastTipo
  mensaje: string
}

interface ToastContextValue {
  toast: (mensaje: string, tipo?: ToastTipo) => void
  success: (mensaje: string) => void
  error: (mensaje: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

function ToastCard({ item, onClose }: { item: ToastItem; onClose: (id: string) => void }) {
  useEffect(() => {
    const timer = setTimeout(
      () => onClose(item.id),
      item.tipo === 'error' ? 6500 : 3800,
    )
    return () => clearTimeout(timer)
  }, [item.id, item.tipo, onClose])

  const estilos =
    item.tipo === 'success'
      ? 'border-emerald-500/25 bg-emerald-950/95 text-emerald-100'
      : item.tipo === 'error'
        ? 'border-red-500/25 bg-red-950/95 text-red-100'
        : 'border-blue-500/25 bg-slate-950/95 text-slate-100'

  const icono =
    item.tipo === 'success' ? (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="m5 12 4 4L19 6" />
      </svg>
    ) : item.tipo === 'error' ? (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v6M12 17h.01" />
      </svg>
    ) : (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 11v5M12 8h.01" />
      </svg>
    )

  return (
    <div
      role={item.tipo === 'error' ? 'alert' : 'status'}
      className={`animate-toast-in flex w-full items-start gap-3 rounded-2xl border px-4 py-3.5 shadow-2xl shadow-black/40 backdrop-blur-xl sm:w-96 ${estilos}`}
    >
      <span className="mt-0.5 shrink-0">{icono}</span>
      <p className="min-w-0 flex-1 text-sm font-medium leading-relaxed">{item.mensaje}</p>
      <button
        type="button"
        onClick={() => onClose(item.id)}
        className="shrink-0 rounded-lg p-0.5 text-white/60 transition hover:text-white"
        aria-label="Cerrar notificación"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M18 6 6 18M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])

  const cerrar = useCallback((id: string) => {
    setItems(actual => actual.filter(item => item.id !== id))
  }, [])

  const toast = useCallback((mensaje: string, tipo: ToastTipo = 'info') => {
    const id =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random()}`
    setItems(actual => [...actual.slice(-3), { id, tipo, mensaje }])
  }, [])

  const value = useMemo<ToastContextValue>(
    () => ({
      toast,
      success: mensaje => toast(mensaje, 'success'),
      error: mensaje => toast(mensaje, 'error'),
    }),
    [toast],
  )

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-4 left-1/2 z-80 flex w-[calc(100%-2rem)] max-w-md -translate-x-1/2 flex-col gap-2 sm:bottom-6 sm:left-auto sm:right-6 sm:w-96 sm:translate-x-0">
        {items.map(item => (
          <div key={item.id} className="pointer-events-auto">
            <ToastCard item={item} onClose={cerrar} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast debe usarse dentro de ToastProvider')
  return context
}
