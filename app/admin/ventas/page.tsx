'use client'

import { useState, useEffect } from 'react'

interface Cliente {
  id: string
  nombre: string
  apellido: string
  dni: string
}

interface iPhone {
  id: string
  modelo: string
  variante: string
  almacenamiento: string
  color: string
  stock: number // <--- AGREGADO: Para poder leer el inventario
}

export default function RegistrarVentaPage() {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [iphones, setIphones] = useState<iPhone[]>([])

  const [clienteId, setClienteId] = useState('')
  const [iphoneId, setIphoneId] = useState('')
  const [precioVenta, setPrecioVenta] = useState('')
  const [anticipoEfectivo, setAnticipoEfectivo] = useState('0')
  const [anticipoEquipo, setAnticipoEquipo] = useState('0')
  const [descripcionEquipo, setDescripcionEquipo] = useState('')
  const [planPago, setPlanPago] = useState('SEMANAL')
  const [totalCuotas, setTotalCuotas] = useState(8)
  const [montoCuota, setMontoCuota] = useState('')
  const [interesPct, setInteresPct] = useState('0')

  const [cargando, setCargando] = useState(false)
  const [mensaje, setMensaje] = useState({ texto: '', tipo: '' })

  // --- LÓGICA DE STOCK ---
  const iphoneSeleccionado = iphones.find(i => i.id === iphoneId);
  const sinStock = iphoneSeleccionado ? iphoneSeleccionado.stock <= 0 : false;

  useEffect(() => {
    const cargarDatos = async () => {
      try {
        const [resClientes, resIphones] = await Promise.all([
          fetch('/api/clientes'),
          fetch('/api/iphones')
        ])
        
        if (resClientes.ok) setClientes(await resClientes.json())
        if (resIphones.ok) {
          const listaIphones = await resIphones.json()
          setIphones(listaIphones.filter((i: any) => i.activo !== false))
        }
      } catch (error) {
        console.error('Error al cargar datos iniciales:', error)
      }
    }
    cargarDatos()
  }, [])

  useEffect(() => {
    const precio = parseFloat(precioVenta) || 0;
    const anticipo = (parseFloat(anticipoEfectivo) || 0) + (parseFloat(anticipoEquipo) || 0);
    const saldoAFinanciar = precio - anticipo;
    const interes = parseFloat(interesPct) || 0;

    if (saldoAFinanciar > 0 && totalCuotas > 0) {
      const saldoConInteres = saldoAFinanciar * (1 + interes / 100);
      setMontoCuota((saldoConInteres / totalCuotas).toFixed(2));
    } else {
      setMontoCuota('');
    }
  }, [precioVenta, anticipoEfectivo, anticipoEquipo, totalCuotas, interesPct]);

  const handlePlanChange = (tipo: string) => {
    setPlanPago(tipo)
    if (tipo === 'SEMANAL') setTotalCuotas(8)
    if (tipo === 'QUINCENAL') setTotalCuotas(4)
    if (tipo === 'MENSUAL') setTotalCuotas(2)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (sinStock) return; // Seguridad extra

    setCargando(true)
    setMensaje({ texto: '', tipo: '' })

    try {
      const res = await fetch('/api/ventas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clienteId,
          iphoneId,
          precioVenta,
          anticipoEfectivo,
          anticipoEquipo,
          descripcionEquipo,
          planPago,
          totalCuotas,
          montoCuota,
          interesPct
        })
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al procesar la venta')

      setMensaje({ texto: '¡Financiación registrada y cuotas generadas con éxito!', tipo: 'success' })
      
      setClienteId(''); setIphoneId(''); setPrecioVenta(''); 
      setAnticipoEfectivo('0'); setAnticipoEquipo('0'); setDescripcionEquipo('');
      setMontoCuota(''); setInteresPct('0')
    } catch (error: any) {
      setMensaje({ texto: error.message, tipo: 'error' })
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl md:text-3xl font-bold mb-6 text-gray-800 dark:text-white">Nueva Financiación</h1>
      {mensaje.texto && (
        <div className={`p-4 rounded-xl mb-6 text-sm font-semibold ${
          mensaje.tipo === 'success' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
        }`}>
          {mensaje.texto}
        </div>
      )}
      <form onSubmit={handleSubmit} className="bg-white dark:bg-zinc-900 p-6 rounded-xl shadow-md border border-gray-200 dark:border-zinc-800 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Seleccionar Cliente *</label>
            <select value={clienteId} onChange={(e) => setClienteId(e.target.value)} required className="w-full p-2.5 border rounded-lg bg-transparent dark:border-zinc-700">
              <option value="" className="dark:bg-zinc-900">-- Elegir Cliente --</option>
              {clientes.map(c => <option key={c.id} value={c.id} className="dark:bg-zinc-900">{c.apellido}, {c.nombre} (DNI: {c.dni})</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Seleccionar iPhone *</label>
            <select value={iphoneId} onChange={(e) => setIphoneId(e.target.value)} required className={`w-full p-2.5 border rounded-lg bg-transparent dark:border-zinc-700 ${sinStock ? 'border-red-500' : ''}`}>
              <option value="" className="dark:bg-zinc-900">-- Elegir Equipo --</option>
              {iphones.map(i => (
                <option key={i.id} value={i.id} disabled={i.stock <= 0} className="dark:bg-zinc-900">
                  {i.modelo} {i.variante} ({i.almacenamiento} - {i.color}) {i.stock <= 0 ? '[AGOTADO]' : `(Stock: ${i.stock})`}
                </option>
              ))}
            </select>
          </div>
        </div>
        <hr className="dark:border-zinc-800" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Precio Final Pactado *</label>
            <input type="number" step="any" value={precioVenta} onChange={(e) => setPrecioVenta(e.target.value)} required className="w-full p-2.5 border rounded-lg bg-transparent dark:border-zinc-700" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Anticipo Efectivo</label>
            <input type="number" step="any" value={anticipoEfectivo} onChange={(e) => setAnticipoEfectivo(e.target.value)} className="w-full p-2.5 border rounded-lg bg-transparent dark:border-zinc-700" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Valor Equipo Tomado</label>
            <input type="number" step="any" value={anticipoEquipo} onChange={(e) => setAnticipoEquipo(e.target.value)} className="w-full p-2.5 border rounded-lg bg-transparent dark:border-zinc-700" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Descripción del Equipo (Opcional)</label>
          <input type="text" value={descripcionEquipo} onChange={(e) => setDescripcionEquipo(e.target.value)} className="w-full p-2.5 border rounded-lg bg-transparent dark:border-zinc-700" />
        </div>
        <hr className="dark:border-zinc-800" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Frecuencia *</label>
            <select value={planPago} onChange={(e) => handlePlanChange(e.target.value)} required className="w-full p-2.5 border rounded-lg bg-transparent dark:border-zinc-700">
              <option value="SEMANAL" className="dark:bg-zinc-900">Semanal</option>
              <option value="QUINCENAL" className="dark:bg-zinc-900">Quincenal</option>
              <option value="MENSUAL" className="dark:bg-zinc-900">Mensual</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Cant. Cuotas *</label>
            <input type="number" value={totalCuotas} onChange={(e) => setTotalCuotas(parseInt(e.target.value))} required className="w-full p-2.5 border rounded-lg bg-transparent dark:border-zinc-700" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Valor de Cada Cuota *</label>
            <input type="number" step="any" value={montoCuota} onChange={(e) => setMontoCuota(e.target.value)} required className="w-full p-2.5 border rounded-lg bg-transparent dark:border-zinc-700" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Interés %</label>
            <input type="number" step="any" value={interesPct} onChange={(e) => setInteresPct(e.target.value)} className="w-full p-2.5 border rounded-lg bg-transparent dark:border-zinc-700" />
          </div>
        </div>

        {precioVenta && montoCuota && (
          <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-4 text-sm text-zinc-300 space-y-1">
            <p>📅 {totalCuotas} cuotas de: <span className="font-semibold text-green-400 text-base">${montoCuota}</span></p>
          </div>
        )}

        <button 
          type="submit" 
          disabled={cargando || sinStock} 
          className={`w-full font-semibold py-3 rounded-xl transition-colors text-base shadow-md ${cargando || sinStock ? 'bg-gray-600 cursor-not-allowed opacity-50' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
        >
          {sinStock ? '⚠️ Sin Stock Disponible' : (cargando ? 'Registrando...' : 'Confirmar y Generar Plan de Pagos')}
        </button>
      </form>
    </div>
  )
}