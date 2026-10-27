'use client'

import { formatARS } from '@/lib/format'

type Monto = number | string

export interface ItemTicket {
  descripcion: string
  cantidad?: number
  subtotal?: Monto
}

export interface TicketPago {
  etiqueta: string
  monto: Monto
}

export interface TicketData {
  titulo: string
  codigo: string | null
  fecha: string
  cliente?: string
  metodo?: string
  pagos?: TicketPago[]
  items: ItemTicket[]
  total?: Monto
  extra?: string[]
  footer?: string
}

function escapeHtml(valor: string) {
  return valor.replace(/[&<>"']/g, caracter => {
    const mapa: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    }
    return mapa[caracter] ?? caracter
  })
}

export function imprimirTicket(ticket: TicketData) {
  const ventana = window.open('', '_blank', 'width=440,height=640')
  if (!ventana) return

  const items = ticket.items
    .map(
      item => `
        <div class="item">
          <div>${escapeHtml(item.descripcion)}</div>
          <div class="fila"><span>${item.cantidad ? `${item.cantidad} x` : ''}</span><span>${
            item.subtotal === undefined || item.subtotal === null
              ? ''
              : escapeHtml(formatARS(item.subtotal))
          }</span></div>
        </div>`,
    )
    .join('')

  const extra = (ticket.extra ?? [])
    .filter(linea => linea.length > 0)
    .map(linea => `<p class="chico">${escapeHtml(linea)}</p>`)
    .join('')

  const totalHtml =
    ticket.total === undefined || ticket.total === null
      ? ''
      : `<div class="total"><span>TOTAL</span><span>${escapeHtml(formatARS(ticket.total))}</span></div>`

  const pagosHtml = (ticket.pagos ?? [])
    .map(
      pago =>
        `<p class="sub">${escapeHtml(pago.etiqueta)}: ${escapeHtml(formatARS(pago.monto))}</p>`,
    )
    .join('')

  ventana.document.write(`<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(ticket.titulo)}</title>
<style>
  @page { size: 80mm auto; margin: 4mm; }
  * { box-sizing: border-box; }
  body { width: 72mm; margin: 0 auto; font-family: ui-monospace, Menlo, Consolas, monospace; font-size: 11px; color: #000; }
  .centro { text-align: center; }
  .titulo { font-weight: 700; font-size: 14px; margin: 0; }
  .sub { font-size: 11px; margin: 2px 0; }
  .chico { font-size: 10px; margin: 2px 0; }
  .aviso { font-size: 10px; font-weight: 600; text-transform: uppercase; margin: 4px 0 0; }
  .linea { border-top: 1px dashed #000; margin: 6px 0; }
  .item { margin-bottom: 4px; }
  .fila { display: flex; justify-content: space-between; gap: 8px; font-size: 10px; }
  .total { display: flex; justify-content: space-between; font-weight: 700; font-size: 13px; border-top: 1px solid #000; padding-top: 5px; margin-top: 5px; }
  p { margin: 2px 0; }
</style>
</head>
<body>
  <div class="centro">
    <p class="titulo">MP STORE</p>
    <p class="sub">${escapeHtml(ticket.titulo)}</p>
    <p class="chico">${escapeHtml(ticket.fecha)}</p>
  </div>
  ${ticket.codigo ? `<p class="centro sub">Operación: ${escapeHtml(ticket.codigo)}</p>` : ''}
  ${ticket.cliente ? `<p class="sub">Cliente: ${escapeHtml(ticket.cliente)}</p>` : ''}
  <div class="linea"></div>
  ${items}
  ${totalHtml}
  ${ticket.metodo ? `<p class="sub">Pago: ${escapeHtml(ticket.metodo)}</p>` : ''}
  ${pagosHtml}
  ${extra}
  <div class="linea"></div>
  <p class="centro chico">${escapeHtml(ticket.footer ?? '¡Gracias por tu compra!')}</p>
  <p class="centro aviso">Ticket no válido como factura</p>
</body>
</html>`)
  ventana.document.close()
  ventana.focus()
  ventana.print()
}

export default function TicketModal({
  ticket,
  onClose,
}: {
  ticket: TicketData
  onClose: () => void
}) {
  return (
    <div className="animate-fade-in fixed inset-0 z-50 flex items-end justify-center bg-black/75 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="animate-modal-in max-h-[92vh] w-full overflow-y-auto rounded-t-2xl border border-zinc-700 bg-zinc-900 p-5 shadow-2xl shadow-black/50 sm:max-w-sm sm:rounded-2xl sm:p-6">
        <div className="flex items-center justify-between gap-3 mb-4">
          <h2 className="text-white font-bold text-lg">Ticket generado</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-500 transition hover:bg-zinc-800 hover:text-white"
            aria-label="Cerrar"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="bg-white text-zinc-900 rounded-xl p-4 font-mono text-[12px] leading-snug">
          <div className="text-center border-b border-dashed border-zinc-400 pb-2 mb-2">
            <p className="font-bold text-sm">MP STORE</p>
            <p className="text-[11px]">{ticket.titulo}</p>
            <p className="text-[10px]">{ticket.fecha}</p>
          </div>
          {ticket.codigo && (
            <p className="text-center text-[11px] mb-2">
              Operación <span className="font-bold">{ticket.codigo}</span>
            </p>
          )}
          {ticket.cliente && (
            <p className="text-[11px] mb-2">
              Cliente: <span className="font-semibold">{ticket.cliente}</span>
            </p>
          )}
          <div className="border-t border-dashed border-zinc-400 pt-2 mb-2 space-y-1.5">
            {ticket.items.map((item, indice) => (
              <div key={`${item.descripcion}-${indice}`}>
                <p className="wrap-break-word">{item.descripcion}</p>
                <div className="flex justify-between gap-2 text-[11px]">
                  <span>{item.cantidad ? `${item.cantidad} x` : ''}</span>
                  <span>
                    {item.subtotal === undefined || item.subtotal === null
                      ? ''
                      : formatARS(item.subtotal)}
                  </span>
                </div>
              </div>
            ))}
          </div>
          {ticket.total !== undefined && ticket.total !== null && (
            <div className="border-t border-zinc-900 pt-2 flex justify-between font-bold text-sm">
              <span>TOTAL</span>
              <span>{formatARS(ticket.total)}</span>
            </div>
          )}
          {ticket.metodo && <p className="text-[11px] mt-1">Pago: {ticket.metodo}</p>}
          {ticket.pagos?.map((pago, indice) => (
            <p key={`${pago.etiqueta}-${indice}`} className="text-[11px] flex justify-between gap-2">
              <span>{pago.etiqueta}</span>
              <span>{formatARS(pago.monto)}</span>
            </p>
          ))}
          {ticket.extra
            ?.filter(linea => linea.length > 0)
            .map((linea, indice) => (
              <p key={`${linea}-${indice}`} className="text-[10px] mt-1 wrap-break-word">
                {linea}
              </p>
            ))}
          <p className="text-center text-[10px] mt-3 border-t border-dashed border-zinc-400 pt-2">
            {ticket.footer ?? '¡Gracias por tu compra!'}
          </p>
          <p className="text-center text-[10px] font-semibold uppercase mt-1">
            Ticket no válido como factura
          </p>
        </div>

        <div className="flex gap-3 mt-4">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-semibold transition"
          >
            Cerrar
          </button>
          <button
            onClick={() => imprimirTicket(ticket)}
            className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold transition"
          >
            Imprimir
          </button>
        </div>
      </div>
    </div>
  )
}