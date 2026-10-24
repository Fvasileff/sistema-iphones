'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ESTADOS_REPARACION,
  ETIQUETAS_ESTADO_REPARACION,
  type EstadoReparacion,
} from '@/lib/constantes'
import { formatARS } from '@/lib/format'
import { formatFechaAR } from '@/lib/fechas'

type Monto = number | string
type MetodoPago = 'efectivo' | 'transferencia' | 'tarjeta'

interface Cliente {
  id: string
  nombre: string
  apellido: string
  dni: string
  telefono: string
}

interface Pago {
  monto: Monto
  anulada?: boolean
}

interface Reparacion {
  id: string
  codigoOperacion: string
  equipo: string
  marca: string | null
  modelo: string | null
  imei: string | null
  falla: string
  estadoFisico: string | null
  presupuesto: Monto
  montoFinal: Monto | null
  estado: string
  fechaIngreso: string
  fechaPromesa: string | null
  anulada: boolean
  cliente: Cliente
  pagos: Pago[]
}

const COLORES_COLUMNA: Record<EstadoReparacion, string> = {
  recibido: 'border-blue-500/30',
  en_diagnostico: 'border-amber-500/30',
  esperando_repuesto: 'border-orange-500/30',
  listo_para_retirar: 'border-green-500/30',
  entregado: 'border-zinc-700',
}

const PUNTOS_COLUMNA: Record<EstadoReparacion, string> = {
  recibido: 'bg-blue-400',
  en_diagnostico: 'bg-amber-400',
  esperando_repuesto: 'bg-orange-400',
  listo_para_retirar: 'bg-green-400',
  entregado: 'bg-zinc-500',
}

const inputClass =
  'w-full px-4 py-3 rounded-xl border border-zinc-700 bg-zinc-900 text-white text-base placeholder-zinc-600 focus:outline-none focus:border-blue-500 transition-colors'

async function pedir<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: 'no-store' })
  const data = (await res.json()) as T & { error?: string }
  if (!res.ok) throw new Error(data.error || 'No se pudo completar la solicitud')
  return data
}

async function solicitar<T>(url: string, method: 'POST' | 'PATCH', body: unknown): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = (await res.json()) as T & { error?: string }
  if (!res.ok) throw new Error(data.error || 'No se pudo completar la solicitud')
  return data
}

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
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
        {label} {required && <span className="text-blue-400">*</span>}
      </label>
      {children}
    </div>
  )
}

function saldoReparacion(reparacion: Reparacion) {
  const objetivo = Number(reparacion.montoFinal ?? reparacion.presupuesto)
  const pagado = reparacion.pagos.reduce((acc, pago) => acc + Number(pago.monto), 0)
  return Math.max(objetivo - pagado, 0)
}

