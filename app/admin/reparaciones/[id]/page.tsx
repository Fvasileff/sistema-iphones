'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import {
  ESTADOS_REPARACION,
  ETIQUETAS_ESTADO_REPARACION,
  type EstadoReparacion,
} from '@/lib/constantes'
import { formatARS } from '@/lib/format'
import { formatFechaAR, formatFechaHoraAR } from '@/lib/fechas'
import TicketModal, { type TicketData } from '@/app/components/TicketModal'

type Monto = number | string
type MetodoPago = 'efectivo' | 'transferencia' | 'tarjeta'

interface Cliente {
  id: string
  nombre: string
  apellido: string
  dni: string
  telefono: string
}

interface Historial {
  id: string
  estadoAnterior: string | null
  estadoNuevo: string
  nota: string | null
  fecha: string
}

interface Repuesto {
  id: string
  cantidad: number
  precioUnitario: Monto
  subtotal: Monto
  anulada: boolean
  motivoAnulacion: string | null
  fechaAnulacion: string | null
  producto: {
    id: string
    nombre: string
    sku: string | null
    categoria: string
  }
}

interface Pago {
  id: string
  codigoOperacion: string
  monto: Monto
  metodoPago: string
  concepto: string | null
  fecha: string
  observaciones: string | null
  anulada: boolean
  motivoAnulacion: string | null
  fechaAnulacion: string | null
}

interface Producto {
  id: string
  nombre: string
  categoria: string
  sku: string | null
  precioVenta: Monto
  stock: number
  activo: boolean
}

interface Reparacion {
  id: string
  codigoOperacion: string
  clienteId: string
  equipo: string
  marca: string | null
  modelo: string | null
  claveEquipo: string | null
  imei: string | null
  color: string | null
  almacenamiento: string | null
  accesoriosRecibidos: string | null
  estadoFisico: string | null
  falla: string
  diagnostico: string | null
  presupuesto: Monto
  montoFinal: Monto | null
  estado: string
  fechaIngreso: string
  fechaPromesa: string | null
  fechaEntrega: string | null
  observaciones: string | null
  anulada: boolean
  motivoAnulacion: string | null
  fechaAnulacion: string | null
  cliente: Cliente
  historial: Historial[]
  repuestos: Repuesto[]
  pagos: Pago[]
}

