import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requerirSesion } from '@/lib/api-auth'
import { manejarErrorApi } from '@/lib/errores'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const sinSesion = await requerirSesion()
  if (sinSesion) return sinSesion

  try {
    const { searchParams } = new URL(req.url)
    const clienteId = searchParams.get('clienteId')
    const estado = searchParams.get('estado')

    const cuotas = await prisma.cuota.findMany({
      where: {
        ...(estado && estado !== 'todos' && { estado }),
        venta: {
          anulada: false,
          ...(clienteId && { clienteId }),
        },
      },
      include: {
        venta: {
          include: {
            cliente: true,
            iphone: true,
          },
        },
      },
      orderBy: { fechaVencimiento: 'asc' },
    })

    const ahora = new Date()

    const cuotasConEstado = cuotas.map(cuota => ({
      ...cuota,
      estado:
        cuota.estado === 'pendiente' && cuota.fechaVencimiento < ahora
          ? 'vencida'
          : cuota.estado,
    }))

    return NextResponse.json(cuotasConEstado)
  } catch (error) {
    return manejarErrorApi(error)
  }
}
