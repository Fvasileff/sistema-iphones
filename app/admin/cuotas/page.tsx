'use client'

import { useState, useEffect } from 'react'

interface Reporte {
  totalCobradoMes: number
  totalDeudaVencida: number
  cantVentasMes: number
  cuotasVencidas: any[]
  cuotasProximas: any[]
  ventasDelMes: any[]
}

export default function ReportesPage() {
  const hoy = new Date()
  const [mes, setMes] = useState(hoy.getMonth() + 1)
  const [anio, setAnio] = useState(hoy.getFullYear())
  const [datos, setDatos] = useState<Reporte | null>(null)
  const [cargando, setCargando] = useState(true)

  const cargar = async () => {
    setCargando(true)
    const res = await fetch(`/api/reportes?mes=${mes}&anio=${anio}`)
    if (res.ok) setDatos(await res.json())
    setCargando(false)
  }

  useEffect(() => { cargar() }, [mes, anio])

  const meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      {/* Header Responsivo */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
        <h1 className="text-2xl md:text-3xl font-bold text-white">📊 Reportes</h1>
        <div className="flex gap-2">
          <select value={mes} onChange={e => setMes(parseInt(e.target.value))}
            className="flex-1 p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-sm outline-none">
            {meses.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
          <select value={anio} onChange={e => setAnio(parseInt(e.target.value))}
            className="w-24 p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-sm outline-none">
            {[2024, 2025, 2026].map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
      </div>

      {cargando || !datos ? (
        <p className="text-zinc-500 text-center py-20">Analizando datos...</p>
      ) : (
        <div className="space-y-6">
          {/* Tarjetas de Resumen */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
              <p className="text-zinc-500 text-xs font-bold uppercase tracking-wider mb-2">Cobrado en {meses[mes-1]}</p>
              <p className="text-3xl font-bold text-green-400">${datos.totalCobradoMes.toLocaleString('es-AR')}</p>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
              <p className="text-zinc-500 text-xs font-bold uppercase tracking-wider mb-2">Deuda Vencida</p>
              <p className="text-3xl font-bold text-red-400">${datos.totalDeudaVencida.toLocaleString('es-AR')}</p>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
              <p className="text-zinc-500 text-xs font-bold uppercase tracking-wider mb-2">Ventas del mes</p>
              <p className="text-3xl font-bold text-white">{datos.cantVentasMes}</p>
            </div>
          </div>

          {/* Listas de Detalles (Tarjetas) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Cuotas Vencidas */}
            <div className="bg-zinc-900 border border-red-500/20 rounded-2xl p-6">
              <h2 className="text-red-400 font-bold mb-4">🔴 Vencidas ({datos.cuotasVencidas.length})</h2>
              <div className="space-y-3">
                {datos.cuotasVencidas.map((c: any) => (
                  <div key={c.id} className="flex justify-between items-center text-sm bg-zinc-950 p-3 rounded-lg">
                    <span className="text-white font-medium">{c.venta.cliente.apellido}</span>
                    <span className="text-red-400 font-bold">${(Number(c.montoOriginal) + Number(c.montoMora)).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Cuotas Próximas */}
            <div className="bg-zinc-900 border border-yellow-500/20 rounded-2xl p-6">
              <h2 className="text-yellow-400 font-bold mb-4">⏰ Próximas ({datos.cuotasProximas.length})</h2>
              <div className="space-y-3">
                {datos.cuotasProximas.map((c: any) => (
                  <div key={c.id} className="flex justify-between items-center text-sm bg-zinc-950 p-3 rounded-lg">
                    <span className="text-white font-medium">{c.venta.cliente.apellido}</span>
                    <span className="text-yellow-400 font-bold">${Number(c.montoOriginal).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Tabla de Ventas (Diseño responsivo mejorado) */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
            <h2 className="text-white font-bold mb-4">📋 Detalle de Ventas</h2>
            <div className="space-y-3">
              {datos.ventasDelMes.map((v: any) => (
                <div key={v.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-zinc-950 rounded-xl gap-2">
                  <div className="flex flex-col">
                    <span className="text-white font-bold">{v.cliente.apellido}, {v.cliente.nombre}</span>
                    <span className="text-zinc-500 text-xs">{v.iphone.modelo}</span>
                  </div>
                  <span className="text-white font-bold">$ {Number(v.precioVenta).toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}