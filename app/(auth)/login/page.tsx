'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })

      if (result?.error) {
        setError('Email o contraseña incorrectos')
      } else {
        router.push('/admin')
      }
    } catch {
      setError('No se pudo iniciar sesión. Intentá de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
      <div className="pointer-events-none absolute -left-32 top-0 h-80 w-80 rounded-full bg-blue-600/15 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 bottom-0 h-72 w-72 rounded-full bg-cyan-500/10 blur-3xl" />

      <div className="animate-fade-in relative grid w-full max-w-4xl overflow-hidden rounded-3xl border border-zinc-800/80 bg-zinc-950/70 shadow-2xl shadow-black/50 backdrop-blur-xl md:grid-cols-[1.05fr_1fr]">
        <div className="relative hidden flex-col justify-between overflow-hidden border-r border-zinc-800/70 bg-linear-to-br from-blue-600/20 via-zinc-900/60 to-zinc-950 p-9 md:flex">
          <div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-blue-400/25 bg-blue-500/15 text-base font-black text-blue-200 shadow-lg shadow-blue-950/40">
              iP
            </div>
            <h1 className="mt-8 text-3xl font-bold leading-tight tracking-tight text-white">
              Sistema
              <br />
              iPhones
            </h1>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-zinc-400">
              Ventas, financiaciones, reparaciones y caja en un solo lugar.
            </p>
          </div>
          <div className="space-y-2.5">
            {['Control total de tu negocio', 'Cuotas y cobranzas al día', 'Caja y reportes en tiempo real'].map(
              item => (
                <p key={item} className="flex items-center gap-2.5 text-xs text-zinc-400">
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500/15 text-[9px] text-emerald-300">
                    ✓
                  </span>
                  {item}
                </p>
              ),
            )}
          </div>
        </div>

        <div className="p-6 sm:p-9">
          <div className="mb-7 md:hidden">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-blue-400/25 bg-blue-500/15 text-sm font-black text-blue-200">
              iP
            </div>
            <h1 className="mt-4 text-2xl font-bold text-white">Sistema iPhones</h1>
          </div>

          <div className="mb-6">
            <h2 className="text-xl font-bold tracking-tight text-white">Bienvenido de nuevo</h2>
            <p className="mt-1 text-sm text-zinc-500">Ingresá tus datos para acceder al panel.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full rounded-xl border border-zinc-700/80 bg-zinc-900/80 px-4 py-3 text-sm text-white placeholder-zinc-600 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                placeholder="tu@email.com"
                autoComplete="email"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="password" className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Contraseña
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full rounded-xl border border-zinc-700/80 bg-zinc-900/80 px-4 py-3 text-sm text-white placeholder-zinc-600 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                placeholder="••••••••"
                autoComplete="current-password"
                required
              />
            </div>

            {error && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-3.5 py-3 text-sm text-red-300"
              >
                <span className="mt-0.5 shrink-0">⚠</span>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-sm font-bold text-white shadow-lg shadow-blue-950/30 transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading && (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              )}
              {loading ? 'Ingresando...' : 'Ingresar'}
            </button>
          </form>

          <p className="mt-6 text-center text-[11px] text-zinc-600">
            Acceso exclusivo para personal autorizado
          </p>
        </div>
      </div>
    </div>
  )
}
