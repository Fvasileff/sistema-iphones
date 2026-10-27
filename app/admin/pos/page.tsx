'use client'

import { useCallback, useEffect, useState } from 'react'
import { formatARS } from '@/lib/format'
import { formatFechaHoraAR } from '@/lib/fechas'
import TicketModal, { type TicketData } from '@/app/components/TicketModal'
import { useToast } from '@/app/components/ToastProvider'

type Monto = number | string
type MetodoPago = 'efectivo' | 'transferencia' | 'tarjeta'
type MetodoPagoSeleccion = MetodoPago | 'mixto'

const METODOS_MIXTO = ['efectivo', 'transferencia', 'tarjeta'] as const
type MontosMixtos = Record<(typeof METODOS_MIXTO)[number], string>

const MONTOS_MIXTOS_VACIOS: MontosMixtos = {
  efectivo: '',
  transferencia: '',
  tarjeta: '',
}

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

interface VentaCreada {
  codigoOperacion: string
  fechaVenta: string
}

interface ItemCatalogo {
  tipo: 'producto' | 'iphone'
  id: string
  nombre: string
  detalle: string
  etiqueta: string
  precio: number
  stock: number
}

interface ItemCarrito extends ItemCatalogo {
  key: string
  cantidad: number
}

const ETIQUETAS_METODO: Record<string, string> = {
  efectivo: 'Efectivo',
  transferencia: 'Transferencia',
  tarjeta: 'Tarjeta',
  mixto: 'Mixto',
}

const ETIQUETAS_CATEGORIA: Record<string, string> = {
  repuesto: 'Repuesto',
  accesorio: 'Producto',
}

const inputClass =
  'w-full px-4 py-3 rounded-xl border border-zinc-700 bg-zinc-900 text-white text-base placeholder-zinc-600 focus:outline-none focus:border-blue-500 transition-colors'

function pagosDesdeFormulario(
  metodo: MetodoPagoSeleccion,
  montos: MontosMixtos,
  total: number,
) {
  if (metodo !== 'mixto') {
    return [{ metodoPago: metodo, monto: total }]
  }

  return METODOS_MIXTO.map(nombre => ({
    metodoPago: nombre,
    monto: Number(montos[nombre]) || 0,
  })).filter(pago => pago.monto > 0)
}

function sumaEnCentavos(pagos: { monto: number }[]) {
  return pagos.reduce((acc, pago) => acc + Math.round(pago.monto * 100), 0)
}

function claveItem(item: { tipo: string; id: string }) {
  return `${item.tipo}:${item.id}`
}

function nombreCliente(cliente: Cliente | null | undefined) {
  return cliente ? `${cliente.apellido}, ${cliente.nombre}` : undefined
}

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

function CamposPagoMixto({
  total,
  montos,
  onChange,
}: {
  total: number
  montos: MontosMixtos
  onChange: (montos: MontosMixtos) => void
}) {
  const suma = METODOS_MIXTO.reduce(
    (acc, metodo) => acc + Math.round((Number(montos[metodo]) || 0) * 100),
    0,
  )
  const diferencia = Math.round(total * 100) - suma

  return (
    <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3 space-y-2">
      <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
        Desglose del pago
      </p>
      {METODOS_MIXTO.map(metodo => (
        <div key={metodo} className="flex items-center justify-between gap-3">
          <label className="text-sm text-zinc-300">{ETIQUETAS_METODO[metodo]}</label>
          <input
            type="number"
            min="0"
            step="any"
            value={montos[metodo]}
            onChange={e => onChange({ ...montos, [metodo]: e.target.value })}
            className="w-32 px-3 py-2 rounded-lg border border-zinc-700 bg-zinc-900 text-white text-sm text-right placeholder-zinc-600 focus:outline-none focus:border-blue-500"
            placeholder="0"
          />
        </div>
      ))}
      <p
        className={`text-xs font-semibold ${
          diferencia === 0 ? 'text-green-400' : 'text-amber-400'
        }`}
      >
        {diferencia === 0
          ? 'La suma coincide exactamente con el total ✓'
          : diferencia > 0
            ? `Falta ${formatARS(diferencia / 100)}`
            : `Excede ${formatARS(Math.abs(diferencia) / 100)}`}
      </p>
    </div>
  )
}

