'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useToast } from '@/app/components/ToastProvider'

interface Cliente {
  id: string
  nombre: string
  apellido: string
  dni: string
  telefono: string
  email?: string
  direccion?: string
}

const inputClass =
  'w-full rounded-xl border border-zinc-700/80 bg-zinc-950/60 px-3.5 py-2.5 text-sm text-white placeholder-zinc-600 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20'

function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string
  required?: boolean
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
        {label} {required && <span className="text-blue-400">*</span>}
      </label>
      {children}
      {hint && <p className="text-[11px] text-zinc-600">{hint}</p>}
    </div>
  )
}

function SkeletonLista() {
  return (
    <div className="divide-y divide-zinc-800/60">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="flex items-center gap-3 px-5 py-4">
          <div className="skeleton h-10 w-10 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="skeleton h-3.5 w-44 rounded" />
            <div className="skeleton h-3 w-60 max-w-full rounded opacity-60" />
          </div>
          <div className="skeleton hidden h-3 w-20 rounded sm:block" />
        </div>
      ))}
    </div>
  )
}

export default function ClientesPage() {
  const toast = useToast()
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [busqueda, setBusqueda] = useState('')
  const [nombre, setNombre] = useState('')
  const [apellido, setApellido] = useState('')
  const [dni, setDni] = useState('')
  const [telefono, setTelefono] = useState('')
  const [email, setEmail] = useState('')
  const [direccion, setDireccion] = useState('')
  const [cargando, setCargando] = useState(false)
  const [cargandoLista, setCargandoLista] = useState(true)
  const [errorLista, setErrorLista] = useState('')
  const [mostrarFormulario, setMostrarFormulario] = useState(false)

  const obtenerClientes = useCallback(async () => {
    setCargandoLista(true)
    setErrorLista('')
    try {
      const res = await fetch('/api/clientes', { cache: 'no-store' })
      if (!res.ok) throw new Error('No se pudieron cargar los clientes')
      setClientes(await res.json())
    } catch (error) {
      setErrorLista(error instanceof Error ? error.message : 'Error al traer clientes')
    } finally {
      setCargandoLista(false)
    }
  }, [])

  useEffect(() => {
    let activo = true
    fetch('/api/clientes', { cache: 'no-store' })
      .then(async res => {
        if (!res.ok) throw new Error('No se pudieron cargar los clientes')
        return res.json() as Promise<Cliente[]>
      })
      .then(data => {
        if (activo) setClientes(data)
      })
      .catch(error => {
        if (activo) {
          setErrorLista(error instanceof Error ? error.message : 'Error al traer clientes')
        }
      })
      .finally(() => {
        if (activo) setCargandoLista(false)
      })

    return () => {
      activo = false
    }
  }, [])

  const clientesFiltrados = clientes.filter(c => {
    const texto = busqueda.trim().toLowerCase()
    if (!texto) return true
    return (
      c.nombre.toLowerCase().includes(texto) ||
      c.apellido.toLowerCase().includes(texto) ||
      c.dni.includes(texto) ||
      c.telefono.includes(texto)
    )
  })

  const normalizarTelefono = (tel: string): string => {
    const t = tel.trim().replace(/\s+/g, '').replace(/-/g, '')
    if (t.startsWith('+549')) return t
    if (t.startsWith('+54')) return t.replace('+54', '+549')
    if (t.startsWith('549')) return '+' + t
    if (t.startsWith('0')) return '+549' + t.slice(1)
    return '+549' + t
  }

  const limpiarFormulario = () => {
    setNombre('')
    setApellido('')
    setDni('')
    setTelefono('')
    setEmail('')
    setDireccion('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setCargando(true)
    try {
      const res = await fetch('/api/clientes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre,
          apellido,
          dni,
          telefono: normalizarTelefono(telefono),
          email,
          direccion,
        }),
      })
      const data = (await res.json()) as { error?: string }
      if (!res.ok) throw new Error(data.error || 'Error al guardar')
      toast.success('Cliente registrado con éxito')
      limpiarFormulario()
      setMostrarFormulario(false)
      await obtenerClientes()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo guardar el cliente')
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-5 p-4 md:p-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-blue-400/80">Directorio</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-white md:text-3xl">Clientes</h1>
          <p className="mt-1 text-sm text-zinc-500">
            {clientes.length} {clientes.length === 1 ? 'cliente registrado' : 'clientes registrados'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setMostrarFormulario(actual => !actual)}
          className={`self-start rounded-xl px-4 py-2.5 text-sm font-bold transition ${
            mostrarFormulario
              ? 'border border-zinc-700 bg-zinc-900 text-zinc-300 hover:bg-zinc-800'
              : 'bg-blue-600 text-white shadow-lg shadow-blue-950/30 hover:bg-blue-500'
          }`}
        >
          {mostrarFormulario ? 'Cancelar' : '+ Nuevo cliente'}
        </button>
      </header>

      {mostrarFormulario && (
        <section className="animate-toast-in rounded-2xl border border-zinc-800/70 bg-zinc-900/60 p-5 shadow-lg shadow-black/10">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-white">Nuevo cliente</h2>
              <p className="mt-0.5 text-[11px] text-zinc-500">Los campos con * son obligatorios.</p>
            </div>
            <span className="rounded-lg border border-blue-500/20 bg-blue-500/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-blue-300">
              Alta
            </span>
          </div>
          <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
            <Field label="Nombre" required>
              <input type="text" value={nombre} onChange={e => setNombre(e.target.value)} required className={inputClass} placeholder="Juan" />
            </Field>
            <Field label="Apellido" required>
              <input type="text" value={apellido} onChange={e => setApellido(e.target.value)} required className={inputClass} placeholder="Pérez" />
            </Field>
            <Field label="DNI" required>
              <input type="text" value={dni} onChange={e => setDni(e.target.value)} required className={inputClass} placeholder="30123456" />
            </Field>
            <Field label="Teléfono" required hint="Se normaliza automáticamente con +549.">
              <input type="tel" value={telefono} onChange={e => setTelefono(e.target.value)} required className={inputClass} placeholder="3815131873" />
            </Field>
            <Field label="Email">
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} className={inputClass} placeholder="cliente@email.com" />
            </Field>
            <Field label="Dirección">
              <input type="text" value={direccion} onChange={e => setDireccion(e.target.value)} className={inputClass} placeholder="Calle y número" />
            </Field>
            <div className="sm:col-span-2">
              <button
                type="submit"
                disabled={cargando}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-sm font-bold text-white shadow-lg shadow-blue-950/20 transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {cargando && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />}
                {cargando ? 'Guardando...' : 'Registrar cliente'}
              </button>
            </div>
          </form>
        </section>
      )}

      <div className="relative">
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
        </span>
        <input
          type="search"
          placeholder="Buscar por nombre, apellido, DNI o teléfono..."
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          className="w-full rounded-xl border border-zinc-800/80 bg-zinc-900/70 py-3 pl-11 pr-4 text-sm text-white placeholder-zinc-600 shadow-sm transition focus:border-blue-500/70 focus:outline-none focus:ring-2 focus:ring-blue-500/15"
        />
      </div>

      <section className="overflow-hidden rounded-2xl border border-zinc-800/70 bg-zinc-900/55 shadow-sm shadow-black/10">
        <div className="flex items-center justify-between border-b border-zinc-800/70 px-5 py-3.5">
          <h2 className="text-sm font-bold text-white">
            {busqueda ? 'Resultados' : 'Clientes registrados'}
          </h2>
          <span className="rounded-full border border-zinc-800 bg-zinc-950/60 px-2.5 py-1 text-[11px] font-semibold tabular-nums text-zinc-500">
            {clientesFiltrados.length}
          </span>
        </div>

        {cargandoLista ? (
          <SkeletonLista />
        ) : errorLista ? (
          <div className="px-5 py-10 text-center">
            <p className="text-sm font-semibold text-red-300">{errorLista}</p>
            <button
              type="button"
              onClick={() => void obtenerClientes()}
              className="mt-3 rounded-xl border border-zinc-700 px-4 py-2 text-sm font-semibold text-zinc-300 transition hover:bg-zinc-800"
            >
              Reintentar
            </button>
          </div>
        ) : clientesFiltrados.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-5 py-14 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full border border-zinc-800 bg-zinc-950 text-zinc-600">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
                <circle cx="9" cy="8" r="3" />
                <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M16 5.5a3 3 0 0 1 0 5.5M18.5 14.5c1.6.8 2.5 2.3 2.5 4.5" />
              </svg>
            </div>
            <p className="mt-3 text-sm font-semibold text-zinc-300">
              {busqueda ? 'No hay coincidencias' : 'Todavía no hay clientes'}
            </p>
            <p className="mt-1 max-w-xs text-xs text-zinc-600">
              {busqueda
                ? 'Probá con otro nombre, DNI o teléfono.'
                : 'Registrá el primer cliente para empezar a vender y financiar.'}
            </p>
            {!busqueda && (
              <button
                type="button"
                onClick={() => setMostrarFormulario(true)}
                className="mt-4 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-blue-500"
              >
                + Nuevo cliente
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-zinc-800/70 text-[11px] uppercase tracking-wider text-zinc-500">
                    <th className="px-5 py-3 font-semibold">Cliente</th>
                    <th className="px-5 py-3 font-semibold">DNI</th>
                    <th className="px-5 py-3 font-semibold">Teléfono</th>
                    <th className="px-5 py-3 font-semibold">Contacto</th>
                    <th className="px-5 py-3 text-right font-semibold">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {clientesFiltrados.map(c => (
                    <tr key={c.id} className="group transition hover:bg-white/2.5">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-zinc-700/70 bg-zinc-800/70 text-xs font-bold text-zinc-300">
                            {c.nombre.charAt(0)}
                            {c.apellido.charAt(0)}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-white">
                              {c.apellido}, {c.nombre}
                            </p>
                            <p className="truncate text-[11px] text-zinc-500">{c.direccion || 'Sin dirección'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 tabular-nums text-zinc-400">{c.dni}</td>
                      <td className="px-5 py-3.5 tabular-nums text-zinc-400">{c.telefono}</td>
                      <td className="px-5 py-3.5 text-xs text-zinc-500">{c.email || '—'}</td>
                      <td className="px-5 py-3.5 text-right">
                        <Link
                          href={`/admin/clientes/${c.id}`}
                          className="inline-flex items-center gap-1 whitespace-nowrap rounded-lg border border-zinc-800 px-3 py-1.5 text-[11px] font-semibold text-zinc-400 transition group-hover:border-blue-500/30 group-hover:text-blue-300"
                        >
                          Ver ficha
                          <span aria-hidden="true">→</span>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="divide-y divide-zinc-800/60 md:hidden">
              {clientesFiltrados.map(c => (
                <Link
                  key={c.id}
                  href={`/admin/clientes/${c.id}`}
                  className="block px-4 py-4 transition hover:bg-white/3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-zinc-700/70 bg-zinc-800/70 text-xs font-bold text-zinc-300">
                        {c.nombre.charAt(0)}
                        {c.apellido.charAt(0)}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-white">
                          {c.apellido}, {c.nombre}
                        </p>
                        <p className="mt-0.5 text-xs text-zinc-500">DNI {c.dni}</p>
                        <p className="text-xs tabular-nums text-zinc-500">{c.telefono}</p>
                        {c.email && <p className="mt-1 truncate text-[11px] text-zinc-600">{c.email}</p>}
                      </div>
                    </div>
                    <span className="shrink-0 text-xs font-semibold text-blue-400">→</span>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  )
}
