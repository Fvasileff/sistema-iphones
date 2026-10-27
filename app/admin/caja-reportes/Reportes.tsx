'use client'

import { useEffect, useState } from 'react'
import { ETIQUETAS_ESTADO_REPARACION } from '@/lib/constantes'
import { fechaISOAR, formatFechaAR, formatFechaHoraAR } from '@/lib/fechas'
import { formatARS } from '@/lib/format'
import { useToast } from '@/app/components/ToastProvider'
import {
  ETIQUETAS_TIPO_OPERACION,
  TIPOS_OPERACION_REPORTE,
  type OperacionReporte,
  type TipoOperacionReporte,
} from '@/lib/reportes'

type Monto = number | string

interface ClienteDetalle {
  nombre: string
  apellido: string
  dni: string
  telefono?: string
  email?: string | null
  direccion?: string | null
}

interface IphoneDetalle {
  modelo: string
  variante: string | null
  color: string
  almacenamiento: string
}

interface ProductoDetalle {
  nombre: string
  sku?: string | null
  categoria?: string
}

interface ItemVentaDetalle {
  id: string
  cantidad: number
  precioUnitario: Monto
  subtotal: Monto
  producto: ProductoDetalle | null
  iphone: IphoneDetalle | null
}

interface PagoDetalle {
  id: string
  codigoOperacion: string
  monto: Monto
  montoMora?: Monto
  metodoPago: string
  fecha: string
  anulada: boolean
  motivoAnulacion?: string | null
  observaciones?: string | null
}

interface CuotaDetalle {
  id: string
  numeroCuota: number
  montoOriginal: Monto
  montoMora: Monto
  fechaVencimiento: string
  fechaPago: string | null
  estado: string
  pagos: PagoDetalle[]
}

interface VentaContadoDetalle {
  codigoOperacion: string
  fechaVenta: string
  total: Monto
  metodoPago: string
  montoEfectivo: Monto
  montoTransferencia: Monto
  montoTarjeta: Monto
  observaciones: string | null
  anulada: boolean
  motivoAnulacion: string | null
  cliente: ClienteDetalle | null
  items: ItemVentaDetalle[]
}

interface VentaFinanciadaDetalle {
  codigoOperacion: string | null
  fechaVenta: string
  precioVenta: Monto
  anticipoEfectivo: Monto
  metodoAnticipo: string
  anticipoEquipo: Monto
  descripcionEquipo: string | null
  planPago: string
  totalCuotas: number
  montoCuota: Monto
  interesPct: Monto
  anulada: boolean
  motivoAnulacion: string | null
  cliente: ClienteDetalle
  iphone: IphoneDetalle
  cuotas: CuotaDetalle[]
}

interface PagoCuotaDetalle extends PagoDetalle {
  cuota: CuotaDetalle & {
    venta: {
      codigoOperacion: string | null
      totalCuotas: number
      precioVenta: Monto
      cliente: ClienteDetalle
      iphone: IphoneDetalle
    }
  }
}

interface RepuestoDetalle {
  id: string
  cantidad: number
  precioUnitario: Monto
  subtotal: Monto
  anulada: boolean
  motivoAnulacion: string | null
  producto: ProductoDetalle
}

interface ReparacionDetalle {
  codigoOperacion: string
  equipo: string
  marca: string | null
  modelo: string | null
  falla: string
  diagnostico: string | null
  presupuesto: Monto
  montoFinal: Monto | null
  estado: string
  fechaIngreso: string
  fechaEntrega: string | null
  anulada: boolean
  motivoAnulacion: string | null
  cliente: ClienteDetalle
  repuestos: RepuestoDetalle[]
  pagos: PagoDetalle[]
}

interface PagoReparacionDetalle extends PagoDetalle {
  concepto: string | null
  reparacion: ReparacionDetalle
}

interface RepuestoReparacionDetalle extends RepuestoDetalle {
  reparacion: ReparacionDetalle
}

interface MovimientoCajaDetalle {
  id: string
  tipo: string
  metodoPago: string
  monto: Monto
  montoEfectivo: Monto
  montoTransferencia: Monto
  montoTarjeta: Monto
  descripcion: string | null
  codigoOperacion: string | null
  createdAt: string
  anulada: boolean
  motivoAnulacion: string | null
  caja: { id: string; fechaDia: string; estado: string }
}

interface ResumenOperaciones {
  total: number
  cobrado: number
  anuladas: number
  ventasContado: number
  ventasFinanciadas: number
  montoVentas: number
}

interface RespuestaOperaciones {
  operaciones: OperacionReporte[]
  total: number
  pagina: number
  limite: number
  totalPaginas: number
  resumen: ResumenOperaciones
}

interface Filtros {
  desde: string
  hasta: string
  tipos: TipoOperacionReporte[]
  metodo: string
  busqueda: string
}

const ETIQUETAS_METODO: Record<string, string> = {
  efectivo: 'Efectivo',
  transferencia: 'Transferencia',
  tarjeta: 'Tarjeta',
  mixto: 'Mixto',
}

const ETIQUETAS_ESTADO_CUOTA: Record<string, string> = {
  pendiente: 'Pendiente',
  pagada: 'Pagada',
  vencida: 'Vencida',
  mora: 'En mora',
}

const inputClass =
  'w-full px-4 py-2.5 rounded-xl border border-zinc-700 bg-zinc-900 text-white text-sm placeholder-zinc-600 focus:outline-none focus:border-blue-500 transition-colors'

