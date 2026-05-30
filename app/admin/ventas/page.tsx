'use client'

import { useState, useEffect, useRef } from 'react'

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
  stock: number
}

// Componente Dropdown custom reutilizable
function Dropdown<T extends string | number>({
  value,
  options,
  onChange,
  placeholder,
  disabled,
  error,
}: {
  value: T | ''
  options: { label: string; value: T; disabled?: boolean; badge?: string }[]
  onChange: (val: T) => void
  placeholder?: string
  disabled?: boolean
  error?: boolean
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
        type="button"
        onClick={() => !disabled && setOpen(prev => !prev)}
        className={`flex items-center justify-between w-full px-4 py-3 rounded-xl border text-sm font-medium transition-all
          ${disabled ? 'opacity-40 cursor-not-allowed bg-zinc-800 border-zinc-700' :
            error ? 'border-red-500 bg-zinc-900 hover:border-red-400' :
            open ? 'border-blue-500 bg-zinc-900' :
            'border-zinc-700 bg-zinc-900 hover:border-zinc-500'}
          text-white`}
      >
        <span className={selected ? 'text-white' : 'text-zinc-500'}>
          {selected ? selected.label : (placeholder || 'Seleccionar...')}
        </span>
        <svg className={`w-4 h-4 text-zinc-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute z-50 top-full mt-2 left-0 w-full bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl overflow-hidden max-h-60 overflow-y-auto">
          {options.map(opt => (
            <button
              key={String(opt.value)}
              type="button"
              disabled={opt.disabled}
              onClick={() => { if (!opt.disabled) { onChange(opt.value); setOpen(false) } }}
              className={`w-full text-left px-4 py-3 text-sm transition-colors flex items-center justify-between
                ${opt.disabled ? 'opacity-40 cursor-not-allowed text-zinc-500' :
                  opt.value === value ? 'bg-zinc-800 text-white font-semibold' :
                  'text-zinc-300 hover:bg-zinc-800'}`}
            >
              <span>
                {opt.value === value && <span className="mr-2 text-blue-400">✓</span>}
                {opt.label}
              </span>
              {opt.badge && (
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium
                  ${opt.badge === 'AGOTADO' ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
                  {opt.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// Input estilizado
function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
        {label} {required && <span className="text-blue-400">*</span>}
      </label>
      {children}
    </div>
  )
}

const inputClass = "w-full px-4 py-3 rounded-xl border border-zinc-700 bg-zinc-900 text-white text-sm placeholder-zinc-600 focus:outline-none focus:border-blue-500 transition-colors"

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

  const iphoneSeleccionado = iphones.find(i => i.id === iphoneId)
  const sinStock = iphoneSeleccionado ? iphoneSeleccionado.stock <= 0 : false

  useEffect(() => {
    const cargarDatos = async () => {
      try {
        const [resClientes, resIphones] = await Promise.all([
          fetch('/api/clientes'),
          fetch('/api/iphones')
        ])
        if (resClientes.ok) setClientes(await resClientes.json())
        if (resIphones.ok) {
          const lista = await resIphones.json()
          setIphones(lista.filter((i: any) => i.activo !== false))
        }
      } catch (error) {
        console.error('Error al cargar datos iniciales:', error)
      }
    }
    cargarDatos()
  }, [])

  useEffect(() => {
    const precio = parseFloat(precioVenta) || 0
    const anticipo = (parseFloat(anticipoEfectivo) || 0) + (parseFloat(anticipoEquipo) || 0)
    const saldo = precio - anticipo
    const interes = parseFloat(interesPct) || 0
    if (saldo > 0 && totalCuotas > 0) {
      setMontoCuota((saldo * (1 + interes / 100) / totalCuotas).toFixed(2))
    } else {
      setMontoCuota('')
    }
  }, [precioVenta, anticipoEfectivo, anticipoEquipo, totalCuotas, interesPct])

  const handlePlanChange = (tipo: string) => {
    setPlanPago(tipo)
    if (tipo === 'SEMANAL') setTotalCuotas(8)
    if (tipo === 'QUINCENAL') setTotalCuotas(4)
    if (tipo === 'MENSUAL') setTotalCuotas(2)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (sinStock) return
    setCargando(true)
    setMensaje({ texto: '', tipo: '' })
    try {
      const res = await fetch('/api/ventas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clienteId, iphoneId, precioVenta, anticipoEfectivo, anticipoEquipo, descripcionEquipo, planPago, totalCuotas, montoCuota, interesPct })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al procesar la venta')
      setMensaje({ texto: '¡Financiación registrada y cuotas generadas con éxito!', tipo: 'success' })
      setClienteId(''); setIphoneId(''); setPrecioVenta('')
      setAnticipoEfectivo('0'); setAnticipoEquipo('0'); setDescripcionEquipo('')
      setMontoCuota(''); setInteresPct('0')
    } catch (error: any) {
      setMensaje({ texto: error.message, tipo: 'error' })
    } finally {
      setCargando(false)
    }
  }

  const precio = parseFloat(precioVenta) || 0
  const anticipo = (parseFloat(anticipoEfectivo) || 0) + (parseFloat(anticipoEquipo) || 0)
  const saldo = precio - anticipo

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto">
      <h1 className="text-2xl md:text-3xl font-bold text-white mb-8">Nueva Financiación</h1>

      {mensaje.texto && (
        <div className={`p-4 rounded-xl mb-6 text-sm font-semibold flex items-center gap-2 ${
          mensaje.tipo === 'success'
            ? 'bg-green-500/10 text-green-400 border border-green-500/20'
            : 'bg-red-500/10 text-red-400 border border-red-500/20'
        }`}>
          {mensaje.tipo === 'success' ? '✅' : '❌'} {mensaje.texto}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* Sección: Cliente y Equipo */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4">
          <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Cliente y Equipo</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Cliente" required>
              <Dropdown
                value={clienteId}
                placeholder="Elegir cliente..."
                options={clientes.map(c => ({
                  label: `${c.apellido}, ${c.nombre} — ${c.dni}`,
                  value: c.id,
                }))}
                onChange={setClienteId}
              />
            </Field>
            <Field label="iPhone" required>
              <Dropdown
                value={iphoneId}
                placeholder="Elegir equipo..."
                error={sinStock}
                options={iphones.map(i => ({
                  label: `${i.modelo}${i.variante ? ' ' + i.variante : ''} (${i.almacenamiento} · ${i.color})`,
                  value: i.id,
                  disabled: i.stock <= 0,
                  badge: i.stock <= 0 ? 'AGOTADO' : `Stock: ${i.stock}`,
                }))}
                onChange={setIphoneId}
              />
            </Field>
          </div>
        </div>

        {/* Sección: Precios */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4">
          <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Precios y Anticipos</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Field label="Precio Final Pactado" required>
              <input type="number" step="any" value={precioVenta} onChange={e => setPrecioVenta(e.target.value)} required placeholder="0" className={inputClass} />
            </Field>
            <Field label="Anticipo Efectivo">
              <input type="number" step="any" value={anticipoEfectivo} onChange={e => setAnticipoEfectivo(e.target.value)} className={inputClass} />
            </Field>
            <Field label="Valor Equipo Tomado">
              <input type="number" step="any" value={anticipoEquipo} onChange={e => setAnticipoEquipo(e.target.value)} className={inputClass} />
            </Field>
          </div>
          <Field label="Descripción del Equipo (opcional)">
            <input type="text" value={descripcionEquipo} onChange={e => setDescripcionEquipo(e.target.value)} placeholder="Ej: iPhone 13 negro 128GB" className={inputClass} />
          </Field>
        </div>

        {/* Sección: Plan de Pagos */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4">
          <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Plan de Pagos</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Field label="Frecuencia" required>
              <Dropdown
                value={planPago}
                options={[
                  { label: 'Semanal', value: 'SEMANAL' },
                  { label: 'Quincenal', value: 'QUINCENAL' },
                  { label: 'Mensual', value: 'MENSUAL' },
                ]}
                onChange={handlePlanChange}
              />
            </Field>
            <Field label="Cant. Cuotas" required>
              <input type="number" value={totalCuotas} onChange={e => setTotalCuotas(parseInt(e.target.value))} required className={inputClass} />
            </Field>
            <Field label="Valor de Cuota" required>
              <input type="number" step="any" value={montoCuota} onChange={e => setMontoCuota(e.target.value)} required placeholder="Auto" className={inputClass} />
            </Field>
            <Field label="Interés %">
              <input type="number" step="any" value={interesPct} onChange={e => setInteresPct(e.target.value)} className={inputClass} />
            </Field>
          </div>

          {/* Resumen calculado */}
          {precioVenta && montoCuota && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
              {[
                { label: 'Precio', value: `$${precio.toLocaleString('es-AR')}`, color: 'text-white' },
                { label: 'Anticipo total', value: `$${anticipo.toLocaleString('es-AR')}`, color: 'text-yellow-400' },
                { label: 'Saldo a financiar', value: `$${saldo.toLocaleString('es-AR')}`, color: 'text-blue-400' },
                { label: `${totalCuotas} cuotas de`, value: `$${parseFloat(montoCuota).toLocaleString('es-AR')}`, color: 'text-green-400' },
              ].map(item => (
                <div key={item.label} className="bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-center">
                  <p className="text-zinc-500 text-xs mb-1">{item.label}</p>
                  <p className={`font-bold text-base ${item.color}`}>{item.value}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={cargando || sinStock}
          className={`w-full py-4 rounded-2xl font-bold text-base transition-all shadow-lg
            ${cargando || sinStock
              ? 'bg-zinc-700 text-zinc-500 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-500 active:scale-95 text-white'}`}
        >
          {sinStock ? '⚠️ Sin Stock Disponible' : cargando ? 'Registrando...' : 'Confirmar y Generar Plan de Pagos'}
        </button>

      </form>
    </div>
  )
}