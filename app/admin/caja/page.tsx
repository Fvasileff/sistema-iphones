'use client'

import { useCallback, useEffect, useState } from 'react'
import { formatARS } from '@/lib/format'
import { formatFechaAR, formatFechaHoraAR } from '@/lib/fechas'

type Monto = number | string

interface MovimientoCaja {
  id: string
  tipo: string
  metodoPago: string
  monto: Monto
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
  venta_financiada: 'Venta financiada',
  cobro_cuota: 'Cobro de cuota',
  venta_producto: 'Venta de producto',
  venta_iphone: 'Venta de iPhone',
  cobro_reparacion: 'Cobro de reparación',
  ingreso: 'Ingreso',
  egreso: 'Egreso',
  anulacion: 'Anulación',
}

const ETIQUETAS_METODO: Record<string, string> = {
  efectivo: 'Efectivo',
  transferencia: 'Transferencia',
  tarjeta: 'Tarjeta',
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
  const [datos, setDatos] = useState<RespuestaCaja | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [aviso, setAviso] = useState('')

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
    setAviso('')
    try {
      const res = await fetch('/api/caja', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ montoInicial: Number(montoInicial) || 0 }),
      })
      const data = (await res.json()) as { error?: string }
      if (!res.ok) throw new Error(data.error || 'No se pudo abrir la caja')
      await cargarCaja()
      setAviso('Caja abierta correctamente.')
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
    setAviso('')
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
      setAviso('Movimiento registrado.')
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
    setAviso('')
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
      setAviso('Caja cerrada. Arqueo guardado.')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cerrar la caja')
    } finally {
      setProcesando(false)
    }
  }

  const caja = datos?.caja ?? null
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
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white">Caja diaria</h1>
          <p className="text-zinc-500 text-sm mt-1">
            {caja ? formatFechaAR(caja.fechaDia) : formatFechaAR(new Date())}
          </p>
        </div>
        {caja && (
          <span
            className={`self-start px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide border ${
              caja.estado === 'abierta'
                ? 'bg-green-500/10 text-green-400 border-green-500/25'
                : 'bg-zinc-800 text-zinc-400 border-zinc-700'
            }`}
          >
            {caja.estado === 'abierta' ? 'Abierta' : 'Cerrada'}
          </span>
        )}
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
        <p className="text-zinc-500 text-center py-20 text-sm">Cargando caja...</p>
      ) : !caja ? (
        <form
          onSubmit={abrirCaja}
          className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 md:p-6 max-w-md space-y-5"
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
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
              <p className="text-zinc-500 text-xs">Monto inicial</p>
              <p className="text-white font-bold text-xl mt-1 tabular-nums">
                {formatARS(montoInicialNum)}
              </p>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
              <p className="text-zinc-500 text-xs">Movimientos del día</p>
              <p className="text-white font-bold text-xl mt-1 tabular-nums">
                {formatARS(totalMovimientos)}
              </p>
              <p className="text-zinc-600 text-xs mt-0.5">{movimientos.length} registros</p>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
              <p className="text-zinc-500 text-xs">Efectivo esperado</p>
              <p className="text-green-400 font-bold text-xl mt-1 tabular-nums">
                {formatARS(
                  caja.estado === 'cerrada'
                    ? Number(caja.montoEsperadoEfectivo ?? esperadoEfectivo)
                    : esperadoEfectivo,
                )}
              </p>
              <p className="text-zinc-600 text-xs mt-0.5">Incluye monto inicial</p>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
              <p className="text-zinc-500 text-xs">Transferencia esperada</p>
              <p className="text-blue-400 font-bold text-xl mt-1 tabular-nums">
                {formatARS(
                  caja.estado === 'cerrada'
                    ? Number(caja.montoEsperadoTransferencia ?? esperadoTransferencia)
                    : esperadoTransferencia,
                )}
              </p>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
              <p className="text-zinc-500 text-xs">Tarjeta del día</p>
              <p className="text-purple-400 font-bold text-xl mt-1 tabular-nums">
                {formatARS(totalTarjeta)}
              </p>
              <p className="text-zinc-600 text-xs mt-0.5">No entra al arqueo de efectivo</p>
            </div>
          </div>

          {caja.estado === 'cerrada' && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
              <h2 className="text-white font-bold text-lg mb-1">Arqueo de cierre</h2>
              <p className="text-zinc-500 text-sm mb-4">
                Cerrada el {formatFechaHoraAR(caja.cerradaAt)}
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[520px]">
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
                <p className="text-zinc-400 text-sm mt-4 bg-zinc-950 border border-zinc-800 rounded-xl p-3">
                  <span className="text-zinc-500">Observaciones: </span>
                  {caja.observaciones}
                </p>
              )}
              <p className="text-zinc-500 text-xs mt-3">
                El cierre es opcional. Si registrás un cobro, la caja se reabre automáticamente.
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className={caja.estado === 'abierta' ? 'lg:col-span-2' : 'lg:col-span-3'}>
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
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
                          className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0"
                        >
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700">
                                {ETIQUETAS_TIPO[m.tipo] ?? m.tipo}
                              </span>
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-zinc-950 text-zinc-500 border border-zinc-800">
                                {ETIQUETAS_METODO[m.metodoPago] ?? m.metodoPago}
                              </span>
                              {m.codigoOperacion && (
                                <span className="text-[10px] text-zinc-600 font-mono">
                                  {m.codigoOperacion}
                                </span>
                              )}
                            </div>
                            {m.descripcion && (
                              <p className="text-zinc-300 text-sm mt-1 break-words">{m.descripcion}</p>
                            )}
                            <p className="text-zinc-600 text-xs mt-1">{formatFechaHoraAR(m.createdAt)}</p>
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
                  className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4"
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
              className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 md:p-6 space-y-5"
            >
              <div>
                <h2 className="text-white font-bold text-lg">Cerrar caja y hacer arqueo</h2>
                <p className="text-zinc-500 text-sm mt-1">
                  Contá el efectivo y las transferencias recibidas. Te mostramos la diferencia contra
                  lo esperado. Las ventas con tarjeta se informan aparte y no suman al arqueo.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 space-y-3">
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

                <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 space-y-3">
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
