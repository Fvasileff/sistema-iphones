'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { formatARS } from '@/lib/format'
import { formatFechaAR } from '@/lib/fechas'

type Monto = number | string

interface CuotaDashboard {
  id: string
  fechaVencimiento: string
  montoOriginal: Monto
  montoMora?: Monto
  venta: {
    cliente: {
      nombre: string
      apellido: string
      telefono?: string
    }
  }
}

interface DashboardData {
  totalVentasMes: Monto
  totalVentasContadoMes: Monto
  totalVentasFinanciadasMes: Monto
  cantVentasMes: number
  cantVentasContadoMes: number
  cantVentasFinanciadasMes: number
  clientesActivosMes: number
  totalCobradoMes: Monto
  totalAnticiposMes: Monto
  totalCuotasPagadasMes: Monto
  totalReparacionesMes: Monto
  cuotasVencidas: CuotaDashboard[]
  cuotasProximas: CuotaDashboard[]
}

const ACCIONES = [
  { href: '/admin/pos', label: 'Nueva venta', detalle: 'Cobrar productos o iPhone', icon: '🧾' },
  { href: '/admin/financiaciones?tab=nueva', label: 'Financiar', detalle: 'Crear un plan de cuotas', icon: '💳' },
  { href: '/admin/reparaciones', label: 'Reparación', detalle: 'Ingresar un equipo', icon: '🔧' },
  { href: '/admin/clientes', label: 'Clientes', detalle: 'Buscar o registrar', icon: '👥' },
]

function IconoMetrica({ tipo }: { tipo: 'ventas' | 'cobrado' | 'clientes' | 'vencidas' | 'operaciones' }) {
  const paths = {
    ventas: 'M4 19V5M4 19h16M8 16v-5M12 16V7M16 16v-8',
    cobrado: 'M4 7h16v10H4zM12 12h.01M7 12h.01M17 12h.01',
    clientes: 'M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm-6 8c0-3.3 2.7-6 6-6s6 2.7 6 6M17 5.5a3.5 3.5 0 0 1 0 7M19 19c0-2.2-.9-4-2.5-5',
    vencidas: 'M12 9v4M12 17h.01M10.3 4.3 2.6 18a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 4.3a2 2 0 0 0-3.4 0Z',
    operaciones: 'M5 4h14v17l-3-2-4 2-4-2-3 2V4Zm3 5h8M8 13h8',
  }
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={paths[tipo]} />
    </svg>
  )
}

function StatCard({
  etiqueta,
  valor,
  detalle,
  tono,
  icono,
}: {
  etiqueta: string
  valor: string
  detalle: string
  tono: 'blue' | 'green' | 'violet' | 'red' | 'neutral'
  icono: 'ventas' | 'cobrado' | 'clientes' | 'vencidas' | 'operaciones'
}) {
  const tonos = {
    blue: 'text-blue-300 bg-blue-500/10 border-blue-500/15',
    green: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/15',
    violet: 'text-violet-300 bg-violet-500/10 border-violet-500/15',
    red: 'text-red-300 bg-red-500/10 border-red-500/15',
    neutral: 'text-zinc-300 bg-zinc-500/10 border-zinc-500/15',
  }
  const valores = {
    blue: 'text-blue-300',
    green: 'text-emerald-300',
    violet: 'text-violet-300',
    red: 'text-red-300',
    neutral: 'text-white',
  }

  return (
    <div className="rounded-2xl border border-zinc-800/70 bg-zinc-900/55 p-4 shadow-sm shadow-black/10 transition hover:border-zinc-700/80 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">{etiqueta}</p>
        <span className={`rounded-lg border p-1.5 ${tonos[tono]}`}>
          <IconoMetrica tipo={icono} />
        </span>
      </div>
      <p className={`mt-3 wrap-break-word text-2xl font-bold tabular-nums ${valores[tono]}`}>{valor}</p>
      <p className="mt-1 text-[11px] text-zinc-600">{detalle}</p>
    </div>
  )
}

