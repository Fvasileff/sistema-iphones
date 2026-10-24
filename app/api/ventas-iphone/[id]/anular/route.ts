import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requerirSesion } from '@/lib/api-auth'
import { buscarMovimientoPorReferencia, revertirMovimientoCaja } from '@/lib/caja'
import { ErrorApi, manejarErrorApi } from '@/lib/errores'
import { anulacionSchema } from '@/lib/validaciones/comunes'

export const dynamic = 'force-dynamic'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const sinSesion = await requerirSesion()
  if (sinSesion) return sinSesion

  try {
    const { id } = await params
    const { motivo } = anulacionSchema.parse(await request.json())

    const venta = await prisma.$transaction(async tx => {
      const actual = await tx.ventaIphone.findUnique({ where: { id } })
      if (!actual) throw new ErrorApi('Venta de iPhone no encontrada', 404)
      if (actual.anulada) throw new ErrorApi('La venta ya está anulada', 409)

      const anulada = await tx.ventaIphone.update({
        where: { id },
        data: {
          anulada: true,
          motivoAnulacion: motivo,
          fechaAnulacion: new Date(),
        },
        include: { cliente: true, iphone: true },
      })

      await tx.iPhone.update({
        where: { id: actual.iphoneId },
        data: { stock: { increment: 1 } },
      })

      const movimientoCaja = await buscarMovimientoPorReferencia(tx, 'venta_iphone', actual.id)
      if (movimientoCaja) {
        await revertirMovimientoCaja(tx, movimientoCaja.id, motivo)
      }

      return anulada
    })

    return NextResponse.json(venta)
  } catch (error) {
    return manejarErrorApi(error)
  }
}
