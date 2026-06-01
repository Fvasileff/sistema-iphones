'use client'

import { useState, useEffect } from 'react'

interface iPhone {
  id: string
  modelo: string
  color: string
  almacenamiento: string
  precioBase: number
  stock: number
}

export default function IphonesPage() {
  const [iphones, setIphones] = useState<iPhone[]>([])
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [busqueda, setBusqueda] = useState('')

  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [editPrecio, setEditPrecio] = useState('')
  const [editStock, setEditStock] = useState('')

  const [modelo, setModelo] = useState('')
  const [almacenamiento, setAlmacenamiento] = useState('')
  const [color, setColor] = useState('')
  const [precioBase, setPrecioBase] = useState('')
  const [stock, setStock] = useState('1')

  const cargarIphones = async () => {
    try {
      const res = await fetch('/api/iphones')
      if (res.ok) setIphones(await res.json())
    } catch (error) {
      console.error('Error cargando equipos:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { cargarIphones() }, [])

  const iphonesFiltrados = iphones.filter((phone) => {
    const termino = busqueda.toLowerCase()
    return (
      phone.modelo?.toLowerCase().includes(termino) ||
      phone.color?.toLowerCase().includes(termino) ||
      phone.almacenamiento?.toLowerCase().includes(termino)
    )
  })

  const formatARS = (valor: number) =>
    new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(valor)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    try {
      const res = await fetch('/api/iphones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modelo, color, almacenamiento, precioBase: parseFloat(precioBase), stock: parseInt(stock) })
      })
      if (res.ok) {
        setModelo(''); setAlmacenamiento(''); setColor(''); setPrecioBase(''); setStock('1')
        setShowForm(false)
        cargarIphones()
      }
    } catch (error) {
      console.error('Error al enviar:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const abrirEdicion = (phone: iPhone) => {
    setEditandoId(phone.id)
    setEditPrecio(String(phone.precioBase))
    setEditStock(String(phone.stock))
  }

  const guardarEdicion = async (id: string) => {
    try {
      const res = await fetch('/api/iphones', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, precioBase: editPrecio, stock: editStock })
      })
      if (res.ok) {
        setEditandoId(null)
        cargarIphones()
      }
    } catch (error) {
      console.error('Error al guardar edición:', error)
    }
  }

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white">📦 Catálogo de iPhones</h1>
          <p className="text-zinc-400 text-sm mt-1">Gestión de inventario y precios.</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition active:scale-95">
          {showForm ? '✖️ Cancelar' : '➕ Agregar iPhone'}
        </button>
      </div>

      {/* Formulario nuevo iPhone */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl mb-8 grid grid-cols-1 md:grid-cols-2 gap-4">
          <input required type="text" value={modelo} onChange={(e) => setModelo(e.target.value)} placeholder="Modelo (Ej: iPhone 13)" className="bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-sm text-white outline-none focus:border-blue-500" />
          <input required type="text" value={almacenamiento} onChange={(e) => setAlmacenamiento(e.target.value)} placeholder="Capacidad (Ej: 128GB)" className="bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-sm text-white outline-none focus:border-blue-500" />
          <input required type="text" value={color} onChange={(e) => setColor(e.target.value)} placeholder="Color" className="bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-sm text-white outline-none focus:border-blue-500" />
          <input required type="number" value={precioBase} onChange={(e) => setPrecioBase(e.target.value)} placeholder="Precio en ARS ($)" className="bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-sm text-white outline-none focus:border-blue-500" />
          <input required type="number" value={stock} onChange={(e) => setStock(e.target.value)} placeholder="Stock inicial" className="bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-sm text-white outline-none focus:border-blue-500" />
          <button disabled={isSaving} type="submit" className="md:col-span-2 bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg text-sm font-bold">
            {isSaving ? 'Guardando...' : 'Guardar Producto'}
          </button>
        </form>
      )}

      {/* Buscador */}
      <input
        type="text"
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        placeholder="🔍 Buscar modelo, color o capacidad..."
        className="w-full bg-zinc-900 border border-zinc-800 text-white rounded-xl px-4 py-3 mb-6 text-sm focus:border-blue-500 outline-none"
      />

      {/* Lista */}
      {loading ? (
        <p className="text-zinc-500 text-sm text-center">Cargando...</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {iphonesFiltrados.map((phone) => (
            <div key={phone.id} className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl hover:border-zinc-700 transition">
              {editandoId === phone.id ? (
                // Modo edición
                <div className="flex flex-col gap-3">
                  <div>
                    <h3 className="text-white font-bold text-lg">{phone.modelo}</h3>
                    <p className="text-zinc-500 text-xs font-semibold uppercase">{phone.almacenamiento} • {phone.color}</p>
                  </div>

                  {/* Precio */}
                  <div>
                    <label className="text-zinc-400 text-xs mb-1 block">Precio ARS</label>
                    <input
                      type="number"
                      value={editPrecio}
                      onChange={(e) => setEditPrecio(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
                    />
                  </div>

                  {/* Stock con suma/resta */}
                  <div>
                    <label className="text-zinc-400 text-xs mb-1 block">
                      En depósito: <span className="text-white font-bold">{phone.stock}</span>
                      <span className="text-zinc-600 ml-1">→ nuevo valor:</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setEditStock(String(Math.max(0, parseInt(editStock || '0') - 1)))}
                        className="w-9 h-9 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg font-bold text-lg transition flex items-center justify-center"
                      >−</button>
                      <input
                        type="number"
                        value={editStock}
                        onChange={(e) => setEditStock(String(Math.max(0, parseInt(e.target.value) || 0)))}
                        className="w-20 bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-blue-500 text-center"
                      />
                      <button
                        type="button"
                        onClick={() => setEditStock(String(parseInt(editStock || '0') + 1))}
                        className="w-9 h-9 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg font-bold text-lg transition flex items-center justify-center"
                      >+</button>
                      <span className="text-zinc-500 text-xs ml-1">unidades</span>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button onClick={() => guardarEdicion(phone.id)} className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg text-xs font-bold transition">
                      ✔ Guardar
                    </button>
                    <button onClick={() => setEditandoId(null)} className="flex-1 bg-zinc-700 hover:bg-zinc-600 text-white py-2 rounded-lg text-xs font-bold transition">
                      ✖ Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                // Modo vista
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-white font-bold text-lg">{phone.modelo}</h3>
                    <p className="text-zinc-500 text-xs font-semibold uppercase">{phone.almacenamiento} • {phone.color}</p>
                    <p className="text-green-400 font-mono font-bold mt-2">{formatARS(Number(phone.precioBase))}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <div className={`px-3 py-1 rounded-full text-xs font-bold ${phone.stock > 0 ? 'bg-blue-950 text-blue-400' : 'bg-red-950 text-red-400'}`}>
                      {phone.stock > 0 ? `Stock: ${phone.stock}` : 'Agotado'}
                    </div>
                    <button onClick={() => abrirEdicion(phone)} className="text-zinc-500 hover:text-white text-xs transition">
                      ✏️ Editar
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}