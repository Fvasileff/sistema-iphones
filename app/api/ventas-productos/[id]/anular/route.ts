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
      const actual = await tx.ventaProducto.findUnique({
        where: { id },
        include: { items: true },
      })

      if (!actual) throw new ErrorApi('Venta no encontrada', 404)
      if (actual.anulada) throw new ErrorApi('La venta ya está anulada', 409)

      const anulada = await tx.ventaProducto.update({
        where: { id },
        data: {
          anulada: true,
          motivoAnulacion: motivo,
          fechaAnulacion: new Date(),
        },
        include: {
          cliente: true,
          items: { include: { producto: true } },
        },
      })

      for (const item of actual.items) {
        await tx.producto.update({
          where: { id: item.productoId },
          data: { stock: { increment: item.cantidad } },
        })

        await tx.movimientoStock.create({
          data: {
            productoId: item.productoId,
            tipo: 'anulacion',
            cantidad: item.cantidad,
            motivo: `Anulación ${actual.codigoOperacion}: ${motivo}`,
            referenciaTipo: 'venta_producto',
            referenciaId: actual.id,
          },
        })
      }

      const movimientoCaja = await buscarMovimientoPorReferencia(tx, 'venta_producto', actual.id)
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
