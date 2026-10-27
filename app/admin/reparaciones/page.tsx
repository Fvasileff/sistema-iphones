'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ESTADOS_REPARACION,
  ETIQUETAS_ESTADO_REPARACION,
  type EstadoReparacion,
} from '@/lib/constantes'
import { formatARS } from '@/lib/format'
import { formatFechaAR } from '@/lib/fechas'
import { useToast } from '@/app/components/ToastProvider'

type Monto = number | string
type MetodoPago = 'efectivo' | 'transferencia' | 'tarjeta'
type FiltroTablero = 'todas' | EstadoReparacion

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

/* ───────────────────────── estilos por columna ───────────────────────── */

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

// Estados en los que la fecha prometida todavía importa.
const ESTADOS_EN_CURSO: readonly string[] = ['recibido', 'en_diagnostico', 'esperando_repuesto']

// Cuántas reparaciones entregadas se muestran antes de "Ver más".
const LIMITE_ENTREGADAS = 8

const SCROLL_OSCURO =
  'scheme-dark scrollbar-thin [scrollbar-color:#3f3f46_transparent]'

const inputClass =
  'w-full px-4 py-3 rounded-xl border border-zinc-700 bg-zinc-900 text-white text-base placeholder-zinc-600 focus:outline-none focus:border-blue-500 transition-colors'

/* ───────────────────────── red ───────────────────────── */

async function leerRespuesta<T>(res: Response): Promise<T & { error?: string }> {
  try {
    return (await res.json()) as T & { error?: string }
  } catch {
    if (res.ok) throw new Error('El servidor devolvió una respuesta inválida')
    return {} as T & { error?: string }
  }
}

function mensajeHttp(status: number, error?: string) {
  if (error) return error
  if (status === 401) return 'La sesión venció. Volvé a iniciar sesión.'
  return 'No se pudo completar la solicitud'
}

async function pedir<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: 'no-store' })
  const data = await leerRespuesta<T>(res)
  if (!res.ok) throw new Error(mensajeHttp(res.status, data.error))
  return data
}

async function solicitar<T>(url: string, method: 'POST' | 'PATCH', body: unknown): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await leerRespuesta<T>(res)
  if (!res.ok) throw new Error(mensajeHttp(res.status, data.error))
  return data
}

/* ───────────────────────── fechas y montos ───────────────────────── */

const ZONA_AR = 'America/Argentina/Tucuman'
const MS_DIA = 86_400_000

function hoyEnDias(): number {
  const [y, m, d] = new Date()
    .toLocaleDateString('en-CA', { timeZone: ZONA_AR })
    .split('-')
    .map(Number)
  return Date.UTC(y, m - 1, d) / MS_DIA
}

// Se apoya en formatFechaAR para que el día calculado coincida siempre con el que se muestra.
function diaEnDias(fecha: string | null): number | null {
  if (!fecha) return null
  const m = formatFechaAR(fecha).match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/)
  if (!m) return null
  return Date.UTC(Number(m[3]), Number(m[2]) - 1, Number(m[1])) / MS_DIA
}

function plural(n: number, singular: string, pluralTexto: string) {
  return `${n} ${n === 1 ? singular : pluralTexto}`
}

// Los pagos anulados NO cuentan: antes se sumaban y el saldo quedaba mal.
function calcularSaldo(r: Reparacion) {
  const objetivo = Number(r.montoFinal ?? r.presupuesto)
  const pagado = r.pagos
    .filter(p => !p.anulada)
    .reduce((acc, p) => acc + Number(p.monto), 0)
  return { objetivo, pagado, saldo: Math.max(objetivo - pagado, 0) }
}

type NivelVencimiento = 'atrasada' | 'hoy' | 'manana' | 'normal' | 'sin'

function calcularVencimiento(
  r: Reparacion,
  hoy: number,
): { nivel: NivelVencimiento; texto: string } | null {
  if (!ESTADOS_EN_CURSO.includes(r.estado)) return null
  const promesa = diaEnDias(r.fechaPromesa)
  if (promesa === null) return { nivel: 'sin', texto: 'Sin fecha promesa' }
  const dif = promesa - hoy
  if (dif < 0) return { nivel: 'atrasada', texto: `Atrasada ${plural(-dif, 'día', 'días')}` }
  if (dif === 0) return { nivel: 'hoy', texto: 'Vence hoy' }
  if (dif === 1) return { nivel: 'manana', texto: 'Vence mañana' }
  return { nivel: 'normal', texto: `Promesa ${formatFechaAR(r.fechaPromesa as string)}` }
}

