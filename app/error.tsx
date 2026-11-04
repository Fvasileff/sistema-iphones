'use client'

import { useEffect } from 'react'
import Link from 'next/link'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Error no controlado en la aplicación:', error)
  }, [error])

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-3xl border border-zinc-800/80 bg-zinc-950/70 p-8 text-center shadow-2xl shadow-black/50 backdrop-blur-xl">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-red-500/20 bg-red-500/10 text-2xl font-black text-red-300">
          !
        </div>
        <h1 className="mt-6 text-2xl font-bold tracking-tight text-white">Algo salió mal</h1>
        <p className="mt-2 text-sm leading-relaxed text-zinc-400">
          Ocurrió un error inesperado. Podés reintentar o volver al panel.
        </p>
        <div className="mt-7 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={reset}
            className="flex-1 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-950/30 transition hover:bg-blue-500"
          >
            Reintentar
          </button>
          <Link
            href="/admin"
            className="flex-1 rounded-xl border border-zinc-700/80 bg-zinc-900/80 px-4 py-2.5 text-sm font-semibold text-zinc-200 transition hover:border-zinc-600 hover:bg-zinc-800"
          >
            Volver al panel
          </Link>
        </div>
      </div>
    </div>
  )
}
