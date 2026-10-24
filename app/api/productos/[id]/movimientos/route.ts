import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requerirSesion } from '@/lib/api-auth'
import { ErrorApi, manejarErrorApi } from '@/lib/errores'
import { movimientoStockSchema } from '@/lib/validaciones/productos'

export const dynamic = 'force-dynamic'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const sinSesion = await requerirSesion()
  if (sinSesion) return sinSesion

  try {
    const { id } = await params

    const movimientos = await prisma.movimientoStock.findMany({
      where: { productoId: id },
      orderBy: { createdAt: 'desc' },
      take: 200,
    })

    return NextResponse.json(movimientos)
  } catch (error) {
    return manejarErrorApi(error)
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const sinSesion = await requerirSesion()
  if (sinSesion) return sinSesion

  try {
    const { id } = await params
    const data = movimientoStockSchema.parse(await request.json())

    const resultado = await prisma.$transaction(async tx => {
      const producto = await tx.producto.findUnique({ where: { id } })
      if (!producto) throw new ErrorApi('Producto no encontrado', 404)

      let delta = 0
      if (data.tipo === 'ingreso') delta = data.cantidad
      if (data.tipo === 'egreso') delta = -data.cantidad
      if (data.tipo === 'ajuste') delta = data.cantidad - producto.stock

      const nuevoStock = producto.stock + delta
      if (nuevoStock < 0) {
        throw new ErrorApi('El stock no puede quedar negativo', 400)
      }

      const actualizado = await tx.producto.update({
        where: { id },
        data: { stock: nuevoStock },
      })

      const movimiento = await tx.movimientoStock.create({
        data: {
          productoId: id,
          tipo: data.tipo,
          cantidad: delta,
          motivo: data.motivo ?? 'Movimiento manual',
        },
      })

      return { producto: actualizado, movimiento }
    })

    return NextResponse.json(resultado, { status: 201 })
  } catch (error) {
    return manejarErrorApi(error)
  }
}
