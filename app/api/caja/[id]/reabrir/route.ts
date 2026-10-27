import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requerirSesion } from '@/lib/api-auth'
import { fechaDiaAR } from '@/lib/fechas'
import { ErrorApi, manejarErrorApi } from '@/lib/errores'

export const dynamic = 'force-dynamic'

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const sinSesion = await requerirSesion()
  if (sinSesion) return sinSesion

  try {
    const { id } = await params

    const caja = await prisma.cajaDiaria.findUnique({ where: { id } })
    if (!caja) throw new ErrorApi('Caja no encontrada', 404)
    if (caja.fechaDia.getTime() !== fechaDiaAR().getTime()) {
      throw new ErrorApi('Solo se puede reabrir la caja del día de hoy', 409)
    }
    if (caja.estado === 'abierta') throw new ErrorApi('La caja ya está abierta', 409)

    const reabierta = await prisma.cajaDiaria.update({
      where: { id },
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

    return NextResponse.json(reabierta)
  } catch (error) {
    return manejarErrorApi(error)
  }
}
