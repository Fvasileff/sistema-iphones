'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import {
  ETIQUETAS_ESTADO_REPARACION,
  type EstadoReparacion,
} from '@/lib/constantes'
import { formatARS } from '@/lib/format'
import { formatFechaAR, formatFechaHoraAR } from '@/lib/fechas'

type Monto = number | string

interface Iphone {
  id: string
  modelo: string
  variante: string | null
  color: string
  almacenamiento: string
}

interface PagoCuota {
  id: string
  monto: Monto
  montoMora: Monto
  fecha: string
  anulada: boolean
}

interface Cuota {
  id: string
  numeroCuota: number
  montoOriginal: Monto
  montoMora: Monto
  fechaVencimiento: string
  fechaPago: string | null
  estado: string
  pagos: PagoCuota[]
}

interface VentaFinanciada {
  id: string
  codigoOperacion: string | null
  precioVenta: Monto
  anticipoEfectivo: Monto
  anticipoEquipo: Monto
  descripcionEquipo: string | null
  planPago: string
  totalCuotas: number
  montoCuota: Monto
  interesPct: Monto
  estado: string
  fechaVenta: string
  anulada: boolean
  motivoAnulacion: string | null
  iphone: Iphone
  cuotas: Cuota[]
}

interface VentaContadoItem {
  id: string
  cantidad: number
  precioUnitario: Monto
  subtotal: Monto
  producto: {
    id: string
    nombre: string
    categoria: string
  } | null
  iphone: Iphone | null
}

interface VentaContado {
  id: string
  codigoOperacion: string
  total: Monto
  metodoPago: string
  montoEfectivo: Monto
  montoTransferencia: Monto
  montoTarjeta: Monto
  observaciones: string | null
  fechaVenta: string
  anulada: boolean
  motivoAnulacion: string | null
  items: VentaContadoItem[]
}

interface PagoReparacion {
  id: string
  monto: Monto
  anulada: boolean
}

interface Reparacion {
  id: string
  codigoOperacion: string
  equipo: string
  marca: string | null
  modelo: string | null
  falla: string
  presupuesto: Monto
  montoFinal: Monto | null
  estado: string
  fechaIngreso: string
  fechaEntrega: string | null
  anulada: boolean
  motivoAnulacion: string | null
  pagos: PagoReparacion[]
}

interface Cliente {
  id: string
  nombre: string
  apellido: string
  dni: string
  telefono: string
  email: string | null
  direccion: string | null
  createdAt: string
  ventas: VentaFinanciada[]
  ventasContado: VentaContado[]
  reparaciones: Reparacion[]
}

const ETIQUETAS_METODO: Record<string, string> = {
  efectivo: 'Efectivo',
  transferencia: 'Transferencia',
  tarjeta: 'Tarjeta',
  mixto: 'Mixto',
}

function DesglosePago({
  metodoPago,
  montoEfectivo,
  montoTransferencia,
  montoTarjeta,
}: {
  metodoPago: string
  montoEfectivo: Monto
  montoTransferencia: Monto
  montoTarjeta: Monto
}) {
  if (metodoPago !== 'mixto') return null

  const partes = [
    { etiqueta: 'Efectivo', monto: Number(montoEfectivo) },
    { etiqueta: 'Transferencia', monto: Number(montoTransferencia) },
    { etiqueta: 'Tarjeta', monto: Number(montoTarjeta) },
  ].filter(pago => pago.monto > 0)

  return (
    <p className="text-zinc-500 text-[11px]">
      {partes.map(pago => `${pago.etiqueta} ${formatARS(pago.monto)}`).join(' · ')}
    </p>
  )
}

type Tono = 'verde' | 'ambar' | 'rojo' | 'azul' | 'zinc' | 'violeta'

const ESTILOS_TONO: Record<Tono, string> = {
  verde: 'bg-green-500/10 text-green-400 border-green-500/25',
  ambar: 'bg-amber-500/10 text-amber-400 border-amber-500/25',
  rojo: 'bg-red-500/10 text-red-400 border-red-500/25',
  azul: 'bg-blue-500/10 text-blue-400 border-blue-500/25',
  zinc: 'bg-zinc-800 text-zinc-400 border-zinc-700',
  violeta: 'bg-violet-500/10 text-violet-400 border-violet-500/25',
}

