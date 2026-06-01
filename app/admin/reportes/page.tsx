'use client'

import { useState, useEffect, useRef } from 'react'

interface Cliente {
  nombre: string
  apellido: string
  dni: string
}

interface Cuota {
  id: number
  montoOriginal: number
  montoMora: number
  fechaVencimiento: string
  venta: {
    cliente: Cliente
  }
}
interface Venta {
  id: number
  fechaVenta: string
  precioVenta: number
  planPago: string
  totalCuotas: number
  iphone: {
    modelo: string
  }
  cliente: Cliente
}

interface Reporte {
  totalCobradoMes: number
  totalDeudaVencida: number
  cantVentasMes: number
  cuotasVencidas: Cuota[]
  cuotasProximas: Cuota[]
  ventasDelMes: Venta[]
}

type PeriodoTipo = 'semanal' | 'mensual' | 'anual'

function Dropdown<T extends string | number>({
  value,
  options,
  onChange,
}: {
  value: T
  options: { label: string; value: T }[]
  onChange: (val: T) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const selected = options.find(o => o.value === value)

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(prev => !prev)}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-700 text-white text-sm font-medium hover:border-zinc-500 transition-colors min-w-[140px] justify-between"
      >
        <span>{selected?.label}</span>
        <svg
          className={`w-4 h-4 text-zinc-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute z-50 top-full mt-2 left-0 min-w-full bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
          {options.map(opt => (
            <button
              key={String(opt.value)}
              onClick={() => { onChange(opt.value); setOpen(false) }}
              className={`w-full text-left px-4 py-3 text-sm transition-colors hover:bg-zinc-800 
                ${opt.value === value ? 'text-white font-semibold bg-zinc-800' : 'text-zinc-300'}`}
            >
              {opt.value === value && <span className="mr-2 text-blue-400">✓</span>}
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function ReportesPage() {
  const hoy = new Date()

  const [tipoPeriodo, setTipoPeriodo] = useState<PeriodoTipo>('mensual')
  const [mes, setMes] = useState<number>(hoy.getMonth() + 1)
  const [anio, setAnio] = useState<number>(hoy.getFullYear())

  const [datos, setDatos] = useState<Reporte | null>(null)
  const [cargando, setCargando] = useState<boolean>(true)

  const cargar = async () => {
    setCargando(true)
    const res = await fetch(`/api/reportes?tipo=${tipoPeriodo}&mes=${mes}&anio=${anio}`)
    if (res.ok) setDatos(await res.json())
    setCargando(false)
  }

  useEffect(() => { cargar() }, [tipoPeriodo, mes, anio])

  const meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
  const anosDisponibles = [hoy.getFullYear() - 2, hoy.getFullYear() - 1, hoy.getFullYear()]

  const obtenerTituloPeriodo = () => {
    if (tipoPeriodo === 'semanal') return 'Últimos 7 días'
    if (tipoPeriodo === 'anual') return `Año ${anio}`
    return `Mes de ${meses[mes - 1]}`
  }

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-8 gap-4">
        <h1 className="text-2xl md:text-3xl font-bold text-white">📊 Reportes</h1>

        <div className="flex flex-wrap gap-2 items-center">
          <Dropdown
            value={tipoPeriodo}
           options={[
              { label: 'Semanal', value: 'semanal' },
              { label: 'Mensual', value: 'mensual' },
              { label: 'Anual', value: 'anual' },
            ]}
            onChange={val => setTipoPeriodo(val as PeriodoTipo)}
          />

          {tipoPeriodo === 'mensual' && (
            <Dropdown
              value={mes}
              options={meses.map((m, i) => ({ label: m, value: i + 1 }))}
              onChange={val => setMes(val as number)}
            />
          )}

          {tipoPeriodo !== 'semanal' && (
            <Dropdown
              value={anio}
              options={anosDisponibles.map(a => ({ label: String(a), value: a }))}
              onChange={val => setAnio(val as number)}
            />
          )}
        </div>
      </div>

      {cargando || !datos ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="w-6 h-6 border-2 border-t-transparent border-white rounded-full animate-spin"></div>
          <p className="text-zinc-500 text-sm">Analizando datos...</p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 hover:border-zinc-700 transition-all">
              <p className="text-zinc-500 text-xs font-bold uppercase tracking-wider mb-2">Cobrado ({obtenerTituloPeriodo()})</p>
              <p className="text-3xl font-bold text-green-400">
                ${(datos.totalCobradoMes || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 hover:border-zinc-700 transition-all">
              <p className="text-zinc-500 text-xs font-bold uppercase tracking-wider mb-2">Deuda Vencida Total</p>
              <p className="text-3xl font-bold text-red-400">
                ${(datos.totalDeudaVencida || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 hover:border-zinc-700 transition-all">
              <p className="text-zinc-500 text-xs font-bold uppercase tracking-wider mb-2">Ventas ({obtenerTituloPeriodo()})</p>
              <p className="text-3xl font-bold text-white">{datos.cantVentasMes || 0}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-zinc-900 border border-red-500/10 rounded-2xl p-6">
              <h2 className="text-red-400 font-bold mb-4 flex items-center gap-2">
                <span>🔴 Vencidas</span>
                <span className="bg-red-500/10 px-2 py-0.5 text-xs rounded-full">{datos.cuotasVencidas?.length || 0}</span>
              </h2>
              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                {!datos.cuotasVencidas || datos.cuotasVencidas.length === 0 ? (
                  <p className="text-zinc-600 text-sm text-center py-4">No hay deudas vencidas 🎉</p>
                ) : (
                  datos.cuotasVencidas.map((c) => (
                    <div key={c.id} className="flex justify-between items-center text-sm bg-zinc-950 p-3 rounded-xl border border-zinc-900">
                      <div>
                        <p className="text-white font-medium">{c.venta.cliente.apellido}, {c.venta.cliente.nombre}</p>
                        <p className="text-[10px] text-zinc-500 font-mono">DNI: {c.venta.cliente.dni}</p>
                        <p className="text-[10px] text-red-400 mt-0.5">
                          Venció: {new Date(c.fechaVencimiento).toLocaleDateString('es-AR')} · {Math.floor((new Date().getTime() - new Date(c.fechaVencimiento).getTime()) / (1000 * 60 * 60 * 24))} días
                        </p>
                      </div>
                      <span className="text-red-400 font-bold">${(Number(c.montoOriginal) + Number(c.montoMora)).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="bg-zinc-900 border border-yellow-500/10 rounded-2xl p-6">
              <h2 className="text-yellow-400 font-bold mb-4 flex items-center gap-2">
                <span>⏰ Próximas</span>
                <span className="bg-yellow-500/10 px-2 py-0.5 text-xs rounded-full">{datos.cuotasProximas?.length || 0}</span>
              </h2>
              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                {!datos.cuotasProximas || datos.cuotasProximas.length === 0 ? (
                  <p className="text-zinc-600 text-sm text-center py-4">No hay cuotas próximas</p>
                ) : (
                 datos.cuotasProximas.map((c) => (
                    <div key={c.id} className="flex justify-between items-center text-sm bg-zinc-950 p-3 rounded-xl border border-zinc-900">
                      <div>
                        <p className="text-white font-medium">{c.venta.cliente.apellido}, {c.venta.cliente.nombre}</p>
                        <p className="text-[10px] text-zinc-500 font-mono">DNI: {c.venta.cliente.dni}</p>
                        <p className="text-[10px] text-yellow-400 mt-0.5">
                          Vence: {new Date(c.fechaVencimiento).toLocaleDateString('es-AR')} · en {Math.floor((new Date(c.fechaVencimiento).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} días
                        </p>
                      </div>
                      <span className="text-yellow-400 font-bold">${Number(c.montoOriginal).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
  <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
    <h2 className="text-white font-bold mb-4">📋 Detalle de Ventas ({obtenerTituloPeriodo()})</h2>
    <div className="space-y-3">
      {!datos.ventasDelMes || datos.ventasDelMes.length === 0 ? (
        <p className="text-zinc-600 text-sm text-center py-8">No se registraron ventas en este período.</p>
      ) : (
        datos.ventasDelMes.map((v) => (
          <div key={v.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-zinc-950 rounded-xl gap-2 border border-zinc-900 hover:border-zinc-800 transition-colors">
            <div className="flex flex-col">
              <span className="text-white font-bold text-sm">{v.cliente.apellido}, {v.cliente.nombre}</span>
              <span className="text-zinc-400 text-xs mt-0.5">
                {v.iphone.modelo} · {v.totalCuotas} cuotas {v.planPago.toLowerCase()}es
              </span>
            </div>
            <div className="flex justify-between sm:flex-col sm:items-end gap-1 items-center">
              <span className="text-zinc-500 text-xs font-mono bg-zinc-900 px-2 py-0.5 rounded-md sm:bg-transparent sm:p-0">
                {new Date(v.fechaVenta).toLocaleDateString('es-AR')}
              </span>
              <span className="text-white font-bold">${Number(v.precioVenta).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        ))
      )}
    </div>
  </div>
        </div>
      )}
    </div>
  )
}