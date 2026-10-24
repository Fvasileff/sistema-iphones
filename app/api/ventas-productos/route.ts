import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requerirSesion } from '@/lib/api-auth'
import { registrarMovimientoCaja } from '@/lib/caja'
import { ErrorApi, manejarErrorApi } from '@/lib/errores'
import { rangoFechasAR } from '@/lib/fechas'
import { generarCodigoOperacion } from '@/lib/operaciones'
import { ventaProductoSchema } from '@/lib/validaciones/ventas'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const sinSesion = await requerirSesion()
  if (sinSesion) return sinSesion

  try {
    const { searchParams } = new URL(request.url)
    const desde = searchParams.get('desde')
    const hasta = searchParams.get('hasta')
    const clienteId = searchParams.get('clienteId')

    const where: {
      clienteId?: string
      fechaVenta?: { gte: Date; lte: Date }
    } = {}

    if (clienteId) where.clienteId = clienteId

    if (desde && hasta) {
      const { inicio, fin } = rangoFechasAR(desde, hasta)
      where.fechaVenta = { gte: inicio, lte: fin }
    }

    const ventas = await prisma.ventaProducto.findMany({
      where,
      include: {
        cliente: true,
        items: { include: { producto: true } },
      },
      orderBy: { fechaVenta: 'desc' },
      take: 200,
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
    const data = ventaProductoSchema.parse(await request.json())

    const agrupados = new Map<string, { cantidad: number; precioUnitario?: number }>()
    for (const item of data.items) {
      const actual = agrupados.get(item.productoId)
      agrupados.set(item.productoId, {
        cantidad: (actual?.cantidad ?? 0) + item.cantidad,
        precioUnitario: item.precioUnitario ?? actual?.precioUnitario,
      })
    }

    const venta = await prisma.$transaction(async tx => {
      if (data.clienteId) {
        const cliente = await tx.cliente.findUnique({ where: { id: data.clienteId } })
        if (!cliente) throw new ErrorApi('Cliente no encontrado', 404)
      }

      const ids = [...agrupados.keys()]
      const productos = await tx.producto.findMany({ where: { id: { in: ids } } })
      const productosPorId = new Map(productos.map(producto => [producto.id, producto]))

      const items = ids.map(productoId => {
        const agrupado = agrupados.get(productoId)
        const producto = productosPorId.get(productoId)

        if (!producto) throw new ErrorApi('Producto no encontrado', 404)
        if (!producto.activo) throw new ErrorApi(`El producto ${producto.nombre} está inactivo`, 400)

        const cantidad = agrupado?.cantidad ?? 0
        if (cantidad <= 0) throw new ErrorApi('Cantidad inválida', 400)
        if (producto.stock < cantidad) {
          throw new ErrorApi(`Stock insuficiente de ${producto.nombre}`, 409)
        }

        const precioUnitario = agrupado?.precioUnitario ?? Number(producto.precioVenta)
        return {
          producto,
          cantidad,
          precioUnitario,
          subtotal: precioUnitario * cantidad,
        }
      })

      const total = items.reduce((acumulado, item) => acumulado + item.subtotal, 0)
      const codigoOperacion = await generarCodigoOperacion(tx)

      const creada = await tx.ventaProducto.create({
        data: {
          codigoOperacion,
          clienteId: data.clienteId ?? null,
          total,
          metodoPago: data.metodoPago,
          observaciones: data.observaciones,
          items: {
            create: items.map(item => ({
              productoId: item.producto.id,
              cantidad: item.cantidad,
              precioUnitario: item.precioUnitario,
              subtotal: item.subtotal,
            })),
          },
        },
        include: {
          cliente: true,
          items: { include: { producto: true } },
        },
      })

      for (const item of items) {
        await tx.producto.update({
          where: { id: item.producto.id },
          data: { stock: { decrement: item.cantidad } },
        })

        await tx.movimientoStock.create({
          data: {
            productoId: item.producto.id,
            tipo: 'venta',
            cantidad: -item.cantidad,
            motivo: `Venta ${codigoOperacion}`,
            referenciaTipo: 'venta_producto',
            referenciaId: creada.id,
          },
        })
      }

      await registrarMovimientoCaja(tx, {
        tipo: 'venta_producto',
        metodoPago: data.metodoPago,
        monto: total,
        descripcion: `Venta de productos ${codigoOperacion}`,
        codigoOperacion,
        referenciaTipo: 'venta_producto',
        referenciaId: creada.id,
      })

      return creada
    })

    return NextResponse.json(venta, { status: 201 })
  } catch (error) {
    return manejarErrorApi(error)
  }
}
