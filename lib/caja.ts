import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { fechaDiaAR } from '@/lib/fechas'
import { aNumero } from '@/lib/format'
import type { MetodoPago, TipoMovimientoCaja } from '@/lib/constantes'

interface MovimientoResumen {
  metodoPago: string
  monto: Prisma.Decimal | number | string
  tipo: string
  anulada: boolean
}

interface MovimientoCajaInput {
  tipo: TipoMovimientoCaja
  metodoPago: MetodoPago
  monto: number
  descripcion?: string | null
  codigoOperacion?: string | null
  referenciaTipo?: string | null
  referenciaId?: string | null
}

export function calcularTotalesCaja(movimientos: MovimientoResumen[]) {
  const totales = {
    efectivo: 0,
    transferencia: 0,
    tarjeta: 0,
    porTipo: {} as Record<string, number>,
  }

  for (const movimiento of movimientos) {
    if (movimiento.anulada) continue
    const monto = aNumero(movimiento.monto)

    if (movimiento.metodoPago === 'efectivo') totales.efectivo += monto
    if (movimiento.metodoPago === 'transferencia') totales.transferencia += monto
    if (movimiento.metodoPago === 'tarjeta') totales.tarjeta += monto

    totales.porTipo[movimiento.tipo] = (totales.porTipo[movimiento.tipo] ?? 0) + monto
  }

  return totales
}

export async function obtenerCajaHoy() {
  return prisma.cajaDiaria.findUnique({
    where: { fechaDia: fechaDiaAR() },
    include: {
      movimientos: {
        where: { anulada: false },
        orderBy: { createdAt: 'asc' },
      },
    },
  })
}

export async function obtenerCajaHoyTx(tx: Prisma.TransactionClient) {
  const fechaDia = fechaDiaAR()
  const caja = await tx.cajaDiaria.findUnique({ where: { fechaDia } })

  if (!caja) {
    return tx.cajaDiaria.create({
      data: {
        fechaDia,
        montoInicial: 0,
        estado: 'abierta',
      },
    })
  }

  if (caja.estado !== 'abierta') {
    return tx.cajaDiaria.update({
      where: { id: caja.id },
      data: {
        estado: 'abierta',
        cerradaAt: null,
        montoEsperadoEfectivo: null,
        montoContadoEfectivo: null,
        diferenciaEfectivo: null,
        montoEsperadoTransferencia: null,
        montoContadoTransferencia: null,
        diferenciaTransferencia: null,
        observaciones: null,
      },
    })
  }

  return caja
}

export async function registrarMovimientoCaja(
  tx: Prisma.TransactionClient,
  data: MovimientoCajaInput,
) {
  const caja = await obtenerCajaHoyTx(tx)

  return tx.movimientoCaja.create({
    data: {
      cajaId: caja.id,
      tipo: data.tipo,
      metodoPago: data.metodoPago,
      monto: data.monto,
      descripcion: data.descripcion ?? null,
      codigoOperacion: data.codigoOperacion ?? null,
      referenciaTipo: data.referenciaTipo ?? null,
      referenciaId: data.referenciaId ?? null,
    },
  })
}

export async function buscarMovimientoPorReferencia(
  tx: Prisma.TransactionClient,
  referenciaTipo: string,
  referenciaId: string,
) {
  return tx.movimientoCaja.findFirst({
    where: {
      referenciaTipo,
      referenciaId,
      anulada: false,
    },
  })
}

export async function revertirMovimientoCaja(
  tx: Prisma.TransactionClient,
  movimientoId: string,
  motivo: string,
) {
  const movimiento = await tx.movimientoCaja.findUnique({
    where: { id: movimientoId },
    include: { caja: true },
  })

  if (!movimiento || movimiento.anulada) return movimiento

  if (movimiento.caja.estado === 'abierta') {
    return tx.movimientoCaja.update({
      where: { id: movimiento.id },
      data: {
        anulada: true,
        motivoAnulacion: motivo,
        fechaAnulacion: new Date(),
      },
    })
  }

  const cajaActual = await obtenerCajaHoyTx(tx)

  return tx.movimientoCaja.create({
    data: {
      cajaId: cajaActual.id,
      tipo: 'anulacion',
      metodoPago: movimiento.metodoPago,
      monto: -aNumero(movimiento.monto),
      descripcion: `Anulación ${movimiento.codigoOperacion ?? ''}${motivo ? `: ${motivo}` : ''}`.trim(),
      codigoOperacion: movimiento.codigoOperacion,
      referenciaTipo: 'anulacion',
      referenciaId: movimiento.id,
    },
  })
}
