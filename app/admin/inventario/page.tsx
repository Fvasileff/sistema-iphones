'use client'

import { useCallback, useEffect, useState } from 'react'
import { formatARS } from '@/lib/format'
import { formatFechaHoraAR } from '@/lib/fechas'
import type { CategoriaProducto } from '@/lib/constantes'

type Monto = number | string

interface Producto {
  id: string
  nombre: string
  descripcion: string | null
  categoria: string
  sku: string | null
  precioCompra: Monto
  precioVenta: Monto
  stock: number
  stockMinimo: number
  activo: boolean
  createdAt: string
  updatedAt: string
}

interface MovimientoStock {
  id: string
  tipo: string
  cantidad: number
  motivo: string | null
  referenciaTipo: string | null
  referenciaId: string | null
  createdAt: string
}

type Vista = 'todos' | CategoriaProducto

const ETIQUETAS_CATEGORIA: Record<string, string> = {
  repuesto: 'Repuesto de taller',
  accesorio: 'Producto de venta',
}

const ETIQUETAS_MOVIMIENTO: Record<string, string> = {
  ingreso: 'Ingreso',
  egreso: 'Egreso',
  ajuste: 'Ajuste',
  venta: 'Venta',
  reparacion: 'Reparación',
  anulacion: 'Anulación',
}

const inputClass =
  'w-full px-4 py-3 rounded-xl border border-zinc-700 bg-zinc-900 text-white text-base placeholder-zinc-600 focus:outline-none focus:border-blue-500 transition-colors'

async function solicitarProductos(): Promise<Producto[]> {
  const res = await fetch('/api/productos', { cache: 'no-store' })
  const data = (await res.json()) as Producto[] | { error?: string }
  if (!res.ok) {
    throw new Error((data as { error?: string }).error || 'No se pudieron cargar los productos')
  }
  return data as Producto[]
}

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

function StockPill({ producto }: { producto: Producto }) {
  if (producto.stock <= 0) {
    return (
      <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/25">
        Sin stock
      </span>
    )
  }
  if (producto.stock <= producto.stockMinimo) {
    return (
      <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/25">
        Stock bajo
      </span>
    )
  }
  return (
    <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 border border-green-500/25">
      En stock
    </span>
  )
}

