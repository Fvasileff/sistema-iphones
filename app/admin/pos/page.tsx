'use client'

import { useCallback, useEffect, useState } from 'react'
import { formatARS } from '@/lib/format'
import { formatFechaHoraAR } from '@/lib/fechas'
import TicketModal, { type TicketData } from '@/app/components/TicketModal'

type Monto = number | string
type MetodoPago = 'efectivo' | 'transferencia' | 'tarjeta'

interface Cliente {
  id: string
  nombre: string
  apellido: string
  dni: string
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

interface ItemCarrito {
  productoId: string
  nombre: string
  precio: number
  cantidad: number
  stock: number
}

interface Iphone {
  id: string
  modelo: string
  variante: string | null
  color: string
  almacenamiento: string
  precioBase: Monto
  stock: number
  activo: boolean
}

interface VentaIphone {
  id: string
  codigoOperacion: string
  precioVenta: Monto
  metodoPago: string
  fechaVenta: string
  anulada: boolean
  motivoAnulacion: string | null
  cliente: Cliente | null
  iphone: Iphone
}

const ETIQUETAS_METODO: Record<MetodoPago, string> = {
  efectivo: 'Efectivo',
  transferencia: 'Transferencia',
  tarjeta: 'Tarjeta',
}

const ETIQUETAS_CATEGORIA: Record<string, string> = {
  repuesto: 'Repuesto',
  accesorio: 'Producto',
}

const inputClass =
  'w-full px-4 py-3 rounded-xl border border-zinc-700 bg-zinc-900 text-white text-base placeholder-zinc-600 focus:outline-none focus:border-blue-500 transition-colors'

async function pedir<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: 'no-store' })
  const data = (await res.json()) as T & { error?: string }
  if (!res.ok) throw new Error(data.error || 'No se pudo completar la solicitud')
  return data
}

async function enviar<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
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

function MensajeError({ mensaje }: { mensaje: string }) {
  if (!mensaje) return null
  return (
    <div className="p-3 rounded-xl text-sm font-semibold bg-red-500/10 text-red-400 border border-red-500/20">
      ❌ {mensaje}
    </div>
  )
}

