'use client'

import { useSession } from 'next-auth/react'
import { useState, useEffect } from 'react'

export default function DashboardPage() {
  const { data: session } = useSession()
  const [datos, setDatos] = useState<any>(null)

  useEffect(() => {
    const hoy = new Date()
    const mes = hoy.getMonth() + 1
    const anio = hoy.getFullYear()
    fetch(`/api/reportes?mes=${mes}&anio=${anio}`)
      .then(r => r.json())
      .then(setDatos)
  }, [])

  return (
    <div>
      <div className="mb-8 mt-6 md:mt-0">
        <h1 className="text-3xl md:text-4xl font-bold text-white">
          Bienvenido👋
        </h1>
        <p className="text-gray-400 mt-1">Resumen del sistema</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gray-900 rounded-2xl p-6">
          <p className="text-gray-400 text-sm">Ventas del mes</p>
          <p className="text-3xl font-bold text-white mt-2">
            {datos ? datos.cantVentasMes : '...'}
          </p>
        </div>

        <div className="bg-gray-900 rounded-2xl p-6">
          <p className="text-gray-400 text-sm">Clientes activos</p>
          <p className="text-3xl font-bold text-white mt-2">
            {datos ? datos.ventasDelMes.length > 0
              ? [...new Set(datos.ventasDelMes.map((v: any) => v.clienteId))].length
              : 0 : '...'}
          </p>
        </div>

        <div className="bg-gray-900 rounded-2xl p-6">
          <p className="text-gray-400 text-sm">Cuotas vencidas</p>
          <p className="text-3xl font-bold text-red-400 mt-2">
            {datos ? datos.cuotasVencidas.length : '...'}
          </p>
        </div>

        <div className="bg-gray-900 rounded-2xl p-6">
          <p className="text-gray-400 text-sm">Cobrado este mes</p>
          <p className="text-3xl font-bold text-green-400 mt-2">
            {datos ? `$${datos.totalCobradoMes.toFixed(2)}` : '...'}
          </p>
        </div>
      </div>

      {/* Próximas a vencer */}
      {datos?.cuotasProximas?.length > 0 && (
        <div className="mt-8 bg-gray-900 rounded-2xl p-6 border border-yellow-500/30">
          <h2 className="text-yellow-400 font-semibold mb-4">
            ⏰ Vencen en los próximos 7 días ({datos.cuotasProximas.length})
          </h2>
          <div className="space-y-2">
            {datos.cuotasProximas.map((c: any) => (
              <div key={c.id} className="flex justify-between items-center text-sm">
                <span className="text-white">{c.venta.cliente.apellido}, {c.venta.cliente.nombre}</span>
                <span className="text-zinc-400">{new Date(c.fechaVencimiento).toLocaleDateString('es-AR')}</span>
                <span className="text-yellow-400 font-semibold">${Number(c.montoOriginal).toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cuotas vencidas sin pagar */}
      {datos?.cuotasVencidas?.length > 0 && (
        <div className="mt-4 bg-gray-900 rounded-2xl p-6 border border-red-500/30">
          <h2 className="text-red-400 font-semibold mb-4">
            🔴 Cuotas vencidas sin pagar ({datos.cuotasVencidas.length})
          </h2>
          <div className="space-y-2">
            {datos.cuotasVencidas.map((c: any) => (
              <div key={c.id} className="flex justify-between items-center text-sm">
                <span className="text-white">{c.venta.cliente.apellido}, {c.venta.cliente.nombre}</span>
                <span className="text-zinc-500 text-xs">{c.venta.cliente.telefono}</span>
                <span className="text-zinc-400">{new Date(c.fechaVencimiento).toLocaleDateString('es-AR')}</span>
                <span className="text-red-400 font-semibold">${(Number(c.montoOriginal) + Number(c.montoMora)).toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}