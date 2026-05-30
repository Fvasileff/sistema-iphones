'use client'

import { useState, useEffect } from 'react'

interface Cliente {
  id: number
  nombre: string
  apellido: string
  dni: string
  telefono: string
  email?: string
  direccion?: string
}

export default function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [busqueda, setBusqueda] = useState('')
  const [nombre, setNombre] = useState('')
  const [apellido, setApellido] = useState('')
  const [dni, setDni] = useState('')
  const [telefono, setTelefono] = useState('')
  const [email, setEmail] = useState('')
  const [direccion, setDireccion] = useState('')
  const [cargando, setCargando] = useState(false)
  const [mensaje, setMensaje] = useState({ texto: '', tipo: '' })
  const [mostrarFormulario, setMostrarFormulario] = useState(false)

  const obtenerClientes = async () => {
    try {
      const res = await fetch('/api/clientes')
      if (res.ok) setClientes(await res.json())
    } catch (error) {
      console.error('Error al traer clientes:', error)
    }
  }

  useEffect(() => { obtenerClientes() }, [])

  const clientesFiltrados = clientes.filter(c => {
    const texto = busqueda.toLowerCase()
    return (
      c.nombre.toLowerCase().includes(texto) ||
      c.apellido.toLowerCase().includes(texto) ||
      c.dni.includes(texto) ||
      c.telefono.includes(texto)
    )
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setCargando(true)
    setMensaje({ texto: '', tipo: '' })
    try {
      const res = await fetch('/api/clientes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre, apellido, dni, telefono, email, direccion }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al guardar')
      setMensaje({ texto: 'Cliente registrado con éxito', tipo: 'success' })
      setNombre(''); setApellido(''); setDni('')
      setTelefono(''); setEmail(''); setDireccion('')
      setMostrarFormulario(false)
      obtenerClientes()
    } catch (error: any) {
      setMensaje({ texto: error.message, tipo: 'error' })
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-white">Gestión de Clientes</h1>
        <button
          onClick={() => setMostrarFormulario(!mostrarFormulario)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors"
        >
          {mostrarFormulario ? '✕ Cancelar' : '+ Nuevo Cliente'}
        </button>
      </div>

      {/* Mensaje */}
      {mensaje.texto && (
        <div className={`p-4 rounded-xl mb-4 text-sm font-semibold ${
          mensaje.tipo === 'success'
            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
            : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
        }`}>
          {mensaje.texto}
        </div>
      )}

      {/* Formulario colapsable */}
      {mostrarFormulario && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 mb-6">
          <h2 className="text-white font-semibold mb-4">Nuevo Cliente</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">Nombre *</label>
              <input type="text" value={nombre} onChange={e => setNombre(e.target.value)} required
                className="w-full p-2.5 border rounded-lg bg-transparent border-zinc-700 text-white focus:outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">Apellido *</label>
              <input type="text" value={apellido} onChange={e => setApellido(e.target.value)} required
                className="w-full p-2.5 border rounded-lg bg-transparent border-zinc-700 text-white focus:outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">DNI *</label>
              <input type="text" value={dni} onChange={e => setDni(e.target.value)} required
                className="w-full p-2.5 border rounded-lg bg-transparent border-zinc-700 text-white focus:outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">Teléfono *</label>
              <input type="text" value={telefono} onChange={e => setTelefono(e.target.value)} required
                className="w-full p-2.5 border rounded-lg bg-transparent border-zinc-700 text-white focus:outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">Email (Opcional)</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                className="w-full p-2.5 border rounded-lg bg-transparent border-zinc-700 text-white focus:outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">Dirección (Opcional)</label>
              <input type="text" value={direccion} onChange={e => setDireccion(e.target.value)}
                className="w-full p-2.5 border rounded-lg bg-transparent border-zinc-700 text-white focus:outline-none focus:border-blue-500" />
            </div>
            <div className="md:col-span-2">
              <button type="submit" disabled={cargando}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-50">
                {cargando ? 'Guardando...' : 'Registrar Cliente'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Buscador */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="🔍 Buscar por nombre, apellido, DNI o teléfono..."
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          className="w-full px-4 py-3 rounded-xl bg-zinc-900 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 text-sm"
        />
      </div>

      {/* Lista de clientes */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
        <div className="px-5 py-3 border-b border-zinc-800 flex items-center justify-between">
          <h2 className="text-white font-semibold">Clientes Registrados</h2>
          <span className="text-zinc-500 text-sm">{clientesFiltrados.length} cliente(s)</span>
        </div>

        {clientesFiltrados.length === 0 ? (
          <p className="text-zinc-500 text-center py-10 text-sm">
            {busqueda ? 'No se encontraron clientes con esa búsqueda.' : 'No hay clientes cargados todavía.'}
          </p>
        ) : (
          <>
            {/* Tabla para desktop */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-zinc-800 text-zinc-500">
                    <th className="px-5 py-3 font-medium">Nombre y Apellido</th>
                    <th className="px-5 py-3 font-medium">DNI</th>
                    <th className="px-5 py-3 font-medium">Teléfono</th>
                    <th className="px-5 py-3 font-medium">Email</th>
                    <th className="px-5 py-3 font-medium">Dirección</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {clientesFiltrados.map(c => (
                    <tr key={c.id} className="hover:bg-zinc-800/50 transition-colors">
                      <td className="px-5 py-3 font-medium text-white">{c.apellido}, {c.nombre}</td>
                      <td className="px-5 py-3 text-zinc-400">{c.dni}</td>
                      <td className="px-5 py-3 text-zinc-400">{c.telefono}</td>
                      <td className="px-5 py-3 text-zinc-500 text-xs">{c.email || '-'}</td>
                      <td className="px-5 py-3 text-zinc-500 text-xs italic">{c.direccion || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Cards para mobile */}
            <div className="md:hidden divide-y divide-zinc-800">
              {clientesFiltrados.map(c => (
                <div key={c.id} className="px-4 py-4">
                  <p className="text-white font-semibold">{c.apellido}, {c.nombre}</p>
                  <p className="text-zinc-400 text-sm mt-1">DNI: {c.dni}</p>
                  <p className="text-zinc-400 text-sm">📞 {c.telefono}</p>
                  {c.email && <p className="text-zinc-500 text-xs mt-1">{c.email}</p>}
                  {c.direccion && <p className="text-zinc-500 text-xs italic">{c.direccion}</p>}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}