function TabProductos({
  productos,
  clientes,
  onCobrado,
}: {
  productos: Producto[]
  clientes: Cliente[]
  onCobrado: (ticket: TicketData) => void
}) {
  const [busqueda, setBusqueda] = useState('')
  const [carrito, setCarrito] = useState<ItemCarrito[]>([])
  const [clienteId, setClienteId] = useState('')
  const [metodoPago, setMetodoPago] = useState<MetodoPago>('efectivo')
  const [observaciones, setObservaciones] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')

  const texto = busqueda.trim().toLowerCase()
  const disponibles = productos.filter(
    p =>
      p.activo &&
      p.stock > 0 &&
      (!texto ||
        p.nombre.toLowerCase().includes(texto) ||
        (p.sku ?? '').toLowerCase().includes(texto)),
  )

  const cliente = clientes.find(c => c.id === clienteId)
  const total = carrito.reduce((acc, item) => acc + item.precio * item.cantidad, 0)

  const agregar = (producto: Producto) => {
    setError('')
    setCarrito(prev => {
      const existente = prev.find(item => item.productoId === producto.id)
      if (existente) {
        if (existente.cantidad >= existente.stock) return prev
        return prev.map(item =>
          item.productoId === producto.id ? { ...item, cantidad: item.cantidad + 1 } : item,
        )
      }
      return [
        ...prev,
        {
          productoId: producto.id,
          nombre: producto.nombre,
          precio: Number(producto.precioVenta),
          cantidad: 1,
          stock: producto.stock,
        },
      ]
    })
  }

  const cambiarCantidad = (productoId: string, valor: number) => {
    setCarrito(prev =>
      prev.map(item => {
        if (item.productoId !== productoId) return item
        const cantidad = Number.isFinite(valor) ? Math.floor(valor) : 1
        return { ...item, cantidad: Math.min(Math.max(cantidad, 1), item.stock) }
      }),
    )
  }

  const quitar = (productoId: string) => {
    setCarrito(prev => prev.filter(item => item.productoId !== productoId))
  }

  const cobrar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (carrito.length === 0) {
      setError('Agregá al menos un producto al carrito.')
      return
    }
    setEnviando(true)
    setError('')
    try {
      const venta = await enviar<{
        codigoOperacion: string
        total: Monto
        fechaVenta: string
      }>('/api/ventas-productos', {
        clienteId: clienteId || null,
        metodoPago,
        observaciones,
        items: carrito.map(item => ({
          productoId: item.productoId,
          cantidad: item.cantidad,
          precioUnitario: item.precio,
        })),
      })

      onCobrado({
        titulo: 'Venta de productos',
        codigo: venta.codigoOperacion,
        fecha: formatFechaHoraAR(venta.fechaVenta),
        cliente: cliente ? `${cliente.apellido}, ${cliente.nombre}` : undefined,
        metodo: ETIQUETAS_METODO[metodoPago],
        items: carrito.map(item => ({
          descripcion: item.nombre,
          cantidad: item.cantidad,
          subtotal: item.precio * item.cantidad,
        })),
        total: venta.total,
        extra: observaciones ? [`Obs: ${observaciones}`] : undefined,
      })

      setCarrito([])
      setObservaciones('')
      setClienteId('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo registrar la venta')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-3">
        <input
          type="text"
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          placeholder="🔍 Buscar producto por nombre o SKU..."
          className="w-full px-4 py-2.5 rounded-xl border border-zinc-800 bg-zinc-900 text-white text-sm placeholder-zinc-500 focus:outline-none focus:border-zinc-600 transition-colors"
        />

        {disponibles.length === 0 ? (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl py-12 text-center">
            <p className="text-zinc-500 text-sm">No hay productos disponibles con stock.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {disponibles.map(producto => {
              const enCarrito = carrito.find(item => item.productoId === producto.id)
              const sinLugar = enCarrito ? enCarrito.cantidad >= producto.stock : false
              return (
                <div
                  key={producto.id}
                  className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex flex-col gap-3"
                >
                  <div className="min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-white font-semibold text-sm break-words">
                        {producto.nombre}
                      </h3>
                      <span className="text-[10px] text-zinc-500 border border-zinc-700 rounded-full px-2 py-0.5 shrink-0">
                        {ETIQUETAS_CATEGORIA[producto.categoria] ?? producto.categoria}
                      </span>
                    </div>
                    <p className="text-zinc-500 text-xs mt-0.5">
                      Stock: {producto.stock}
                      {producto.sku ? ` · ${producto.sku}` : ''}
                    </p>
                    <p className="text-white font-bold text-lg mt-1 tabular-nums">
                      {formatARS(producto.precioVenta)}
                    </p>
                  </div>
                  <button
                    onClick={() => agregar(producto)}
                    disabled={sinLugar}
                    className="mt-auto w-full py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 border border-zinc-700 text-white text-xs font-bold transition"
                  >
                    {sinLugar ? 'Sin stock disponible' : 'Agregar al carrito'}
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <form
        onSubmit={cobrar}
        className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4 h-fit lg:sticky lg:top-4"
      >
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-white font-bold text-lg">Carrito</h2>
          <span className="text-zinc-500 text-xs">
            {carrito.reduce((acc, item) => acc + item.cantidad, 0)} ítems
          </span>
        </div>

        {carrito.length === 0 ? (
          <p className="text-zinc-600 text-sm py-8 text-center">
            Agregá productos para cobrar una venta.
          </p>
        ) : (
          <div className="space-y-2">
            {carrito.map(item => (
              <div
                key={item.productoId}
                className="bg-zinc-950 border border-zinc-800 rounded-xl p-3 space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-white text-sm font-medium break-words">{item.nombre}</p>
                  <button
                    type="button"
                    onClick={() => quitar(item.productoId)}
                    className="text-zinc-500 hover:text-red-400 text-xs shrink-0 transition"
                  >
                    Quitar
                  </button>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => cambiarCantidad(item.productoId, item.cantidad - 1)}
                      className="w-8 h-8 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-bold transition"
                    >
                      −
                    </button>
                    <input
                      type="number"
                      min="1"
                      max={item.stock}
                      value={item.cantidad}
                      onChange={e => cambiarCantidad(item.productoId, Number(e.target.value))}
                      className="w-14 px-2 py-1.5 rounded-lg border border-zinc-700 bg-zinc-900 text-white text-sm text-center focus:outline-none focus:border-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => cambiarCantidad(item.productoId, item.cantidad + 1)}
                      className="w-8 h-8 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-bold transition"
                    >
                      +
                    </button>
                  </div>
                  <p className="text-white font-bold text-sm tabular-nums">
                    {formatARS(item.precio * item.cantidad)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        <MensajeError mensaje={error} />

        <Field label="Cliente">
          <select value={clienteId} onChange={e => setClienteId(e.target.value)} className={inputClass}>
            <option value="">Consumidor final</option>
            {clientes.map(c => (
              <option key={c.id} value={c.id}>
                {c.apellido}, {c.nombre} — {c.dni}
              </option>
            ))}
          </select>
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

        <Field label="Observaciones">
          <input
            type="text"
            value={observaciones}
            onChange={e => setObservaciones(e.target.value)}
            className={inputClass}
            placeholder="Opcional"
            maxLength={500}
          />
        </Field>

        <div className="border-t border-zinc-800 pt-3 flex items-center justify-between">
          <span className="text-zinc-400 text-sm">Total</span>
          <span className="text-white font-bold text-2xl tabular-nums">{formatARS(total)}</span>
        </div>

        <button
          type="submit"
          disabled={enviando || carrito.length === 0}
          className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold transition"
        >
          {enviando ? 'Cobrando...' : 'Cobrar y generar ticket'}
        </button>
      </form>
    </div>
  )
}

function TabIphones({
  iphones,
  clientes,
  ventas,
  onVendido,
  onAnulado,
}: {
  iphones: Iphone[]
  clientes: Cliente[]
  ventas: VentaIphone[]
  onVendido: (ticket: TicketData) => Promise<void>
  onAnulado: () => Promise<void>
}) {
  const [busqueda, setBusqueda] = useState('')
  const [seleccionadoId, setSeleccionadoId] = useState('')
  const [precio, setPrecio] = useState('')
  const [clienteId, setClienteId] = useState('')
  const [metodoPago, setMetodoPago] = useState<MetodoPago>('efectivo')
  const [observaciones, setObservaciones] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [anulandoId, setAnulandoId] = useState<string | null>(null)
  const [error, setError] = useState('')

  const texto = busqueda.trim().toLowerCase()
  const disponibles = iphones.filter(
    i =>
      i.activo &&
      i.stock > 0 &&
      (!texto ||
        i.modelo.toLowerCase().includes(texto) ||
        i.color.toLowerCase().includes(texto) ||
        i.almacenamiento.toLowerCase().includes(texto) ||
        (i.variante ?? '').toLowerCase().includes(texto)),
  )
  const seleccionado = iphones.find(i => i.id === seleccionadoId)
  const cliente = clientes.find(c => c.id === clienteId)

  const elegir = (iphone: Iphone) => {
    setSeleccionadoId(iphone.id)
    setPrecio(String(iphone.precioBase))
    setError('')
  }

  const vender = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!seleccionado) {
      setError('Elegí un iPhone para vender.')
      return
    }
    setEnviando(true)
    setError('')
    try {
      const venta = await enviar<VentaIphone>('/api/ventas-iphone', {
        clienteId: clienteId || null,
        iphoneId: seleccionado.id,
        precioVenta: Number(precio),
        metodoPago,
        observaciones,
      })

      await onVendido({
        titulo: 'Venta de iPhone',
        codigo: venta.codigoOperacion,
        fecha: formatFechaHoraAR(venta.fechaVenta),
        cliente: cliente ? `${cliente.apellido}, ${cliente.nombre}` : undefined,
        metodo: ETIQUETAS_METODO[metodoPago],
        items: [
          {
            descripcion: `${seleccionado.modelo} ${seleccionado.almacenamiento} · ${seleccionado.color}`,
            subtotal: venta.precioVenta,
          },
        ],
        total: venta.precioVenta,
        extra: observaciones ? [`Obs: ${observaciones}`] : undefined,
      })

      setSeleccionadoId('')
      setPrecio('')
      setClienteId('')
      setObservaciones('')
      setMetodoPago('efectivo')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo registrar la venta')
    } finally {
      setEnviando(false)
    }
  }

  const anular = async (venta: VentaIphone) => {
    const motivo = window.prompt(`Motivo para anular ${venta.codigoOperacion}:`)
    if (!motivo || motivo.trim().length < 3) return
    setAnulandoId(venta.id)
    setError('')
    try {
      await enviar(`/api/ventas-iphone/${venta.id}/anular`, { motivo: motivo.trim() })
      await onAnulado()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo anular la venta')
    } finally {
      setAnulandoId(null)
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-4">
        <input
          type="text"
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          placeholder="🔍 Buscar iPhone por modelo, color o almacenamiento..."
          className="w-full px-4 py-2.5 rounded-xl border border-zinc-800 bg-zinc-900 text-white text-sm placeholder-zinc-500 focus:outline-none focus:border-zinc-600 transition-colors"
        />

        {disponibles.length === 0 ? (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl py-12 text-center">
            <p className="text-zinc-500 text-sm">No hay iPhones disponibles con stock.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {disponibles.map(iphone => {
              const activo = seleccionadoId === iphone.id
              return (
                <button
                  key={iphone.id}
                  type="button"
                  onClick={() => elegir(iphone)}
                  className={`text-left bg-zinc-900 border rounded-2xl p-4 transition ${
                    activo
                      ? 'border-blue-500 ring-1 ring-blue-500/40'
                      : 'border-zinc-800 hover:border-zinc-600'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-white font-semibold text-sm break-words">
                      {iphone.modelo}
                      {iphone.variante ? ` ${iphone.variante}` : ''}
                    </h3>
                    <span className="text-[10px] text-zinc-400 border border-zinc-700 rounded-full px-2 py-0.5 shrink-0">
                      Stock: {iphone.stock}
                    </span>
                  </div>
                  <p className="text-zinc-500 text-xs mt-1">
                    {iphone.almacenamiento} · {iphone.color}
                  </p>
                  <p className="text-white font-bold text-lg mt-2 tabular-nums">
                    {formatARS(iphone.precioBase)}
                  </p>
                </button>
              )
            })}
          </div>
        )}

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
          <div className="flex items-center justify-between gap-2 mb-3">
            <h2 className="text-white font-bold text-base">Ventas de iPhone de hoy</h2>
            <span className="text-zinc-500 text-xs">{ventas.length}</span>
          </div>
          {ventas.length === 0 ? (
            <p className="text-zinc-600 text-sm py-6 text-center">
              Todavía no hay ventas de iPhone al contado.
            </p>
          ) : (
            <div className="divide-y divide-zinc-800">
              {ventas.slice(0, 10).map(venta => (
                <div
                  key={venta.id}
                  className={`py-3 first:pt-0 last:pb-0 flex items-start justify-between gap-3 ${
                    venta.anulada ? 'opacity-50' : ''
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[10px] font-mono text-zinc-400 bg-zinc-950 border border-zinc-800 px-2 py-0.5 rounded-md">
                        {venta.codigoOperacion}
                      </span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700">
                        {ETIQUETAS_METODO[venta.metodoPago as MetodoPago] ?? venta.metodoPago}
                      </span>
                      {venta.anulada && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/25">
                          Anulada
                        </span>
                      )}
                    </div>
                    <p className="text-zinc-200 text-sm mt-1">
                      {venta.iphone.modelo} {venta.iphone.almacenamiento} ·{' '}
                      {venta.cliente
                        ? `${venta.cliente.apellido}, ${venta.cliente.nombre}`
                        : 'Consumidor final'}
                    </p>
                    <p className="text-zinc-500 text-[11px]">
                      {formatFechaHoraAR(venta.fechaVenta)}
                    </p>
                    {venta.anulada && venta.motivoAnulacion && (
                      <p className="text-red-400 text-[11px]">Motivo: {venta.motivoAnulacion}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`font-bold text-sm tabular-nums ${
                        venta.anulada ? 'text-zinc-500 line-through' : 'text-green-400'
                      }`}
                    >
                      {formatARS(venta.precioVenta)}
                    </span>
                    {!venta.anulada && (
                      <button
                        type="button"
                        onClick={() => anular(venta)}
                        disabled={anulandoId === venta.id}
                        className="text-zinc-500 hover:text-red-400 disabled:opacity-50 text-[11px] font-semibold transition"
                      >
                        {anulandoId === venta.id ? 'Anulando...' : 'Anular'}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <form
        onSubmit={vender}
        className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4 h-fit lg:sticky lg:top-4"
      >
        <div>
          <h2 className="text-white font-bold text-lg">Vender iPhone al contado</h2>
          <p className="text-zinc-500 text-xs mt-1">
            Descuenta stock del catálogo e ingresa a caja.
          </p>
        </div>

        {seleccionado ? (
          <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3">
            <p className="text-white text-sm font-semibold">
              {seleccionado.modelo}
              {seleccionado.variante ? ` ${seleccionado.variante}` : ''}
            </p>
            <p className="text-zinc-500 text-xs">
              {seleccionado.almacenamiento} · {seleccionado.color} · Stock {seleccionado.stock}
            </p>
          </div>
        ) : (
          <p className="text-zinc-600 text-sm py-3 text-center border border-dashed border-zinc-800 rounded-xl">
            Elegí un iPhone del catálogo.
          </p>
        )}

        <MensajeError mensaje={error} />

        <Field label="Precio de venta" required>
          <input
            type="number"
            min="0.01"
            step="any"
            value={precio}
            onChange={e => setPrecio(e.target.value)}
            className={inputClass}
            placeholder="0"
            required
          />
        </Field>

        <Field label="Cliente">
          <select
            value={clienteId}
            onChange={e => setClienteId(e.target.value)}
            className={inputClass}
          >
            <option value="">Consumidor final</option>
            {clientes.map(c => (
              <option key={c.id} value={c.id}>
                {c.apellido}, {c.nombre} — {c.dni}
              </option>
            ))}
          </select>
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

        <Field label="Observaciones">
          <input
            type="text"
            value={observaciones}
            onChange={e => setObservaciones(e.target.value)}
            className={inputClass}
            placeholder="Opcional"
            maxLength={500}
          />
        </Field>

        <div className="border-t border-zinc-800 pt-3 flex items-center justify-between">
          <span className="text-zinc-400 text-sm">Total</span>
          <span className="text-white font-bold text-2xl tabular-nums">
            {formatARS(Number(precio) || 0)}
          </span>
        </div>

        <button
          type="submit"
          disabled={enviando || !seleccionado || Number(precio) <= 0}
          className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold transition"
        >
          {enviando ? 'Cobrando...' : 'Cobrar y generar ticket'}
        </button>
      </form>
    </div>
  )
}

export default function PosPage() {
  const [productos, setProductos] = useState<Producto[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [iphones, setIphones] = useState<Iphone[]>([])
  const [ventasIphone, setVentasIphone] = useState<VentaIphone[]>([])
  const [tab, setTab] = useState<'productos' | 'iphones'>('productos')
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [aviso, setAviso] = useState('')
  const [ticket, setTicket] = useState<TicketData | null>(null)

  useEffect(() => {
    let activo = true

    Promise.all([
      pedir<Producto[]>('/api/productos'),
      pedir<Cliente[]>('/api/clientes'),
      pedir<Iphone[]>('/api/iphones'),
      pedir<VentaIphone[]>('/api/ventas-iphone'),
    ])
      .then(([listaProductos, listaClientes, listaIphones, listaVentas]) => {
        if (!activo) return
        setProductos(listaProductos)
        setClientes(listaClientes)
        setIphones(listaIphones)
        setVentasIphone(listaVentas)
      })
      .catch(e => {
        if (activo) setError(e instanceof Error ? e.message : 'No se pudo cargar el POS')
      })
      .finally(() => {
        if (activo) setCargando(false)
      })

    return () => {
      activo = false
    }
  }, [])

  const refrescarDatos = useCallback(async () => {
    try {
      const [listaProductos, listaIphones, listaVentas] = await Promise.all([
        pedir<Producto[]>('/api/productos'),
        pedir<Iphone[]>('/api/iphones'),
        pedir<VentaIphone[]>('/api/ventas-iphone'),
      ])
      setProductos(listaProductos)
      setIphones(listaIphones)
      setVentasIphone(listaVentas)
      setError('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudieron actualizar los datos del POS')
    }
  }, [])

  const alVender = async (nuevoTicket: TicketData) => {
    setTicket(nuevoTicket)
    setError('')
    setAviso('Venta de productos registrada e ingresada a caja.')
    await refrescarDatos()
  }

  const alVenderIphone = async (nuevoTicket: TicketData) => {
    setTicket(nuevoTicket)
    setError('')
    setAviso('Venta de iPhone registrada, stock descontado e ingreso a caja.')
    await refrescarDatos()
  }

  const alAnularIphone = async () => {
    setError('')
    setAviso('Venta de iPhone anulada, stock restituido y caja revertida.')
    await refrescarDatos()
  }

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-white">Punto de venta</h1>
        <p className="text-zinc-500 text-sm mt-1">
          Venta de productos e iPhones al contado, con control de stock y ticket.
        </p>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3 mb-5 text-xs text-zinc-400 flex items-start gap-2">
        <span className="text-base leading-none">💵</span>
        <p>
          La caja se abre automáticamente con $0 al registrar el primer cobro del día. El cierre con
          arqueo es opcional. Las ventas con tarjeta se muestran aparte y no suman al efectivo
          esperado.
        </p>
      </div>

      <div className="flex gap-2 mb-5">
        <button
          type="button"
          onClick={() => setTab('productos')}
          className={`px-4 py-2 rounded-xl text-sm font-bold transition ${
            tab === 'productos'
              ? 'bg-blue-600 text-white'
              : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white'
          }`}
        >
          Productos
        </button>
        <button
          type="button"
          onClick={() => setTab('iphones')}
          className={`px-4 py-2 rounded-xl text-sm font-bold transition ${
            tab === 'iphones'
              ? 'bg-blue-600 text-white'
              : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white'
          }`}
        >
          iPhones al contado
        </button>
      </div>

      {aviso && (
        <div className="p-4 rounded-xl mb-5 text-sm font-semibold bg-green-500/10 text-green-400 border border-green-500/20">
          ✅ {aviso}
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl mb-5 text-sm font-semibold bg-red-500/10 text-red-400 border border-red-500/20">
          ❌ {error}
        </div>
      )}

      {cargando ? (
        <p className="text-zinc-500 text-center py-20 text-sm">Cargando punto de venta...</p>
      ) : tab === 'productos' ? (
        <TabProductos productos={productos} clientes={clientes} onCobrado={alVender} />
      ) : (
        <TabIphones
          iphones={iphones}
          clientes={clientes}
          ventas={ventasIphone}
          onVendido={alVenderIphone}
          onAnulado={alAnularIphone}
        />
      )}

      {ticket && <TicketModal ticket={ticket} onClose={() => setTicket(null)} />}
    </div>
  )
}
