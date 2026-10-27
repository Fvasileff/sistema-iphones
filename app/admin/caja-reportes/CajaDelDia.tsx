'use client'

import { useCallback, useEffect, useState } from 'react'
import { formatARS } from '@/lib/format'
import { formatFechaAR, formatFechaHoraAR, formatHoraAR } from '@/lib/fechas'
import { useToast } from '@/app/components/ToastProvider'

type Monto = number | string

interface MovimientoCaja {
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
}

interface CajaDiaria {
  id: string
  fechaDia: string
  montoInicial: Monto
  estado: string
  abiertaAt: string
  cerradaAt: string | null
  montoEsperadoEfectivo: Monto | null
  montoContadoEfectivo: Monto | null
  diferenciaEfectivo: Monto | null
  montoEsperadoTransferencia: Monto | null
  montoContadoTransferencia: Monto | null
  diferenciaTransferencia: Monto | null
  observaciones: string | null
  movimientos: MovimientoCaja[]
}

interface TotalesCaja {
  efectivo: number
  transferencia: number
  tarjeta: number
  porTipo: Record<string, number>
  montoInicial?: number
}

interface RespuestaCaja {
  caja: CajaDiaria | null
  abierta: boolean
  totales: TotalesCaja
}

const ETIQUETAS_TIPO: Record<string, string> = {
  venta: 'Venta',
  venta_financiada: 'Anticipo financiación',
  cobro_cuota: 'Pago de cuota',
  venta_producto: 'Venta',
  venta_iphone: 'Venta',
  cobro_reparacion: 'Cobro de reparación',
  ingreso: 'Ingreso',
  egreso: 'Egreso',
  anulacion: 'Anulación',
}

const inputClass =
  'w-full px-4 py-3 rounded-xl border border-zinc-700 bg-zinc-900 text-white text-base placeholder-zinc-600 focus:outline-none focus:border-blue-500 transition-colors'

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

function Diferencia({ valor }: { valor: number }) {
  const color =
    Math.abs(valor) < 0.005 ? 'text-green-400' : valor > 0 ? 'text-amber-400' : 'text-red-400'
  const etiqueta = Math.abs(valor) < 0.005 ? 'Sin diferencia' : valor > 0 ? 'Sobrante' : 'Faltante'

  return (
    <span className={`font-bold tabular-nums ${color}`}>
      {formatARS(valor)} <span className="text-xs font-medium">({etiqueta})</span>
    </span>
  )
}

