import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requerirSesion } from '@/lib/api-auth'
import { ErrorApi, manejarErrorApi } from '@/lib/errores'
import { includeReparacion } from '@/lib/reparaciones'
import { anulacionSchema } from '@/lib/validaciones/comunes'

export const dynamic = 'force-dynamic'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const sinSesion = await requerirSesion()
  if (sinSesion) return sinSesion

  try {
    const { id } = await params
    const { motivo } = anulacionSchema.parse(await request.json())

    const reparacion = await prisma.$transaction(async tx => {
      const actual = await tx.reparacion.findUnique({
        where: { id },
        include: {
          repuestos: { where: { anulada: false } },
          pagos: { where: { anulada: false } },
        },
      })

      if (!actual) throw new ErrorApi('Reparación no encontrada', 404)
      if (actual.anulada) throw new ErrorApi('La reparación ya está anulada', 409)
      if (actual.pagos.length > 0) {
        throw new ErrorApi('Anulá primero los pagos registrados de esta reparación', 409)
      }

      const anulada = await tx.reparacion.update({
        where: { id },
        data: {
          anulada: true,
          motivoAnulacion: motivo,
          fechaAnulacion: new Date(),
          historial: {
            create: {
              estadoAnterior: actual.estado,
              estadoNuevo: 'anulada',
              nota: motivo,
            },
          },
        },
        include: includeReparacion,
      })

      for (const repuesto of actual.repuestos) {
        await tx.reparacionProducto.update({
          where: { id: repuesto.id },
          data: {
            anulada: true,
            motivoAnulacion: motivo,
            fechaAnulacion: new Date(),
          },
        })

        await tx.producto.update({
          where: { id: repuesto.productoId },
          data: { stock: { increment: repuesto.cantidad } },
        })

        await tx.movimientoStock.create({
          data: {
            productoId: repuesto.productoId,
            tipo: 'anulacion',
            cantidad: repuesto.cantidad,
            motivo: `Anulación reparación ${actual.codigoOperacion}: ${motivo}`,
            referenciaTipo: 'reparacion',
            referenciaId: actual.id,
          },
        })
      }

      return anulada
    })

    return NextResponse.json(reparacion)
  } catch (error) {
    return manejarErrorApi(error)
  }
}
