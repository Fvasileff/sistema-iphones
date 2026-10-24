import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requerirSesion } from '@/lib/api-auth'
import { buscarMovimientoPorReferencia, revertirMovimientoCaja } from '@/lib/caja'
import { ErrorApi, manejarErrorApi } from '@/lib/errores'
import { anulacionSchema } from '@/lib/validaciones/comunes'

export const dynamic = 'force-dynamic'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; pagoId: string }> },
) {
  const sinSesion = await requerirSesion()
  if (sinSesion) return sinSesion

  try {
    const { id, pagoId } = await params
    const { motivo } = anulacionSchema.parse(await request.json())

    const pago = await prisma.$transaction(async tx => {
      const actual = await tx.pagoCuota.findUnique({
        where: { id: pagoId },
        include: { cuota: true },
      })

      if (!actual || actual.cuotaId !== id) {
        throw new ErrorApi('Pago de cuota no encontrado', 404)
      }
      if (actual.anulada) throw new ErrorApi('El pago ya está anulado', 409)

      const anulado = await tx.pagoCuota.update({
        where: { id: pagoId },
        data: {
          anulada: true,
          motivoAnulacion: motivo,
          fechaAnulacion: new Date(),
        },
      })

      const ahora = new Date()
      const estado =
        Number(actual.cuota.montoMora) > 0
          ? 'mora'
          : actual.cuota.fechaVencimiento < ahora
            ? 'vencida'
            : 'pendiente'

      await tx.cuota.update({
        where: { id: actual.cuotaId },
        data: {
          estado,
          fechaPago: null,
        },
      })

      const movimientoCaja = await buscarMovimientoPorReferencia(tx, 'pago_cuota', actual.id)
      if (movimientoCaja) {
        await revertirMovimientoCaja(tx, movimientoCaja.id, motivo)
      }

      return anulado
    })

    return NextResponse.json(pago)
  } catch (error) {
    return manejarErrorApi(error)
  }
}