function CuotaRow({ cuota, vencida }: { cuota: CuotaDashboard; vencida: boolean }) {
  const total = Number(cuota.montoOriginal) + Number(cuota.montoMora ?? 0)
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-zinc-800/60 bg-zinc-950/45 px-3.5 py-3 transition hover:border-zinc-700/60">
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-zinc-100">
          {cuota.venta.cliente.apellido}, {cuota.venta.cliente.nombre}
        </p>
        <p className="mt-0.5 text-[11px] text-zinc-500">
          {vencida ? 'Venció' : 'Vence'} {formatFechaAR(cuota.fechaVencimiento)}
          {cuota.venta.cliente.telefono ? ` · ${cuota.venta.cliente.telefono}` : ''}
        </p>
      </div>
      <span className={`shrink-0 text-sm font-bold tabular-nums ${vencida ? 'text-red-300' : 'text-amber-300'}`}>
        {formatARS(total)}
      </span>
    </div>
  )
}

function ListaCuotas({
  titulo,
  subtitulo,
  cuotas,
  vencida,
}: {
  titulo: string
  subtitulo: string
  cuotas: CuotaDashboard[]
  vencida: boolean
}) {
  return (
    <section className="rounded-2xl border border-zinc-800/70 bg-zinc-900/50 p-4 sm:p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-white">{titulo}</h2>
          <p className="mt-0.5 text-[11px] text-zinc-500">{subtitulo}</p>
        </div>
        <span className={`rounded-full border px-2.5 py-1 text-[11px] font-bold tabular-nums ${vencida ? 'border-red-500/20 bg-red-500/10 text-red-300' : 'border-amber-500/20 bg-amber-500/10 text-amber-300'}`}>
          {cuotas.length}
        </span>
      </div>
      {cuotas.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-800 py-8 text-center">
          <span className={`mb-2 flex h-9 w-9 items-center justify-center rounded-full ${vencida ? 'bg-emerald-500/10 text-emerald-300' : 'bg-zinc-800 text-zinc-500'}`}>
            ✓
          </span>
          <p className="text-sm font-medium text-zinc-400">
            {vencida ? 'No hay deudas vencidas' : 'No hay vencimientos próximos'}
          </p>
          <p className="mt-0.5 text-[11px] text-zinc-600">
            {vencida ? 'La cartera está al día.' : 'No hay cuotas en los próximos 7 días.'}
          </p>
        </div>
      ) : (
        <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
          {cuotas.map(cuota => (
            <CuotaRow key={cuota.id} cuota={cuota} vencida={vencida} />
          ))}
        </div>
      )}
    </section>
  )
}

