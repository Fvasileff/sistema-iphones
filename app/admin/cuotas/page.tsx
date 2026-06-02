'use client'

import { useState, useEffect } from 'react'


type Cliente = { nombre: string; apellido: string }
type Venta = { id: string; cliente: Cliente; fechaVenta: string }  // ✅ agregado fechaVenta
type Cuota = {
  id: number
  ventaId: string
  estado: 'pendiente' | 'pagada' | 'mora' | 'vencida'
  montoOriginal: number
  montoMora?: number
  fechaVencimiento: string
  venta: Venta
  numeroCuota?: number
}

type ClienteGroup = {
  key: string
  ventaId: string
  nombre: string
  apellido: string
  cuotas: Cuota[]
}

function initials(nombre: string, apellido: string) {
  return ((apellido?.[0] ?? '') + (nombre?.[0] ?? '')).toUpperCase()
}

function fmt(n: number) {
  return Number(n).toLocaleString('es-AR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function formatFecha(str: string): string {
  if (!str) return '—'
  const match = str.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!match) return '—'
  const d = new Date(parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3]))
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })
}

const FILTROS = [
  { key: 'todas',      label: 'Todas' },
  { key: 'pendientes', label: 'Pendientes' },
  { key: 'vencidas',   label: 'Vencidas' },
  { key: 'pagadas',    label: 'Pagadas' },
  { key: 'mora',       label: 'En mora' },
] as const

type FiltroKey = (typeof FILTROS)[number]['key']

const FILTER_ACTIVE: Record<FiltroKey, string> = {
  todas:      'bg-blue-600 text-white border-blue-600',
  pendientes: 'bg-amber-500 text-white border-amber-500',
  vencidas:   'bg-orange-500 text-white border-orange-500',
  pagadas:    'bg-green-600 text-white border-green-600',
  mora:       'bg-red-600 text-white border-red-600',
}

function EstadoPill({ estado }: { estado: Cuota['estado'] }) {
  if (estado === 'mora')
    return (
      <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/25">
        En mora
      </span>
    )
  if (estado === 'pagada')
    return (
      <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 border border-green-500/25">
        Pagada
      </span>
    )
  if (estado === 'vencida')
    return (
      <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/25">
        Vencida
      </span>
    )
  return (
    <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/25">
      Pendiente
    </span>
  )
}