const ESTILO_VENCIMIENTO: Record<NivelVencimiento, string> = {
  atrasada: 'bg-red-500/15 text-red-300 border-red-500/30',
  hoy: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  manana: 'bg-yellow-500/10 text-yellow-200 border-yellow-500/25',
  normal: 'bg-zinc-800/70 text-zinc-300 border-zinc-700',
  sin: 'bg-transparent text-zinc-500 border-zinc-800',
}

function ordenar(lista: Reparacion[], estado: EstadoReparacion): Reparacion[] {
  const copia = [...lista]
  if (estado === 'entregado') {
    return copia.sort((a, b) => b.fechaIngreso.localeCompare(a.fechaIngreso))
  }
  // Lo más urgente arriba: promesa más cercana primero, sin fecha al final.
  return copia.sort((a, b) => {
    const pa = a.fechaPromesa ?? '9999'
    const pb = b.fechaPromesa ?? '9999'
    if (pa !== pb) return pa.localeCompare(pb)
    return a.fechaIngreso.localeCompare(b.fechaIngreso)
  })
}

/* ───────────────────────── piezas de UI ───────────────────────── */

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

const TONOS_CHIP = {
  neutro: 'border-zinc-700 text-zinc-200',
  rojo: 'border-red-500/40 text-red-300',
  verde: 'border-green-500/40 text-green-300',
  ambar: 'border-amber-500/40 text-amber-300',
} as const

function ChipResumen({
  etiqueta,
  valor,
  detalle,
  tono,
  activo,
  onClick,
}: {
  etiqueta: string
  valor: number
  detalle?: string
  tono: keyof typeof TONOS_CHIP
  activo: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={activo}
      className={`flex items-baseline gap-2 rounded-xl border px-3 py-2 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
        activo ? 'bg-zinc-800 ring-1 ring-zinc-500' : 'bg-zinc-900 hover:bg-zinc-800/70'
      } ${TONOS_CHIP[tono]}`}
    >
      <span className="text-xl font-bold tabular-nums leading-none">{valor}</span>
      <span className="text-sm text-zinc-300">{etiqueta}</span>
      {detalle && <span className="text-xs text-zinc-500 tabular-nums">{detalle}</span>}
    </button>
  )
}