function SkeletonDashboard() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="rounded-2xl border border-zinc-800/70 bg-zinc-900/50 p-5">
            <div className="skeleton h-3 w-24 rounded" />
            <div className="skeleton mt-4 h-7 w-28 rounded" />
            <div className="skeleton mt-3 h-3 w-16 rounded opacity-60" />
          </div>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, index) => (
          <div key={index} className="rounded-2xl border border-zinc-800/70 bg-zinc-900/50 p-5">
            <div className="skeleton h-4 w-40 rounded" />
            <div className="mt-5 space-y-2">
              {Array.from({ length: 4 }).map((_, row) => (
                <div key={row} className="skeleton h-14 w-full rounded-xl opacity-70" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const [datos, setDatos] = useState<DashboardData | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  const cargar = async () => {
    setCargando(true)
    setError('')
    try {
      const res = await fetch('/api/dashboard', { cache: 'no-store' })
      const data = (await res.json()) as DashboardData & { error?: string }
      if (!res.ok) throw new Error(data.error || 'No se pudo cargar el resumen')
      setDatos(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cargar el resumen')
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    let activo = true
    fetch('/api/dashboard', { cache: 'no-store' })
      .then(async res => {
        const data = (await res.json()) as DashboardData & { error?: string }
        if (!res.ok) throw new Error(data.error || 'No se pudo cargar el resumen')
        return data
      })
      .then(data => {
        if (activo) setDatos(data)
      })
      .catch(e => {
        if (activo) setError(e instanceof Error ? e.message : 'No se pudo cargar el resumen')
      })
      .finally(() => {
        if (activo) setCargando(false)
      })

    return () => {
      activo = false
    }
  }, [])

  const hoy = new Date().toLocaleDateString('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'America/Argentina/Tucuman',
  })

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 md:p-8">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-blue-400/80">Panel general</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-white md:text-3xl">
            Buen día <span className="font-normal text-zinc-400">👋</span>
          </h1>
          <p className="mt-1 text-sm capitalize text-zinc-500">{hoy}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/pos"
            className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-950/30 transition hover:bg-blue-500"
          >
            + Nueva venta
          </Link>
          <Link
            href="/admin/caja-reportes?tab=reportes"
            className="rounded-xl border border-zinc-700/80 bg-zinc-900/70 px-4 py-2.5 text-sm font-semibold text-zinc-200 transition hover:border-zinc-600 hover:bg-zinc-800"
          >
            Ver reportes
          </Link>
        </div>
      </header>

      {cargando ? (
        <SkeletonDashboard />
      ) : error ? (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-6 text-center">
          <p className="text-sm font-semibold text-red-300">{error}</p>
          <button
            type="button"
            onClick={() => void cargar()}
            className="mt-3 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-200 transition hover:bg-red-500/20"
          >
            Reintentar
          </button>
        </div>
      ) : datos ? (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            <StatCard
              etiqueta="Total vendido"
              valor={formatARS(datos.totalVentasMes)}
              detalle={`${datos.cantVentasMes} operaciones del mes`}
              tono="blue"
              icono="ventas"
            />
            <StatCard
              etiqueta="Cobrado"
              valor={formatARS(datos.totalCobradoMes)}
              detalle="Contado, cuotas y taller"
              tono="green"
              icono="cobrado"
            />
            <StatCard
              etiqueta="Clientes activos"
              valor={String(datos.clientesActivosMes)}
              detalle="Con compras este mes"
              tono="violet"
              icono="clientes"
            />
            <StatCard
              etiqueta="Cuotas vencidas"
              valor={String(datos.cuotasVencidas.length)}
              detalle="Requieren seguimiento"
              tono="red"
              icono="vencidas"
            />
            <div className="col-span-2 lg:col-span-1">
              <StatCard
                etiqueta="Ventas del mes"
                valor={String(datos.cantVentasMes)}
                detalle={`${datos.cantVentasContadoMes} contado · ${datos.cantVentasFinanciadasMes} financiadas`}
                tono="neutral"
                icono="operaciones"
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-zinc-800/70 bg-zinc-900/50 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Contado</p>
              <p className="mt-1 text-lg font-bold tabular-nums text-white">{formatARS(datos.totalVentasContadoMes)}</p>
            </div>
            <div className="rounded-2xl border border-zinc-800/70 bg-zinc-900/50 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Financiado</p>
              <p className="mt-1 text-lg font-bold tabular-nums text-white">{formatARS(datos.totalVentasFinanciadasMes)}</p>
            </div>
            <div className="rounded-2xl border border-zinc-800/70 bg-zinc-900/50 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Anticipos</p>
              <p className="mt-1 text-lg font-bold tabular-nums text-white">{formatARS(datos.totalAnticiposMes)}</p>
            </div>
            <div className="rounded-2xl border border-zinc-800/70 bg-zinc-900/50 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Taller</p>
              <p className="mt-1 text-lg font-bold tabular-nums text-white">{formatARS(datos.totalReparacionesMes)}</p>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <ListaCuotas
              titulo="Vencen pronto"
              subtitulo="Próximos 7 días"
              cuotas={datos.cuotasProximas}
              vencida={false}
            />
            <ListaCuotas
              titulo="Cuotas vencidas"
              subtitulo="Seguimiento de cobranza"
              cuotas={datos.cuotasVencidas}
              vencida
            />
          </div>

          <section>
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-sm font-bold text-white">Accesos rápidos</h2>
              <span className="text-[11px] text-zinc-600">Atajos del sistema</span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {ACCIONES.map(accion => (
                <Link
                  key={accion.href}
                  href={accion.href}
                  className="group rounded-2xl border border-zinc-800/70 bg-zinc-900/50 p-4 transition hover:-translate-y-0.5 hover:border-blue-500/30 hover:bg-zinc-900"
                >
                  <span className="text-xl">{accion.icon}</span>
                  <p className="mt-3 text-sm font-bold text-white transition group-hover:text-blue-200">{accion.label}</p>
                  <p className="mt-0.5 text-[11px] text-zinc-500">{accion.detalle}</p>
                </Link>
              ))}
            </div>
          </section>
        </>
      ) : null}
    </div>
  )
}