function Badge({ children, tono = 'zinc' }: { children: React.ReactNode; tono?: Tono }) {
  return (
    <span
      className={`inline-flex items-center text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border ${ESTILOS_TONO[tono]}`}
    >
      {children}
    </span>
  )
}

function ResumenCard({
  etiqueta,
  valor,
  detalle,
  tono = 'zinc',
}: {
  etiqueta: string
  valor: string
  detalle?: string
  tono?: Tono
}) {
  const colorValor: Record<Tono, string> = {
    verde: 'text-green-400',
    ambar: 'text-amber-400',
    rojo: 'text-red-400',
    azul: 'text-blue-400',
    zinc: 'text-white',
    violeta: 'text-violet-400',
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
      <p className="text-zinc-500 text-[10px] uppercase tracking-wider">{etiqueta}</p>
      <p className={`text-lg font-bold tabular-nums mt-1 ${colorValor[tono]}`}>{valor}</p>
      {detalle && <p className="text-zinc-600 text-[11px] mt-0.5">{detalle}</p>}
    </div>
  )
}

function Seccion({
  titulo,
  detalle,
  children,
}: {
  titulo: string
  detalle?: string
  children: React.ReactNode
}) {
  return (
    <section className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
      <div className="px-5 py-4 border-b border-zinc-800 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-white font-bold text-base">{titulo}</h2>
        {detalle && <span className="text-zinc-500 text-xs">{detalle}</span>}
      </div>
      <div className="p-4 sm:p-5">{children}</div>
    </section>
  )
}

function estadoCuota(cuota: Cuota): 'pagada' | 'mora' | 'vencida' | 'pendiente' {
  if (cuota.estado === 'pagada') return 'pagada'
  if (cuota.estado === 'mora') return 'mora'
  return new Date(cuota.fechaVencimiento).getTime() < Date.now() ? 'vencida' : 'pendiente'
}

function saldoCuota(cuota: Cuota) {
  return Number(cuota.montoOriginal) + Number(cuota.montoMora)
}

function saldoVenta(venta: VentaFinanciada) {
  return venta.cuotas
    .filter(cuota => estadoCuota(cuota) !== 'pagada')
    .reduce((acumulado, cuota) => acumulado + saldoCuota(cuota), 0)
}