function filtrosIniciales(): Filtros {
  const hoy = fechaISOAR(new Date())
  const [anio, mes] = hoy.split('-')
  return {
    desde: `${anio}-${mes}-01`,
    hasta: hoy,
    tipos: [],
    metodo: '',
    busqueda: '',
  }
}

interface PeriodoRapido {
  id: string
  label: string
  desde: string
  hasta: string
}

function obtenerPeriodosRapidos(): PeriodoRapido[] {
  const hoy = fechaISOAR(new Date())
  if (!hoy) return []

  const [anio, mes, dia] = hoy.split('-').map(Number)
  const pad = (valor: number) => String(valor).padStart(2, '0')
  const fechaUTC = (fecha: Date) =>
    `${fecha.getUTCFullYear()}-${pad(fecha.getUTCMonth() + 1)}-${pad(fecha.getUTCDate())}`

  const base = new Date(Date.UTC(anio, mes - 1, dia))
  const diaSemana = base.getUTCDay()
  const diasDesdeLunes = (diaSemana + 6) % 7
  const inicioSemana = new Date(
    Date.UTC(anio, mes - 1, dia - diasDesdeLunes),
  )

  return [
    { id: 'hoy', label: 'Hoy', desde: hoy, hasta: hoy },
    {
      id: 'semana',
      label: 'Esta semana',
      desde: fechaUTC(inicioSemana),
      hasta: hoy,
    },
    {
      id: 'mes',
      label: 'Este mes',
      desde: `${anio}-${pad(mes)}-01`,
      hasta: hoy,
    },
    {
      id: 'anio',
      label: 'Este año',
      desde: `${anio}-01-01`,
      hasta: hoy,
    },
  ]
}

function etiquetaMetodo(metodo: string | null | undefined) {
  if (!metodo) return '—'
  return ETIQUETAS_METODO[metodo] ?? metodo
}

function nombreCliente(cliente: ClienteDetalle | null | undefined) {
  if (!cliente) return 'Consumidor final'
  return `${cliente.apellido}, ${cliente.nombre}`
}

function nombreItem(item: ItemVentaDetalle) {
  if (item.producto) return item.producto.nombre
  if (item.iphone) {
    return `${item.iphone.modelo} ${item.iphone.almacenamiento} ${item.iphone.color}`
  }
  return 'Ítem'
}

function Campo({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
        {label}
      </label>
      {children}
    </div>
  )
}

function Dato({
  label,
  valor,
  className = '',
}: {
  label: string
  valor: React.ReactNode
  className?: string
}) {
  return (
    <div className={`min-w-0 ${className}`}>
      <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">{label}</p>
      <div className="text-sm text-white mt-0.5 wrap-break-word">{valor}</div>
    </div>
  )
}

function Bloque({
  titulo,
  children,
}: {
  titulo: string
  children: React.ReactNode
}) {
  return (
    <section className="border-t border-zinc-800 pt-4 mt-4 first:border-0 first:pt-0 first:mt-0">
      <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">{titulo}</h3>
      {children}
    </section>
  )
}

function EstadoOperacion({
  anulada,
  motivo,
}: {
  anulada: boolean
  motivo?: string | null
}) {
  if (!anulada) {
    return (
      <span className="inline-flex items-center text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 border border-green-500/20">
        Activa
      </span>
    )
  }

  return (
    <div className="inline-flex flex-col gap-1">
      <span className="self-start text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">
        Anulada
      </span>
      {motivo && <span className="text-[11px] text-red-400/80">{motivo}</span>}
    </div>
  )
}

function DesglosePago({
  efectivo,
  transferencia,
  tarjeta,
}: {
  efectivo: Monto
  transferencia: Monto
  tarjeta: Monto
}) {
  const pagos = [
    { etiqueta: 'Efectivo', monto: Number(efectivo) },
    { etiqueta: 'Transferencia', monto: Number(transferencia) },
    { etiqueta: 'Tarjeta', monto: Number(tarjeta) },
  ].filter(pago => pago.monto !== 0)

  if (pagos.length === 0) return null

  return (
    <div className="flex flex-wrap gap-2">
      {pagos.map(pago => (
        <span
          key={pago.etiqueta}
          className="text-xs bg-zinc-950 border border-zinc-800 text-zinc-300 px-2.5 py-1 rounded-lg"
        >
          {pago.etiqueta}: <span className="font-semibold text-white">{formatARS(pago.monto)}</span>
        </span>
      ))}
    </div>
  )
}

function ClienteInfo({ cliente }: { cliente: ClienteDetalle | null }) {
  if (!cliente) {
    return <p className="text-sm text-zinc-500">Consumidor final</p>
  }

  return (
    <div className="grid sm:grid-cols-2 gap-3">
      <Dato label="Cliente" valor={nombreCliente(cliente)} />
      <Dato label="DNI" valor={cliente.dni} />
      <Dato label="Teléfono" valor={cliente.telefono ?? '—'} />
      <Dato label="Email" valor={cliente.email ?? '—'} />
    </div>
  )
}