function TarjetaReparacion({
  reparacion,
  estado,
  hoy,
  arrastrando,
  guardando,
  onMover,
  onDragStart,
  onDragEnd,
}: {
  reparacion: Reparacion
  estado: EstadoReparacion
  hoy: number
  arrastrando: boolean
  guardando: boolean
  onMover: (id: string, estado: EstadoReparacion) => void
  onDragStart: (id: string) => void
  onDragEnd: () => void
}) {
  const { objetivo, saldo } = calcularSaldo(reparacion)
  const vencimiento = calcularVencimiento(reparacion, hoy)
  const ingreso = diaEnDias(reparacion.fechaIngreso)
  const diasEnTaller = ingreso === null ? null : Math.max(hoy - ingreso, 0)

  return (
    <article
      draggable={!guardando}
      onDragStart={e => {
        e.dataTransfer.effectAllowed = 'move'
        e.dataTransfer.setData('text/plain', reparacion.id)
        onDragStart(reparacion.id)
      }}
      onDragEnd={onDragEnd}
      aria-busy={guardando}
      className={`rounded-xl border bg-zinc-900 p-3.5 transition ${
        guardando
          ? 'border-blue-500/40 opacity-70'
          : arrastrando
            ? 'border-zinc-800 opacity-40'
            : 'border-zinc-800 hover:border-zinc-600 cursor-grab active:cursor-grabbing'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="rounded-md border border-zinc-700 bg-zinc-950 px-2 py-0.5 font-mono text-xs font-semibold text-zinc-300">
          {reparacion.codigoOperacion}
        </span>
        <span className="text-xs text-zinc-400">
          {guardando
            ? 'Guardando…'
            : estado === 'entregado' || diasEnTaller === null
              ? formatFechaAR(reparacion.fechaIngreso)
              : diasEnTaller === 0
                ? 'Ingresó hoy'
                : `${diasEnTaller} d en taller`}
        </span>
      </div>

      <Link
        href={`/admin/reparaciones/${reparacion.id}`}
        draggable={false}
        className="mt-2.5 block truncate text-[15px] font-semibold text-white hover:text-blue-400 focus-visible:outline-none focus-visible:text-blue-400"
      >
        {reparacion.cliente.apellido}, {reparacion.cliente.nombre}
      </Link>
      <p className="truncate text-sm text-zinc-200">{reparacion.equipo}</p>
      <p className="mt-1 line-clamp-2 text-[13px] leading-snug text-zinc-400">{reparacion.falla}</p>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {vencimiento && (
          <span
            className={`rounded-md border px-2 py-0.5 text-xs font-semibold ${ESTILO_VENCIMIENTO[vencimiento.nivel]}`}
          >
            {vencimiento.texto}
          </span>
        )}
        {saldo > 0 && (
          <span
            className={`rounded-md border px-2 py-0.5 text-xs font-bold tabular-nums ${
              estado === 'entregado'
                ? 'border-red-500/30 bg-red-500/15 text-red-300'
                : 'border-amber-500/30 bg-amber-500/10 text-amber-300'
            }`}
          >
            {estado === 'entregado' ? 'Debe' : 'Saldo'} {formatARS(saldo)}
          </span>
        )}
        {saldo === 0 && objetivo > 0 && estado === 'listo_para_retirar' && (
          <span className="rounded-md border border-green-500/30 bg-green-500/10 px-2 py-0.5 text-xs font-semibold text-green-300">
            Pagado
          </span>
        )}
      </div>

      <div className="mt-3 flex items-center gap-2 border-t border-zinc-800 pt-3">
        <select
          value={estado}
          disabled={guardando}
          onChange={e => onMover(reparacion.id, e.target.value as EstadoReparacion)}
          aria-label={`Estado de ${reparacion.codigoOperacion}`}
          className="min-w-0 flex-1 rounded-lg border border-zinc-700 bg-zinc-950 px-2.5 py-2 text-xs font-medium text-zinc-200 focus:outline-none focus:border-blue-500 disabled:opacity-50 scheme-dark"
        >
          {ESTADOS_REPARACION.map(e => (
            <option key={e} value={e}>
              {ETIQUETAS_ESTADO_REPARACION[e]}
            </option>
          ))}
        </select>
        <Link
          href={`/admin/reparaciones/${reparacion.id}`}
          draggable={false}
          className="shrink-0 rounded-lg border border-blue-500/30 bg-blue-600/15 px-3 py-2 text-xs font-bold text-blue-300 transition hover:bg-blue-600/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          Abrir ficha
        </Link>
      </div>
    </article>
  )
}

/* ───────────────────────── formulario de ingreso ───────────────────────── */

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
  const [busquedaCliente, setBusquedaCliente] = useState('')
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

  useEffect(() => {
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !guardando) onClose()
    }
    window.addEventListener('keydown', alTeclear)
    return () => window.removeEventListener('keydown', alTeclear)
  }, [onClose, guardando])

  const clientesFiltrados = useMemo(() => {
    const t = busquedaCliente.trim().toLowerCase()
    if (!t) return clientes
    return clientes.filter(
      c =>
        c.id === clienteId ||
        c.apellido.toLowerCase().includes(t) ||
        c.nombre.toLowerCase().includes(t) ||
        c.dni.toLowerCase().includes(t),
    )
  }, [clientes, busquedaCliente, clienteId])

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (guardando) return
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
      setGuardando(false)
    }
  }

  return (
    <div className="animate-fade-in fixed inset-0 z-50 flex items-end justify-center bg-black/75 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Nuevo ingreso al taller"
        className="animate-modal-in max-h-[94vh] w-full overflow-y-auto rounded-t-2xl border border-zinc-700 bg-zinc-900 p-5 shadow-2xl shadow-black/50 sm:max-w-3xl sm:rounded-2xl sm:p-6"
      >
        <div className="flex items-center justify-between gap-3 mb-5">
          <div>
            <h2 className="text-white font-bold text-lg">Nuevo ingreso al taller</h2>
            <p className="text-zinc-400 text-xs mt-0.5">
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
              <input
                type="search"
                value={busquedaCliente}
                onChange={e => setBusquedaCliente(e.target.value)}
                className={inputClass}
                placeholder="Filtrar por apellido, nombre o DNI"
              />
              <select
                value={clienteId}
                onChange={e => setClienteId(e.target.value)}
                className={inputClass}
                required
              >
                <option value="">
                  {clientesFiltrados.length === 0 ? 'Ningún cliente coincide' : 'Elegir cliente...'}
                </option>
                {clientesFiltrados.map(c => (
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

/* ───────────────────────── página ───────────────────────── */

export default function ReparacionesPage() {
  const router = useRouter()
  const toast = useToast()
  const [reparaciones, setReparaciones] = useState<Reparacion[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [cargando, setCargando] = useState(true)
  const [errorCarga, setErrorCarga] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [filtro, setFiltro] = useState<FiltroTablero>('todas')
  const [modalNueva, setModalNueva] = useState(false)
  const [arrastrandoId, setArrastrandoId] = useState<string | null>(null)
  const [columnaActiva, setColumnaActiva] = useState<string | null>(null)
  const [verTodasEntregadas, setVerTodasEntregadas] = useState(false)
  const [hoy, setHoy] = useState(hoyEnDias)

  // Reparaciones que se están guardando. El ref evita leer estado viejo dentro de callbacks.
  const moviendoRef = useRef<ReadonlySet<string>>(new Set())
  const [moviendo, setMoviendo] = useState<ReadonlySet<string>>(new Set())
  const reparacionesRef = useRef<Reparacion[]>([])

  useEffect(() => {
    reparacionesRef.current = reparaciones
  }, [reparaciones])

  const marcarMoviendo = useCallback((id: string, valor: boolean) => {
    const siguiente = new Set(moviendoRef.current)
    if (valor) siguiente.add(id)
    else siguiente.delete(id)
    moviendoRef.current = siguiente
    setMoviendo(siguiente)
  }, [])

  const avisar = useCallback(
    (tipo: 'ok' | 'error', texto: string) => {
      if (tipo === 'ok') toast.success(texto)
      else toast.error(texto)
    },
    [toast],
  )

  const cargarTodo = useCallback(async () => {
    setCargando(true)
    setErrorCarga('')
    try {
      const [lista, listaClientes] = await Promise.all([
        pedir<Reparacion[]>('/api/reparaciones'),
        pedir<Cliente[]>('/api/clientes'),
      ])
      setReparaciones(lista)
      setClientes(listaClientes)
      setHoy(hoyEnDias())
    } catch (e) {
      setErrorCarga(e instanceof Error ? e.message : 'No se pudieron cargar las reparaciones')
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    let activo = true

    Promise.all([
      pedir<Reparacion[]>('/api/reparaciones'),
      pedir<Cliente[]>('/api/clientes'),
    ])
      .then(([lista, listaClientes]) => {
        if (!activo) return
        setReparaciones(lista)
        setClientes(listaClientes)
        setHoy(hoyEnDias())
      })
      .catch(e => {
        if (activo) {
          setErrorCarga(e instanceof Error ? e.message : 'No se pudieron cargar las reparaciones')
        }
      })
      .finally(() => {
        if (activo) setCargando(false)
      })

    return () => {
      activo = false
    }
  }, [])

  // Actualiza sin pisar movimientos en curso (si hay uno guardándose, se descarta la respuesta).
  const refrescar = useCallback(async (mostrarError = false) => {
    if (moviendoRef.current.size > 0) return
    try {
      const lista = await pedir<Reparacion[]>('/api/reparaciones')
      if (moviendoRef.current.size > 0) return
      setReparaciones(lista)
      setHoy(hoyEnDias())
    } catch (e) {
      if (mostrarError) {
        avisar('error', e instanceof Error ? e.message : 'No se pudieron actualizar las reparaciones')
      }
    }
  }, [avisar])

  // Si alguien cambió algo desde otra pestaña o el celular, se ve al volver a esta ventana.
  useEffect(() => {
    const alVolver = () => {
      if (document.visibilityState === 'visible') void refrescar()
    }
    window.addEventListener('focus', alVolver)
    document.addEventListener('visibilitychange', alVolver)
    return () => {
      window.removeEventListener('focus', alVolver)
      document.removeEventListener('visibilitychange', alVolver)
    }
  }, [refrescar])

  const mover = useCallback(
    async (id: string, estado: EstadoReparacion) => {
      const actual = reparacionesRef.current.find(r => r.id === id)
      if (!actual || actual.estado === estado || moviendoRef.current.has(id)) return

      if (estado === 'entregado') {
        const { saldo } = calcularSaldo(actual)
        if (
          saldo > 0 &&
          !window.confirm(
            `${actual.codigoOperacion} tiene un saldo de ${formatARS(saldo)} sin cobrar.\n¿Marcarla como entregada igual?`,
          )
        ) {
          return
        }
      }

      const anterior = actual.estado
      marcarMoviendo(id, true)
      setReparaciones(prev => prev.map(r => (r.id === id ? { ...r, estado } : r)))

      try {
        await solicitar(`/api/reparaciones/${id}`, 'PATCH', { estado })
        avisar('ok', `${actual.codigoOperacion} pasó a ${ETIQUETAS_ESTADO_REPARACION[estado]}.`)
      } catch (e) {
        // Se revierte solo esta tarjeta, sin recargar todo el tablero.
        setReparaciones(prev => prev.map(r => (r.id === id ? { ...r, estado: anterior } : r)))
        avisar('error', e instanceof Error ? e.message : 'No se pudo cambiar el estado')
      } finally {
        marcarMoviendo(id, false)
      }
    },
    [avisar, marcarMoviendo],
  )

  const alCrear = (reparacionId: string) => {
    setModalNueva(false)
    router.push(`/admin/reparaciones/${reparacionId}`)
  }

  const cerrarModal = useCallback(() => setModalNueva(false), [])

  const texto = busqueda.trim().toLowerCase()

  const base = useMemo(
    () =>
      reparaciones.filter(r => {
        if (r.anulada) return false
        if (!texto) return true
        return (
          r.codigoOperacion.toLowerCase().includes(texto) ||
          r.cliente.nombre.toLowerCase().includes(texto) ||
          r.cliente.apellido.toLowerCase().includes(texto) ||
          r.cliente.dni.toLowerCase().includes(texto) ||
          r.equipo.toLowerCase().includes(texto) ||
          (r.imei ?? '').toLowerCase().includes(texto)
        )
      }),
    [reparaciones, texto],
  )

  const resumen = useMemo(() => {
    const porEstado = Object.fromEntries(
      ESTADOS_REPARACION.map(estado => [estado, 0]),
    ) as Record<EstadoReparacion, number>
    let enTaller = 0
    for (const r of base) {
      const estado = r.estado as EstadoReparacion
      if (!(estado in porEstado)) continue
      porEstado[estado]++
      if (estado !== 'entregado') enTaller++
    }
    return { enTaller, porEstado }
  }, [base])

  const visibles = useMemo(
    () =>
      base.filter(r =>
        filtro === 'todas' ? r.estado !== 'entregado' : r.estado === filtro,
      ),
    [base, filtro],
  )

  const alternarFiltro = (f: FiltroTablero) => setFiltro(actual => (actual === f ? 'todas' : f))

  return (
    <div className="flex h-[calc(100dvh-3.5rem)] flex-col gap-4 p-4 md:h-dvh md:p-8">
      <header className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white md:text-3xl">Reparaciones</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Arrastrá una tarjeta a otra columna, o cambiá el estado desde la propia tarjeta.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            type="search"
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar cliente, equipo, IMEI o código"
            aria-label="Buscar reparaciones"
            className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-sm text-white placeholder-zinc-500 transition-colors focus:border-zinc-600 focus:outline-none sm:w-80"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void refrescar(true)}
              className="rounded-xl border border-zinc-800 bg-zinc-900 px-3.5 py-2.5 text-sm text-zinc-300 transition hover:bg-zinc-800"
              aria-label="Actualizar tablero"
              title="Actualizar"
            >
              ↻
            </button>
            <button
              type="button"
              onClick={() => setModalNueva(true)}
              className="flex-1 shrink-0 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-blue-500 sm:flex-none"
            >
              + Nuevo ingreso
            </button>
          </div>
        </div>
      </header>

      {!cargando && !errorCarga && (
        <div className="flex flex-wrap gap-2">
          <ChipResumen
            etiqueta="Todos"
            valor={resumen.enTaller}
            tono="neutro"
            activo={filtro === 'todas'}
            onClick={() => setFiltro('todas')}
          />
          {ESTADOS_REPARACION.map(estado => (
            <ChipResumen
              key={estado}
              etiqueta={ETIQUETAS_ESTADO_REPARACION[estado]}
              valor={resumen.porEstado[estado]}
              tono={
                estado === 'listo_para_retirar'
                  ? 'verde'
                  : estado === 'en_diagnostico' || estado === 'esperando_repuesto'
                    ? 'ambar'
                    : 'neutro'
              }
              activo={filtro === estado}
              onClick={() => alternarFiltro(estado)}
            />
          ))}
        </div>
      )}

      {cargando ? (
        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, column) => (
            <div key={column} className="rounded-2xl border border-zinc-800/70 bg-zinc-950/40 p-3">
              <div className="skeleton mb-3 h-4 w-28 rounded" />
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, card) => (
                  <div key={card} className="skeleton h-28 w-full rounded-xl opacity-70" />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : errorCarga ? (
        <div className="mx-auto max-w-md rounded-2xl border border-red-500/20 bg-red-500/10 p-5 text-center">
          <p className="text-sm font-semibold text-red-400">❌ {errorCarga}</p>
          <button
            type="button"
            onClick={() => void cargarTodo()}
            className="mt-3 rounded-xl bg-zinc-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-700"
          >
            Reintentar
          </button>
        </div>
      ) : (
        <div
          className={`flex min-h-0 flex-1 snap-x snap-mandatory gap-3 overflow-x-auto pb-1 xl:snap-none ${SCROLL_OSCURO}`}
        >
          {ESTADOS_REPARACION.map(estado => {
            const delEstado = ordenar(
              visibles.filter(r => r.estado === estado),
              estado,
            )
            const recortar =
              estado === 'entregado' && !verTodasEntregadas && delEstado.length > LIMITE_ENTREGADAS
            const mostradas = recortar ? delEstado.slice(0, LIMITE_ENTREGADAS) : delEstado
            const activa = columnaActiva === estado

            return (
              <section
                key={estado}
                aria-label={ETIQUETAS_ESTADO_REPARACION[estado]}
                onDragOver={e => {
                  e.preventDefault()
                  e.dataTransfer.dropEffect = 'move'
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
                  if (id) void mover(id, estado)
                }}
                className={`flex min-h-0 w-[85vw] shrink-0 snap-start flex-col rounded-2xl border bg-zinc-950/40 transition sm:w-80 xl:w-auto xl:min-w-0 xl:flex-1 xl:shrink ${
                  activa ? 'border-blue-500/60 bg-blue-500/5' : COLORES_COLUMNA[estado]
                }`}
              >
                <div className="flex items-center justify-between gap-2 px-4 pb-2 pt-3.5">
                  <h2 className="flex items-center gap-2 text-[15px] font-bold text-white">
                    <span className={`h-2 w-2 rounded-full ${PUNTOS_COLUMNA[estado]}`} />
                    {ETIQUETAS_ESTADO_REPARACION[estado]}
                  </h2>
                  <span className="rounded-full border border-zinc-800 bg-zinc-900 px-2 py-0.5 text-xs font-bold tabular-nums text-zinc-300">
                    {delEstado.length}
                  </span>
                </div>

                <div className={`min-h-0 flex-1 space-y-2.5 overflow-y-auto px-3 pb-3 ${SCROLL_OSCURO}`}>
                  {delEstado.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-zinc-800 py-8 text-center text-sm text-zinc-600">
                      {filtro !== 'todas' || texto ? 'Sin coincidencias' : 'Sin reparaciones'}
                    </p>
                  ) : (
                    mostradas.map(reparacion => (
                      <TarjetaReparacion
                        key={reparacion.id}
                        reparacion={reparacion}
                        estado={estado}
                        hoy={hoy}
                        arrastrando={arrastrandoId === reparacion.id}
                        guardando={moviendo.has(reparacion.id)}
                        onMover={(id, nuevo) => void mover(id, nuevo)}
                        onDragStart={setArrastrandoId}
                        onDragEnd={() => {
                          setArrastrandoId(null)
                          setColumnaActiva(null)
                        }}
                      />
                    ))
                  )}

                  {estado === 'entregado' && delEstado.length > LIMITE_ENTREGADAS && (
                    <button
                      type="button"
                      onClick={() => setVerTodasEntregadas(v => !v)}
                      className="w-full rounded-xl border border-zinc-800 py-2 text-xs font-semibold text-zinc-400 transition hover:bg-zinc-900 hover:text-white"
                    >
                      {verTodasEntregadas
                        ? 'Ver menos'
                        : `Ver ${delEstado.length - LIMITE_ENTREGADAS} más`}
                    </button>
                  )}
                </div>
              </section>
            )
          })}
        </div>
      )}

      {modalNueva && (
        <FormNuevaReparacion clientes={clientes} onClose={cerrarModal} onCreada={alCrear} />
      )}
    </div>
  )
}