function VentaFinanciadaCard({ venta }: { venta: VentaFinanciada }) {
  const pagadas = venta.cuotas.filter(cuota => estadoCuota(cuota) === 'pagada').length
  const pendientes = venta.cuotas.length - pagadas
  const saldo = saldoVenta(venta)
  const progreso = venta.totalCuotas > 0 ? Math.round((pagadas / venta.totalCuotas) * 100) : 0

  return (
    <div
      className={`rounded-xl border p-4 ${
        venta.anulada ? 'border-zinc-800 opacity-60' : 'border-zinc-800 bg-zinc-950/40'
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-white font-semibold text-sm">
              {venta.iphone.modelo} {venta.iphone.almacenamiento}
            </p>
            {venta.iphone.color && (
              <span className="text-zinc-500 text-xs">{venta.iphone.color}</span>
            )}
            {venta.anulada ? (
              <Badge tono="rojo">Anulada</Badge>
            ) : (
              <Badge tono={pendientes === 0 ? 'verde' : saldo > 0 ? 'ambar' : 'azul'}>
                {pendientes === 0 ? 'Al día' : `${pendientes} cuota${pendientes !== 1 ? 's' : ''} pendiente${pendientes !== 1 ? 's' : ''}`}
              </Badge>
            )}
          </div>
          <p className="text-zinc-500 text-xs mt-1">
            {venta.codigoOperacion ?? 'Sin código'} · {formatFechaHoraAR(venta.fechaVenta)}
          </p>
        </div>
        <div className="text-left sm:text-right shrink-0">
          <p className="text-zinc-500 text-[10px] uppercase tracking-wider">Saldo adeudado</p>
          <p className={`font-bold tabular-nums ${saldo > 0 ? 'text-amber-400' : 'text-green-400'}`}>
            {formatARS(saldo)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
        <div>
          <p className="text-zinc-500 text-[10px] uppercase tracking-wider">Precio</p>
          <p className="text-zinc-200 text-sm tabular-nums">{formatARS(venta.precioVenta)}</p>
        </div>
        <div>
          <p className="text-zinc-500 text-[10px] uppercase tracking-wider">Anticipo</p>
          <p className="text-zinc-200 text-sm tabular-nums">
            {formatARS(Number(venta.anticipoEfectivo) + Number(venta.anticipoEquipo))}
          </p>
        </div>
        <div>
          <p className="text-zinc-500 text-[10px] uppercase tracking-wider">Plan</p>
          <p className="text-zinc-200 text-sm">
            {venta.planPago} · {venta.totalCuotas} cuotas
          </p>
        </div>
        <div>
          <p className="text-zinc-500 text-[10px] uppercase tracking-wider">Cuota</p>
          <p className="text-zinc-200 text-sm tabular-nums">{formatARS(venta.montoCuota)}</p>
        </div>
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between text-[11px] text-zinc-500 mb-1">
          <span>
            {pagadas} de {venta.totalCuotas} cuotas pagadas
          </span>
          <span>{progreso}%</span>
        </div>
        <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
          <div
            className={`h-full rounded-full ${progreso === 100 ? 'bg-green-500' : 'bg-blue-500'}`}
            style={{ width: `${progreso}%` }}
          />
        </div>
      </div>

      {venta.anulada && venta.motivoAnulacion && (
        <p className="text-red-400 text-[11px] mt-3">Motivo de anulación: {venta.motivoAnulacion}</p>
      )}

      {venta.descripcionEquipo && (
        <p className="text-zinc-500 text-[11px] mt-3">
          Equipo entregado: <span className="text-zinc-300">{venta.descripcionEquipo}</span>
        </p>
      )}

      <details className="mt-3 group">
        <summary className="text-zinc-400 hover:text-white text-xs font-semibold cursor-pointer select-none">
          Ver cuotas ({venta.cuotas.length})
        </summary>
        <div className="mt-2 divide-y divide-zinc-800/80">
          {venta.cuotas.map(cuota => {
            const estado = estadoCuota(cuota)
            const tono: Tono =
              estado === 'pagada'
                ? 'verde'
                : estado === 'mora'
                  ? 'rojo'
                  : estado === 'vencida'
                    ? 'ambar'
                    : 'azul'
            return (
              <div
                key={cuota.id}
                className="py-2 flex flex-wrap items-center justify-between gap-2 text-xs"
              >
                <div className="flex items-center gap-2">
                  <span className="text-zinc-400 font-semibold">
                    Cuota {cuota.numeroCuota}/{venta.totalCuotas}
                  </span>
                  <Badge tono={tono}>
                    {estado === 'pagada'
                      ? 'Pagada'
                      : estado === 'mora'
                        ? 'Mora'
                        : estado === 'vencida'
                          ? 'Vencida'
                          : 'Pendiente'}
                  </Badge>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-zinc-500">
                    Vence {formatFechaAR(cuota.fechaVencimiento)}
                  </span>
                  <span
                    className={`font-semibold tabular-nums ${
                      estado === 'pagada' ? 'text-green-400' : 'text-zinc-200'
                    }`}
                  >
                    {formatARS(saldoCuota(cuota))}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </details>
    </div>
  )
}

function ReparacionCard({ reparacion }: { reparacion: Reparacion }) {
  const objetivo = Number(reparacion.montoFinal ?? reparacion.presupuesto)
  const pagado = reparacion.pagos
    .filter(pago => !pago.anulada)
    .reduce((acumulado, pago) => acumulado + Number(pago.monto), 0)
  const saldo = Math.max(objetivo - pagado, 0)
  const etiquetaEstado =
    ETIQUETAS_ESTADO_REPARACION[reparacion.estado as EstadoReparacion] ?? reparacion.estado

  return (
    <Link
      href={`/admin/reparaciones/${reparacion.id}`}
      className={`block rounded-xl border p-4 transition hover:border-zinc-600 ${
        reparacion.anulada ? 'border-zinc-800 opacity-60' : 'border-zinc-800 bg-zinc-950/40'
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-zinc-400 font-mono text-xs">{reparacion.codigoOperacion}</span>
            {reparacion.anulada ? (
              <Badge tono="rojo">Anulada</Badge>
            ) : (
              <Badge tono={reparacion.estado === 'entregado' ? 'verde' : 'azul'}>
                {etiquetaEstado}
              </Badge>
            )}
          </div>
          <p className="text-white font-semibold text-sm mt-1 wrap-break-word">
            {reparacion.equipo}
            {reparacion.modelo ? ` · ${reparacion.modelo}` : ''}
          </p>
          <p className="text-zinc-500 text-xs mt-0.5 line-clamp-2">{reparacion.falla}</p>
          <p className="text-zinc-600 text-[11px] mt-1">
            Ingreso {formatFechaHoraAR(reparacion.fechaIngreso)}
          </p>
        </div>
        <div className="text-left sm:text-right shrink-0">
          <p className="text-zinc-500 text-[10px] uppercase tracking-wider">Saldo</p>
          <p className={`font-bold tabular-nums ${saldo > 0 ? 'text-amber-400' : 'text-green-400'}`}>
            {formatARS(saldo)}
          </p>
          <p className="text-zinc-600 text-[10px] mt-0.5">
            Pagado {formatARS(pagado)} de {formatARS(objetivo)}
          </p>
        </div>
      </div>
    </Link>
  )
}

function CompraRow({ venta }: { venta: VentaContado }) {
  return (
    <div
      className={`py-3 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 ${
        venta.anulada ? 'opacity-60' : ''
      }`}
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-zinc-400 font-mono text-xs">{venta.codigoOperacion}</span>
          <Badge tono="violeta">Venta</Badge>
          {venta.anulada && <Badge tono="rojo">Anulada</Badge>}
        </div>
        <p className="text-zinc-200 text-sm mt-1 wrap-break-word">
          {venta.items
            .map(item => {
              const descripcion =
                item.producto?.nombre ??
                (item.iphone
                  ? `${item.iphone.modelo} ${item.iphone.almacenamiento}`
                  : 'Ítem')
              return `${item.cantidad}x ${descripcion}`
            })
            .join(' · ') || 'Sin detalle'}
        </p>
        <p className="text-zinc-600 text-[11px] mt-0.5">
          {formatFechaHoraAR(venta.fechaVenta)} ·{' '}
          {ETIQUETAS_METODO[venta.metodoPago] ?? venta.metodoPago}
        </p>
        <DesglosePago
          metodoPago={venta.metodoPago}
          montoEfectivo={venta.montoEfectivo}
          montoTransferencia={venta.montoTransferencia}
          montoTarjeta={venta.montoTarjeta}
        />
      </div>
      <span className="font-bold text-sm text-white tabular-nums shrink-0">
        {formatARS(venta.total)}
      </span>
    </div>
  )
}

export default function ClienteDetallePage() {
  const params = useParams<{ id: string }>()
  const id = params.id

  const [cliente, setCliente] = useState<Cliente | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!id) return
    let activo = true

    fetch(`/api/clientes/${id}`, { cache: 'no-store' })
      .then(async res => {
        const data = (await res.json()) as Cliente & { error?: string }
        if (!res.ok) throw new Error(data.error || 'No se pudo cargar el cliente')
        return data
      })
      .then(data => {
        if (activo) {
          setCliente(data)
          setCargando(false)
        }
      })
      .catch(e => {
        if (activo) {
          setError(e instanceof Error ? e.message : 'No se pudo cargar el cliente')
          setCargando(false)
        }
      })

    return () => {
      activo = false
    }
  }, [id])

  if (cargando) {
    return (
      <div className="mx-auto max-w-6xl p-4 md:p-8">
        <div className="skeleton h-3 w-24 rounded" />
        <div className="mt-4 skeleton h-8 w-64 max-w-full rounded" />
        <div className="mt-3 skeleton h-3 w-80 max-w-full rounded opacity-60" />
        <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="skeleton h-24 w-full rounded-2xl opacity-70" />
          ))}
        </div>
        <div className="mt-6 space-y-4">
          <div className="skeleton h-40 w-full rounded-2xl" />
          <div className="skeleton h-56 w-full rounded-2xl" />
        </div>
      </div>
    )
  }

  if (!cliente) {
    return (
      <div className="p-4 md:p-8 max-w-6xl mx-auto">
        <div className="p-4 rounded-xl text-sm font-semibold bg-red-500/10 text-red-400 border border-red-500/20">
          ❌ {error || 'No se encontró el cliente'}
        </div>
        <Link
          href="/admin/clientes"
          className="inline-block mt-4 px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-semibold transition"
        >
          Volver a clientes
        </Link>
      </div>
    )
  }

  const ventasFinanciadas = cliente.ventas
  const ventasActivas = ventasFinanciadas.filter(venta => !venta.anulada)

  const cuotasPendientes = ventasActivas
    .flatMap(venta =>
      venta.cuotas
        .filter(cuota => estadoCuota(cuota) !== 'pagada')
        .map(cuota => ({ cuota, venta })),
    )
    .sort(
      (a, b) =>
        new Date(a.cuota.fechaVencimiento).getTime() -
        new Date(b.cuota.fechaVencimiento).getTime(),
    )

  const saldoTotal = cuotasPendientes.reduce(
    (acumulado, item) => acumulado + saldoCuota(item.cuota),
    0,
  )

  const compras = cliente.ventasContado
  const totalCompras = compras
    .filter(venta => !venta.anulada)
    .reduce((acumulado, venta) => acumulado + Number(venta.total), 0)

  const reparacionesEnTaller = cliente.reparaciones.filter(
    reparacion => !reparacion.anulada && reparacion.estado !== 'entregado',
  )

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <Link
        href="/admin/clientes"
        className="text-zinc-500 hover:text-white text-xs font-semibold transition"
      >
        ← Volver a clientes
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-3 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white">
            {cliente.apellido}, {cliente.nombre}
          </h1>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-400 mt-2">
            <span>DNI {cliente.dni}</span>
            <span>📞 {cliente.telefono}</span>
            {cliente.email && <span>✉️ {cliente.email}</span>}
            {cliente.direccion && <span>📍 {cliente.direccion}</span>}
            <span className="text-zinc-600">Cliente desde {formatFechaAR(cliente.createdAt)}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
        <ResumenCard
          etiqueta="Saldo adeudado"
          valor={formatARS(saldoTotal)}
          detalle={`${cuotasPendientes.length} cuota${cuotasPendientes.length !== 1 ? 's' : ''} pendiente${cuotasPendientes.length !== 1 ? 's' : ''}`}
          tono={saldoTotal > 0 ? 'ambar' : 'verde'}
        />
        <ResumenCard
          etiqueta="iPhones financiados"
          valor={String(ventasActivas.length)}
          detalle={`${ventasFinanciadas.length - ventasActivas.length} anulada${ventasFinanciadas.length - ventasActivas.length !== 1 ? 's' : ''}`}
          tono="azul"
        />
        <ResumenCard
          etiqueta="En taller"
          valor={String(reparacionesEnTaller.length)}
          detalle={`${cliente.reparaciones.length} ingreso${cliente.reparaciones.length !== 1 ? 's' : ''} total${cliente.reparaciones.length !== 1 ? 'es' : ''}`}
          tono="violeta"
        />
        <ResumenCard
          etiqueta="Compras"
          valor={formatARS(totalCompras)}
          detalle={`${compras.length} operación${compras.length !== 1 ? 'es' : ''}`}
          tono="verde"
        />
        <ResumenCard
          etiqueta="Cuotas pagadas"
          valor={String(
            ventasActivas.reduce(
              (acumulado, venta) =>
                acumulado + venta.cuotas.filter(cuota => estadoCuota(cuota) === 'pagada').length,
              0,
            ),
          )}
          detalle="Historial al día"
          tono="zinc"
        />
      </div>

      <div className="space-y-5">
        <Seccion
          titulo="iPhones financiados"
          detalle={`${ventasFinanciadas.length} venta${ventasFinanciadas.length !== 1 ? 's' : ''}`}
        >
          {ventasFinanciadas.length === 0 ? (
            <p className="text-zinc-600 text-sm py-4 text-center">
              Este cliente no tiene iPhones financiados.
            </p>
          ) : (
            <div className="space-y-3">
              {ventasFinanciadas.map(venta => (
                <VentaFinanciadaCard key={venta.id} venta={venta} />
              ))}
            </div>
          )}
        </Seccion>

        <Seccion
          titulo="Cuotas pendientes"
          detalle={saldoTotal > 0 ? `Saldo adeudado ${formatARS(saldoTotal)}` : undefined}
        >
          {cuotasPendientes.length === 0 ? (
            <p className="text-zinc-600 text-sm py-4 text-center">
              No hay cuotas pendientes. El cliente está al día.
            </p>
          ) : (
            <div className="divide-y divide-zinc-800">
              {cuotasPendientes.map(({ cuota, venta }) => {
                const estado = estadoCuota(cuota)
                const tono: Tono =
                  estado === 'mora' ? 'rojo' : estado === 'vencida' ? 'ambar' : 'azul'
                return (
                  <div
                    key={cuota.id}
                    className="py-3 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-zinc-300 text-sm font-semibold">
                          {venta.iphone.modelo} {venta.iphone.almacenamiento}
                        </span>
                        <span className="text-zinc-500 text-xs">
                          Cuota {cuota.numeroCuota}/{venta.totalCuotas}
                        </span>
                        <Badge tono={tono}>
                          {estado === 'mora' ? 'Mora' : estado === 'vencida' ? 'Vencida' : 'Pendiente'}
                        </Badge>
                      </div>
                      <p className="text-zinc-600 text-[11px] mt-0.5">
                        {venta.codigoOperacion ?? 'Sin código'} · Vence{' '}
                        {formatFechaAR(cuota.fechaVencimiento)}
                        {Number(cuota.montoMora) > 0
                          ? ` · Mora ${formatARS(cuota.montoMora)}`
                          : ''}
                      </p>
                    </div>
                    <span className="font-bold text-sm text-amber-400 tabular-nums shrink-0">
                      {formatARS(saldoCuota(cuota))}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </Seccion>

        <Seccion
          titulo="Ingresos al taller"
          detalle={`${cliente.reparaciones.length} registro${cliente.reparaciones.length !== 1 ? 's' : ''}`}
        >
          {cliente.reparaciones.length === 0 ? (
            <p className="text-zinc-600 text-sm py-4 text-center">
              Este cliente no tiene ingresos al taller.
            </p>
          ) : (
            <div className="space-y-3">
              {cliente.reparaciones.map(reparacion => (
                <ReparacionCard key={reparacion.id} reparacion={reparacion} />
              ))}
            </div>
          )}
        </Seccion>

        <Seccion
          titulo="Compras"
          detalle={
            compras.length > 0
              ? `Total ${formatARS(totalCompras)} · ${compras.length} operación${compras.length !== 1 ? 'es' : ''}`
              : undefined
          }
        >
          {compras.length === 0 ? (
            <p className="text-zinc-600 text-sm py-4 text-center">
              Este cliente no tiene compras registradas.
            </p>
          ) : (
            <div className="divide-y divide-zinc-800">
              {compras.map(compra => (
                <CompraRow key={compra.id} venta={compra} />
              ))}
            </div>
          )}
        </Seccion>
      </div>
    </div>
  )
}