function FormNuevaReparacion({
  clientes,
  onClose,
  onCreada,
}: {
  clientes: Cliente[]
  onClose: () => void
  onCreada: (reparacionId: string) => void
}) {
  const [clienteId, setClienteId] = useState('')
  const [marca, setMarca] = useState('Apple')
  const [modelo, setModelo] = useState('')
  const [imei, setImei] = useState('')
  const [claveEquipo, setClaveEquipo] = useState('')
  const [color, setColor] = useState('')
  const [almacenamiento, setAlmacenamiento] = useState('')
  const [estadoFisico, setEstadoFisico] = useState('')
  const [accesoriosRecibidos, setAccesoriosRecibidos] = useState('')
  const [falla, setFalla] = useState('')
  const [diagnostico, setDiagnostico] = useState('')
  const [presupuesto, setPresupuesto] = useState('0')
  const [sena, setSena] = useState('0')
  const [metodoPago, setMetodoPago] = useState<MetodoPago>('efectivo')
  const [fechaPromesa, setFechaPromesa] = useState('')
  const [observaciones, setObservaciones] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!clienteId) {
      setError('Elegí un cliente.')
      return
    }
    if (!modelo.trim()) {
      setError('Ingresá el modelo del equipo.')
      return
    }

    setGuardando(true)
    setError('')
    try {
      const equipo = `${marca} ${modelo}`.trim()
      const reparacion = await solicitar<{ id: string }>('/api/reparaciones', 'POST', {
        clienteId,
        equipo,
        marca,
        modelo,
        imei,
        claveEquipo,
        color,
        almacenamiento,
        estadoFisico,
        accesoriosRecibidos,
        falla,
        diagnostico,
        presupuesto: Number(presupuesto) || 0,
        sena: Number(sena) || 0,
        metodoPago,
        fechaPromesa: fechaPromesa || null,
        observaciones,
      })
      onCreada(reparacion.id)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo registrar el ingreso')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-t-2xl sm:rounded-2xl p-5 sm:p-6 w-full sm:max-w-3xl shadow-2xl max-h-[94vh] overflow-y-auto">
        <div className="flex items-center justify-between gap-3 mb-5">
          <div>
            <h2 className="text-white font-bold text-lg">Nuevo ingreso al taller</h2>
            <p className="text-zinc-500 text-xs mt-0.5">
              Cargá los datos del equipo, la falla y la seña si corresponde.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-white p-1.5 rounded-lg hover:bg-zinc-800 transition"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-xl mb-4 text-sm font-semibold bg-red-500/10 text-red-400 border border-red-500/20">
            ❌ {error}
          </div>
        )}

        {clientes.length === 0 && (
          <div className="p-3 rounded-xl mb-4 text-sm bg-amber-500/10 text-amber-400 border border-amber-500/20">
            No hay clientes cargados. Creá uno desde <strong>Clientes</strong> antes de registrar el
            ingreso.
          </div>
        )}

        <form onSubmit={guardar} className="space-y-5">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 space-y-4">
            <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Cliente</p>
            <Field label="Cliente" required>
              <select
                value={clienteId}
                onChange={e => setClienteId(e.target.value)}
                className={inputClass}
                required
              >
                <option value="">Elegir cliente...</option>
                {clientes.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.apellido}, {c.nombre} — {c.dni}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 space-y-4">
            <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Equipo</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Marca" required>
                <input
                  type="text"
                  value={marca}
                  onChange={e => setMarca(e.target.value)}
                  className={inputClass}
                  placeholder="Apple"
                  maxLength={60}
                  required
                />
              </Field>
              <Field label="Modelo" required>
                <input
                  type="text"
                  value={modelo}
                  onChange={e => setModelo(e.target.value)}
                  className={inputClass}
                  placeholder="iPhone 13"
                  maxLength={80}
                  required
                />
              </Field>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="IMEI o serie">
                <input
                  type="text"
                  value={imei}
                  onChange={e => setImei(e.target.value)}
                  className={inputClass}
                  placeholder="Opcional"
                  maxLength={60}
                />
              </Field>
              <Field label="Contraseña o patrón">
                <input
                  type="text"
                  value={claveEquipo}
                  onChange={e => setClaveEquipo(e.target.value)}
                  className={inputClass}
                  placeholder="Para pruebas del equipo"
                  maxLength={120}
                />
              </Field>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Color">
                <input
                  type="text"
                  value={color}
                  onChange={e => setColor(e.target.value)}
                  className={inputClass}
                  placeholder="Opcional"
                  maxLength={40}
                />
              </Field>
              <Field label="Almacenamiento">
                <input
                  type="text"
                  value={almacenamiento}
                  onChange={e => setAlmacenamiento(e.target.value)}
                  className={inputClass}
                  placeholder="Ej: 128 GB"
                  maxLength={40}
                />
              </Field>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Estado estético">
                <textarea
                  value={estadoFisico}
                  onChange={e => setEstadoFisico(e.target.value)}
                  className={`${inputClass} min-h-20 resize-y`}
                  placeholder="Rayas, golpes, pantalla rota..."
                  maxLength={300}
                />
              </Field>
              <Field label="Accesorios recibidos">
                <textarea
                  value={accesoriosRecibidos}
                  onChange={e => setAccesoriosRecibidos(e.target.value)}
                  className={`${inputClass} min-h-20 resize-y`}
                  placeholder="Funda, cargador, chip..."
                  maxLength={300}
                />
              </Field>
            </div>
          </div>

          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 space-y-4">
            <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Falla y presupuesto</p>
            <Field label="Falla reportada" required>
              <textarea
                value={falla}
                onChange={e => setFalla(e.target.value)}
                className={`${inputClass} min-h-24 resize-y`}
                placeholder="Qué trae el cliente y qué falla presenta"
                maxLength={1000}
                required
              />
            </Field>
            <Field label="Diagnóstico inicial">
              <textarea
                value={diagnostico}
                onChange={e => setDiagnostico(e.target.value)}
                className={`${inputClass} min-h-20 resize-y`}
                placeholder="Opcional"
                maxLength={1000}
              />
            </Field>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Presupuesto estimado">
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={presupuesto}
                  onChange={e => setPresupuesto(e.target.value)}
                  className={inputClass}
                  placeholder="0"
                />
              </Field>
              <Field label="Fecha prometida">
                <input
                  type="date"
                  value={fechaPromesa}
                  onChange={e => setFechaPromesa(e.target.value)}
                  className={`${inputClass} [&::-webkit-calendar-picker-indicator]:opacity-50 [&::-webkit-calendar-picker-indicator]:invert`}
                  style={{ colorScheme: 'dark' }}
                />
              </Field>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Seña">
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={sena}
                  onChange={e => setSena(e.target.value)}
                  className={inputClass}
                  placeholder="0"
                />
              </Field>
              <Field label="Método de la seña">
                <select
                  value={metodoPago}
                  onChange={e => setMetodoPago(e.target.value as MetodoPago)}
                  className={inputClass}
                >
                  <option value="efectivo">Efectivo</option>
                  <option value="transferencia">Transferencia</option>
                  <option value="tarjeta">Tarjeta</option>
                </select>
              </Field>
            </div>
            <Field label="Observaciones">
              <textarea
                value={observaciones}
                onChange={e => setObservaciones(e.target.value)}
                className={`${inputClass} min-h-20 resize-y`}
                placeholder="Opcional"
                maxLength={1000}
              />
            </Field>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-semibold transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={guardando || clientes.length === 0}
              className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-bold transition"
            >
              {guardando ? 'Registrando...' : 'Registrar ingreso'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function ReparacionesPage() {
  const router = useRouter()
  const [reparaciones, setReparaciones] = useState<Reparacion[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [aviso, setAviso] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [modalNueva, setModalNueva] = useState(false)
  const [arrastrandoId, setArrastrandoId] = useState<string | null>(null)
  const [columnaActiva, setColumnaActiva] = useState<string | null>(null)

  useEffect(() => {
    let activo = true

    Promise.all([pedir<Reparacion[]>('/api/reparaciones'), pedir<Cliente[]>('/api/clientes')])
      .then(([listaReparaciones, listaClientes]) => {
        if (!activo) return
        setReparaciones(listaReparaciones)
        setClientes(listaClientes)
      })
      .catch(e => {
        if (activo) setError(e instanceof Error ? e.message : 'No se pudieron cargar las reparaciones')
      })
      .finally(() => {
        if (activo) setCargando(false)
      })

    return () => {
      activo = false
    }
  }, [])

  const refrescar = useCallback(async () => {
    try {
      const lista = await pedir<Reparacion[]>('/api/reparaciones')
      setReparaciones(lista)
      setError('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudieron actualizar las reparaciones')
    }
  }, [])

  const mover = async (reparacionId: string, estado: EstadoReparacion) => {
    const reparacion = reparaciones.find(r => r.id === reparacionId)
    if (!reparacion || reparacion.estado === estado) return

    setError('')
    setAviso('')
    setReparaciones(prev =>
      prev.map(r => (r.id === reparacionId ? { ...r, estado } : r)),
    )

    try {
      await solicitar(`/api/reparaciones/${reparacionId}`, 'PATCH', { estado })
      setAviso(
        `${reparacion.codigoOperacion} pasó a ${ETIQUETAS_ESTADO_REPARACION[estado]}.`,
      )
      await refrescar()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cambiar el estado')
      await refrescar()
    }
  }

  const texto = busqueda.trim().toLowerCase()
  const visibles = reparaciones.filter(reparacion => {
    if (reparacion.anulada) return false
    if (!texto) return true
    return (
      reparacion.codigoOperacion.toLowerCase().includes(texto) ||
      reparacion.cliente.nombre.toLowerCase().includes(texto) ||
      reparacion.cliente.apellido.toLowerCase().includes(texto) ||
      reparacion.cliente.dni.toLowerCase().includes(texto) ||
      reparacion.equipo.toLowerCase().includes(texto) ||
      (reparacion.imei ?? '').toLowerCase().includes(texto)
    )
  })

  const alCrear = async (reparacionId: string) => {
    setModalNueva(false)
    setAviso('Ingreso registrado.')
    await refrescar()
    router.push(`/admin/reparaciones/${reparacionId}`)
  }

  return (
    <div className="p-4 md:p-8">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 mb-5">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white">Reparaciones</h1>
          <p className="text-zinc-500 text-sm mt-1">
            Arrastrá las tarjetas entre columnas o usá las flechas para cambiar el estado.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          <input
            type="text"
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            placeholder="🔍 Buscar cliente, equipo, IMEI o código..."
            className="w-full sm:w-80 px-4 py-2.5 rounded-xl border border-zinc-800 bg-zinc-900 text-white text-sm placeholder-zinc-500 focus:outline-none focus:border-zinc-600 transition-colors"
          />
          <button
            onClick={() => setModalNueva(true)}
            className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold transition shrink-0"
          >
            + Nuevo ingreso
          </button>
        </div>
      </div>

      {aviso && (
        <div className="p-3 rounded-xl mb-4 text-sm font-semibold bg-green-500/10 text-green-400 border border-green-500/20">
          ✅ {aviso}
        </div>
      )}

      {error && (
        <div className="p-3 rounded-xl mb-4 text-sm font-semibold bg-red-500/10 text-red-400 border border-red-500/20">
          ❌ {error}
        </div>
      )}

      {cargando ? (
        <p className="text-zinc-500 text-center py-20 text-sm">Cargando reparaciones...</p>
      ) : (
        <div className="overflow-x-auto pb-3">
          <div className="flex gap-4 min-w-max">
            {ESTADOS_REPARACION.map(estado => {
              const delEstado = visibles.filter(r => r.estado === estado)
              const activa = columnaActiva === estado
              return (
                <section
                  key={estado}
                  onDragOver={e => {
                    e.preventDefault()
                    if (columnaActiva !== estado) setColumnaActiva(estado)
                  }}
                  onDragLeave={e => {
                    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
                      setColumnaActiva(null)
                    }
                  }}
                  onDrop={e => {
                    e.preventDefault()
                    const id = e.dataTransfer.getData('text/plain') || arrastrandoId
                    setColumnaActiva(null)
                    setArrastrandoId(null)
                    if (id) mover(id, estado)
                  }}
                  className={`w-72 sm:w-80 shrink-0 rounded-2xl border bg-zinc-950/40 p-3 transition ${
                    activa ? 'border-blue-500/60 bg-blue-500/5' : COLORES_COLUMNA[estado]
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 px-1 mb-3">
                    <h2 className="text-white text-sm font-bold flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${PUNTOS_COLUMNA[estado]}`} />
                      {ETIQUETAS_ESTADO_REPARACION[estado]}
                    </h2>
                    <span className="text-[10px] font-bold bg-zinc-900 border border-zinc-800 text-zinc-400 rounded-full px-2 py-0.5">
                      {delEstado.length}
                    </span>
                  </div>

                  <div className="space-y-2 min-h-24">
                    {delEstado.length === 0 ? (
                      <p className="text-zinc-700 text-xs text-center py-8 border border-dashed border-zinc-800 rounded-xl">
                        Sin reparaciones
                      </p>
                    ) : (
                      delEstado.map(reparacion => {
                        const indice = ESTADOS_REPARACION.indexOf(estado)
                        const anterior = indice > 0 ? ESTADOS_REPARACION[indice - 1] : null
                        const siguiente =
                          indice < ESTADOS_REPARACION.length - 1
                            ? ESTADOS_REPARACION[indice + 1]
                            : null
                        const saldo = saldoReparacion(reparacion)
                        return (
                          <article
                            key={reparacion.id}
                            draggable
                            onDragStart={e => {
                              setArrastrandoId(reparacion.id)
                              e.dataTransfer.effectAllowed = 'move'
                              e.dataTransfer.setData('text/plain', reparacion.id)
                            }}
                            onDragEnd={() => {
                              setArrastrandoId(null)
                              setColumnaActiva(null)
                            }}
                            className={`bg-zinc-900 border border-zinc-800 rounded-xl p-3 cursor-grab active:cursor-grabbing transition ${
                              arrastrandoId === reparacion.id ? 'opacity-50' : 'hover:border-zinc-600'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[10px] font-bold text-zinc-400 bg-zinc-950 border border-zinc-800 px-2 py-0.5 rounded-md">
                                {reparacion.codigoOperacion}
                              </span>
                              <span className="text-[10px] text-zinc-600">
                                {formatFechaAR(reparacion.fechaIngreso)}
                              </span>
                            </div>
                            <p className="text-white font-semibold text-sm mt-1.5 truncate">
                              {reparacion.cliente.apellido}, {reparacion.cliente.nombre}
                            </p>
                            <p className="text-zinc-300 text-xs truncate">{reparacion.equipo}</p>
                            <p className="text-zinc-500 text-[11px] mt-0.5 line-clamp-2">
                              {reparacion.falla}
                            </p>
                            <div className="flex items-center justify-between gap-2 mt-2">
                              <span className="text-zinc-500 text-[10px]">
                                {reparacion.fechaPromesa
                                  ? `Promesa: ${formatFechaAR(reparacion.fechaPromesa)}`
                                  : 'Sin fecha promesa'}
                              </span>
                              {saldo > 0 && (
                                <span className="text-amber-400 text-[10px] font-bold tabular-nums">
                                  Saldo {formatARS(saldo)}
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-1.5 mt-2.5 pt-2 border-t border-zinc-800">
                              <button
                                type="button"
                                onClick={() => anterior && mover(reparacion.id, anterior)}
                                disabled={!anterior}
                                className="w-8 h-8 rounded-lg bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30 text-zinc-300 text-sm font-bold transition"
                                aria-label="Mover a la columna anterior"
                              >
                                ←
                              </button>
                              <button
                                type="button"
                                onClick={() => siguiente && mover(reparacion.id, siguiente)}
                                disabled={!siguiente}
                                className="w-8 h-8 rounded-lg bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30 text-zinc-300 text-sm font-bold transition"
                                aria-label="Mover a la columna siguiente"
                              >
                                →
                              </button>
                              <Link
                                href={`/admin/reparaciones/${reparacion.id}`}
                                className="flex-1 text-center px-2 py-1.5 rounded-lg bg-blue-600/15 hover:bg-blue-600/25 border border-blue-500/25 text-blue-400 text-[11px] font-bold transition"
                              >
                                Abrir ficha
                              </Link>
                            </div>
                          </article>
                        )
                      })
                    )}
                  </div>
                </section>
              )
            })}
          </div>
        </div>
      )}

      {modalNueva && (
        <FormNuevaReparacion
          clientes={clientes}
          onClose={() => setModalNueva(false)}
          onCreada={alCrear}
        />
      )}
    </div>
  )
}
