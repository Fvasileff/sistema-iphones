import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requerirSesion } from '@/lib/api-auth'
import { ErrorApi, manejarErrorApi } from '@/lib/errores'

export const dynamic = 'force-dynamic'

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const sinSesion = await requerirSesion()
  if (sinSesion) return sinSesion

  try {
    const { id } = await params
    const { porcentaje } = await req.json()

    const porcentajeNumero = Number(porcentaje)
    if (!Number.isFinite(porcentajeNumero) || porcentajeNumero <= 0) {
      throw new ErrorApi('Porcentaje de mora inválido', 400)
    }

    const cuotaActual = await prisma.cuota.findUnique({
      where: { id },
      include: { venta: true },
    })

    if (!cuotaActual) throw new ErrorApi('Cuota no encontrada', 404)
    if (cuotaActual.venta.anulada) throw new ErrorApi('La venta está anulada', 409)
    if (cuotaActual.estado === 'pagada') throw new ErrorApi('La cuota ya está pagada', 409)

    const montoMora = Number(cuotaActual.montoOriginal) * (porcentajeNumero / 100)

    const cuota = await prisma.cuota.update({
      where: { id },
      data: { montoMora, estado: 'mora' },
    })

    return NextResponse.json(cuota)
  } catch (error) {
    return manejarErrorApi(error)
  }
}