export default function CajaPage() {
  const toast = useToast()
  const [datos, setDatos] = useState<RespuestaCaja | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  const [montoInicial, setMontoInicial] = useState('0')
  const [tipoMovimiento, setTipoMovimiento] = useState<'ingreso' | 'egreso'>('ingreso')
  const [metodoMovimiento, setMetodoMovimiento] = useState<'efectivo' | 'transferencia' | 'tarjeta'>('efectivo')
  const [montoMovimiento, setMontoMovimiento] = useState('')
  const [descripcionMovimiento, setDescripcionMovimiento] = useState('')

  const [contadoEfectivo, setContadoEfectivo] = useState('')
  const [contadoTransferencia, setContadoTransferencia] = useState('')
  const [observacionesCierre, setObservacionesCierre] = useState('')

  const [procesando, setProcesando] = useState(false)

  const cargarCaja = useCallback(async () => {
    try {
      const res = await fetch('/api/caja', { cache: 'no-store' })
      const data = (await res.json()) as RespuestaCaja & { error?: string }
      if (!res.ok) throw new Error(data.error || 'No se pudo cargar la caja')
      setDatos(data)
      setError('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cargar la caja')
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    let activo = true

    fetch('/api/caja', { cache: 'no-store' })
      .then(async res => {
        const data = (await res.json()) as RespuestaCaja & { error?: string }
        if (!activo) return
        if (!res.ok) {
          setError(data.error || 'No se pudo cargar la caja')
        } else {
          setDatos(data)
          setError('')
        }
      })
      .catch(e => {
        if (activo) setError(e instanceof Error ? e.message : 'No se pudo cargar la caja')
      })
      .finally(() => {
        if (activo) setCargando(false)
      })

    return () => {
      activo = false
    }
  }, [])

  const abrirCaja = async (e: React.FormEvent) => {
    e.preventDefault()
    setProcesando(true)
    setError('')
    try {
      const res = await fetch('/api/caja', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ montoInicial: Number(montoInicial) || 0 }),
      })
      const data = (await res.json()) as { error?: string }
      if (!res.ok) throw new Error(data.error || 'No se pudo abrir la caja')
      await cargarCaja()
      toast.success('Caja abierta correctamente.')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo abrir la caja')
    } finally {
      setProcesando(false)
    }
  }

  const agregarMovimiento = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!datos?.caja) return
    setProcesando(true)
    setError('')
    try {
      const res = await fetch(`/api/caja/${datos.caja.id}/movimientos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo: tipoMovimiento,
          metodoPago: metodoMovimiento,
          monto: Number(montoMovimiento),
          descripcion: descripcionMovimiento,
        }),
      })
      const data = (await res.json()) as { error?: string }
      if (!res.ok) throw new Error(data.error || 'No se pudo registrar el movimiento')
      setMontoMovimiento('')
      setDescripcionMovimiento('')
      await cargarCaja()
      toast.success('Movimiento registrado.')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo registrar el movimiento')
    } finally {
      setProcesando(false)
    }
  }

  const cerrarCaja = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!datos?.caja) return
    setProcesando(true)
    setError('')
    try {
      const res = await fetch(`/api/caja/${datos.caja.id}/cerrar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          montoContadoEfectivo: Number(contadoEfectivo) || 0,
          montoContadoTransferencia: Number(contadoTransferencia) || 0,
          observaciones: observacionesCierre,
        }),
      })
      const data = (await res.json()) as { error?: string }
      if (!res.ok) throw new Error(data.error || 'No se pudo cerrar la caja')
      await cargarCaja()
      toast.success('Caja cerrada. Arqueo guardado.')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cerrar la caja')
    } finally {
      setProcesando(false)
    }
  }

  const reabrirCaja = async () => {
    if (!datos?.caja) return
    setProcesando(true)
    setError('')
    try {
      const res = await fetch(`/api/caja/${datos.caja.id}/reabrir`, { method: 'POST' })
      const data = (await res.json()) as { error?: string }
      if (!res.ok) throw new Error(data.error || 'No se pudo reabrir la caja')
      await cargarCaja()
      toast.success('Caja reabierta correctamente.')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo reabrir la caja')
    } finally {
      setProcesando(false)
    }
  }

  const caja = datos?.caja ?? null
  const fueReabierta = Boolean(caja?.observaciones?.includes('Reabierta automáticamente'))
  const totales = datos?.totales
  const montoInicialNum = Number(caja?.montoInicial ?? 0)
  const esperadoEfectivo = montoInicialNum + (totales?.efectivo ?? 0)
  const esperadoTransferencia = totales?.transferencia ?? 0
  const totalTarjeta = totales?.tarjeta ?? 0
  const difEfectivo =
    contadoEfectivo === '' ? null : Number(contadoEfectivo) - esperadoEfectivo
  const difTransferencia =
    contadoTransferencia === '' ? null : Number(contadoTransferencia) - esperadoTransferencia
  const tiposConMovimiento = Object.entries(totales?.porTipo ?? {})
  const movimientos = caja?.movimientos ?? []
  const totalMovimientos =
    (totales?.efectivo ?? 0) + (totales?.transferencia ?? 0) + (totales?.tarjeta ?? 0)

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-blue-400/80">Operación diaria</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-white md:text-3xl">Caja diaria</h1>
          <p className="mt-1 text-sm text-zinc-500">
            {caja ? formatFechaAR(caja.fechaDia) : formatFechaAR(new Date())}
          </p>
        </div>
        {caja && (
          <span
            className={`inline-flex items-center gap-2 self-start rounded-full border px-3 py-1.5 text-xs font-bold uppercase tracking-wide ${
              caja.estado === 'abierta'
                ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300'
                : 'border-zinc-700 bg-zinc-800 text-zinc-400'
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                caja.estado === 'abierta' ? 'bg-emerald-400' : 'bg-zinc-500'
              }`}
            />
            {caja.estado === 'abierta' ? 'Abierta' : 'Cerrada'}
          </span>
        )}
      </div>

      {error && (
        <div className="p-4 rounded-xl mb-5 text-sm font-semibold bg-red-500/10 text-red-400 border border-red-500/20">
          ❌ {error}
        </div>
      )}

      {caja?.estado === 'abierta' && fueReabierta && (
        <div className="p-3 rounded-xl mb-5 text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
          ⚠️ Esta caja se reabrió automáticamente por un movimiento. Revisá el arqueo antes de
          volver a cerrarla.
        </div>
      )}

      {cargando ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="rounded-2xl border border-zinc-800/70 bg-zinc-900/50 p-4">
                <div className="skeleton h-3 w-20 rounded" />
                <div className="skeleton mt-3 h-6 w-24 rounded" />
              </div>
            ))}
          </div>
          <div className="rounded-2xl border border-zinc-800/70 bg-zinc-900/50 p-5">
            <div className="skeleton h-4 w-40 rounded" />
            <div className="mt-4 space-y-2">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="skeleton h-12 w-full rounded-xl opacity-70" />
              ))}
            </div>
          </div>
        </div>
      ) : !caja ? (
        <form
          onSubmit={abrirCaja}
          className="rounded-2xl border border-zinc-800/70 bg-zinc-900/55 p-5 md:p-6 max-w-md space-y-5"
        >
          <div>
            <h2 className="text-white font-bold text-lg">Abrir caja</h2>
            <p className="text-zinc-500 text-sm mt-1">
              Todavía no abriste la caja de hoy. Ingresá el monto inicial.
            </p>
          </div>
          <Field label="Monto inicial" required>
            <input
              type="number"
              min="0"
              step="any"
              value={montoInicial}
              onChange={e => setMontoInicial(e.target.value)}
              className={inputClass}
              placeholder="0"
              required
            />
          </Field>
          <button
            type="submit"
            disabled={procesando}
            className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold transition"
          >
            {procesando ? 'Abriendo...' : 'Abrir caja'}
          </button>
        </form>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="rounded-2xl border border-zinc-800/70 bg-zinc-900/55 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Monto inicial</p>
              <p className="mt-1 text-xl font-bold tabular-nums text-white">
                {formatARS(montoInicialNum)}
              </p>
            </div>
            <div className="rounded-2xl border border-zinc-800/70 bg-zinc-900/55 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Movimientos del día</p>
              <p className="mt-1 text-xl font-bold tabular-nums text-white">
                {formatARS(totalMovimientos)}
              </p>
              <p className="text-zinc-600 text-xs mt-0.5">{movimientos.length} registros</p>
            </div>
            <div className="rounded-2xl border border-zinc-800/70 bg-zinc-900/55 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Efectivo esperado</p>
              <p className="mt-1 text-xl font-bold tabular-nums text-emerald-300">
                {formatARS(
                  caja.estado === 'cerrada'
                    ? Number(caja.montoEsperadoEfectivo ?? esperadoEfectivo)
                    : esperadoEfectivo,
                )}
              </p>
              <p className="text-zinc-600 text-xs mt-0.5">Incluye monto inicial</p>
            </div>
            <div className="rounded-2xl border border-zinc-800/70 bg-zinc-900/55 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Transferencia esperada</p>
              <p className="mt-1 text-xl font-bold tabular-nums text-blue-300">
                {formatARS(
                  caja.estado === 'cerrada'
                    ? Number(caja.montoEsperadoTransferencia ?? esperadoTransferencia)
                    : esperadoTransferencia,
                )}
              </p>
            </div>
            <div className="rounded-2xl border border-zinc-800/70 bg-zinc-900/55 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Tarjeta del día</p>
              <p className="mt-1 text-xl font-bold tabular-nums text-violet-300">
                {formatARS(totalTarjeta)}
              </p>
              <p className="text-zinc-600 text-xs mt-0.5">No entra al arqueo de efectivo</p>
            </div>
          </div>

          {caja.estado === 'cerrada' && (
            <div className="rounded-2xl border border-zinc-800/70 bg-zinc-900/55 p-5">
              <h2 className="text-white font-bold text-lg mb-1">Arqueo de cierre</h2>
              <p className="text-zinc-500 text-sm mb-4">
                Cerrada el {formatFechaHoraAR(caja.cerradaAt)}
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-130">
                  <thead>
                    <tr className="text-left text-zinc-500 text-xs uppercase tracking-wider border-b border-zinc-800">
                      <th className="pb-2 pr-3 font-semibold">Método</th>
                      <th className="pb-2 px-3 font-semibold text-right">Esperado</th>
                      <th className="pb-2 px-3 font-semibold text-right">Contado</th>
                      <th className="pb-2 pl-3 font-semibold text-right">Diferencia</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/70">
                    <tr>
                      <td className="py-3 pr-3 text-zinc-300">Efectivo</td>
                      <td className="py-3 px-3 text-right text-white tabular-nums">
                        {formatARS(caja.montoEsperadoEfectivo)}
                      </td>
                      <td className="py-3 px-3 text-right text-white tabular-nums">
                        {formatARS(caja.montoContadoEfectivo)}
                      </td>
                      <td className="py-3 pl-3 text-right">
                        <Diferencia valor={Number(caja.diferenciaEfectivo ?? 0)} />
                      </td>
                    </tr>
                    <tr>
                      <td className="py-3 pr-3 text-zinc-300">Transferencia</td>
                      <td className="py-3 px-3 text-right text-white tabular-nums">
                        {formatARS(caja.montoEsperadoTransferencia)}
                      </td>
                      <td className="py-3 px-3 text-right text-white tabular-nums">
                        {formatARS(caja.montoContadoTransferencia)}
                      </td>
                      <td className="py-3 pl-3 text-right">
                        <Diferencia valor={Number(caja.diferenciaTransferencia ?? 0)} />
                      </td>
                    </tr>
                    <tr>
                      <td className="py-3 pr-3 text-zinc-300">Tarjeta</td>
                      <td className="py-3 px-3 text-right text-white tabular-nums">
                        {formatARS(totalTarjeta)}
                      </td>
                      <td className="py-3 px-3 text-right text-zinc-500">—</td>
                      <td className="py-3 pl-3 text-right text-zinc-500 text-xs">
                        No entra al arqueo
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              {caja.observaciones && (
                <p className="text-zinc-400 text-sm mt-4 rounded-xl border border-zinc-800 bg-zinc-950/60 p-3">
                  <span className="text-zinc-500">Observaciones: </span>
                  {caja.observaciones}
                </p>
              )}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-4">
                <p className="text-zinc-500 text-xs">
                  La caja se reabre sola al registrar ventas o cobros. También podés reabrirla ahora
                  para cargar un movimiento manual.
                </p>
                <button
                  type="button"
                  onClick={reabrirCaja}
                  disabled={procesando}
                  className="shrink-0 px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 disabled:opacity-50 text-white text-sm font-bold transition"
                >
                  {procesando ? 'Reabriendo...' : 'Reabrir caja'}
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className={caja.estado === 'abierta' ? 'lg:col-span-2' : 'lg:col-span-3'}>
              <div className="rounded-2xl border border-zinc-800/70 bg-zinc-900/55 p-5">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <h2 className="text-white font-bold text-lg">Movimientos del día</h2>
                  <span className="text-zinc-500 text-xs">{movimientos.length}</span>
                </div>

                {tiposConMovimiento.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {tiposConMovimiento.map(([tipo, monto]) => (
                      <span
                        key={tipo}
                        className="text-xs bg-zinc-950 border border-zinc-800 text-zinc-400 px-2.5 py-1 rounded-lg"
                      >
                        {ETIQUETAS_TIPO[tipo] ?? tipo}:{' '}
                        <span className={monto < 0 ? 'text-red-400' : 'text-zinc-200'}>
                          {formatARS(monto)}
                        </span>
                      </span>
                    ))}
                  </div>
                )}

                {movimientos.length === 0 ? (
                  <p className="text-zinc-600 text-sm py-10 text-center">
                    Todavía no hay movimientos en esta caja.
                  </p>
                ) : (
                  <div className="divide-y divide-zinc-800">
                    {movimientos.map(m => {
                      const monto = Number(m.monto)
                      return (
                        <div
                          key={m.id}
                          className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-white wrap-break-word">
                              {ETIQUETAS_TIPO[m.tipo] ?? m.tipo}
                              {m.codigoOperacion ? ` #${m.codigoOperacion}` : ''}
                            </p>
                            <p className="text-zinc-500 text-xs mt-0.5">
                              {formatHoraAR(m.createdAt)}
                            </p>
                          </div>
                          <p
                            className={`font-bold tabular-nums shrink-0 ${
                              monto < 0 ? 'text-red-400' : 'text-green-400'
                            }`}
                          >
                            {formatARS(monto)}
                          </p>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>

            {caja.estado === 'abierta' && (
              <div className="space-y-6">
                <form
                  onSubmit={agregarMovimiento}
                  className="rounded-2xl border border-zinc-800/70 bg-zinc-900/55 p-5 space-y-4"
                >
                  <div>
                    <h2 className="text-white font-bold text-lg">Registrar movimiento</h2>
                    <p className="text-zinc-500 text-xs mt-1">Ingreso o egreso manual de caja.</p>
                  </div>
                  <Field label="Tipo" required>
                    <select
                      value={tipoMovimiento}
                      onChange={e => setTipoMovimiento(e.target.value as 'ingreso' | 'egreso')}
                      className={inputClass}
                    >
                      <option value="ingreso">Ingreso</option>
                      <option value="egreso">Egreso</option>
                    </select>
                  </Field>
                  <Field label="Método" required>
                    <select
                      value={metodoMovimiento}
                      onChange={e =>
                        setMetodoMovimiento(
                          e.target.value as 'efectivo' | 'transferencia' | 'tarjeta',
                        )
                      }
                      className={inputClass}
                    >
                      <option value="efectivo">Efectivo</option>
                      <option value="transferencia">Transferencia</option>
                      <option value="tarjeta">Tarjeta</option>
                    </select>
                  </Field>
                  <Field label="Monto" required>
                    <input
                      type="number"
                      min="0.01"
                      step="any"
                      value={montoMovimiento}
                      onChange={e => setMontoMovimiento(e.target.value)}
                      className={inputClass}
                      placeholder="0"
                      required
                    />
                  </Field>
                  <Field label="Descripción">
                    <input
                      type="text"
                      value={descripcionMovimiento}
                      onChange={e => setDescripcionMovimiento(e.target.value)}
                      className={inputClass}
                      placeholder="Ej: retiro para proveedor"
                      maxLength={300}
                    />
                  </Field>
                  <button
                    type="submit"
                    disabled={procesando}
                    className="w-full py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 disabled:opacity-50 text-white font-bold transition"
                  >
                    {procesando ? 'Guardando...' : 'Agregar movimiento'}
                  </button>
                </form>
              </div>
            )}
          </div>

          {caja.estado === 'abierta' && (
            <form
              onSubmit={cerrarCaja}
              className="rounded-2xl border border-zinc-800/70 bg-zinc-900/55 p-5 md:p-6 space-y-5"
            >
              <div>
                <h2 className="text-white font-bold text-lg">Cerrar caja y hacer arqueo</h2>
                <p className="text-zinc-500 text-sm mt-1">
                  Contá el efectivo y las transferencias recibidas. Te mostramos la diferencia contra
                  lo esperado. Las ventas con tarjeta se informan aparte y no suman al arqueo.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4 space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-zinc-400">Efectivo esperado</span>
                    <span className="text-white font-bold tabular-nums">
                      {formatARS(esperadoEfectivo)}
                    </span>
                  </div>
                  <Field label="Efectivo contado" required>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={contadoEfectivo}
                      onChange={e => setContadoEfectivo(e.target.value)}
                      className={inputClass}
                      placeholder="0"
                      required
                    />
                  </Field>
                  <p className="text-xs text-zinc-500 min-h-5">
                    {difEfectivo !== null ? (
                      <>
                        Diferencia: <Diferencia valor={difEfectivo} />
                      </>
                    ) : (
                      'Ingresá el efectivo contado para ver la diferencia.'
                    )}
                  </p>
                </div>

                <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4 space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-zinc-400">Transferencia esperada</span>
                    <span className="text-white font-bold tabular-nums">
                      {formatARS(esperadoTransferencia)}
                    </span>
                  </div>
                  <Field label="Transferencia contada" required>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={contadoTransferencia}
                      onChange={e => setContadoTransferencia(e.target.value)}
                      className={inputClass}
                      placeholder="0"
                      required
                    />
                  </Field>
                  <p className="text-xs text-zinc-500 min-h-5">
                    {difTransferencia !== null ? (
                      <>
                        Diferencia: <Diferencia valor={difTransferencia} />
                      </>
                    ) : (
                      'Ingresá la transferencia contada para ver la diferencia.'
                    )}
                  </p>
                </div>
              </div>

              <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-4 flex items-center justify-between gap-3 text-sm">
                <span className="text-purple-300">Tarjeta del día (informativo)</span>
                <span className="text-white font-bold tabular-nums">{formatARS(totalTarjeta)}</span>
              </div>

              <Field label="Observaciones (opcional)">
                <textarea
                  value={observacionesCierre}
                  onChange={e => setObservacionesCierre(e.target.value)}
                  className={`${inputClass} min-h-20 resize-y`}
                  placeholder="Ej: faltante por vuelto, detalle de billetes, etc."
                  maxLength={500}
                />
              </Field>

              <button
                type="submit"
                disabled={procesando}
                className="w-full py-3.5 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-bold transition"
              >
                {procesando ? 'Cerrando...' : 'Cerrar caja'}
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  )
}
