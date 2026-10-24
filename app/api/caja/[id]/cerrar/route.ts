import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requerirSesion } from '@/lib/api-auth'
import { calcularTotalesCaja } from '@/lib/caja'
import { ErrorApi, manejarErrorApi } from '@/lib/errores'
import { cierreCajaSchema } from '@/lib/validaciones/caja'

export const dynamic = 'force-dynamic'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const sinSesion = await requerirSesion()
  if (sinSesion) return sinSesion

  try {
    const { id } = await params
    const data = cierreCajaSchema.parse(await request.json())

    const caja = await prisma.cajaDiaria.findUnique({
      where: { id },
      include: { movimientos: true },
    })

    if (!caja) throw new ErrorApi('Caja no encontrada', 404)
    if (caja.estado !== 'abierta') throw new ErrorApi('La caja ya está cerrada', 409)

    const totales = calcularTotalesCaja(caja.movimientos)
    const esperadoEfectivo = Number(caja.montoInicial) + totales.efectivo
    const esperadoTransferencia = totales.transferencia

    const cerrada = await prisma.cajaDiaria.update({
      where: { id },
      data: {
        estado: 'cerrada',
        cerradaAt: new Date(),
        montoEsperadoEfectivo: esperadoEfectivo,
        montoContadoEfectivo: data.montoContadoEfectivo,
        diferenciaEfectivo: data.montoContadoEfectivo - esperadoEfectivo,
        montoEsperadoTransferencia: esperadoTransferencia,
        montoContadoTransferencia: data.montoContadoTransferencia,
        diferenciaTransferencia: data.montoContadoTransferencia - esperadoTransferencia,
        observaciones: data.observaciones,
      },
    })

    return NextResponse.json({
      caja: cerrada,
      esperado: {
        efectivo: esperadoEfectivo,
        transferencia: esperadoTransferencia,
      },
      diferencia: {
        efectivo: Number(cerrada.diferenciaEfectivo),
        transferencia: Number(cerrada.diferenciaTransferencia),
      },
    })
  } catch (error) {
    return manejarErrorApi(error)
  }
}