function VentaUnificada({
  productos,
  iphones,
  clientes,
  onCobrado,
}: {
  productos: Producto[]
  iphones: Iphone[]
  clientes: Cliente[]
  onCobrado: (ticket: TicketData) => Promise<void>
}) {
  const [busqueda, setBusqueda] = useState('')
  const [catalogo, setCatalogo] = useState<'todos' | 'productos' | 'iphones'>('todos')
  const [carrito, setCarrito] = useState<ItemCarrito[]>([])
  const [clienteId, setClienteId] = useState('')
  const [metodoPago, setMetodoPago] = useState<MetodoPagoSeleccion>('efectivo')
  const [montosMixtos, setMontosMixtos] = useState<MontosMixtos>(MONTOS_MIXTOS_VACIOS)
  const [observaciones, setObservaciones] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')

  const itemsCatalogo: ItemCatalogo[] = [
    ...productos
      .filter(producto => producto.activo)
      .map(producto => ({
        tipo: 'producto' as const,
        id: producto.id,
        nombre: producto.nombre,
        detalle: [producto.sku, ETIQUETAS_CATEGORIA[producto.categoria] ?? producto.categoria]
          .filter(Boolean)
          .join(' · '),
        etiqueta: ETIQUETAS_CATEGORIA[producto.categoria] ?? 'Producto',
        precio: Number(producto.precioVenta),
        stock: producto.stock,
      })),
    ...iphones
      .filter(iphone => iphone.activo)
      .map(iphone => ({
        tipo: 'iphone' as const,
        id: iphone.id,
        nombre: `${iphone.modelo}${iphone.variante ? ` ${iphone.variante}` : ''}`,
        detalle: `${iphone.almacenamiento} · ${iphone.color}`,
        etiqueta: 'iPhone',
        precio: Number(iphone.precioBase),
        stock: iphone.stock,
      })),
  ]

  const texto = busqueda.trim().toLowerCase()
  const filtrados = itemsCatalogo.filter(item => {
    if (catalogo === 'productos' && item.tipo !== 'producto') return false
    if (catalogo === 'iphones' && item.tipo !== 'iphone') return false
    if (!texto) return true
    return `${item.nombre} ${item.detalle} ${item.etiqueta}`.toLowerCase().includes(texto)
  })

  const total = carrito.reduce(
    (acc, item) => acc + Math.round(item.precio * 100) * item.cantidad,
    0,
  ) / 100

  const agregar = (item: ItemCatalogo) => {
    if (item.stock <= 0) return
    setError('')
    setCarrito(actual => {
      const key = claveItem(item)
      const existente = actual.find(linea => linea.key === key)
      if (!existente) return [...actual, { ...item, key, cantidad: 1 }]
      if (existente.cantidad >= item.stock) return actual
      return actual.map(linea =>
        linea.key === key ? { ...linea, cantidad: linea.cantidad + 1 } : linea,
      )
    })
  }

  const cambiarCantidad = (key: string, valor: number) => {
    setCarrito(actual =>
      actual.map(item => {
        if (item.key !== key) return item
        if (!Number.isFinite(valor)) return item
        return { ...item, cantidad: Math.min(Math.max(Math.floor(valor), 1), item.stock) }
      }),
    )
  }

  const cambiarPrecio = (key: string, valor: number) => {
    setCarrito(actual =>
      actual.map(item =>
        item.key === key
          ? { ...item, precio: Number.isFinite(valor) ? Math.max(0, valor) : item.precio }
          : item,
      ),
    )
  }

  const quitar = (key: string) => {
    setCarrito(actual => actual.filter(item => item.key !== key))
  }

  const cobrar = async () => {
    setError('')

    if (carrito.length === 0) {
      setError('Agregá al menos un producto o iPhone al carrito.')
      return
    }

    if (total <= 0) {
      setError('El total de la venta debe ser mayor a 0.')
      return
    }

    const pagos = pagosDesdeFormulario(metodoPago, montosMixtos, total)
    if (sumaEnCentavos(pagos) !== Math.round(total * 100)) {
      setError('La suma de los pagos debe coincidir exactamente con el total.')
      return
    }

    setEnviando(true)

    try {
      const venta = await enviar<VentaCreada>('/api/ventas-contado', {
        clienteId: clienteId || undefined,
        pagos,
        observaciones: observaciones.trim() || undefined,
        items: carrito.map(item => ({
          tipo: item.tipo,
          id: item.id,
          cantidad: item.cantidad,
          precioUnitario: item.precio,
        })),
      })

      const cliente = clientes.find(c => c.id === clienteId) ?? null
      const ticket: TicketData = {
        titulo: 'Venta',
        codigo: venta.codigoOperacion,
        fecha: formatFechaHoraAR(venta.fechaVenta),
        cliente: nombreCliente(cliente),
        metodo: ETIQUETAS_METODO[metodoPago],
        pagos: pagos.map(pago => ({
          etiqueta: ETIQUETAS_METODO[pago.metodoPago] ?? pago.metodoPago,
          monto: pago.monto,
        })),
        items: carrito.map(item => ({
          descripcion: `${item.nombre}${item.detalle ? ` (${item.detalle})` : ''}`,
          cantidad: item.cantidad,
          subtotal: item.precio * item.cantidad,
        })),
        total,
        extra: observaciones.trim() ? [`Observaciones: ${observaciones.trim()}`] : [],
      }

      await onCobrado(ticket)
      setCarrito([])
      setClienteId('')
      setMetodoPago('efectivo')
      setMontosMixtos(MONTOS_MIXTOS_VACIOS)
      setObservaciones('')
      setBusqueda('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo registrar la venta')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="grid lg:grid-cols-[1.15fr_0.85fr] gap-5 items-start">
        <section className="space-y-4 min-w-0">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
            <div className="flex flex-col gap-3">
              <input
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
                placeholder="Buscar producto, SKU o iPhone..."
                className={inputClass}
              />
              <div className="flex flex-wrap gap-2">
                {(['todos', 'productos', 'iphones'] as const).map(opcion => (
                  <button
                    key={opcion}
                    type="button"
                    onClick={() => setCatalogo(opcion)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition ${
                      catalogo === opcion
                        ? 'bg-blue-600 text-white'
                        : 'bg-zinc-950 border border-zinc-800 text-zinc-400 hover:text-white'
                    }`}
                  >
                    {opcion === 'todos' ? 'Todo' : opcion === 'productos' ? 'Productos' : 'iPhones'}
                  </button>
                ))}
                <span className="ml-auto text-xs text-zinc-500 self-center">
                  {filtrados.length} disponible{filtrados.length === 1 ? '' : 's'}
                </span>
              </div>
            </div>
          </div>

          {filtrados.length === 0 ? (
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-10 text-center text-sm text-zinc-500">
              No hay artículos que coincidan con la búsqueda.
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {filtrados.map(item => {
                const enCarrito = carrito.find(linea => linea.key === claveItem(item))
                const sinStock = item.stock <= 0
                return (
                  <button
                    key={claveItem(item)}
                    type="button"
                    disabled={sinStock}
                    onClick={() => agregar(item)}
                    className="text-left bg-zinc-900 border border-zinc-800 hover:border-blue-500/60 disabled:hover:border-zinc-800 disabled:opacity-40 rounded-2xl p-4 transition group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                          item.tipo === 'iphone'
                            ? 'text-violet-300 bg-violet-500/10 border-violet-500/20'
                            : 'text-cyan-300 bg-cyan-500/10 border-cyan-500/20'
                        }`}
                      >
                        {item.etiqueta}
                      </span>
                      <span
                        className={`text-[11px] font-semibold ${
                          sinStock ? 'text-red-400' : 'text-zinc-500'
                        }`}
                      >
                        {sinStock ? 'Sin stock' : `Stock: ${item.stock}`}
                      </span>
                    </div>
                    <p className="text-white font-bold text-sm mt-3 group-hover:text-blue-300 transition line-clamp-2">
                      {item.nombre}
                    </p>
                    <p className="text-zinc-500 text-xs mt-1 line-clamp-2">{item.detalle}</p>
                    <div className="flex items-end justify-between gap-2 mt-4">
                      <span className="text-white font-bold">{formatARS(item.precio)}</span>
                      {enCarrito ? (
                        <span className="text-[11px] font-bold text-blue-400">
                          {enCarrito.cantidad} en carrito
                        </span>
                      ) : (
                        <span className="text-[11px] font-semibold text-zinc-600 group-hover:text-blue-400 transition">
                          + Agregar
                        </span>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </section>

        <aside className="lg:sticky lg:top-6 space-y-4 min-w-0">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
            <div className="flex items-center justify-between gap-3 mb-3">
              <h2 className="text-white font-bold">Carrito</h2>
              <span className="text-xs text-zinc-500">
                {carrito.reduce((acc, item) => acc + item.cantidad, 0)} unidad(es)
              </span>
            </div>

            {carrito.length === 0 ? (
              <p className="text-zinc-500 text-sm py-10 text-center">
                Elegí productos o iPhones del catálogo.
              </p>
            ) : (
              <div className="space-y-2">
                {carrito.map(item => (
                  <div
                    key={item.key}
                    className="bg-zinc-950 border border-zinc-800 rounded-xl p-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-white wrap-break-word">{item.nombre}</p>
                        <p className="text-[11px] text-zinc-500 wrap-break-word">{item.detalle}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => quitar(item.key)}
                        className="text-zinc-500 hover:text-red-400 text-xs font-semibold shrink-0"
                        aria-label={`Quitar ${item.nombre}`}
                      >
                        Quitar
                      </button>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 mt-3">
                      <div className="flex items-center rounded-lg border border-zinc-700 overflow-hidden">
                        <button
                          type="button"
                          onClick={() => cambiarCantidad(item.key, item.cantidad - 1)}
                          className="px-2.5 py-1.5 text-zinc-300 hover:bg-zinc-800 transition"
                          aria-label="Restar unidad"
                        >
                          −
                        </button>
                        <input
                          type="number"
                          min={1}
                          max={item.stock}
                          value={item.cantidad}
                          onChange={e => cambiarCantidad(item.key, Number(e.target.value))}
                          className="w-12 bg-zinc-950 text-white text-sm text-center py-1.5 focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => cambiarCantidad(item.key, item.cantidad + 1)}
                          className="px-2.5 py-1.5 text-zinc-300 hover:bg-zinc-800 transition"
                          aria-label="Sumar unidad"
                        >
                          +
                        </button>
                      </div>
                      <label className="flex items-center gap-1.5 text-[11px] text-zinc-500">
                        Precio
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={item.precio}
                          onChange={e => cambiarPrecio(item.key, Number(e.target.value))}
                          className="w-24 px-2 py-1.5 rounded-lg border border-zinc-700 bg-zinc-900 text-white text-xs text-right focus:outline-none focus:border-blue-500"
                        />
                      </label>
                      <span className="ml-auto text-sm font-bold text-white">
                        {formatARS(item.precio * item.cantidad)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="border-t border-zinc-800 mt-4 pt-4 space-y-4">
              <Field label="Cliente">
                <select
                  value={clienteId}
                  onChange={e => setClienteId(e.target.value)}
                  className={inputClass}
                >
                  <option value="">Consumidor final</option>
                  {clientes.map(cliente => (
                    <option key={cliente.id} value={cliente.id}>
                      {cliente.apellido}, {cliente.nombre} · DNI {cliente.dni}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Método de pago" required>
                <div className="grid grid-cols-2 gap-2">
                  {(['efectivo', 'transferencia', 'tarjeta', 'mixto'] as const).map(opcion => (
                    <button
                      key={opcion}
                      type="button"
                      onClick={() => setMetodoPago(opcion)}
                      className={`py-2.5 rounded-xl text-xs font-bold transition ${
                        metodoPago === opcion
                          ? 'bg-blue-600 text-white'
                          : 'bg-zinc-950 border border-zinc-800 text-zinc-400 hover:text-white'
                      }`}
                    >
                      {ETIQUETAS_METODO[opcion]}
                    </button>
                  ))}
                </div>
              </Field>

              {metodoPago === 'mixto' && (
                <CamposPagoMixto
                  total={total}
                  montos={montosMixtos}
                  onChange={setMontosMixtos}
                />
              )}

              <Field label="Observaciones">
                <textarea
                  value={observaciones}
                  onChange={e => setObservaciones(e.target.value)}
                  rows={2}
                  placeholder="Opcional"
                  className={`${inputClass} resize-y`}
                />
              </Field>

              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  Total
                </span>
                <span className="text-2xl font-bold text-white">{formatARS(total)}</span>
              </div>

              <MensajeError mensaje={error} />

              <button
                type="button"
                onClick={() => void cobrar()}
                disabled={enviando || carrito.length === 0}
                className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold transition"
              >
                {enviando ? 'Registrando venta...' : 'Cobrar y generar ticket'}
              </button>
            </div>
          </div>
        </aside>
      </div>

    </div>
  )
}

export default function PosPage() {
  const toast = useToast()
  const [productos, setProductos] = useState<Producto[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [iphones, setIphones] = useState<Iphone[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [ticket, setTicket] = useState<TicketData | null>(null)

  useEffect(() => {
    let activo = true

    Promise.all([
      pedir<Producto[]>('/api/productos'),
      pedir<Cliente[]>('/api/clientes'),
      pedir<Iphone[]>('/api/iphones'),
    ])
      .then(([listaProductos, listaClientes, listaIphones]) => {
        if (!activo) return
        setProductos(listaProductos)
        setClientes(listaClientes)
        setIphones(listaIphones)
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
      const [listaProductos, listaIphones] = await Promise.all([
        pedir<Producto[]>('/api/productos'),
        pedir<Iphone[]>('/api/iphones'),
      ])
      setProductos(listaProductos)
      setIphones(listaIphones)
      setError('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudieron actualizar los datos del POS')
    }
  }, [])

  const alVender = async (nuevoTicket: TicketData) => {
    setTicket(nuevoTicket)
    setError('')
    toast.success('Venta registrada, stock actualizado e ingreso a caja.')
    await refrescarDatos()
  }

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-white">Punto de venta</h1>
        <p className="text-zinc-500 text-sm mt-1">
          Venta de productos e iPhones al contado en una misma operación, con control de stock y
          ticket único.
        </p>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3 mb-5 text-xs text-zinc-400 flex items-start gap-2">
        <span className="text-base leading-none">💵</span>
        <p>
          La caja se abre (o reabre) automáticamente con $0 al registrar un cobro, así que nunca
          bloquea una venta. El cierre con arqueo es opcional. Las ventas con tarjeta se muestran
          aparte y no suman al efectivo esperado.
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-xl mb-5 text-sm font-semibold bg-red-500/10 text-red-400 border border-red-500/20">
          ❌ {error}
        </div>
      )}

      {cargando ? (
        <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-4">
            <div className="skeleton h-20 w-full rounded-2xl" />
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="skeleton h-36 w-full rounded-2xl" />
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-zinc-800/70 bg-zinc-900/50 p-5">
            <div className="skeleton h-5 w-28 rounded" />
            <div className="mt-5 space-y-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="skeleton h-16 w-full rounded-xl opacity-70" />
              ))}
            </div>
            <div className="skeleton mt-5 h-24 w-full rounded-xl opacity-60" />
          </div>
        </div>
      ) : (
        <VentaUnificada
          productos={productos}
          iphones={iphones}
          clientes={clientes}
          onCobrado={alVender}
        />
      )}

      {ticket && <TicketModal ticket={ticket} onClose={() => setTicket(null)} />}
    </div>
  )
}
