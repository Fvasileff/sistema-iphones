import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requerirSesion } from '@/lib/api-auth'
import { ErrorApi, manejarErrorApi } from '@/lib/errores'
import { reparacionRepuestoSchema } from '@/lib/validaciones/reparaciones'

export const dynamic = 'force-dynamic'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const sinSesion = await requerirSesion()
  if (sinSesion) return sinSesion

  try {
    const { id } = await params

    const repuestos = await prisma.reparacionProducto.findMany({
      where: { reparacionId: id },
      include: { producto: true },
      orderBy: { createdAt: 'asc' },
    })

    return NextResponse.json(repuestos)
  } catch (error) {
    return manejarErrorApi(error)
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const sinSesion = await requerirSesion()
  if (sinSesion) return sinSesion

  try {
    const { id } = await params
    const data = reparacionRepuestoSchema.parse(await request.json())

    const repuesto = await prisma.$transaction(async tx => {
      const reparacion = await tx.reparacion.findUnique({ where: { id } })
      if (!reparacion) throw new ErrorApi('Reparación no encontrada', 404)
      if (reparacion.anulada) throw new ErrorApi('La reparación está anulada', 409)

      const producto = await tx.producto.findUnique({ where: { id: data.productoId } })
      if (!producto) throw new ErrorApi('Producto no encontrado', 404)
      if (!producto.activo) throw new ErrorApi('El producto está inactivo', 400)
      if (producto.stock < data.cantidad) {
        throw new ErrorApi(`Stock insuficiente de ${producto.nombre}`, 409)
      }

      const precioUnitario = data.precioUnitario ?? Number(producto.precioVenta)
      const subtotal = precioUnitario * data.cantidad

      const creado = await tx.reparacionProducto.create({
        data: {
          reparacionId: reparacion.id,
          productoId: producto.id,
          cantidad: data.cantidad,
          precioUnitario,
          subtotal,
        },
        include: { producto: true },
      })

      await tx.producto.update({
        where: { id: producto.id },
        data: { stock: { decrement: data.cantidad } },
      })

      await tx.movimientoStock.create({
        data: {
          productoId: producto.id,
          tipo: 'reparacion',
          cantidad: -data.cantidad,
          motivo: `Reparación ${reparacion.codigoOperacion}`,
          referenciaTipo: 'reparacion',
          referenciaId: reparacion.id,
        },
      })

      return creado
    })

    return NextResponse.json(repuesto, { status: 201 })
  } catch (error) {
    return manejarErrorApi(error)
  }
}
