import { NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { requerirSesion } from '@/lib/api-auth'
import { CATEGORIAS_PRODUCTO } from '@/lib/constantes'
import { manejarErrorApi } from '@/lib/errores'
import { productoCreateSchema } from '@/lib/validaciones/productos'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const sinSesion = await requerirSesion()
  if (sinSesion) return sinSesion

  try {
    const { searchParams } = new URL(request.url)
    const categoria = searchParams.get('categoria')
    const busqueda = searchParams.get('busqueda')?.trim()
    const activoParam = searchParams.get('activo')
    const soloStockBajo = searchParams.get('stockBajo') === 'true'

    const where: Prisma.ProductoWhereInput = {}

    if (categoria && CATEGORIAS_PRODUCTO.includes(categoria as (typeof CATEGORIAS_PRODUCTO)[number])) {
      where.categoria = categoria
    }

    if (activoParam !== null) {
      where.activo = activoParam !== 'false'
    }

    if (busqueda) {
      where.OR = [
        { nombre: { contains: busqueda, mode: 'insensitive' } },
        { sku: { contains: busqueda, mode: 'insensitive' } },
        { descripcion: { contains: busqueda, mode: 'insensitive' } },
      ]
    }

    const productos = await prisma.producto.findMany({
      where,
      orderBy: { nombre: 'asc' },
    })

    return NextResponse.json(
      soloStockBajo ? productos.filter(producto => producto.stock <= producto.stockMinimo) : productos,
    )
  } catch (error) {
    return manejarErrorApi(error)
  }
}

export async function POST(request: Request) {
  const sinSesion = await requerirSesion()
  if (sinSesion) return sinSesion

  try {
    const data = productoCreateSchema.parse(await request.json())

    const producto = await prisma.$transaction(async tx => {
      const creado = await tx.producto.create({
        data: {
          nombre: data.nombre,
          descripcion: data.descripcion,
          categoria: data.categoria,
          sku: data.sku,
          precioCompra: data.precioCompra,
          precioVenta: data.precioVenta,
          stock: data.stock,
          stockMinimo: data.stockMinimo,
          activo: data.activo,
        },
      })

      if (data.stock > 0) {
        await tx.movimientoStock.create({
          data: {
            productoId: creado.id,
            tipo: 'ingreso',
            cantidad: data.stock,
            motivo: 'Stock inicial',
          },
        })
      }

      return creado
    })

    return NextResponse.json(producto, { status: 201 })
  } catch (error) {
    return manejarErrorApi(error)
  }
}