function TarjetasResumen({ resumen }: { resumen: ResumenOperaciones }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
        <p className="text-zinc-500 text-[11px] font-bold uppercase tracking-wider">Monto vendido</p>
        <p className="text-xl font-bold text-blue-400 mt-1 tabular-nums">
          {formatARS(resumen.montoVentas)}
        </p>
        <p className="text-[11px] text-zinc-600 mt-1">
          {resumen.ventasContado} contado · {resumen.ventasFinanciadas} financiadas
        </p>
      </div>
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
        <p className="text-zinc-500 text-[11px] font-bold uppercase tracking-wider">Cobrado</p>
        <p className="text-xl font-bold text-green-400 mt-1 tabular-nums">
          {formatARS(resumen.cobrado)}
        </p>
        <p className="text-[11px] text-zinc-600 mt-1">Efectivo, transferencia y tarjeta</p>
      </div>
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
        <p className="text-zinc-500 text-[11px] font-bold uppercase tracking-wider">Operaciones</p>
        <p className="text-xl font-bold text-white mt-1 tabular-nums">{resumen.total}</p>
        <p className="text-[11px] text-zinc-600 mt-1">Registros encontrados</p>
      </div>
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
        <p className="text-zinc-500 text-[11px] font-bold uppercase tracking-wider">Anuladas</p>
        <p className="text-xl font-bold text-red-400 mt-1 tabular-nums">{resumen.anuladas}</p>
        <p className="text-[11px] text-zinc-600 mt-1">No suman al cobrado</p>
      </div>
    </div>
  )
}

function DetalleVentaContado({ detalle }: { detalle: VentaContadoDetalle }) {
  return (
    <>
      <ClienteInfo cliente={detalle.cliente} />

      <Bloque titulo="Ítems">
        <div className="space-y-2">
          {detalle.items.map(item => (
            <div
              key={item.id}
              className="flex items-start justify-between gap-3 bg-zinc-950 border border-zinc-800 rounded-xl p-3"
            >
              <div className="min-w-0">
                <p className="text-sm text-white font-semibold wrap-break-word">{nombreItem(item)}</p>
                <p className="text-[11px] text-zinc-500 mt-0.5">
                  {item.cantidad} x {formatARS(item.precioUnitario)}
                </p>
              </div>
              <span className="text-sm font-bold text-white shrink-0">
                {formatARS(item.subtotal)}
              </span>
            </div>
          ))}
        </div>
      </Bloque>

      <Bloque titulo="Pago">
        <div className="grid sm:grid-cols-2 gap-3">
          <Dato label="Método" valor={etiquetaMetodo(detalle.metodoPago)} />
          <Dato label="Total" valor={<span className="font-bold">{formatARS(detalle.total)}</span>} />
          <Dato label="Observaciones" valor={detalle.observaciones ?? '—'} className="sm:col-span-2" />
        </div>
        <div className="mt-3">
          <DesglosePago
            efectivo={detalle.montoEfectivo}
            transferencia={detalle.montoTransferencia}
            tarjeta={detalle.montoTarjeta}
          />
        </div>
      </Bloque>
    </>
  )
}

