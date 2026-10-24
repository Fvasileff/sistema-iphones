import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requerirSesion } from '@/lib/api-auth'
import { ErrorApi, manejarErrorApi } from '@/lib/errores'
import { anulacionSchema } from '@/lib/validaciones/comunes'

export const dynamic = 'force-dynamic'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; repuestoId: string }> },
) {
  const sinSesion = await requerirSesion()
  if (sinSesion) return sinSesion

  try {
    const { id, repuestoId } = await params
    const { motivo } = anulacionSchema.parse(await request.json())

    const repuesto = await prisma.$transaction(async tx => {
      const actual = await tx.reparacionProducto.findUnique({
        where: { id: repuestoId },
        include: { reparacion: true },
      })

      if (!actual || actual.reparacionId !== id) {
        throw new ErrorApi('Repuesto de reparación no encontrado', 404)
      }
      if (actual.anulada) throw new ErrorApi('El repuesto ya está anulado', 409)
      if (actual.reparacion.anulada) throw new ErrorApi('La reparación está anulada', 409)

      const anulado = await tx.reparacionProducto.update({
        where: { id: repuestoId },
        data: {
          anulada: true,
          motivoAnulacion: motivo,
          fechaAnulacion: new Date(),
        },
        include: { producto: true },
      })

      await tx.producto.update({
        where: { id: actual.productoId },
        data: { stock: { increment: actual.cantidad } },
      })

      await tx.movimientoStock.create({
        data: {
          productoId: actual.productoId,
          tipo: 'anulacion',
          cantidad: actual.cantidad,
          motivo: `Anulación repuesto en ${actual.reparacion.codigoOperacion}: ${motivo}`,
          referenciaTipo: 'reparacion',
          referenciaId: actual.reparacionId,
        },
      })

      return anulado
    })

    return NextResponse.json(repuesto)
  } catch (error) {
    return manejarErrorApi(error)
  }
}
