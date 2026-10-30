'use client'

import { useCallback, useEffect, useState } from 'react'
import { useToast } from '@/app/components/ToastProvider'

interface VarianteStock {
  id: string
  color: string
  stock: number
}

interface iPhone {
  id: string
  modelo: string
  variante?: string
  almacenamiento: string
  precioBase: number
  variantes: VarianteStock[]
  stockTotal?: number
}

interface ColorForm {
  id?: string
  color: string
  stock: string
}

const COLORES_COMUNES = [
  'Medianoche',
  'Blanco estelar',
  'Negro',
  'Blanco',
  'Azul',
  'Celeste',
  'Rojo',
  'Rosa',
  'Verde',
  'Amarillo',
  'Morado',
  'Titanio natural',
  'Titanio negro',
  'Titanio blanco',
  'Titanio desierto',
]

const inputClass =
  'w-full rounded-xl border border-zinc-700/80 bg-zinc-950/60 px-3.5 py-2.5 text-sm text-white placeholder-zinc-600 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20'

const formatARS = (valor: number) =>
  new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(valor)

const stockTotal = (phone: iPhone) =>
  phone.stockTotal ?? phone.variantes.reduce((acc, variante) => acc + variante.stock, 0)

function Field({
  label,
  required,
  children,
}: {
  label: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
        {label} {required && <span className="text-blue-400">*</span>}
      </label>
      {children}
    </div>
  )
}

function ColorRows({
  rows,
  onChange,
  minRows = 0,
  required = false,
}: {
  rows: ColorForm[]
  onChange: (rows: ColorForm[]) => void
  minRows?: number
  required?: boolean
}) {
  const actualizar = (index: number, cambios: Partial<ColorForm>) =>
    onChange(rows.map((row, i) => (i === index ? { ...row, ...cambios } : row)))

  return (
    <div className="space-y-2">
      {rows.map((row, index) => (
        <div key={index} className="flex items-center gap-2">
          <input
            required={required}
            list="colores-comunes"
            type="text"
            value={row.color}
            onChange={e => actualizar(index, { color: e.target.value })}
            placeholder="Color"
            className={inputClass}
          />
          <input
            required={required}
            type="number"
            min="0"
            value={row.stock}
            onChange={e => actualizar(index, { stock: e.target.value })}
            placeholder="Stock"
            className={`${inputClass} w-24 text-center`}
          />
          {rows.length > minRows && (
            <button
              type="button"
              onClick={() => onChange(rows.filter((_, i) => i !== index))}
              aria-label="Quitar color"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-zinc-800 text-zinc-500 transition hover:border-red-500/40 hover:text-red-300"
            >
              ✕
            </button>
          )}
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...rows, { color: '', stock: '1' }])}
        className="text-xs font-semibold text-blue-400 transition hover:text-blue-300"
      >
        + Agregar color
      </button>
    </div>
  )
}

