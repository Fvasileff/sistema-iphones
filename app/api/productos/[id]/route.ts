import { NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { requerirSesion } from '@/lib/api-auth'
import { ErrorApi, manejarErrorApi } from '@/lib/errores'
import { productoUpdateSchema } from '@/lib/validaciones/productos'

export const dynamic = 'force-dynamic'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const sinSesion = await requerirSesion()
  if (sinSesion) return sinSesion

  try {
    const { id } = await params

    const producto = await prisma.producto.findUnique({
      where: { id },
      include: {
        movimientos: {
          orderBy: { createdAt: 'desc' },
          take: 50,
        },
      },
    })

    if (!producto) throw new ErrorApi('Producto no encontrado', 404)

    return NextResponse.json(producto)
  } catch (error) {
    return manejarErrorApi(error)
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const sinSesion = await requerirSesion()
  if (sinSesion) return sinSesion

  try {
    const { id } = await params
    const data = productoUpdateSchema.parse(await request.json())

    const cambios: Prisma.ProductoUpdateInput = {}

    if (data.nombre !== undefined) cambios.nombre = data.nombre
    if (data.descripcion !== undefined) cambios.descripcion = data.descripcion
    if (data.categoria !== undefined) cambios.categoria = data.categoria
    if (data.sku !== undefined) cambios.sku = data.sku || null
    if (data.precioCompra !== undefined) cambios.precioCompra = data.precioCompra
    if (data.precioVenta !== undefined) cambios.precioVenta = data.precioVenta
    if (data.stockMinimo !== undefined) cambios.stockMinimo = data.stockMinimo
    if (data.activo !== undefined) cambios.activo = data.activo

    if (Object.keys(cambios).length === 0) {
      throw new ErrorApi('No hay cambios para guardar', 400)
    }

    const producto = await prisma.producto.update({
      where: { id },
      data: cambios,
    })

    return NextResponse.json(producto)
  } catch (error) {
    return manejarErrorApi(error)
  }
}
