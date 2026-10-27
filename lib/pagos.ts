import { METODOS_PAGO, type MetodoPago, type MetodoPagoCaja } from '@/lib/constantes'
import { ErrorApi } from '@/lib/errores'
import { formatARS } from '@/lib/format'

export interface PagoDetalle {
  metodoPago: MetodoPago
  monto: number
}

export interface PagoDesglosado {
  metodoPago: MetodoPagoCaja
  monto: number
  montoEfectivo: number
  montoTransferencia: number
  montoTarjeta: number
}

export function aCentavos(monto: number) {
  return Math.round(monto * 100)
}

export function desglosarPagos(pagos: PagoDetalle[]): PagoDesglosado {
  const centavos = { efectivo: 0, transferencia: 0, tarjeta: 0 }

  for (const pago of pagos) {
    if (!METODOS_PAGO.includes(pago.metodoPago)) {
      throw new ErrorApi('Método de pago inválido', 400)
    }
    centavos[pago.metodoPago] += aCentavos(pago.monto)
  }

  const metodosUsados = METODOS_PAGO.filter(metodo => centavos[metodo] !== 0)

  return {
    metodoPago: metodosUsados.length > 1 ? 'mixto' : (metodosUsados[0] ?? 'efectivo'),
    monto: (centavos.efectivo + centavos.transferencia + centavos.tarjeta) / 100,
    montoEfectivo: centavos.efectivo / 100,
    montoTransferencia: centavos.transferencia / 100,
    montoTarjeta: centavos.tarjeta / 100,
  }
}

export function validarPagos(pagos: PagoDetalle[], totalEsperado: number) {
  const normalizados: PagoDetalle[] = []

  for (const pago of pagos) {
    const centavos = aCentavos(pago.monto)
    if (centavos < 0) throw new ErrorApi('Los montos de pago no pueden ser negativos', 400)
    if (centavos > 0) normalizados.push(pago)
  }

  if (normalizados.length === 0) {
    throw new ErrorApi('Indicá al menos un medio de pago', 400)
  }

  const metodos = new Set(normalizados.map(pago => pago.metodoPago))
  if (metodos.size !== normalizados.length) {
    throw new ErrorApi('Hay métodos de pago repetidos', 400)
  }

  const desglose = desglosarPagos(normalizados)

  if (aCentavos(desglose.monto) !== aCentavos(totalEsperado)) {
    throw new ErrorApi(
      `La suma de los pagos (${formatARS(desglose.monto)}) no coincide con el total (${formatARS(totalEsperado)})`,
      400,
    )
  }

  return { pagos: normalizados, ...desglose }
}