export default function CatalogoIphones() {
  const toast = useToast()
  const [iphones, setIphones] = useState<iPhone[]>([])
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [busqueda, setBusqueda] = useState('')

  // edición
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [editPrecio, setEditPrecio] = useState('')
  const [editVariantes, setEditVariantes] = useState<ColorForm[]>([])

  // alta
  const [modelo, setModelo] = useState('')
  const [almacenamiento, setAlmacenamiento] = useState('')
  const [precioBase, setPrecioBase] = useState('')
  const [coloresForm, setColoresForm] = useState<ColorForm[]>([{ color: '', stock: '1' }])

  const cargarIphones = useCallback(async () => {
    setError('')
    try {
      const res = await fetch('/api/iphones', { cache: 'no-store' })
      if (!res.ok) throw new Error('No se pudieron cargar los equipos')
      setIphones(await res.json())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudieron cargar los equipos')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let activo = true
    fetch('/api/iphones', { cache: 'no-store' })
      .then(async res => {
        if (!res.ok) throw new Error('No se pudieron cargar los equipos')
        return res.json() as Promise<iPhone[]>
      })
      .then(data => {
        if (activo) setIphones(data)
      })
      .catch(e => {
        if (activo) setError(e instanceof Error ? e.message : 'No se pudieron cargar los equipos')
      })
      .finally(() => {
        if (activo) setLoading(false)
      })

    return () => {
      activo = false
    }
  }, [])

  const iphonesFiltrados = iphones.filter(phone => {
    const termino = busqueda.trim().toLowerCase()
    if (!termino) return true
    return (
      phone.modelo?.toLowerCase().includes(termino) ||
      phone.almacenamiento?.toLowerCase().includes(termino) ||
      phone.variantes.some(c => c.color.toLowerCase().includes(termino))
    )
  })

  const limpiarFormulario = () => {
    setModelo('')
    setAlmacenamiento('')
    setPrecioBase('')
    setColoresForm([{ color: '', stock: '1' }])
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const colores = coloresForm
      .map(c => ({ color: c.color.trim(), stock: parseInt(c.stock) || 0 }))
      .filter(c => c.color)

    if (colores.length === 0) {
      toast.error('Agregá al menos un color')
      return
    }
    const nombres = colores.map(c => c.color.toLowerCase())
    if (new Set(nombres).size !== nombres.length) {
      toast.error('Hay colores repetidos')
      return
    }

    setIsSaving(true)
    try {
      const res = await fetch('/api/iphones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          modelo,
          almacenamiento,
          precioBase: parseFloat(precioBase),
          variantes: colores,
        }),
      })
      const data = (await res.json()) as { error?: string }
      if (!res.ok) throw new Error(data.error || 'No se pudo guardar el equipo')
      toast.success('iPhone agregado al catálogo')
      limpiarFormulario()
      setShowForm(false)
      await cargarIphones()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo guardar el equipo')
    } finally {
      setIsSaving(false)
    }
  }

  const abrirEdicion = (phone: iPhone) => {
    setEditandoId(phone.id)
    setEditPrecio(String(phone.precioBase))
    setEditVariantes(
      phone.variantes.map(variante => ({
        id: variante.id,
        color: variante.color,
        stock: String(variante.stock),
      })),
    )
  }

  const guardarEdicion = async (phone: iPhone) => {
    const variantes = editVariantes
      .map(c => ({ id: c.id, color: c.color.trim(), stock: parseInt(c.stock) || 0 }))
      .filter(c => c.color)

    if (variantes.length === 0) {
      toast.error('Agregá al menos un color')
      return
    }
    const nombres = variantes.map(c => c.color.toLowerCase())
    if (new Set(nombres).size !== nombres.length) {
      toast.error('Hay colores repetidos')
      return
    }

    try {
      const res = await fetch('/api/iphones', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: phone.id,
          precioBase: Number(editPrecio),
          variantes,
        }),
      })
      const data = (await res.json()) as { error?: string }
      if (!res.ok) throw new Error(data.error || 'No se pudo guardar el cambio')
      setEditandoId(null)
      toast.success('Equipo actualizado')
      await cargarIphones()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo guardar el cambio')
    }
  }

  const grupos = [...iphonesFiltrados.reduce((mapa, phone) => {
    const key = `${phone.modelo}||${phone.almacenamiento}`
    const grupo = mapa.get(key) ?? {
      key,
      modelo: phone.modelo,
      almacenamiento: phone.almacenamiento,
      phones: [] as iPhone[],
      variantes: [] as VarianteStock[],
      stockTotal: 0,
    }
    grupo.phones.push(phone)
    grupo.variantes.push(...phone.variantes)
    grupo.stockTotal += stockTotal(phone)
    mapa.set(key, grupo)
    return mapa
  }, new Map<string, { key: string; modelo: string; almacenamiento: string; phones: iPhone[]; variantes: VarianteStock[]; stockTotal: number }>()).values()]

  return (
    <div>
      <datalist id="colores-comunes">
        {COLORES_COMUNES.map(c => (
          <option key={c} value={c} />
        ))}
      </datalist>

      <header className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-white">Catálogo de iPhones</h2>
          <p className="mt-0.5 text-sm text-zinc-500">
            {iphones.length} {iphones.length === 1 ? 'equipo disponible' : 'equipos disponibles'} para
            financiar.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm(actual => !actual)}
          className={`self-start rounded-xl px-4 py-2.5 text-sm font-bold transition ${
            showForm
              ? 'border border-zinc-700 bg-zinc-900 text-zinc-300 hover:bg-zinc-800'
              : 'bg-blue-600 text-white shadow-lg shadow-blue-950/30 hover:bg-blue-500'
          }`}
        >
          {showForm ? 'Cancelar' : '+ Agregar iPhone'}
        </button>
      </header>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="animate-toast-in mb-5 grid gap-4 rounded-2xl border border-zinc-800/70 bg-zinc-900/60 p-5 sm:grid-cols-2"
        >
          <Field label="Modelo" required>
            <input
              required
              type="text"
              value={modelo}
              onChange={e => setModelo(e.target.value)}
              placeholder="iPhone 13"
              className={inputClass}
            />
          </Field>
          <Field label="Almacenamiento" required>
            <input
              required
              type="text"
              value={almacenamiento}
              onChange={e => setAlmacenamiento(e.target.value)}
              placeholder="128GB"
              className={inputClass}
            />
          </Field>
          <Field label="Precio base (ARS)" required>
            <input
              required
              type="number"
              min="0"
              step="any"
              value={precioBase}
              onChange={e => setPrecioBase(e.target.value)}
              placeholder="0"
              className={inputClass}
            />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Colores y stock" required>
              <ColorRows rows={coloresForm} onChange={setColoresForm} minRows={1} required />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <button
              disabled={isSaving}
              type="submit"
              className="w-full rounded-xl bg-blue-600 py-3 text-sm font-bold text-white transition hover:bg-blue-500 disabled:opacity-50"
            >
              {isSaving ? 'Guardando...' : 'Guardar equipo'}
            </button>
            <p className="mt-2 text-xs text-zinc-600">
              Si ese modelo y almacenamiento ya existe, los colores se suman al equipo existente.
            </p>
          </div>
        </form>
      )}

      <div className="relative mb-5">
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
        </span>
        <input
          type="search"
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          placeholder="Buscar modelo, color o capacidad..."
          className="w-full rounded-xl border border-zinc-800/80 bg-zinc-900/70 py-3 pl-11 pr-4 text-sm text-white placeholder-zinc-600 transition focus:border-blue-500/70 focus:outline-none focus:ring-2 focus:ring-blue-500/15"
        />
      </div>

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="rounded-2xl border border-zinc-800/70 bg-zinc-900/50 p-5">
              <div className="skeleton h-5 w-36 rounded" />
              <div className="skeleton mt-2 h-3 w-24 rounded opacity-60" />
              <div className="skeleton mt-5 h-5 w-28 rounded" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-6 text-center">
          <p className="text-sm font-semibold text-red-300">{error}</p>
          <button
            type="button"
            onClick={() => void cargarIphones()}
            className="mt-3 rounded-xl border border-zinc-700 px-4 py-2 text-sm font-semibold text-zinc-300 transition hover:bg-zinc-800"
          >
            Reintentar
          </button>
        </div>
      ) : iphonesFiltrados.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-zinc-800/70 bg-zinc-900/50 px-5 py-14 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full border border-zinc-800 bg-zinc-950 text-zinc-600">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <rect x="7" y="2" width="10" height="20" rx="2" />
              <path d="M11 18h2" />
            </svg>
          </div>
          <p className="mt-3 text-sm font-semibold text-zinc-300">
            {busqueda ? 'No hay equipos que coincidan' : 'Catálogo vacío'}
          </p>
          <p className="mt-1 max-w-xs text-xs text-zinc-600">
            {busqueda
              ? 'Probá con otro modelo, color o capacidad.'
              : 'Agregá el primer iPhone para poder financiarlo.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {grupos.map(grupo => {
            const phoneEditando =
              grupo.phones.find(phone => phone.id === editandoId) ?? grupo.phones[0]

            return (
              <div
                key={grupo.key}
                className="rounded-2xl border border-zinc-800/70 bg-zinc-900/55 p-5 shadow-sm shadow-black/10 transition hover:border-zinc-700/80"
              >
                {editandoId === phoneEditando.id ? (
                  <div className="flex flex-col gap-3">
                    <div>
                      <h3 className="text-lg font-bold text-white">{phoneEditando.modelo}</h3>
                      <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                        {phoneEditando.almacenamiento}
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                        Precio ARS
                      </label>
                      <input
                        type="number"
                        value={editPrecio}
                        onChange={e => setEditPrecio(e.target.value)}
                        className={inputClass}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                        Variantes / Colores
                      </label>
                      <ColorRows
                        rows={editVariantes}
                        onChange={setEditVariantes}
                        minRows={1}
                        required
                      />
                    </div>

                    <div className="flex gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => void guardarEdicion(phoneEditando)}
                        className="flex-1 rounded-lg bg-blue-600 py-2 text-xs font-bold text-white transition hover:bg-blue-500"
                      >
                        Guardar
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditandoId(null)}
                        className="flex-1 rounded-lg bg-zinc-800 py-2 text-xs font-bold text-zinc-300 transition hover:bg-zinc-700"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <h3 className="truncate text-lg font-bold text-white">
                        {grupo.modelo} - {grupo.almacenamiento}
                      </h3>
                      <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                        {grupo.phones.length === 1
                          ? formatARS(Number(phoneEditando.precioBase))
                          : `${grupo.phones.length} publicaciones`}
                      </p>
                      <p className="mt-3 font-mono text-base font-bold text-emerald-300">
                        {formatARS(Number(phoneEditando.precioBase))}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {grupo.variantes.length === 0 ? (
                          <span className="text-xs text-zinc-600">Sin colores cargados</span>
                        ) : (
                          grupo.variantes.map(variante => (
                            <span
                              key={variante.id}
                              className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
                                variante.stock > 0
                                  ? 'border-zinc-700 bg-zinc-800/60 text-zinc-200'
                                  : 'border-red-500/20 bg-red-500/10 text-red-300'
                              }`}
                            >
                              {variante.color} · {variante.stock}
                            </span>
                          ))
                        )}
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-2">
                      <span
                        className={`rounded-full border px-2.5 py-1 text-[11px] font-bold ${
                          grupo.stockTotal > 0
                            ? 'border-blue-500/20 bg-blue-500/10 text-blue-300'
                            : 'border-red-500/20 bg-red-500/10 text-red-300'
                        }`}
                      >
                        {grupo.stockTotal > 0 ? `Stock: ${grupo.stockTotal}` : 'Agotado'}
                      </span>
                      {grupo.phones.map(phone => (
                        <button
                          key={phone.id}
                          type="button"
                          onClick={() => abrirEdicion(phone)}
                          className="rounded-lg border border-zinc-800 px-2.5 py-1 text-[11px] font-semibold text-zinc-400 transition hover:border-zinc-600 hover:text-white"
                        >
                          {grupo.phones.length > 1 && phone.variante
                            ? `Editar ${phone.variante}`
                            : 'Editar'}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}