function CuotaRow({
  c,
  index,
  totalCuotas,
  onMora,
  onPago,
}: {
  c: Cuota
  index: number
  totalCuotas: number
  onMora: (c: Cuota) => void
  onPago: (c: Cuota) => void
}) {
  const mora    = c.estado === 'mora'
  const pagada  = c.estado === 'pagada'
  const vencida = c.estado === 'vencida'
  const montoMora = Number(c.montoMora ?? 0)
  const total     = Number(c.montoOriginal) + montoMora

  const nroCuotaActual = c.numeroCuota ?? (index + 1)

  const borderLeftColor = mora
    ? 'border-l-4 border-l-red-500'
    : pagada
    ? 'border-l-4 border-l-green-500'
    : vencida
    ? 'border-l-4 border-l-orange-500'
    : 'border-l-4 border-l-amber-500'

  return (
    <div
      className={`rounded-xl p-3 border border-zinc-800/80 bg-zinc-950/40 transition ${borderLeftColor} ${
        pagada ? 'opacity-65' : ''
      }`}
    >
      <div className="flex items-center justify-between gap-3 w-full">
        <div className="flex flex-col gap-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-zinc-400 bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded-md shrink-0">
              Cuota {nroCuotaActual}/{totalCuotas}
            </span>
            <EstadoPill estado={c.estado} />
          </div>
          
          <p className="text-zinc-400 text-xs pl-0.5">
            Vence {formatFecha(c.fechaVencimiento)}
          </p>

          {montoMora > 0 && (
            <p className="text-red-400 text-[11px] font-medium pl-0.5 mt-0.5">
              ⚠️ Mora aplicada: +${fmt(montoMora)}
            </p>
          )}
        </div>

        <div className="flex flex-col items-end gap-2 shrink-0">
          <div className="text-right">
            <p className={`text-sm font-bold tabular-nums ${mora ? 'text-red-400' : pagada ? 'text-green-400' : vencida ? 'text-orange-400' : 'text-white'}`}>
              ${fmt(total)}
            </p>
            {montoMora > 0 && (
              <p className="text-zinc-600 text-[10px] line-through tabular-nums -mt-0.5">
                ${fmt(Number(c.montoOriginal))}
              </p>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            {!pagada && (
              <>
                {vencida && (
                  <button
                    onClick={() => onMora(c)}
                    className="bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition"
                  >
                    + Mora
                  </button>
                )}
                <button
                  onClick={() => onPago(c)}
                  className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg text-[11px] font-semibold transition shadow-md shadow-blue-600/10"
                >
                  Pagar
                </button>
              </>
            )}
            {pagada && (
              <span className="text-green-400 bg-green-500/10 border border-green-500/20 px-2.5 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1">
                ✓ Cobrada
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function ClienteCard({
  group,
  onMora,
  onPago,
}: {
  group: ClienteGroup
  onMora: (c: Cuota) => void
  onPago: (c: Cuota) => void
}) {
  const [abierto, setAbierto] = useState(true)

  const tieneMora    = group.cuotas.some(c => c.estado === 'mora')
  const tieneVencida = group.cuotas.some(c => c.estado === 'vencida')
  const todasPagadas = group.cuotas.every(c => c.estado === 'pagada')

  const totalPendiente = group.cuotas
    .filter(c => c.estado !== 'pagada')
    .reduce((acc, c) => acc + Number(c.montoOriginal) + Number(c.montoMora ?? 0), 0)

  const ini = initials(group.nombre, group.apellido)

  const avatarColor = tieneMora
    ? 'bg-red-500/15 text-red-400'
    : tieneVencida
    ? 'bg-orange-500/15 text-orange-400'
    : todasPagadas
    ? 'bg-green-500/15 text-green-400'
    : 'bg-blue-500/15 text-blue-400'

  const borderColor = tieneMora
    ? 'border-red-500/25'
    : tieneVencida
    ? 'border-orange-500/25'
    : todasPagadas
    ? 'border-green-500/15'
    : 'border-zinc-800'

  // ✅ Fecha de compra tomada de la primera cuota
  const fechaCompra = formatFecha(group.cuotas[0]?.venta?.fechaVenta ?? '')

  return (
    <div className={`bg-zinc-900 rounded-2xl border transition ${borderColor}`}>
      <button
        onClick={() => setAbierto(v => !v)}
        className="w-full flex items-center gap-3 p-4 text-left"
      >
        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold shrink-0 ${avatarColor}`}>
          {ini}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-white font-semibold text-sm">
            {group.apellido}, {group.nombre}
          </p>
          <div className="text-zinc-500 text-xs mt-0.5 flex flex-wrap items-center gap-x-2">
            <span>{group.cuotas.length} cuota{group.cuotas.length !== 1 ? 's' : ''}</span>
            {tieneMora    && <span className="text-red-400">• con mora</span>}
            {tieneVencida && !tieneMora && <span className="text-orange-400">• vencida</span>}
            {todasPagadas && <span className="text-green-400">• al día</span>}
            {/* ✅ Reemplazado el ID por la fecha de compra */}
            <span className="text-zinc-600 font-medium bg-zinc-950 px-1.5 py-0.5 rounded text-[10px]">
              Compra: {fechaCompra}
            </span>
          </div>
        </div>

        {!todasPagadas && totalPendiente > 0 && (
          <div className="text-right shrink-0 mr-2">
            <p className="text-xs text-zinc-500">Pendiente</p>
            <p className={`text-sm font-bold tabular-nums ${tieneMora ? 'text-red-400' : tieneVencida ? 'text-orange-400' : 'text-white'}`}>
              ${fmt(totalPendiente)}
            </p>
          </div>
        )}

        <span
          className={`text-zinc-500 transition-transform duration-200 shrink-0 ${abierto ? 'rotate-180' : ''}`}
          aria-hidden
        >
          ▾
        </span>
      </button>

      {abierto && (
        <div className="px-3 sm:px-4 pb-4 space-y-2">
          <div className="border-t border-zinc-800 mb-3" />
          {group.cuotas.map((c, index) => (
            <CuotaRow 
              key={c.id} 
              c={c} 
              index={index} 
              totalCuotas={group.cuotas.length} 
              onMora={onMora} 
              onPago={onPago} 
            />
          ))}
        </div>
      )}
    </div>
  )
}

function ModalMora({
  cuota,
  onClose,
  onConfirm,
}: {
  cuota: Cuota
  onClose: () => void
  onConfirm: (pct: number) => Promise<void>
}) {
  const [pct, setPct] = useState('10')
  const [loading, setLoading] = useState(false)
  const pctNum = parseFloat(pct)
  const montoOriginal = Number(cuota.montoOriginal)
  const preview = !isNaN(pctNum) && pctNum > 0 ? montoOriginal * (1 + pctNum / 100) : null

  const handleConfirm = async () => {
    if (isNaN(pctNum) || pctNum <= 0 || pctNum > 100)
      return alert('Ingresá un porcentaje válido entre 1 y 100')
    setLoading(true)
    await onConfirm(pctNum)
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 bg-black/65 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-t-2xl sm:rounded-2xl p-6 w-full sm:max-w-sm shadow-2xl">
        <h2 className="text-white font-bold text-base mb-0.5">Aplicar mora</h2>
        <p className="text-zinc-400 text-sm mb-5">
          {cuota.venta.cliente.apellido}, {cuota.venta.cliente.nombre}
          <span className="block text-zinc-600 text-xs mt-0.5">Monto actual: ${fmt(montoOriginal)}</span>
        </p>
        <label className="text-zinc-400 text-xs block mb-1.5">Porcentaje de mora (%)</label>
        <input
          type="number"
          min="1"
          max="100"
          value={pct}
          onChange={e => setPct(e.target.value)}
          className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 mb-2"
          placeholder="Ej: 10"
          autoFocus
        />
        {preview !== null && (
          <p className="text-zinc-500 text-xs mb-5">
            Nuevo total: <span className="text-red-400 font-bold">${fmt(preview)}</span>
          </p>
        )}
        <div className="flex gap-3 mt-2">
          <button onClick={onClose} className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 py-3 rounded-xl text-sm transition">
            Cancelar
          </button>
          <button onClick={handleConfirm} disabled={loading} className="flex-1 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white py-3 rounded-xl text-sm font-bold transition">
            {loading ? 'Aplicando...' : 'Aplicar mora'}
          </button>
        </div>
      </div>
    </div>
  )
}

function ModalPago({
  cuota,
  onClose,
  onConfirm,
}: {
  cuota: Cuota
  onClose: () => void
  onConfirm: () => Promise<void>
}) {
  const [loading, setLoading] = useState(false)
  const montoOriginal = Number(cuota.montoOriginal)
  const montoMora     = Number(cuota.montoMora ?? 0)
  const total         = montoOriginal + montoMora

  const handleConfirm = async () => {
    setLoading(true)
    await onConfirm()
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 bg-black/65 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-t-2xl sm:rounded-2xl p-6 w-full sm:max-w-sm shadow-2xl">
        <h2 className="text-white font-bold text-base mb-0.5">Confirmar pago</h2>
        <p className="text-zinc-400 text-sm mb-5">
          {cuota.venta.cliente.apellido}, {cuota.venta.cliente.nombre}
        </p>
        <div className="bg-zinc-800 rounded-xl p-4 mb-5 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-zinc-400">Monto original</span>
            <span className="text-white tabular-nums">${fmt(montoOriginal)}</span>
          </div>
          {montoMora > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-zinc-400">Mora</span>
              <span className="text-red-400 tabular-nums">+${fmt(montoMora)}</span>
            </div>
          )}
          <div className="flex justify-between text-sm font-bold border-t border-zinc-700 pt-2 mt-1">
            <span className="text-zinc-300">Total a cobrar</span>
            <span className="text-white text-base tabular-nums">${fmt(total)}</span>
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 py-3 rounded-xl text-sm transition">
            Cancelar
          </button>
          <button onClick={handleConfirm} disabled={loading} className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white py-3 rounded-xl text-sm font-bold transition">
            {loading ? 'Registrando...' : '✓ Confirmar pago'}
          </button>
        </div>
      </div>
    </div>
  )
}

function agruparPorCliente(cuotas: Cuota[]): ClienteGroup[] {
  const map = new Map<string, ClienteGroup>()
  for (const c of cuotas) {
    const { nombre, apellido } = c.venta.cliente
    const vId = c.ventaId || c.venta?.id || 'sin-id'
    const key = `${apellido}||${nombre}||${vId}`.toLowerCase()
    
    if (!map.has(key)) {
      map.set(key, { key, ventaId: vId, nombre, apellido, cuotas: [] })
    }
    map.get(key)!.cuotas.push(c)
  }
  const grupos = Array.from(map.values())
  grupos.forEach(g => {
    g.cuotas.sort((a, b) => new Date(a.fechaVencimiento).getTime() - new Date(b.fechaVencimiento).getTime())
  })
  return grupos
}

export default function CuotasPage() {
  const [cuotas, setCuotas]     = useState<Cuota[]>([])
  const [cargando, setCargando] = useState(true)
  const [filtro, setFiltro]     = useState<FiltroKey>('todas')
  const [busqueda, setBusqueda] = useState('')
  const [cuotaMora, setCuotaMora] = useState<Cuota | null>(null)
  const [cuotaPago, setCuotaPago] = useState<Cuota | null>(null)

  useEffect(() => { cargarCuotas() }, [])

  const cargarCuotas = () => {
    setCargando(true)
    fetch('/api/cuotas', { cache: 'no-store' })
      .then(r => r.json())
      .then((data: Cuota[]) => { setCuotas(data); setCargando(false) })
      .catch(() => setCargando(false))
  }

  const cuotasBuscadas = cuotas.filter(c => {
    const completo = `${c.venta.cliente.nombre} ${c.venta.cliente.apellido}`.toLowerCase()
    return completo.includes(busqueda.toLowerCase())
  })

  const cuotasFiltradas = cuotasBuscadas.filter(c => {
    if (filtro === 'pendientes') return c.estado === 'pendiente'
    if (filtro === 'vencidas')   return c.estado === 'vencida'
    if (filtro === 'pagadas')    return c.estado === 'pagada'
    if (filtro === 'mora')       return c.estado === 'mora'
    return true
  })

  const grupos = agruparPorCliente(cuotasFiltradas)

  const conteos: Record<FiltroKey, number> = {
    todas:      cuotas.length,
    pendientes: cuotas.filter(c => c.estado === 'pendiente').length,
    vencidas:   cuotas.filter(c => c.estado === 'vencida').length,
    pagadas:    cuotas.filter(c => c.estado === 'pagada').length,
    mora:       cuotas.filter(c => c.estado === 'mora').length,
  }

  const handleMora = async (pct: number) => {
    if (!cuotaMora) return
    const res = await fetch(`/api/cuotas/${cuotaMora.id}/mora`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ porcentaje: pct }),
    })
    if (res.ok) { setCuotaMora(null); cargarCuotas() }
    else alert('Error al aplicar mora')
  }

  const handlePago = async () => {
    if (!cuotaPago) return
    const res = await fetch(`/api/cuotas/${cuotaPago.id}/pagar`, { method: 'POST' })
    if (res.ok) { setCuotaPago(null); cargarCuotas() }
    else alert('Error al registrar el pago')
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-2xl mx-auto">
      <h1 className="text-xl sm:text-2xl font-bold text-white mb-6 flex items-center gap-2">
        📅 Gestión de cuotas
      </h1>

      <div className="mb-4">
        <input
          type="text"
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          placeholder="🔍 Buscar cliente por nombre o apellido..."
          className="w-full px-4 py-3 rounded-xl border border-zinc-800 bg-zinc-900 text-white text-sm placeholder-zinc-500 focus:outline-none focus:border-zinc-600 transition-colors"
        />
      </div>

      <div className="relative -mx-4 px-4 sm:mx-0 sm:px-0 mb-6">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide snap-x">
          {FILTROS.map(f => (
            <button
              key={f.key}
              onClick={() => setFiltro(f.key)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold border transition shrink-0 snap-start ${
                filtro === f.key
                  ? FILTER_ACTIVE[f.key]
                  : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-zinc-600'
              }`}
            >
              {f.label}
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                filtro === f.key ? 'bg-white/20 text-white' : 'bg-zinc-800 text-zinc-500'
              }`}>
                {conteos[f.key]}
              </span>
            </button>
          ))}
        </div>
      </div>

      {cargando ? (
        <p className="text-zinc-500 text-center py-20 text-sm">Cargando...</p>
      ) : grupos.length === 0 ? (
        <p className="text-zinc-600 text-center py-20 text-sm">No se encontraron cuotas</p>
      ) : (
        <div className="space-y-3">
          {grupos.map(g => (
            <ClienteCard key={g.key} group={g} onMora={setCuotaMora} onPago={setCuotaPago} />
          ))}
        </div>
      )}

      {cuotaMora && (
        <ModalMora cuota={cuotaMora} onClose={() => setCuotaMora(null)} onConfirm={handleMora} />
      )}
      {cuotaPago && (
        <ModalPago cuota={cuotaPago} onClose={() => setCuotaPago(null)} onConfirm={handlePago} />
      )}
    </div>
  )
}