function DetalleVentaFinanciada({
  detalle,
  tipo,
}: {
  detalle: VentaFinanciadaDetalle
  tipo: TipoOperacionReporte
}) {
  return (
    <>
      <ClienteInfo cliente={detalle.cliente} />

      <Bloque titulo="Equipo">
        <div className="grid sm:grid-cols-2 gap-3">
          <Dato
            label="iPhone"
            valor={`${detalle.iphone.modelo} ${detalle.iphone.almacenamiento} ${detalle.iphone.color}`}
          />
          <Dato label="Precio de venta" valor={formatARS(detalle.precioVenta)} />
        </div>
      </Bloque>

      <Bloque titulo={tipo === 'anticipo_financiacion' ? 'Anticipo' : 'Plan de pago'}>
        <div className="grid sm:grid-cols-2 gap-3">
          <Dato label="Anticipo" valor={formatARS(detalle.anticipoEfectivo)} />
          <Dato label="Método del anticipo" valor={etiquetaMetodo(detalle.metodoAnticipo)} />
          <Dato label="Plan" valor={detalle.planPago} />
          <Dato label="Cuotas" valor={`${detalle.totalCuotas} de ${formatARS(detalle.montoCuota)}`} />
          <Dato label="Interés" valor={`${Number(detalle.interesPct)}%`} />
          <Dato label="Equipo entregado" valor={detalle.descripcionEquipo ?? '—'} />
          <Dato label="Valor equipo entregado" valor={formatARS(detalle.anticipoEquipo)} />
        </div>
      </Bloque>

      <Bloque titulo="Cuotas">
        <div className="space-y-2">
          {detalle.cuotas.map(cuota => {
            const pagado = cuota.pagos.reduce((acc, pago) => acc + Number(pago.monto), 0)
            return (
              <div
                key={cuota.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-zinc-950 border border-zinc-800 rounded-xl p-3"
              >
                <div>
                  <p className="text-sm text-white font-semibold">
                    Cuota {cuota.numeroCuota}/{detalle.totalCuotas}
                  </p>
                  <p className="text-[11px] text-zinc-500">
                    Vence {formatFechaAR(cuota.fechaVencimiento)}
                    {cuota.fechaPago ? ` · Pagada ${formatFechaAR(cuota.fechaPago)}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border ${
                      cuota.estado === 'pagada'
                        ? 'bg-green-500/10 text-green-400 border-green-500/20'
                        : cuota.estado === 'mora' || cuota.estado === 'vencida'
                          ? 'bg-red-500/10 text-red-400 border-red-500/20'
                          : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                    }`}
                  >
                    {ETIQUETAS_ESTADO_CUOTA[cuota.estado] ?? cuota.estado}
                  </span>
                  <span className="text-sm font-bold text-white tabular-nums">
                    {formatARS(Number(cuota.montoOriginal) + Number(cuota.montoMora))}
                  </span>
                  {pagado > 0 && (
                    <span className="text-[11px] text-green-400">Pagado {formatARS(pagado)}</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </Bloque>
    </>
  )
}

function DetallePagoCuota({ detalle }: { detalle: PagoCuotaDetalle }) {
  return (
    <>
      <ClienteInfo cliente={detalle.cuota.venta.cliente} />

      <Bloque titulo="Pago">
        <div className="grid sm:grid-cols-2 gap-3">
          <Dato label="Monto" valor={formatARS(detalle.monto)} />
          <Dato label="Mora" valor={formatARS(detalle.montoMora ?? 0)} />
          <Dato label="Método" valor={etiquetaMetodo(detalle.metodoPago)} />
          <Dato label="Fecha" valor={formatFechaHoraAR(detalle.fecha)} />
          <Dato label="Observaciones" valor={detalle.observaciones ?? '—'} className="sm:col-span-2" />
        </div>
      </Bloque>

      <Bloque titulo="Operación financiada">
        <div className="grid sm:grid-cols-2 gap-3">
          <Dato label="Venta" valor={detalle.cuota.venta.codigoOperacion ?? '—'} />
          <Dato
            label="iPhone"
            valor={`${detalle.cuota.venta.iphone.modelo} ${detalle.cuota.venta.iphone.almacenamiento}`}
          />
          <Dato
            label="Cuota"
            valor={`${detalle.cuota.numeroCuota}/${detalle.cuota.venta.totalCuotas}`}
          />
          <Dato label="Vencimiento" valor={formatFechaAR(detalle.cuota.fechaVencimiento)} />
          <Dato label="Estado de cuota" valor={ETIQUETAS_ESTADO_CUOTA[detalle.cuota.estado] ?? detalle.cuota.estado} />
          <Dato label="Precio de venta" valor={formatARS(detalle.cuota.venta.precioVenta)} />
        </div>
      </Bloque>
    </>
  )
}

function TablaRepuestos({ repuestos }: { repuestos: RepuestoDetalle[] }) {
  if (repuestos.length === 0) {
    return <p className="text-sm text-zinc-500">Sin repuestos asociados.</p>
  }

  return (
    <div className="space-y-2">
      {repuestos.map(repuesto => (
        <div
          key={repuesto.id}
          className="flex items-start justify-between gap-3 bg-zinc-950 border border-zinc-800 rounded-xl p-3"
        >
          <div className="min-w-0">
            <p className="text-sm text-white font-semibold wrap-break-word">
              {repuesto.producto.nombre}
            </p>
            <p className="text-[11px] text-zinc-500 mt-0.5">
              {repuesto.cantidad} x {formatARS(repuesto.precioUnitario)}
              {repuesto.anulada ? ' · Anulado' : ''}
            </p>
          </div>
          <span className="text-sm font-bold text-white shrink-0">
            {formatARS(repuesto.subtotal)}
          </span>
        </div>
      ))}
    </div>
  )
}

function DetallePagoReparacion({ detalle }: { detalle: PagoReparacionDetalle }) {
  return (
    <>
      <ClienteInfo cliente={detalle.reparacion.cliente} />

      <Bloque titulo="Pago">
        <div className="grid sm:grid-cols-2 gap-3">
          <Dato label="Monto" valor={formatARS(detalle.monto)} />
          <Dato label="Método" valor={etiquetaMetodo(detalle.metodoPago)} />
          <Dato label="Concepto" valor={detalle.concepto ?? '—'} />
          <Dato label="Fecha" valor={formatFechaHoraAR(detalle.fecha)} />
          <Dato label="Observaciones" valor={detalle.observaciones ?? '—'} className="sm:col-span-2" />
        </div>
      </Bloque>

      <Bloque titulo="Reparación">
        <div className="grid sm:grid-cols-2 gap-3">
          <Dato label="Código" valor={detalle.reparacion.codigoOperacion} />
          <Dato label="Equipo" valor={[detalle.reparacion.equipo, detalle.reparacion.marca, detalle.reparacion.modelo].filter(Boolean).join(' · ')} />
          <Dato label="Estado" valor={ETIQUETAS_ESTADO_REPARACION[detalle.reparacion.estado as keyof typeof ETIQUETAS_ESTADO_REPARACION] ?? detalle.reparacion.estado} />
          <Dato label="Presupuesto" valor={formatARS(detalle.reparacion.presupuesto)} />
          <Dato label="Monto final" valor={detalle.reparacion.montoFinal ? formatARS(detalle.reparacion.montoFinal) : '—'} />
          <Dato label="Falla" valor={detalle.reparacion.falla} className="sm:col-span-2" />
        </div>
      </Bloque>

      <Bloque titulo="Repuestos usados">
        <TablaRepuestos repuestos={detalle.reparacion.repuestos} />
      </Bloque>
    </>
  )
}

function DetalleRepuesto({ detalle }: { detalle: RepuestoReparacionDetalle }) {
  return (
    <>
      <ClienteInfo cliente={detalle.reparacion.cliente} />

      <Bloque titulo="Repuesto">
        <div className="grid sm:grid-cols-2 gap-3">
          <Dato label="Producto" valor={detalle.producto.nombre} />
          <Dato label="SKU" valor={detalle.producto.sku ?? '—'} />
          <Dato label="Cantidad" valor={detalle.cantidad} />
          <Dato label="Precio unitario" valor={formatARS(detalle.precioUnitario)} />
          <Dato label="Subtotal" valor={formatARS(detalle.subtotal)} />
          <Dato label="Estado" valor={detalle.anulada ? 'Anulado' : 'Activo'} />
        </div>
      </Bloque>

      <Bloque titulo="Reparación">
        <div className="grid sm:grid-cols-2 gap-3">
          <Dato label="Código" valor={detalle.reparacion.codigoOperacion} />
          <Dato label="Equipo" valor={[detalle.reparacion.equipo, detalle.reparacion.marca, detalle.reparacion.modelo].filter(Boolean).join(' · ')} />
          <Dato label="Estado" valor={ETIQUETAS_ESTADO_REPARACION[detalle.reparacion.estado as keyof typeof ETIQUETAS_ESTADO_REPARACION] ?? detalle.reparacion.estado} />
          <Dato label="Ingreso" valor={formatFechaAR(detalle.reparacion.fechaIngreso)} />
        </div>
      </Bloque>
    </>
  )
}

function DetalleMovimiento({ detalle }: { detalle: MovimientoCajaDetalle }) {
  return (
    <>
      <Bloque titulo="Movimiento">
        <div className="grid sm:grid-cols-2 gap-3">
          <Dato label="Tipo" valor={detalle.tipo} />
          <Dato label="Método" valor={etiquetaMetodo(detalle.metodoPago)} />
          <Dato label="Monto" valor={<span className="font-bold">{formatARS(detalle.monto)}</span>} />
          <Dato label="Fecha" valor={formatFechaHoraAR(detalle.createdAt)} />
          <Dato label="Descripción" valor={detalle.descripcion ?? '—'} className="sm:col-span-2" />
          <Dato label="Caja" valor={formatFechaAR(detalle.caja.fechaDia)} />
          <Dato label="Estado de caja" valor={detalle.caja.estado} />
        </div>
        <div className="mt-3">
          <DesglosePago
            efectivo={detalle.montoEfectivo}
            transferencia={detalle.montoTransferencia}
            tarjeta={detalle.montoTarjeta}
          />
        </div>
      </Bloque>
    </>
  )
}

function ContenidoDetalle({
  tipo,
  detalle,
}: {
  tipo: TipoOperacionReporte
  detalle: unknown
}) {
  if (tipo === 'venta_contado') {
    return <DetalleVentaContado detalle={detalle as VentaContadoDetalle} />
  }
  if (tipo === 'venta_financiada' || tipo === 'anticipo_financiacion') {
    return (
      <DetalleVentaFinanciada
        detalle={detalle as VentaFinanciadaDetalle}
        tipo={tipo}
      />
    )
  }
  if (tipo === 'pago_cuota') {
    return <DetallePagoCuota detalle={detalle as PagoCuotaDetalle} />
  }
  if (tipo === 'pago_reparacion') {
    return <DetallePagoReparacion detalle={detalle as PagoReparacionDetalle} />
  }
  if (tipo === 'repuesto_reparacion') {
    return <DetalleRepuesto detalle={detalle as RepuestoReparacionDetalle} />
  }
  return <DetalleMovimiento detalle={detalle as MovimientoCajaDetalle} />
}

function ModalDetalle({
  operacion,
  onClose,
}: {
  operacion: OperacionReporte
  onClose: () => void
}) {
  const [detalle, setDetalle] = useState<unknown>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let activo = true

    fetch(`/api/reportes/operaciones/${operacion.tipo}/${operacion.id}`, {
      cache: 'no-store',
    })
      .then(async res => {
        const data = (await res.json()) as { detalle?: unknown; error?: string }
        if (!activo) return
        if (!res.ok) throw new Error(data.error || 'No se pudo cargar el detalle')
        setDetalle(data.detalle)
      })
      .catch(e => {
        if (activo) setError(e instanceof Error ? e.message : 'No se pudo cargar el detalle')
      })
      .finally(() => {
        if (activo) setCargando(false)
      })

    return () => {
      activo = false
    }
  }, [operacion.id, operacion.tipo])

  return (
    <div
      className="animate-fade-in fixed inset-0 z-50 flex items-end justify-center bg-black/75 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onMouseDown={e => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="animate-modal-in max-h-[92vh] w-full overflow-y-auto rounded-t-2xl border border-zinc-700 bg-zinc-900 shadow-2xl shadow-black/50 sm:max-w-2xl sm:rounded-2xl">
        <div className="sticky top-0 z-10 bg-zinc-900 border-b border-zinc-800 px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-300 border border-blue-500/20">
                  {ETIQUETAS_TIPO_OPERACION[operacion.tipo]}
                </span>
                <EstadoOperacion anulada={operacion.anulada} />
              </div>
              <h2 className="text-white font-bold text-lg mt-1">
                {operacion.codigo ?? 'Detalle de operación'}
              </h2>
              <p className="text-zinc-500 text-xs mt-0.5">
                {formatFechaHoraAR(operacion.fecha)}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-zinc-500 hover:text-white p-1.5 rounded-lg hover:bg-zinc-800 transition shrink-0"
              aria-label="Cerrar detalle"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="p-5">
          {cargando ? (
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="skeleton h-12 w-full rounded-xl opacity-70" />
                ))}
              </div>
              <div className="skeleton h-24 w-full rounded-xl opacity-60" />
              <div className="skeleton h-32 w-full rounded-xl opacity-50" />
            </div>
          ) : error ? (
            <div className="p-4 rounded-xl text-sm font-semibold bg-red-500/10 text-red-400 border border-red-500/20">
              ❌ {error}
            </div>
          ) : (
            <ContenidoDetalle tipo={operacion.tipo} detalle={detalle} />
          )}
        </div>

        <div className="border-t border-zinc-800 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-sm font-semibold transition"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}

function BadgeTipo({ tipo }: { tipo: TipoOperacionReporte }) {
  const colores: Record<TipoOperacionReporte, string> = {
    venta_contado: 'bg-blue-500/10 text-blue-300 border-blue-500/20',
    venta_financiada: 'bg-violet-500/10 text-violet-300 border-violet-500/20',
    anticipo_financiacion: 'bg-fuchsia-500/10 text-fuchsia-300 border-fuchsia-500/20',
    pago_cuota: 'bg-green-500/10 text-green-300 border-green-500/20',
    pago_reparacion: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/20',
    repuesto_reparacion: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
    movimiento_caja: 'bg-zinc-500/10 text-zinc-300 border-zinc-500/20',
  }

  return (
    <span
      className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border ${colores[tipo]}`}
    >
      {ETIQUETAS_TIPO_OPERACION[tipo]}
    </span>
  )
}


function ModalAnular({
  operacion,
  onClose,
  onConfirm,
  procesando,
  error,
}: {
  operacion: OperacionReporte
  onClose: () => void
  onConfirm: (motivo: string) => void
  procesando: boolean
  error: string
}) {
  const [motivo, setMotivo] = useState('')
  const valido = motivo.trim().length >= 3

  return (
    <div
      className="animate-fade-in fixed inset-0 z-60 flex items-end justify-center bg-black/75 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onMouseDown={e => {
        if (e.target === e.currentTarget && !procesando) onClose()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Anular operación"
        className="animate-modal-in w-full rounded-t-2xl border border-zinc-700 bg-zinc-900 p-5 shadow-2xl shadow-black/50 sm:max-w-md sm:rounded-2xl sm:p-6"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-white">Anular operación</h2>
            <p className="mt-1 text-xs text-zinc-500">
              Esta acción revierte el stock y los movimientos de caja asociados.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={procesando}
            className="shrink-0 rounded-lg p-1.5 text-zinc-500 transition hover:bg-zinc-800 hover:text-white disabled:opacity-50"
            aria-label="Cerrar"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="mb-4 rounded-xl border border-zinc-800 bg-zinc-950/60 p-3.5">
          <div className="flex flex-wrap items-center gap-2">
            <BadgeTipo tipo={operacion.tipo} />
            <span className="text-sm font-bold text-white">
              {operacion.codigo ?? 'Sin código'}
            </span>
          </div>
          <p className="mt-2 text-xs text-zinc-400">{operacion.resumen}</p>
          <p className="mt-1 text-xs text-zinc-500">
            {formatFechaHoraAR(operacion.fecha)} · {formatARS(operacion.monto)}
          </p>
        </div>

        <div className="mb-4 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-200">
          La operación quedará marcada como anulada. No se puede deshacer.
        </div>

        <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
          Motivo de anulación <span className="text-blue-400">*</span>
        </label>
        <textarea
          value={motivo}
          onChange={e => setMotivo(e.target.value)}
          placeholder="Indicá el motivo (mínimo 3 caracteres)"
          maxLength={300}
          rows={3}
          disabled={procesando}
          className="w-full resize-y rounded-xl border border-zinc-700/80 bg-zinc-950/60 px-3.5 py-2.5 text-sm text-white placeholder-zinc-600 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:opacity-60"
          autoFocus
        />
        <p className="mt-1 text-right text-[10px] text-zinc-600">{motivo.length}/300</p>

        {error && (
          <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 px-3.5 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={procesando}
            className="flex-1 rounded-xl bg-zinc-800 py-2.5 text-sm font-semibold text-zinc-300 transition hover:bg-zinc-700 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => onConfirm(motivo.trim())}
            disabled={!valido || procesando}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-600 py-2.5 text-sm font-bold text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {procesando && (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            )}
            {procesando ? 'Anulando...' : 'Confirmar anulación'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function ReportesPage() {
  const toast = useToast()
  const inicial = filtrosIniciales()
  const [borrador, setBorrador] = useState<Filtros>(inicial)
  const [filtros, setFiltros] = useState<Filtros>(inicial)
  const [pagina, setPagina] = useState(1)
  const [datos, setDatos] = useState<RespuestaOperaciones | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [seleccionada, setSeleccionada] = useState<OperacionReporte | null>(null)
  const [operacionAnular, setOperacionAnular] = useState<OperacionReporte | null>(null)
  const [anulando, setAnulando] = useState(false)
  const [errorAnulacion, setErrorAnulacion] = useState('')
  const [version, setVersion] = useState(0)

  useEffect(() => {
    let activo = true
    const params = new URLSearchParams({
      desde: filtros.desde,
      hasta: filtros.hasta,
      page: String(pagina),
      limit: '50',
    })

    if (filtros.tipos.length > 0) params.set('tipo', filtros.tipos.join(','))
    if (filtros.metodo) params.set('metodo', filtros.metodo)
    if (filtros.busqueda) params.set('busqueda', filtros.busqueda)

    fetch(`/api/reportes/operaciones?${params.toString()}`, { cache: 'no-store' })
      .then(async res => {
        const data = (await res.json()) as RespuestaOperaciones & { error?: string }
        if (!activo) return
        if (!res.ok) throw new Error(data.error || 'No se pudieron cargar las operaciones')
        setDatos(data)
      })
      .catch(e => {
        if (activo) {
          setDatos(null)
          setError(e instanceof Error ? e.message : 'No se pudieron cargar las operaciones')
        }
      })
      .finally(() => {
        if (activo) setCargando(false)
      })

    return () => {
      activo = false
    }
  }, [filtros, pagina, version])

  const aplicar = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!borrador.desde || !borrador.hasta) {
      setError('Indicá la fecha desde y hasta.')
      return
    }

    if (borrador.desde > borrador.hasta) {
      setError('La fecha desde no puede ser posterior a la fecha hasta.')
      return
    }

    setCargando(true)
    setFiltros({ ...borrador, tipos: [...borrador.tipos], busqueda: borrador.busqueda.trim() })
    setPagina(1)
  }

  const limpiar = () => {
    const nuevos = filtrosIniciales()
    setCargando(true)
    setBorrador(nuevos)
    setFiltros(nuevos)
    setPagina(1)
    setError('')
  }

  const alternarTipo = (tipo: TipoOperacionReporte) => {
    setBorrador(actual => ({
      ...actual,
      tipos: actual.tipos.includes(tipo)
        ? actual.tipos.filter(item => item !== tipo)
        : [...actual.tipos, tipo],
    }))
  }

  const abrirAnulacion = (operacion: OperacionReporte) => {
    setErrorAnulacion('')
    setOperacionAnular(operacion)
  }

  const anularOperacion = async (motivo: string) => {
    if (!operacionAnular) return

    setAnulando(true)
    setErrorAnulacion('')

    try {
      const res = await fetch(
        `/api/reportes/operaciones/${operacionAnular.tipo}/${operacionAnular.id}/anular`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ motivo }),
        },
      )
      const data = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok) throw new Error(data.error || 'No se pudo anular la operación')

      setOperacionAnular(null)
      toast.success('Operación anulada. Stock y caja actualizados.')
      setCargando(true)
      setVersion(actual => actual + 1)
    } catch (e) {
      setErrorAnulacion(e instanceof Error ? e.message : 'No se pudo anular la operación')
    } finally {
      setAnulando(false)
    }
  }

  const operaciones = datos?.operaciones ?? []
  const periodosRapidos = obtenerPeriodosRapidos()
  const periodoActivo = periodosRapidos.find(
    periodo =>
      periodo.desde === borrador.desde && periodo.hasta === borrador.hasta,
  )?.id

  const aplicarPeriodo = (periodo: PeriodoRapido) => {
    const nuevos = { ...borrador, desde: periodo.desde, hasta: periodo.hasta }
    setBorrador(nuevos)
    setError('')
    setCargando(true)
    setFiltros({
      ...nuevos,
      tipos: [...nuevos.tipos],
      busqueda: nuevos.busqueda.trim(),
    })
    setPagina(1)
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-white">Reportes</h1>
        <p className="text-zinc-500 text-sm mt-1">
          Historial completo de ventas, cobros, repuestos y movimientos de caja.
        </p>
      </div>

      <form
        onSubmit={aplicar}
        className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 space-y-4 mb-5"
      >
        <div className="flex flex-col gap-2.5 rounded-xl border border-zinc-800/80 bg-zinc-950/45 p-3 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
            Período rápido
          </span>
          <div className="flex flex-wrap gap-1.5">
            {periodosRapidos.map(periodo => (
              <button
                key={periodo.id}
                type="button"
                onClick={() => aplicarPeriodo(periodo)}
                aria-pressed={periodoActivo === periodo.id}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition ${
                  periodoActivo === periodo.id
                    ? 'bg-blue-600 text-white border-blue-500'
                    : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-white hover:border-zinc-700'
                }`}
              >
                {periodo.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Campo label="Desde">
            <input
              type="date"
              value={borrador.desde}
              onChange={e => setBorrador(actual => ({ ...actual, desde: e.target.value }))}
              className={inputClass}
            />
          </Campo>
          <Campo label="Hasta">
            <input
              type="date"
              value={borrador.hasta}
              onChange={e => setBorrador(actual => ({ ...actual, hasta: e.target.value }))}
              className={inputClass}
            />
          </Campo>
          <Campo label="Método de pago">
            <select
              value={borrador.metodo}
              onChange={e => setBorrador(actual => ({ ...actual, metodo: e.target.value }))}
              className={inputClass}
            >
              <option value="">Todos</option>
              <option value="efectivo">Efectivo</option>
              <option value="transferencia">Transferencia</option>
              <option value="tarjeta">Tarjeta</option>
              <option value="mixto">Mixto</option>
            </select>
          </Campo>
          <Campo label="Buscar">
            <input
              type="search"
              value={borrador.busqueda}
              onChange={e => setBorrador(actual => ({ ...actual, busqueda: e.target.value }))}
              placeholder="Código, cliente, DNI..."
              maxLength={100}
              className={inputClass}
            />
          </Campo>
        </div>

        <div>
          <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">
            Tipo de operación
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setBorrador(actual => ({ ...actual, tipos: [] }))}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition ${
                borrador.tipos.length === 0
                  ? 'bg-blue-600 text-white border-blue-500'
                  : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-white'
              }`}
            >
              Todos
            </button>
            {TIPOS_OPERACION_REPORTE.map(tipo => (
              <button
                key={tipo}
                type="button"
                onClick={() => alternarTipo(tipo)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition ${
                  borrador.tipos.includes(tipo)
                    ? 'bg-blue-600 text-white border-blue-500'
                    : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-white'
                }`}
              >
                {ETIQUETAS_TIPO_OPERACION[tipo]}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-end gap-2">
          <button
            type="button"
            onClick={limpiar}
            className="px-4 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-300 hover:text-white text-sm font-semibold transition"
          >
            Limpiar
          </button>
          <button
            type="submit"
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold transition"
          >
            Aplicar filtros
          </button>
        </div>
      </form>

      {error && (
        <div className="p-4 rounded-xl mb-5 text-sm font-semibold bg-red-500/10 text-red-400 border border-red-500/20">
          ❌ {error}
        </div>
      )}

      {datos && (
        <div className="mb-5">
          <TarjetasResumen resumen={datos.resumen} />
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-zinc-800/70 bg-zinc-900/55 shadow-sm shadow-black/10">
        <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between gap-3">
          <h2 className="text-white font-bold">Operaciones</h2>
          <span className="text-xs text-zinc-500">
            {datos ? `${datos.total} resultado${datos.total === 1 ? '' : 's'}` : ''}
          </span>
        </div>

        {cargando ? (
          <div className="divide-y divide-zinc-800/60">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="flex items-center gap-4 px-4 py-4">
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="skeleton h-3.5 w-40 rounded" />
                  <div className="skeleton h-3 w-64 max-w-full rounded opacity-60" />
                </div>
                <div className="skeleton h-4 w-24 rounded" />
              </div>
            ))}
          </div>
        ) : operaciones.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-5 py-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full border border-zinc-800 bg-zinc-950 text-zinc-600">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" />
              </svg>
            </div>
            <p className="mt-3 text-sm font-semibold text-zinc-300">Sin operaciones</p>
            <p className="mt-1 text-xs text-zinc-600">Probá ampliando el rango de fechas o quitando filtros.</p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-800">
            {operaciones.map(operacion => (
              <div
                key={`${operacion.tipo}:${operacion.id}`}
                className="flex flex-col gap-2 px-4 py-3 transition hover:bg-zinc-950/60 sm:flex-row sm:items-center sm:gap-4"
              >
                <button
                  type="button"
                  onClick={() => setSeleccionada(operacion)}
                  className="min-w-0 flex-1 text-left"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <BadgeTipo tipo={operacion.tipo} />
                    <span className="text-sm font-bold text-white">
                      {operacion.codigo ?? 'Sin código'}
                    </span>
                    {operacion.anulada && (
                      <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">
                        Anulada
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-zinc-500 mt-0.5">
                    {formatFechaHoraAR(operacion.fecha)}
                    {operacion.clienteApellido
                      ? ` · ${operacion.clienteApellido}, ${operacion.clienteNombre}`
                      : ''}
                    {operacion.clienteDni ? ` · DNI ${operacion.clienteDni}` : ''}
                  </p>
                  <p className="text-xs text-zinc-400 mt-1 wrap-break-word">{operacion.resumen}</p>
                </button>
                <div className="flex items-center justify-between gap-3 shrink-0 sm:justify-end">
                  <span className="text-[11px] text-zinc-500">
                    {etiquetaMetodo(operacion.metodoPago)}
                  </span>
                  <span
                    className={`font-bold tabular-nums ${
                      operacion.anulada ? 'text-zinc-500 line-through' : 'text-white'
                    }`}
                  >
                    {formatARS(operacion.monto)}
                  </span>
                  {!operacion.anulada && (
                    <button
                      type="button"
                      onClick={() => abrirAnulacion(operacion)}
                      className="rounded-lg border border-red-500/25 px-2.5 py-1.5 text-[11px] font-bold text-red-300 transition hover:bg-red-500/10 hover:text-red-200"
                    >
                      Anular operación
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setSeleccionada(operacion)}
                    className="text-xs text-zinc-600 transition hover:text-zinc-300"
                    aria-label="Ver detalle"
                  >
                    ›
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {datos && datos.totalPaginas > 1 && (
          <div className="px-4 py-3 border-t border-zinc-800 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => {
                setCargando(true)
                setPagina(actual => Math.max(1, actual - 1))
              }}
              disabled={pagina <= 1 || cargando}
              className="px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-300 disabled:opacity-40 text-xs font-bold transition"
            >
              ← Anterior
            </button>
            <span className="text-xs text-zinc-500">
              Página {datos.pagina} de {datos.totalPaginas}
            </span>
            <button
              type="button"
              onClick={() => {
                setCargando(true)
                setPagina(actual => Math.min(datos.totalPaginas, actual + 1))
              }}
              disabled={pagina >= datos.totalPaginas || cargando}
              className="px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-300 disabled:opacity-40 text-xs font-bold transition"
            >
              Siguiente →
            </button>
          </div>
        )}
      </div>

      {seleccionada && (
        <ModalDetalle operacion={seleccionada} onClose={() => setSeleccionada(null)} />
      )}

      {operacionAnular && (
        <ModalAnular
          key={`${operacionAnular.tipo}:${operacionAnular.id}`}
          operacion={operacionAnular}
          onClose={() => {
            if (!anulando) setOperacionAnular(null)
          }}
          onConfirm={motivo => void anularOperacion(motivo)}
          procesando={anulando}
          error={errorAnulacion}
        />
      )}
    </div>
  )
}