const ETIQUETAS_METODO: Record<string, string> = {
  efectivo: 'Efectivo',
  transferencia: 'Transferencia',
  tarjeta: 'Tarjeta',
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

function DatoEquipo({ etiqueta, valor }: { etiqueta: string; valor: string | null }) {
  if (!valor) return null
  return (
    <div>
      <p className="text-zinc-500 text-[10px] uppercase tracking-wider">{etiqueta}</p>
      <p className="text-zinc-200 text-sm break-words">{valor}</p>
    </div>
  )
}

function saldoActual(reparacion: Reparacion) {
  const objetivo = Number(reparacion.montoFinal ?? reparacion.presupuesto)
  const pagado = reparacion.pagos.reduce((acc, pago) => acc + Number(pago.monto), 0)
  return { objetivo, pagado, saldo: Math.max(objetivo - pagado, 0) }
}

function ModalPago({
  reparacion,
  onClose,
  onCobrado,
}: {
  reparacion: Reparacion
  onClose: () => void
  onCobrado: (ticket: TicketData) => void
}) {
  const { saldo } = saldoActual(reparacion)
  const [monto, setMonto] = useState(saldo > 0 ? String(saldo) : '')
  const [metodoPago, setMetodoPago] = useState<MetodoPago>('efectivo')
  const [concepto, setConcepto] = useState('')
  const [observaciones, setObservaciones] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')

  const cobrar = async (e: React.FormEvent) => {
    e.preventDefault()
    setEnviando(true)
    setError('')
    try {
      const pago = await solicitar<{
        codigoOperacion: string
        monto: Monto
        metodoPago: string
        fecha: string
      }>(`/api/reparaciones/${reparacion.id}/pagos`, 'POST', {
        monto: Number(monto),
        metodoPago,
        concepto,
        observaciones,
      })

      const restante = Math.max(saldo - Number(pago.monto), 0)

      onCobrado({
        titulo: 'Cobro de reparación',
        codigo: pago.codigoOperacion,
        fecha: formatFechaHoraAR(pago.fecha),
        cliente: `${reparacion.cliente.apellido}, ${reparacion.cliente.nombre}`,
        metodo: ETIQUETAS_METODO[metodoPago] ?? metodoPago,
        items: [
          {
            descripcion: `Reparación ${reparacion.codigoOperacion} · ${reparacion.equipo}`,
            subtotal: pago.monto,
          },
        ],
        total: pago.monto,
        extra: [
          concepto ? `Concepto: ${concepto}` : '',
          `Saldo restante: ${formatARS(restante)}`,
          observaciones ? `Obs: ${observaciones}` : '',
        ].filter(Boolean),
      })
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo registrar el pago')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/65 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-t-2xl sm:rounded-2xl p-5 sm:p-6 w-full sm:max-w-md shadow-2xl">
        <div className="flex items-center justify-between gap-3 mb-1">
          <h2 className="text-white font-bold text-lg">Registrar pago</h2>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-white p-1.5 rounded-lg hover:bg-zinc-800 transition"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>
        <p className="text-zinc-400 text-sm mb-4">
          Seña, pago parcial o saldo final. Se registra en caja automáticamente.
        </p>

        <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3 mb-4 flex items-center justify-between text-sm">
          <span className="text-zinc-400">Saldo actual</span>
          <span className="text-amber-400 font-bold tabular-nums">{formatARS(saldo)}</span>
        </div>

        <form onSubmit={cobrar} className="space-y-4">
          {error && (
            <div className="p-3 rounded-xl text-sm font-semibold bg-red-500/10 text-red-400 border border-red-500/20">
              ❌ {error}
            </div>
          )}

          <Field label="Monto" required>
            <input
              type="number"
              min="0.01"
              step="any"
              value={monto}
              onChange={e => setMonto(e.target.value)}
              className={inputClass}
              placeholder="0"
              required
            />
          </Field>

          <Field label="Método de pago" required>
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

          <Field label="Concepto">
            <input
              type="text"
              value={concepto}
              onChange={e => setConcepto(e.target.value)}
              className={inputClass}
              placeholder="Ej: seña, pago parcial, saldo"
              maxLength={120}
            />
          </Field>

          <Field label="Observaciones">
            <input
              type="text"
              value={observaciones}
              onChange={e => setObservaciones(e.target.value)}
              className={inputClass}
              placeholder="Opcional"
              maxLength={300}
            />
          </Field>

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-semibold transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={enviando}
              className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-bold transition"
            >
              {enviando ? 'Registrando...' : 'Cobrar y generar ticket'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function ModalRepuesto({
  reparacionId,
  productos,
  onClose,
  onAgregado,
}: {
  reparacionId: string
  productos: Producto[]
  onClose: () => void
  onAgregado: () => void
}) {
  const [productoId, setProductoId] = useState('')
  const [cantidad, setCantidad] = useState('1')
  const [precioUnitario, setPrecioUnitario] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')

  const disponibles = productos.filter(p => p.activo && p.stock > 0)
  const producto = disponibles.find(p => p.id === productoId)

  const agregar = async (e: React.FormEvent) => {
    e.preventDefault()
    setEnviando(true)
    setError('')
    try {
      await solicitar(`/api/reparaciones/${reparacionId}/repuestos`, 'POST', {
        productoId,
        cantidad: Number(cantidad),
        precioUnitario: precioUnitario === '' ? undefined : Number(precioUnitario),
      })
      onAgregado()
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo agregar el repuesto')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/65 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-t-2xl sm:rounded-2xl p-5 sm:p-6 w-full sm:max-w-md shadow-2xl">
        <div className="flex items-center justify-between gap-3 mb-1">
          <h2 className="text-white font-bold text-lg">Agregar repuesto</h2>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-white p-1.5 rounded-lg hover:bg-zinc-800 transition"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>
        <p className="text-zinc-500 text-xs mb-4">
          Descuenta stock del inventario y queda registrado en la reparación.
        </p>

        <form onSubmit={agregar} className="space-y-4">
          {error && (
            <div className="p-3 rounded-xl text-sm font-semibold bg-red-500/10 text-red-400 border border-red-500/20">
              ❌ {error}
            </div>
          )}

          {disponibles.length === 0 ? (
            <p className="text-amber-400 text-sm bg-amber-500/10 border border-amber-500/20 rounded-xl p-3">
              No hay repuestos o productos con stock disponible.
            </p>
          ) : (
            <>
              <Field label="Repuesto o producto" required>
                <select
                  value={productoId}
                  onChange={e => {
                    setProductoId(e.target.value)
                    const encontrado = disponibles.find(p => p.id === e.target.value)
                    setPrecioUnitario(encontrado ? String(encontrado.precioVenta) : '')
                  }}
                  className={inputClass}
                  required
                >
                  <option value="">Elegir...</option>
                  {disponibles.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.nombre} — stock {p.stock}
                    </option>
                  ))}
                </select>
              </Field>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Cantidad" required>
                  <input
                    type="number"
                    min="1"
                    max={producto?.stock ?? undefined}
                    step="1"
                    value={cantidad}
                    onChange={e => setCantidad(e.target.value)}
                    className={inputClass}
                    required
                  />
                </Field>
                <Field label="Precio unitario">
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={precioUnitario}
                    onChange={e => setPrecioUnitario(e.target.value)}
                    className={inputClass}
                    placeholder="Precio del producto"
                  />
                </Field>
              </div>
            </>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-semibold transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={enviando || !productoId}
              className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-bold transition"
            >
              {enviando ? 'Agregando...' : 'Agregar repuesto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function ReparacionDetallePage() {
  const params = useParams<{ id: string }>()
  const id = params.id

  const [reparacion, setReparacion] = useState<Reparacion | null>(null)
  const [productos, setProductos] = useState<Producto[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [aviso, setAviso] = useState('')
  const [ticket, setTicket] = useState<TicketData | null>(null)

  const [estadoForm, setEstadoForm] = useState<EstadoReparacion>('recibido')
  const [notaEstado, setNotaEstado] = useState('')
  const [presupuestoForm, setPresupuestoForm] = useState('0')
  const [montoFinalForm, setMontoFinalForm] = useState('')
  const [guardandoEstado, setGuardandoEstado] = useState(false)
  const [guardandoMontos, setGuardandoMontos] = useState(false)
  const [modalPago, setModalPago] = useState(false)
  const [modalRepuesto, setModalRepuesto] = useState(false)

  useEffect(() => {
    if (!id) return
    let activo = true

    Promise.all([
      pedir<Reparacion>(`/api/reparaciones/${id}`),
      pedir<Producto[]>('/api/productos'),
    ])
      .then(([detalle, listaProductos]) => {
        if (!activo) return
        setReparacion(detalle)
        setProductos(listaProductos)
        setEstadoForm(detalle.estado as EstadoReparacion)
        setPresupuestoForm(String(detalle.presupuesto))
        setMontoFinalForm(detalle.montoFinal === null ? '' : String(detalle.montoFinal))
      })
      .catch(e => {
        if (activo) setError(e instanceof Error ? e.message : 'No se pudo cargar la reparación')
      })
      .finally(() => {
        if (activo) setCargando(false)
      })

    return () => {
      activo = false
    }
  }, [id])

  const refrescar = useCallback(async () => {
    try {
      const [detalle, listaProductos] = await Promise.all([
        pedir<Reparacion>(`/api/reparaciones/${id}`),
        pedir<Producto[]>('/api/productos'),
      ])
      setReparacion(detalle)
      setProductos(listaProductos)
      setPresupuestoForm(String(detalle.presupuesto))
      setMontoFinalForm(detalle.montoFinal === null ? '' : String(detalle.montoFinal))
      setError('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo actualizar la reparación')
    }
  }, [id])

  const actualizarEstado = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!reparacion || estadoForm === reparacion.estado) return
    setGuardandoEstado(true)
    setError('')
    setAviso('')
    try {
      await solicitar(`/api/reparaciones/${reparacion.id}`, 'PATCH', {
        estado: estadoForm,
        nota: notaEstado || undefined,
      })
      setNotaEstado('')
      setAviso('Estado actualizado.')
      await refrescar()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo actualizar el estado')
    } finally {
      setGuardandoEstado(false)
    }
  }

  const actualizarMontos = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!reparacion) return
    setGuardandoMontos(true)
    setError('')
    setAviso('')
    try {
      const payload: { presupuesto?: number; montoFinal?: number | null } = {}
      const nuevoPresupuesto = Number(presupuestoForm) || 0
      if (nuevoPresupuesto !== Number(reparacion.presupuesto)) {
        payload.presupuesto = nuevoPresupuesto
      }

      const nuevoMontoFinal = montoFinalForm.trim() === '' ? null : Number(montoFinalForm)
      const montoFinalActual =
        reparacion.montoFinal === null ? null : Number(reparacion.montoFinal)
      if (nuevoMontoFinal !== montoFinalActual) {
        payload.montoFinal = nuevoMontoFinal
      }

      if (Object.keys(payload).length === 0) {
        setAviso('No hay cambios de montos para guardar.')
        return
      }

      await solicitar(`/api/reparaciones/${reparacion.id}`, 'PATCH', payload)
      setAviso('Montos actualizados.')
      await refrescar()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudieron actualizar los montos')
    } finally {
      setGuardandoMontos(false)
    }
  }

  const anularPago = async (pago: Pago) => {
    if (!reparacion) return
    const motivo = window.prompt(`Motivo para anular el pago ${pago.codigoOperacion}:`)
    if (!motivo || motivo.trim().length < 3) return
    setError('')
    setAviso('')
    try {
      await solicitar(
        `/api/reparaciones/${reparacion.id}/pagos/${pago.id}/anular`,
        'POST',
        { motivo: motivo.trim() },
      )
      setAviso('Pago anulado.')
      await refrescar()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo anular el pago')
    }
  }

  const anularRepuesto = async (repuesto: Repuesto) => {
    if (!reparacion) return
    const motivo = window.prompt(`Motivo para anular el repuesto ${repuesto.producto.nombre}:`)
    if (!motivo || motivo.trim().length < 3) return
    setError('')
    setAviso('')
    try {
      await solicitar(
        `/api/reparaciones/${reparacion.id}/repuestos/${repuesto.id}/anular`,
        'POST',
        { motivo: motivo.trim() },
      )
      setAviso('Repuesto anulado y stock restituido.')
      await refrescar()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo anular el repuesto')
    }
  }

  const anularReparacion = async () => {
    if (!reparacion) return
    const motivo = window.prompt(
      `Motivo para anular la reparación ${reparacion.codigoOperacion}:`,
    )
    if (!motivo || motivo.trim().length < 3) return
    setError('')
    setAviso('')
    try {
      await solicitar(`/api/reparaciones/${reparacion.id}/anular`, 'POST', {
        motivo: motivo.trim(),
      })
      setAviso('Reparación anulada.')
      await refrescar()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo anular la reparación')
    }
  }

  const imprimirRecepcion = () => {
    if (!reparacion) return
    setTicket({
      titulo: 'Comprobante de recepción',
      codigo: reparacion.codigoOperacion,
      fecha: formatFechaHoraAR(reparacion.fechaIngreso),
      cliente: `${reparacion.cliente.apellido}, ${reparacion.cliente.nombre} · DNI ${reparacion.cliente.dni}`,
      items: [
        { descripcion: `Equipo: ${reparacion.equipo}` },
        ...(reparacion.imei ? [{ descripcion: `IMEI/Serie: ${reparacion.imei}` }] : []),
        ...(reparacion.color ? [{ descripcion: `Color: ${reparacion.color}` }] : []),
        ...(reparacion.almacenamiento
          ? [{ descripcion: `Almacenamiento: ${reparacion.almacenamiento}` }]
          : []),
        { descripcion: `Falla: ${reparacion.falla}` },
        ...(reparacion.estadoFisico
          ? [{ descripcion: `Estado estético: ${reparacion.estadoFisico}` }]
          : []),
        ...(reparacion.accesoriosRecibidos
          ? [{ descripcion: `Accesorios: ${reparacion.accesoriosRecibidos}` }]
          : []),
        ...(reparacion.fechaPromesa
          ? [{ descripcion: `Fecha prometida: ${formatFechaAR(reparacion.fechaPromesa)}` }]
          : []),
      ],
      extra: [
        Number(reparacion.presupuesto) > 0
          ? `Presupuesto estimado: ${formatARS(reparacion.presupuesto)}`
          : '',
        reparacion.observaciones ? `Obs: ${reparacion.observaciones}` : '',
      ].filter(Boolean),
      footer: 'Conservá este comprobante para retirar el equipo.',
    })
  }

  if (cargando) {
    return (
      <div className="p-4 md:p-8">
        <p className="text-zinc-500 text-center py-20 text-sm">Cargando reparación...</p>
      </div>
    )
  }

  if (!reparacion) {
    return (
      <div className="p-4 md:p-8 max-w-3xl mx-auto">
        <div className="p-4 rounded-xl text-sm font-semibold bg-red-500/10 text-red-400 border border-red-500/20">
          ❌ {error || 'No se encontró la reparación'}
        </div>
        <Link
          href="/admin/reparaciones"
          className="inline-block mt-4 px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-semibold transition"
        >
          Volver al taller
        </Link>
      </div>
    )
  }

  const { objetivo, pagado, saldo } = saldoActual(reparacion)
  const repuestosActivos = reparacion.repuestos.filter(r => !r.anulada)
  const pagosActivos = reparacion.pagos.filter(p => !p.anulada)

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-5">
        <div>
          <Link
            href="/admin/reparaciones"
            className="text-zinc-500 hover:text-white text-xs font-semibold transition"
          >
            ← Volver al taller
          </Link>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <h1 className="text-2xl md:text-3xl font-bold text-white">
              {reparacion.codigoOperacion}
            </h1>
            <span
              className={`text-[10px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full border ${
                reparacion.anulada
                  ? 'bg-red-500/10 text-red-400 border-red-500/25'
                  : 'bg-blue-500/10 text-blue-400 border-blue-500/25'
              }`}
            >
              {reparacion.anulada
                ? 'Anulada'
                : ETIQUETAS_ESTADO_REPARACION[
                    reparacion.estado as keyof typeof ETIQUETAS_ESTADO_REPARACION
                  ] ?? reparacion.estado}
            </span>
          </div>
          <p className="text-zinc-500 text-sm mt-1">
            Ingreso {formatFechaHoraAR(reparacion.fechaIngreso)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={imprimirRecepcion}
            className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-white text-sm font-semibold transition"
          >
            Comprobante de recepción
          </button>
          {!reparacion.anulada && (
            <button
              onClick={() => setModalPago(true)}
              className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold transition"
            >
              Registrar pago
            </button>
          )}
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

      {reparacion.anulada && (
        <div className="p-4 rounded-xl mb-5 text-sm bg-red-500/10 text-red-400 border border-red-500/20">
          Reparación anulada el {formatFechaHoraAR(reparacion.fechaAnulacion)}
          {reparacion.motivoAnulacion ? `: ${reparacion.motivoAnulacion}` : ''}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
            <h2 className="text-white font-bold text-base mb-3">Cliente y equipo</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-zinc-500 text-[10px] uppercase tracking-wider">Cliente</p>
                <p className="text-white text-sm font-semibold">
                  {reparacion.cliente.apellido}, {reparacion.cliente.nombre}
                </p>
                <p className="text-zinc-400 text-xs">DNI {reparacion.cliente.dni}</p>
                <p className="text-zinc-400 text-xs">Tel. {reparacion.cliente.telefono}</p>
              </div>
              <div>
                <p className="text-zinc-500 text-[10px] uppercase tracking-wider">Equipo</p>
                <p className="text-white text-sm font-semibold">{reparacion.equipo}</p>
                <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1">
                  {reparacion.marca && (
                    <span className="text-zinc-400 text-xs">Marca: {reparacion.marca}</span>
                  )}
                  {reparacion.modelo && (
                    <span className="text-zinc-400 text-xs">Modelo: {reparacion.modelo}</span>
                  )}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-zinc-800">
              <DatoEquipo etiqueta="IMEI / Serie" valor={reparacion.imei} />
              <DatoEquipo etiqueta="Color" valor={reparacion.color} />
              <DatoEquipo etiqueta="Almacenamiento" valor={reparacion.almacenamiento} />
              <DatoEquipo etiqueta="Contraseña / patrón" valor={reparacion.claveEquipo} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              <DatoEquipo etiqueta="Estado estético" valor={reparacion.estadoFisico} />
              <DatoEquipo etiqueta="Accesorios recibidos" valor={reparacion.accesoriosRecibidos} />
            </div>
            {reparacion.fechaPromesa && (
              <p className="text-zinc-400 text-xs mt-4">
                Fecha prometida: <span className="text-white">{formatFechaAR(reparacion.fechaPromesa)}</span>
              </p>
            )}
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
            <h2 className="text-white font-bold text-base mb-3">Falla y diagnóstico</h2>
            <p className="text-zinc-500 text-[10px] uppercase tracking-wider">Falla reportada</p>
            <p className="text-zinc-200 text-sm whitespace-pre-wrap mb-3">{reparacion.falla}</p>
            <p className="text-zinc-500 text-[10px] uppercase tracking-wider">Diagnóstico</p>
            <p className="text-zinc-200 text-sm whitespace-pre-wrap">
              {reparacion.diagnostico || 'Sin diagnóstico cargado.'}
            </p>
            {reparacion.observaciones && (
              <>
                <p className="text-zinc-500 text-[10px] uppercase tracking-wider mt-3">Observaciones</p>
                <p className="text-zinc-200 text-sm whitespace-pre-wrap">{reparacion.observaciones}</p>
              </>
            )}
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
            <div className="flex items-center justify-between gap-2 mb-3">
              <h2 className="text-white font-bold text-base">Repuestos usados</h2>
              {!reparacion.anulada && (
                <button
                  onClick={() => setModalRepuesto(true)}
                  className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-white text-xs font-semibold transition"
                >
                  + Agregar repuesto
                </button>
              )}
            </div>
            {reparacion.repuestos.length === 0 ? (
              <p className="text-zinc-600 text-sm py-4 text-center">
                Todavía no se usaron repuestos en esta reparación.
              </p>
            ) : (
              <div className="divide-y divide-zinc-800">
                {reparacion.repuestos.map(repuesto => (
                  <div
                    key={repuesto.id}
                    className={`py-3 first:pt-0 last:pb-0 flex items-start justify-between gap-3 ${
                      repuesto.anulada ? 'opacity-50' : ''
                    }`}
                  >
                    <div className="min-w-0">
                      <p
                        className={`text-sm font-medium break-words ${
                          repuesto.anulada ? 'text-zinc-500 line-through' : 'text-white'
                        }`}
                      >
                        {repuesto.producto.nombre}
                      </p>
                      <p className="text-zinc-500 text-xs">
                        {repuesto.cantidad} x {formatARS(repuesto.precioUnitario)}
                        {repuesto.anulada ? ' · anulado' : ''}
                      </p>
                      {repuesto.anulada && repuesto.motivoAnulacion && (
                        <p className="text-red-400 text-[11px]">Motivo: {repuesto.motivoAnulacion}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-white font-bold text-sm tabular-nums">
                        {formatARS(repuesto.subtotal)}
                      </span>
                      {!repuesto.anulada && !reparacion.anulada && (
                        <button
                          onClick={() => anularRepuesto(repuesto)}
                          className="text-zinc-500 hover:text-red-400 text-[11px] font-semibold transition"
                        >
                          Anular
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
            <div className="flex items-center justify-between gap-2 mb-3">
              <h2 className="text-white font-bold text-base">Pagos</h2>
              {!reparacion.anulada && (
                <button
                  onClick={() => setModalPago(true)}
                  className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-white text-xs font-semibold transition"
                >
                  + Registrar pago
                </button>
              )}
            </div>
            {reparacion.pagos.length === 0 ? (
              <p className="text-zinc-600 text-sm py-4 text-center">
                Todavía no hay pagos registrados.
              </p>
            ) : (
              <div className="divide-y divide-zinc-800">
                {reparacion.pagos.map(pago => (
                  <div
                    key={pago.id}
                    className={`py-3 first:pt-0 last:pb-0 flex items-start justify-between gap-3 ${
                      pago.anulada ? 'opacity-50' : ''
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[10px] font-mono text-zinc-400 bg-zinc-950 border border-zinc-800 px-2 py-0.5 rounded-md">
                          {pago.codigoOperacion}
                        </span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700">
                          {ETIQUETAS_METODO[pago.metodoPago] ?? pago.metodoPago}
                        </span>
                        {pago.anulada && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/25">
                            Anulado
                          </span>
                        )}
                      </div>
                      <p className="text-zinc-300 text-sm mt-1">
                        {pago.concepto || 'Pago'}
                      </p>
                      <p className="text-zinc-500 text-[11px]">{formatFechaHoraAR(pago.fecha)}</p>
                      {pago.observaciones && (
                        <p className="text-zinc-500 text-[11px]">Obs: {pago.observaciones}</p>
                      )}
                      {pago.anulada && pago.motivoAnulacion && (
                        <p className="text-red-400 text-[11px]">Motivo: {pago.motivoAnulacion}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`font-bold text-sm tabular-nums ${
                          pago.anulada ? 'text-zinc-500 line-through' : 'text-green-400'
                        }`}
                      >
                        {formatARS(pago.monto)}
                      </span>
                      {!pago.anulada && !reparacion.anulada && (
                        <button
                          onClick={() => anularPago(pago)}
                          className="text-zinc-500 hover:text-red-400 text-[11px] font-semibold transition"
                        >
                          Anular
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
            <h2 className="text-white font-bold text-base mb-3">Historial</h2>
            {reparacion.historial.length === 0 ? (
              <p className="text-zinc-600 text-sm py-4 text-center">Sin movimientos de estado.</p>
            ) : (
              <div className="space-y-3">
                {reparacion.historial.map(item => (
                  <div key={item.id} className="flex gap-3">
                    <div className="flex flex-col items-center shrink-0 pt-1">
                      <span className="w-2 h-2 rounded-full bg-blue-400" />
                      <span className="w-px flex-1 bg-zinc-800 mt-1" />
                    </div>
                    <div className="pb-1">
                      <p className="text-white text-sm">
                        {item.estadoAnterior
                          ? ETIQUETAS_ESTADO_REPARACION[
                              item.estadoAnterior as keyof typeof ETIQUETAS_ESTADO_REPARACION
                            ] ?? item.estadoAnterior
                          : 'Inicio'}{' '}
                        →{' '}
                        {ETIQUETAS_ESTADO_REPARACION[
                          item.estadoNuevo as keyof typeof ETIQUETAS_ESTADO_REPARACION
                        ] ?? item.estadoNuevo}
                      </p>
                      {item.nota && <p className="text-zinc-400 text-xs">{item.nota}</p>}
                      <p className="text-zinc-600 text-[11px]">{formatFechaHoraAR(item.fecha)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-5">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
            <h2 className="text-white font-bold text-base mb-3">Resumen</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between gap-2">
                <span className="text-zinc-400">Presupuesto</span>
                <span className="text-white tabular-nums">{formatARS(reparacion.presupuesto)}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-zinc-400">Monto final</span>
                <span className="text-white tabular-nums">
                  {reparacion.montoFinal === null ? '—' : formatARS(reparacion.montoFinal)}
                </span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-zinc-400">Total a cobrar</span>
                <span className="text-white tabular-nums">{formatARS(objetivo)}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-zinc-400">Pagado</span>
                <span className="text-green-400 tabular-nums">{formatARS(pagado)}</span>
              </div>
              <div className="flex justify-between gap-2 border-t border-zinc-800 pt-2 font-bold">
                <span className="text-zinc-300">Saldo</span>
                <span className={saldo > 0 ? 'text-amber-400 tabular-nums' : 'text-green-400 tabular-nums'}>
                  {formatARS(saldo)}
                </span>
              </div>
            </div>
            <p className="text-zinc-600 text-[11px] mt-3">
              {pagosActivos.length} pago{pagosActivos.length !== 1 ? 's' : ''} ·{' '}
              {repuestosActivos.length} repuesto{repuestosActivos.length !== 1 ? 's' : ''}
            </p>
          </div>

          {!reparacion.anulada && (
            <form
              onSubmit={actualizarEstado}
              className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-3"
            >
              <h2 className="text-white font-bold text-base">Cambiar estado</h2>
              <Field label="Estado" required>
                <select
                  value={estadoForm}
                  onChange={e => setEstadoForm(e.target.value as EstadoReparacion)}
                  className={inputClass}
                >
                  {ESTADOS_REPARACION.map(estado => (
                    <option key={estado} value={estado}>
                      {ETIQUETAS_ESTADO_REPARACION[estado]}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Nota del cambio">
                <input
                  type="text"
                  value={notaEstado}
                  onChange={e => setNotaEstado(e.target.value)}
                  className={inputClass}
                  placeholder="Opcional"
                  maxLength={300}
                />
              </Field>
              <button
                type="submit"
                disabled={guardandoEstado || estadoForm === reparacion.estado}
                className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-sm font-bold transition"
              >
                {guardandoEstado ? 'Guardando...' : 'Actualizar estado'}
              </button>
            </form>
          )}

          {!reparacion.anulada && (
            <form
              onSubmit={actualizarMontos}
              className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-3"
            >
              <h2 className="text-white font-bold text-base">Montos</h2>
              <Field label="Presupuesto">
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={presupuestoForm}
                  onChange={e => setPresupuestoForm(e.target.value)}
                  className={inputClass}
                />
              </Field>
              <Field label="Monto final">
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={montoFinalForm}
                  onChange={e => setMontoFinalForm(e.target.value)}
                  className={inputClass}
                  placeholder="Vacío = usa presupuesto"
                />
              </Field>
              <button
                type="submit"
                disabled={guardandoMontos}
                className="w-full py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 disabled:opacity-50 text-white text-sm font-bold transition"
              >
                {guardandoMontos ? 'Guardando...' : 'Guardar montos'}
              </button>
            </form>
          )}

          {!reparacion.anulada && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
              <h2 className="text-white font-bold text-base mb-2">Anular reparación</h2>
              {pagosActivos.length > 0 ? (
                <p className="text-zinc-500 text-xs">
                  Para anular la reparación primero anulá los pagos registrados.
                </p>
              ) : (
                <>
                  <p className="text-zinc-500 text-xs mb-3">
                    El registro no se borra: queda anulado con motivo y se restituye el stock de los
                    repuestos.
                  </p>
                  <button
                    onClick={anularReparacion}
                    className="w-full py-2.5 rounded-xl bg-red-600/15 hover:bg-red-600/25 border border-red-500/30 text-red-400 text-sm font-bold transition"
                  >
                    Anular reparación
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {modalPago && (
        <ModalPago
          reparacion={reparacion}
          onClose={() => setModalPago(false)}
          onCobrado={async nuevoTicket => {
            setTicket(nuevoTicket)
            setAviso('Pago registrado e ingresado a caja.')
            await refrescar()
          }}
        />
      )}

      {modalRepuesto && (
        <ModalRepuesto
          reparacionId={reparacion.id}
          productos={productos}
          onClose={() => setModalRepuesto(false)}
          onAgregado={async () => {
            setAviso('Repuesto agregado y stock descontado.')
            await refrescar()
          }}
        />
      )}

      {ticket && <TicketModal ticket={ticket} onClose={() => setTicket(null)} />}
    </div>
  )
}
