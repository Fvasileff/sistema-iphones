import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requerirSesion } from '@/lib/api-auth'
import { registrarMovimientoCaja } from '@/lib/caja'
import { ErrorApi, manejarErrorApi } from '@/lib/errores'
import { generarCodigoOperacion } from '@/lib/operaciones'
import { ventaIphoneContadoSchema } from '@/lib/validaciones/ventas'

export const dynamic = 'force-dynamic'

export async function GET() {
  const sinSesion = await requerirSesion()
  if (sinSesion) return sinSesion

  try {
    const ventas = await prisma.ventaIphone.findMany({
      include: { cliente: true, iphone: true },
      orderBy: { fechaVenta: 'desc' },
      take: 100,
    })

    return NextResponse.json(ventas)
  } catch (error) {
    return manejarErrorApi(error)
  }
}

export async function POST(request: Request) {
  const sinSesion = await requerirSesion()
  if (sinSesion) return sinSesion

  try {
    const data = ventaIphoneContadoSchema.parse(await request.json())

    const venta = await prisma.$transaction(async tx => {
      if (data.clienteId) {
        const cliente = await tx.cliente.findUnique({ where: { id: data.clienteId } })
        if (!cliente) throw new ErrorApi('Cliente no encontrado', 404)
      }

      const iphone = await tx.iPhone.findUnique({ where: { id: data.iphoneId } })
      if (!iphone) throw new ErrorApi('iPhone no encontrado', 404)
      if (!iphone.activo) throw new ErrorApi('El iPhone está inactivo', 400)
      if (iphone.stock <= 0) throw new ErrorApi('El iPhone no tiene stock disponible', 409)

      const codigoOperacion = await generarCodigoOperacion(tx)

      const creada = await tx.ventaIphone.create({
        data: {
          codigoOperacion,
          clienteId: data.clienteId ?? null,
          iphoneId: iphone.id,
          precioVenta: data.precioVenta,
          metodoPago: data.metodoPago,
          observaciones: data.observaciones,
        },
        include: { cliente: true, iphone: true },
      })

      await tx.iPhone.update({
        where: { id: iphone.id },
        data: { stock: { decrement: 1 } },
      })

      await registrarMovimientoCaja(tx, {
        tipo: 'venta_iphone',
        metodoPago: data.metodoPago,
        monto: data.precioVenta,
        descripcion: `Venta iPhone ${iphone.modelo} ${iphone.almacenamiento} ${codigoOperacion}`,
        codigoOperacion,
        referenciaTipo: 'venta_iphone',
        referenciaId: creada.id,
      })

      return creada
    })

    return NextResponse.json(venta, { status: 201 })
  } catch (error) {
    return manejarErrorApi(error)
  }
}
