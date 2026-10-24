import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requerirSesion } from '@/lib/api-auth'
import { calcularTotalesCaja, obtenerCajaHoy } from '@/lib/caja'
import { fechaDiaAR } from '@/lib/fechas'
import { ErrorApi, manejarErrorApi } from '@/lib/errores'
import { aperturaCajaSchema } from '@/lib/validaciones/caja'

export const dynamic = 'force-dynamic'

export async function GET() {
  const sinSesion = await requerirSesion()
  if (sinSesion) return sinSesion

  try {
    const caja = await obtenerCajaHoy()

    if (!caja) {
      return NextResponse.json({
        caja: null,
        abierta: false,
        totales: { efectivo: 0, transferencia: 0, porTipo: {} },
      })
    }

    return NextResponse.json({
      caja,
      abierta: caja.estado === 'abierta',
      totales: {
        ...calcularTotalesCaja(caja.movimientos),
        montoInicial: Number(caja.montoInicial),
      },
    })
  } catch (error) {
    return manejarErrorApi(error)
  }
}

export async function POST(request: Request) {
  const sinSesion = await requerirSesion()
  if (sinSesion) return sinSesion

  try {
    const data = aperturaCajaSchema.parse(await request.json())
    const fechaDia = fechaDiaAR()

    const existente = await prisma.cajaDiaria.findUnique({ where: { fechaDia } })
    if (existente) {
      throw new ErrorApi('Ya existe una caja para el día de hoy', 409)
    }

    const caja = await prisma.cajaDiaria.create({
      data: {
        fechaDia,
        montoInicial: data.montoInicial,
        estado: 'abierta',
      },
    })

    return NextResponse.json(caja, { status: 201 })
  } catch (error) {
    return manejarErrorApi(error)
  }
}
