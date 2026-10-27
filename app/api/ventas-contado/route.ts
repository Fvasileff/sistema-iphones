import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requerirSesion } from '@/lib/api-auth'
import { registrarMovimientoCaja } from '@/lib/caja'
import { ErrorApi, manejarErrorApi } from '@/lib/errores'
import { rangoFechasAR } from '@/lib/fechas'
import { generarCodigoOperacion } from '@/lib/operaciones'
import { validarPagos } from '@/lib/pagos'
import { ventaContadoSchema } from '@/lib/validaciones/ventas'

export const dynamic = 'force-dynamic'

interface ItemAgrupado {
  tipo: 'producto' | 'iphone'
  id: string
  cantidad: number
  precioUnitario?: number
}

export async function GET(request: Request) {
  const sinSesion = await requerirSesion()
  if (sinSesion) return sinSesion

  try {
    const { searchParams } = new URL(request.url)
    const desde = searchParams.get('desde')
    const hasta = searchParams.get('hasta')
    const clienteId = searchParams.get('clienteId')
    const limite = Number(searchParams.get('limit') ?? 100)
    const take = Number.isFinite(limite) ? Math.min(Math.max(Math.floor(limite), 1), 200) : 100

    const where: {
      clienteId?: string
      fechaVenta?: { gte: Date; lte: Date }
    } = {}

    if (clienteId) where.clienteId = clienteId

    if (desde && hasta) {
      const { inicio, fin } = rangoFechasAR(desde, hasta)
      where.fechaVenta = { gte: inicio, lte: fin }
    }

    const ventas = await prisma.ventaContado.findMany({
      where,
      include: {
        cliente: true,
        items: { include: { producto: true, iphone: true } },
      },
      orderBy: { fechaVenta: 'desc' },
      take,
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
    const data = ventaContadoSchema.parse(await request.json())

    const agrupados = new Map<string, ItemAgrupado>()
    for (const item of data.items) {
      const clave = `${item.tipo}:${item.id}`
      const actual = agrupados.get(clave)
      agrupados.set(clave, {
        tipo: item.tipo,
        id: item.id,
        cantidad: (actual?.cantidad ?? 0) + item.cantidad,
        precioUnitario: item.precioUnitario ?? actual?.precioUnitario,
      })
    }

    const itemsAgrupados = [...agrupados.values()]
    const productoIds = itemsAgrupados.filter(item => item.tipo === 'producto').map(item => item.id)
    const iphoneIds = itemsAgrupados.filter(item => item.tipo === 'iphone').map(item => item.id)

    const venta = await prisma.$transaction(async tx => {
      if (data.clienteId) {
        const cliente = await tx.cliente.findUnique({ where: { id: data.clienteId } })
        if (!cliente) throw new ErrorApi('Cliente no encontrado', 404)
      }

      const [productos, iphones] = await Promise.all([
        productoIds.length > 0
          ? tx.producto.findMany({ where: { id: { in: productoIds } } })
          : Promise.resolve([]),
        iphoneIds.length > 0
          ? tx.iPhone.findMany({ where: { id: { in: iphoneIds } } })
          : Promise.resolve([]),
      ])

      const productosPorId = new Map(productos.map(producto => [producto.id, producto]))
      const iphonesPorId = new Map(iphones.map(iphone => [iphone.id, iphone]))

      const items = itemsAgrupados.map(item => {
        const cantidad = item.cantidad

        if (item.tipo === 'producto') {
          const producto = productosPorId.get(item.id)
          if (!producto) throw new ErrorApi('Producto no encontrado', 404)
          if (!producto.activo) {
            throw new ErrorApi(`El producto ${producto.nombre} está inactivo`, 400)
          }
          if (producto.stock < cantidad) {
            throw new ErrorApi(`Stock insuficiente de ${producto.nombre}`, 409)
          }

          const precioUnitario = item.precioUnitario ?? Number(producto.precioVenta)
          return {
            tipo: item.tipo,
            productoId: producto.id,
            iphoneId: null,
            nombre: producto.nombre,
            cantidad,
            precioUnitario,
            subtotal: precioUnitario * cantidad,
          } as const
        }

        const iphone = iphonesPorId.get(item.id)
        if (!iphone) throw new ErrorApi('iPhone no encontrado', 404)
        if (!iphone.activo) throw new ErrorApi('El iPhone está inactivo', 400)
        if (iphone.stock < cantidad) {
          throw new ErrorApi(
            `Stock insuficiente de ${iphone.modelo} ${iphone.almacenamiento}`,
            409,
          )
        }

        const precioUnitario = item.precioUnitario ?? Number(iphone.precioBase)
        return {
          tipo: item.tipo,
          productoId: null,
          iphoneId: iphone.id,
          nombre: `${iphone.modelo} ${iphone.almacenamiento}`,
          cantidad,
          precioUnitario,
          subtotal: precioUnitario * cantidad,
        } as const
      })

      const total = items.reduce((acumulado, item) => acumulado + item.subtotal, 0)
      if (total <= 0) throw new ErrorApi('El total de la venta debe ser mayor a 0', 400)

      const pago = validarPagos(data.pagos, total)

      for (const item of items) {
        if (item.tipo === 'producto' && item.productoId) {
          const descuento = await tx.producto.updateMany({
            where: {
              id: item.productoId,
              activo: true,
              stock: { gte: item.cantidad },
            },
            data: { stock: { decrement: item.cantidad } },
          })
          if (descuento.count === 0) {
            throw new ErrorApi(`Stock insuficiente de ${item.nombre}`, 409)
          }
        }

        if (item.tipo === 'iphone' && item.iphoneId) {
          const descuento = await tx.iPhone.updateMany({
            where: {
              id: item.iphoneId,
              activo: true,
              stock: { gte: item.cantidad },
            },
            data: { stock: { decrement: item.cantidad } },
          })
          if (descuento.count === 0) {
            throw new ErrorApi(`Stock insuficiente de ${item.nombre}`, 409)
          }
        }
      }

      const codigoOperacion = await generarCodigoOperacion(tx)

      const creada = await tx.ventaContado.create({
        data: {
          codigoOperacion,
          clienteId: data.clienteId ?? null,
          total,
          metodoPago: pago.metodoPago,
          montoEfectivo: pago.montoEfectivo,
          montoTransferencia: pago.montoTransferencia,
          montoTarjeta: pago.montoTarjeta,
          observaciones: data.observaciones,
          items: {
            create: items.map(item => ({
              productoId: item.productoId,
              iphoneId: item.iphoneId,
              cantidad: item.cantidad,
              precioUnitario: item.precioUnitario,
              subtotal: item.subtotal,
            })),
          },
        },
        include: {
          cliente: true,
          items: { include: { producto: true, iphone: true } },
        },
      })

      for (const item of items) {
        if (!item.productoId) continue

        await tx.movimientoStock.create({
          data: {
            productoId: item.productoId,
            tipo: 'venta',
            cantidad: -item.cantidad,
            motivo: `Venta ${codigoOperacion}`,
            referenciaTipo: 'venta_contado',
            referenciaId: creada.id,
          },
        })
      }

      await registrarMovimientoCaja(tx, {
        tipo: 'venta',
        pagos: pago.pagos,
        descripcion: `Venta ${codigoOperacion}`,
        codigoOperacion,
        referenciaTipo: 'venta_contado',
        referenciaId: creada.id,
      })

      return creada
    })

    return NextResponse.json(venta, { status: 201 })
  } catch (error) {
    return manejarErrorApi(error)
  }
}
