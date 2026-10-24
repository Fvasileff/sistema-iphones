import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requerirSesion } from '@/lib/api-auth'
import { ErrorApi, manejarErrorApi } from '@/lib/errores'
import { generarCodigoOperacion } from '@/lib/operaciones'
import { movimientoCajaSchema } from '@/lib/validaciones/caja'

export const dynamic = 'force-dynamic'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const sinSesion = await requerirSesion()
  if (sinSesion) return sinSesion

  try {
    const { id } = await params

    const caja = await prisma.cajaDiaria.findUnique({
      where: { id },
      include: { movimientos: { orderBy: { createdAt: 'asc' } } },
    })

    if (!caja) throw new ErrorApi('Caja no encontrada', 404)

    return NextResponse.json(caja.movimientos)
  } catch (error) {
    return manejarErrorApi(error)
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const sinSesion = await requerirSesion()
  if (sinSesion) return sinSesion

  try {
    const { id } = await params
    const data = movimientoCajaSchema.parse(await request.json())

    const movimiento = await prisma.$transaction(async tx => {
      const caja = await tx.cajaDiaria.findUnique({ where: { id } })

      if (!caja) throw new ErrorApi('Caja no encontrada', 404)
      if (caja.estado !== 'abierta') throw new ErrorApi('La caja está cerrada', 409)

      const codigoOperacion = await generarCodigoOperacion(tx)

      return tx.movimientoCaja.create({
        data: {
          cajaId: caja.id,
          tipo: data.tipo,
          metodoPago: data.metodoPago,
          monto: data.tipo === 'egreso' ? -data.monto : data.monto,
          descripcion: data.descripcion,
          codigoOperacion,
        },
      })
    })

    return NextResponse.json(movimiento, { status: 201 })
  } catch (error) {
    return manejarErrorApi(error)
  }
}
