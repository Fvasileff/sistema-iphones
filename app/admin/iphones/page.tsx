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

      {/* Formulario */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl mb-8 grid grid-cols-1 md:grid-cols-2 gap-4">
          <input required type="text" value={modelo} onChange={(e) => setModelo(e.target.value)} placeholder="Modelo (Ej: iPhone 13)" className="bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-sm text-white outline-none focus:border-blue-500" />
          <input required type="text" value={almacenamiento} onChange={(e) => setAlmacenamiento(e.target.value)} placeholder="Capacidad (Ej: 128GB)" className="bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-sm text-white outline-none focus:border-blue-500" />
          <input required type="text" value={color} onChange={(e) => setColor(e.target.value)} placeholder="Color" className="bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-sm text-white outline-none focus:border-blue-500" />
          <input required type="number" value={precioBase} onChange={(e) => setPrecioBase(e.target.value)} placeholder="Precio (USD)" className="bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-sm text-white outline-none focus:border-blue-500" />
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

      {/* Lista de iPhones (Grid Responsive) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {iphonesFiltrados.map((phone) => (
          <div key={phone.id} className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl flex justify-between items-center hover:border-zinc-700 transition">
            <div>
              <h3 className="text-white font-bold text-lg">{phone.modelo}</h3>
              <p className="text-zinc-500 text-xs font-semibold uppercase">{phone.almacenamiento} • {phone.color}</p>
              <p className="text-green-400 font-mono font-bold mt-2">$ {Number(phone.precioBase)}</p>
            </div>
            <div className={`px-3 py-1 rounded-full text-xs font-bold ${phone.stock > 0 ? 'bg-blue-950 text-blue-400' : 'bg-red-950 text-red-400'}`}>
              {phone.stock > 0 ? `Stock: ${phone.stock}` : 'Agotado'}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}