function ProductoCard({
  producto,
  onMovimiento,
  onHistorial,
  onEditar,
}: {
  producto: Producto
  onMovimiento: (producto: Producto) => void
  onHistorial: (producto: Producto) => void
  onEditar: (producto: Producto) => void
}) {
  const bajo = producto.activo && producto.stock <= producto.stockMinimo

  return (
    <div
      className={`bg-zinc-900 border rounded-2xl p-4 transition ${
        bajo ? 'border-amber-500/25' : 'border-zinc-800'
      } ${producto.activo ? '' : 'opacity-60'}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5 mb-1">
            <h3 className="text-white font-semibold text-sm break-words">{producto.nombre}</h3>
            <StockPill producto={producto} />
            {!producto.activo && (
              <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700">
                Inactivo
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-zinc-500">
            <span>{ETIQUETAS_CATEGORIA[producto.categoria] ?? producto.categoria}</span>
            {producto.sku && (
              <>
                <span className="text-zinc-700">•</span>
                <span className="font-mono">{producto.sku}</span>
              </>
            )}
          </div>
          {producto.descripcion && (
            <p className="text-zinc-400 text-xs mt-1 break-words">{producto.descripcion}</p>
          )}
        </div>

        <div className="flex items-center gap-4 sm:items-end sm:flex-col sm:text-right shrink-0">
          <div>
            <p className="text-zinc-500 text-[10px] uppercase tracking-wider">Stock</p>
            <p
              className={`font-bold text-xl tabular-nums ${
                producto.stock <= 0
                  ? 'text-red-400'
                  : producto.stock <= producto.stockMinimo
                    ? 'text-amber-400'
                    : 'text-white'
              }`}
            >
              {producto.stock}
            </p>
            <p className="text-zinc-600 text-[10px]">mín. {producto.stockMinimo}</p>
          </div>
          <div className="text-right">
            <p className="text-zinc-500 text-[10px] uppercase tracking-wider">Venta</p>
            <p className="text-white font-semibold text-sm tabular-nums">
              {formatARS(producto.precioVenta)}
            </p>
            <p className="text-zinc-600 text-[10px] tabular-nums">
              Compra {formatARS(producto.precioCompra)}
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-zinc-800/70">
        <button
          onClick={() => onMovimiento(producto)}
          className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition"
        >
          Movimiento
        </button>
        <button
          onClick={() => onHistorial(producto)}
          className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 text-xs font-semibold transition"
        >
          Historial
        </button>
        <button
          onClick={() => onEditar(producto)}
          className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 text-xs font-semibold transition"
        >
          Editar
        </button>
      </div>
    </div>
  )
}

function FormProducto({
  producto,
  onClose,
  onSaved,
}: {
  producto?: Producto
  onClose: () => void
  onSaved: (mensaje: string) => void
}) {
  const editando = Boolean(producto)
  const [nombre, setNombre] = useState(producto?.nombre ?? '')
  const [descripcion, setDescripcion] = useState(producto?.descripcion ?? '')
  const [categoria, setCategoria] = useState<CategoriaProducto>(
    producto?.categoria === 'accesorio' ? 'accesorio' : 'repuesto',
  )
  const [sku, setSku] = useState(producto?.sku ?? '')
  const [precioCompra, setPrecioCompra] = useState(String(producto?.precioCompra ?? '0'))
  const [precioVenta, setPrecioVenta] = useState(String(producto?.precioVenta ?? ''))
  const [stockMinimo, setStockMinimo] = useState(String(producto?.stockMinimo ?? '0'))
  const [stockInicial, setStockInicial] = useState('0')
  const [activo, setActivo] = useState(producto?.activo ?? true)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault()
    setGuardando(true)
    setError('')
    try {
      const payload: Record<string, unknown> = {
        nombre,
        descripcion,
        categoria,
        sku,
        precioCompra: Number(precioCompra) || 0,
        precioVenta: Number(precioVenta) || 0,
        stockMinimo: Number(stockMinimo) || 0,
        activo,
      }
      if (!editando) payload.stock = Number(stockInicial) || 0

      const res = await fetch(
        editando ? `/api/productos/${producto?.id}` : '/api/productos',
        {
          method: editando ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        },
      )
      const data = (await res.json()) as { error?: string }
      if (!res.ok) throw new Error(data.error || 'No se pudo guardar el producto')
      onSaved(editando ? 'Producto actualizado.' : 'Producto creado.')
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar el producto')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/65 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-t-2xl sm:rounded-2xl p-5 sm:p-6 w-full sm:max-w-2xl shadow-2xl max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between gap-3 mb-5">
          <h2 className="text-white font-bold text-lg">
            {editando ? 'Editar producto' : 'Nuevo producto'}
          </h2>
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

        <form onSubmit={guardar} className="space-y-4">
          <Field label="Nombre" required>
            <input
              type="text"
              value={nombre}
              onChange={e => setNombre(e.target.value)}
              className={inputClass}
              placeholder="Ej: Pantalla iPhone 13"
              maxLength={120}
              required
            />
          </Field>

          <Field label="Descripción">
            <input
              type="text"
              value={descripcion}
              onChange={e => setDescripcion(e.target.value)}
              className={inputClass}
              placeholder="Detalle opcional"
              maxLength={500}
            />
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Categoría" required>
              <select
                value={categoria}
                onChange={e => setCategoria(e.target.value as CategoriaProducto)}
                className={inputClass}
              >
                <option value="repuesto">Repuesto de taller</option>
                <option value="accesorio">Producto de venta</option>
              </select>
            </Field>
            <Field label="SKU">
              <input
                type="text"
                value={sku}
                onChange={e => setSku(e.target.value)}
                className={inputClass}
                placeholder="Código interno"
                maxLength={60}
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Precio de compra">
              <input
                type="number"
                min="0"
                step="any"
                value={precioCompra}
                onChange={e => setPrecioCompra(e.target.value)}
                className={inputClass}
                placeholder="0"
              />
            </Field>
            <Field label="Precio de venta" required>
              <input
                type="number"
                min="0"
                step="any"
                value={precioVenta}
                onChange={e => setPrecioVenta(e.target.value)}
                className={inputClass}
                placeholder="0"
                required
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Stock mínimo">
              <input
                type="number"
                min="0"
                step="1"
                value={stockMinimo}
                onChange={e => setStockMinimo(e.target.value)}
                className={inputClass}
                placeholder="0"
              />
            </Field>
            {editando ? (
              <Field label="Estado">
                <select
                  value={activo ? 'activo' : 'inactivo'}
                  onChange={e => setActivo(e.target.value === 'activo')}
                  className={inputClass}
                >
                  <option value="activo">Activo</option>
                  <option value="inactivo">Inactivo</option>
                </select>
              </Field>
            ) : (
              <Field label="Stock inicial">
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={stockInicial}
                  onChange={e => setStockInicial(e.target.value)}
                  className={inputClass}
                  placeholder="0"
                />
              </Field>
            )}
          </div>

          {!editando && (
            <div className="flex items-center gap-2">
              <input
                id="producto-activo"
                type="checkbox"
                checked={activo}
                onChange={e => setActivo(e.target.checked)}
                className="w-4 h-4 accent-blue-600"
              />
              <label htmlFor="producto-activo" className="text-zinc-400 text-sm">
                Producto activo
              </label>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-semibold transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={guardando}
              className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-bold transition"
            >
              {guardando ? 'Guardando...' : editando ? 'Guardar cambios' : 'Crear producto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function FormMovimiento({
  producto,
  onClose,
  onSaved,
}: {
  producto: Producto
  onClose: () => void
  onSaved: (mensaje: string) => void
}) {
  const [tipo, setTipo] = useState<'ingreso' | 'egreso' | 'ajuste'>('ingreso')
  const [cantidad, setCantidad] = useState('')
  const [motivo, setMotivo] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  const cantidadNum = Number(cantidad)
  const nuevoStock =
    tipo === 'ingreso'
      ? producto.stock + (Number.isFinite(cantidadNum) ? cantidadNum : 0)
      : tipo === 'egreso'
        ? producto.stock - (Number.isFinite(cantidadNum) ? cantidadNum : 0)
        : Number.isFinite(cantidadNum)
          ? cantidadNum
          : producto.stock

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault()
    setGuardando(true)
    setError('')
    try {
      const res = await fetch(`/api/productos/${producto.id}/movimientos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo, cantidad: cantidadNum, motivo }),
      })
      const data = (await res.json()) as { error?: string }
      if (!res.ok) throw new Error(data.error || 'No se pudo registrar el movimiento')
      onSaved('Movimiento de stock registrado.')
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo registrar el movimiento')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/65 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-t-2xl sm:rounded-2xl p-5 sm:p-6 w-full sm:max-w-md shadow-2xl">
        <div className="flex items-center justify-between gap-3 mb-1">
          <h2 className="text-white font-bold text-lg">Movimiento de stock</h2>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-white p-1.5 rounded-lg hover:bg-zinc-800 transition"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>
        <p className="text-zinc-400 text-sm mb-4">{producto.nombre}</p>

        {error && (
          <div className="p-3 rounded-xl mb-4 text-sm font-semibold bg-red-500/10 text-red-400 border border-red-500/20">
            ❌ {error}
          </div>
        )}

        <form onSubmit={guardar} className="space-y-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3 flex items-center justify-between text-sm">
            <span className="text-zinc-400">Stock actual</span>
            <span className="text-white font-bold tabular-nums">{producto.stock}</span>
          </div>

          <Field label="Tipo" required>
            <select
              value={tipo}
              onChange={e => setTipo(e.target.value as 'ingreso' | 'egreso' | 'ajuste')}
              className={inputClass}
            >
              <option value="ingreso">Ingreso</option>
              <option value="egreso">Egreso</option>
              <option value="ajuste">Ajuste (stock final)</option>
            </select>
          </Field>

          <Field label={tipo === 'ajuste' ? 'Stock nuevo' : 'Cantidad'} required>
            <input
              type="number"
              min={tipo === 'ajuste' ? '0' : '1'}
              step="1"
              value={cantidad}
              onChange={e => setCantidad(e.target.value)}
              className={inputClass}
              placeholder={tipo === 'ajuste' ? String(producto.stock) : '0'}
              required
            />
          </Field>

          <Field label="Motivo">
            <input
              type="text"
              value={motivo}
              onChange={e => setMotivo(e.target.value)}
              className={inputClass}
              placeholder="Ej: compra a proveedor, rotura, conteo físico"
              maxLength={300}
            />
          </Field>

          <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3 flex items-center justify-between text-sm">
            <span className="text-zinc-400">Stock resultante</span>
            <span
              className={`font-bold tabular-nums ${
                nuevoStock < 0 ? 'text-red-400' : 'text-green-400'
              }`}
            >
              {nuevoStock}
            </span>
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-semibold transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={guardando || nuevoStock < 0}
              className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-bold transition"
            >
              {guardando ? 'Guardando...' : 'Registrar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function InventarioPage() {
  const [productos, setProductos] = useState<Producto[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [aviso, setAviso] = useState('')
  const [vista, setVista] = useState<Vista>('todos')
  const [busqueda, setBusqueda] = useState('')
  const [mostrarInactivos, setMostrarInactivos] = useState(false)

  const [productoForm, setProductoForm] = useState<Producto | 'nuevo' | null>(null)
  const [productoMovimiento, setProductoMovimiento] = useState<Producto | null>(null)
  const [productoHistorial, setProductoHistorial] = useState<Producto | null>(null)
  const [movimientosHistorial, setMovimientosHistorial] = useState<MovimientoStock[]>([])
  const [cargandoHistorial, setCargandoHistorial] = useState(false)
  const [errorHistorial, setErrorHistorial] = useState('')

  useEffect(() => {
    let activo = true

    solicitarProductos()
      .then(data => {
        if (activo) setProductos(data)
      })
      .catch(e => {
        if (activo) setError(e instanceof Error ? e.message : 'No se pudieron cargar los productos')
      })
      .finally(() => {
        if (activo) setCargando(false)
      })

    return () => {
      activo = false
    }
  }, [])

  const recargar = useCallback(async () => {
    try {
      const data = await solicitarProductos()
      setProductos(data)
      setError('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudieron cargar los productos')
    }
  }, [])

  const alGuardar = async (mensaje: string) => {
    setAviso(mensaje)
    setError('')
    await recargar()
  }

  const abrirHistorial = async (producto: Producto) => {
    setProductoHistorial(producto)
    setMovimientosHistorial([])
    setErrorHistorial('')
    setCargandoHistorial(true)
    try {
      const res = await fetch(`/api/productos/${producto.id}/movimientos`, { cache: 'no-store' })
      const data = (await res.json()) as MovimientoStock[] | { error?: string }
      if (!res.ok) {
        throw new Error((data as { error?: string }).error || 'No se pudo cargar el historial')
      }
      setMovimientosHistorial(data as MovimientoStock[])
    } catch (e) {
      setErrorHistorial(e instanceof Error ? e.message : 'No se pudo cargar el historial')
    } finally {
      setCargandoHistorial(false)
    }
  }

  const texto = busqueda.trim().toLowerCase()
  const filtrados = productos
    .filter(p => (mostrarInactivos ? true : p.activo))
    .filter(p => (vista === 'todos' ? true : p.categoria === vista))
    .filter(p => {
      if (!texto) return true
      return (
        p.nombre.toLowerCase().includes(texto) ||
        (p.sku ?? '').toLowerCase().includes(texto) ||
        (p.descripcion ?? '').toLowerCase().includes(texto)
      )
    })

  const repuestos = filtrados.filter(p => p.categoria === 'repuesto')
  const accesorios = filtrados.filter(p => p.categoria === 'accesorio')

  const activos = productos.filter(p => p.activo)
  const stockBajo = activos.filter(p => p.stock <= p.stockMinimo)
  const valorInventario = activos.reduce(
    (acc, p) => acc + Number(p.precioCompra) * p.stock,
    0,
  )

  const tabs: { key: Vista; label: string; cantidad: number }[] = [
    { key: 'todos', label: 'Todos', cantidad: activos.length },
    {
      key: 'repuesto',
      label: 'Repuestos de taller',
      cantidad: activos.filter(p => p.categoria === 'repuesto').length,
    },
    {
      key: 'accesorio',
      label: 'Productos de venta',
      cantidad: activos.filter(p => p.categoria === 'accesorio').length,
    },
  ]

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white">Inventario</h1>
          <p className="text-zinc-500 text-sm mt-1">
            Repuestos de taller, productos de venta y control de stock.
          </p>
        </div>
        <button
          onClick={() => setProductoForm('nuevo')}
          className="self-start px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold transition"
        >
          + Nuevo producto
        </button>
      </div>

      {aviso && (
        <div className="p-4 rounded-xl mb-5 text-sm font-semibold bg-green-500/10 text-green-400 border border-green-500/20">
          ✅ {aviso}
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl mb-5 text-sm font-semibold bg-red-500/10 text-red-400 border border-red-500/20">
          ❌ {error}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
          <p className="text-zinc-500 text-xs">Repuestos de taller</p>
          <p className="text-white font-bold text-xl mt-1 tabular-nums">
            {activos.filter(p => p.categoria === 'repuesto').length}
          </p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
          <p className="text-zinc-500 text-xs">Productos de venta</p>
          <p className="text-white font-bold text-xl mt-1 tabular-nums">
            {activos.filter(p => p.categoria === 'accesorio').length}
          </p>
        </div>
        <div
          className={`bg-zinc-900 border rounded-2xl p-4 ${
            stockBajo.length > 0 ? 'border-amber-500/30' : 'border-zinc-800'
          }`}
        >
          <p className="text-zinc-500 text-xs">Stock bajo</p>
          <p
            className={`font-bold text-xl mt-1 tabular-nums ${
              stockBajo.length > 0 ? 'text-amber-400' : 'text-white'
            }`}
          >
            {stockBajo.length}
          </p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
          <p className="text-zinc-500 text-xs">Valor de inventario</p>
          <p className="text-white font-bold text-lg mt-1 tabular-nums">
            {formatARS(valorInventario)}
          </p>
        </div>
      </div>

      {stockBajo.length > 0 && (
        <div className="bg-amber-500/5 border border-amber-500/25 rounded-2xl p-4 md:p-5 mb-6">
          <h2 className="text-amber-400 font-bold text-sm flex items-center gap-2">
            ⚠️ Reposición pendiente ({stockBajo.length})
          </h2>
          <p className="text-zinc-500 text-xs mt-1 mb-3">
            Estos productos llegaron a su stock mínimo o se quedaron sin stock.
          </p>
          <div className="space-y-2">
            {stockBajo.map(p => (
              <div
                key={p.id}
                className="flex items-center justify-between gap-3 bg-zinc-950/60 border border-zinc-800 rounded-xl px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="text-white text-sm font-medium truncate">{p.nombre}</p>
                  <p className="text-zinc-500 text-[11px]">
                    Stock {p.stock} · mínimo {p.stockMinimo} ·{' '}
                    {ETIQUETAS_CATEGORIA[p.categoria] ?? p.categoria}
                  </p>
                </div>
                <button
                  onClick={() => setProductoMovimiento(p)}
                  className="shrink-0 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition"
                >
                  Reponer
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
        <input
          type="text"
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          placeholder="🔍 Buscar por nombre, SKU o descripción..."
          className="flex-1 px-4 py-2.5 rounded-xl border border-zinc-800 bg-zinc-900 text-white text-sm placeholder-zinc-500 focus:outline-none focus:border-zinc-600 transition-colors"
        />
        <label className="flex items-center gap-2 text-zinc-400 text-sm shrink-0 px-1">
          <input
            type="checkbox"
            checked={mostrarInactivos}
            onChange={e => setMostrarInactivos(e.target.checked)}
            className="w-4 h-4 accent-blue-600"
          />
          Mostrar inactivos
        </label>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 mb-5">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setVista(tab.key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold border transition shrink-0 ${
              vista === tab.key
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-zinc-600'
            }`}
          >
            {tab.label}
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                vista === tab.key ? 'bg-white/20 text-white' : 'bg-zinc-800 text-zinc-500'
              }`}
            >
              {tab.cantidad}
            </span>
          </button>
        ))}
      </div>

      {cargando ? (
        <p className="text-zinc-500 text-center py-20 text-sm">Cargando inventario...</p>
      ) : filtrados.length === 0 ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl py-16 text-center">
          <p className="text-zinc-500 text-sm">No hay productos que coincidan con el filtro.</p>
          <button
            onClick={() => setProductoForm('nuevo')}
            className="mt-4 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition"
          >
            + Nuevo producto
          </button>
        </div>
      ) : vista === 'todos' ? (
        <div className="space-y-8">
          {repuestos.length > 0 && (
            <section>
              <h2 className="text-white font-bold text-sm mb-3 flex items-center gap-2">
                🔧 Repuestos de taller
                <span className="text-zinc-500 text-xs font-normal">({repuestos.length})</span>
              </h2>
              <div className="space-y-3">
                {repuestos.map(p => (
                  <ProductoCard
                    key={p.id}
                    producto={p}
                    onMovimiento={setProductoMovimiento}
                    onHistorial={abrirHistorial}
                    onEditar={setProductoForm}
                  />
                ))}
              </div>
            </section>
          )}

          {accesorios.length > 0 && (
            <section>
              <h2 className="text-white font-bold text-sm mb-3 flex items-center gap-2">
                📦 Productos de venta
                <span className="text-zinc-500 text-xs font-normal">({accesorios.length})</span>
              </h2>
              <div className="space-y-3">
                {accesorios.map(p => (
                  <ProductoCard
                    key={p.id}
                    producto={p}
                    onMovimiento={setProductoMovimiento}
                    onHistorial={abrirHistorial}
                    onEditar={setProductoForm}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtrados.map(p => (
            <ProductoCard
              key={p.id}
              producto={p}
              onMovimiento={setProductoMovimiento}
              onHistorial={abrirHistorial}
              onEditar={setProductoForm}
            />
          ))}
        </div>
      )}

      {productoForm !== null && (
        <FormProducto
          key={productoForm === 'nuevo' ? 'nuevo' : productoForm.id}
          producto={productoForm === 'nuevo' ? undefined : productoForm}
          onClose={() => setProductoForm(null)}
          onSaved={alGuardar}
        />
      )}

      {productoMovimiento && (
        <FormMovimiento
          key={productoMovimiento.id}
          producto={productoMovimiento}
          onClose={() => setProductoMovimiento(null)}
          onSaved={alGuardar}
        />
      )}

      {productoHistorial && (
        <div className="fixed inset-0 bg-black/65 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-t-2xl sm:rounded-2xl p-5 sm:p-6 w-full sm:max-w-lg shadow-2xl max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between gap-3 mb-1">
              <h2 className="text-white font-bold text-lg">Historial de stock</h2>
              <button
                onClick={() => setProductoHistorial(null)}
                className="text-zinc-500 hover:text-white p-1.5 rounded-lg hover:bg-zinc-800 transition"
                aria-label="Cerrar"
              >
                ✕
              </button>
            </div>
            <p className="text-zinc-400 text-sm mb-4">{productoHistorial.nombre}</p>

            {errorHistorial && (
              <div className="p-3 rounded-xl mb-4 text-sm font-semibold bg-red-500/10 text-red-400 border border-red-500/20">
                ❌ {errorHistorial}
              </div>
            )}

            <div className="overflow-y-auto flex-1 -mx-1 px-1">
              {cargandoHistorial ? (
                <p className="text-zinc-500 text-sm text-center py-10">Cargando movimientos...</p>
              ) : movimientosHistorial.length === 0 ? (
                <p className="text-zinc-600 text-sm text-center py-10">
                  Todavía no hay movimientos registrados.
                </p>
              ) : (
                <div className="divide-y divide-zinc-800">
                  {movimientosHistorial.map(m => (
                    <div key={m.id} className="flex items-start justify-between gap-3 py-3 first:pt-0">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700">
                            {ETIQUETAS_MOVIMIENTO[m.tipo] ?? m.tipo}
                          </span>
                          {m.referenciaTipo && (
                            <span className="text-[10px] text-zinc-600">
                              {m.referenciaTipo}
                            </span>
                          )}
                        </div>
                        {m.motivo && (
                          <p className="text-zinc-300 text-sm mt-1 break-words">{m.motivo}</p>
                        )}
                        <p className="text-zinc-600 text-xs mt-1">
                          {formatFechaHoraAR(m.createdAt)}
                        </p>
                      </div>
                      <span
                        className={`font-bold tabular-nums shrink-0 ${
                          m.cantidad < 0 ? 'text-red-400' : 'text-green-400'
                        }`}
                      >
                        {m.cantidad > 0 ? '+' : ''}
                        {m.cantidad}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={() => setProductoHistorial(null)}
              className="w-full mt-4 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-semibold transition"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
