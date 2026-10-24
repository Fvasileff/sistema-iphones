import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { registrarMovimientoCaja } from '@/lib/caja'
import { ErrorApi, manejarErrorApi } from '@/lib/errores'
import { parseFechaAR, sumarDiasAR } from '@/lib/fechas'
import { generarCodigoOperacion } from '@/lib/operaciones'
import { ventaFinanciadaSchema } from '@/lib/validaciones/ventas'
import { whatsappNuevaFinanciacion } from '@/utils/whatsapp'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const session = await auth()

    if (!session || !session.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const usuario = await prisma.usuario.findUnique({
      where: { email: session.user.email },
    })

    if (!usuario) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    const data = ventaFinanciadaSchema.parse(await request.json())

    let fechaPrimeraCuota: Date
    try {
      fechaPrimeraCuota = parseFechaAR(data.fechaPrimeraCuota)
    } catch (error) {
      throw new ErrorApi(error instanceof Error ? error.message : 'Fecha inválida', 400)
    }

    const dias = data.planPago === 'SEMANAL' ? 7 : data.planPago === 'QUINCENAL' ? 15 : 30

    const resultado = await prisma.$transaction(async tx => {
      const [cliente, iphone] = await Promise.all([
        tx.cliente.findUnique({ where: { id: data.clienteId } }),
        tx.iPhone.findUnique({ where: { id: data.iphoneId } }),
      ])

      if (!cliente) throw new ErrorApi('Cliente no encontrado', 404)
      if (!iphone) throw new ErrorApi('iPhone no encontrado', 404)
      if (iphone.stock <= 0) throw new ErrorApi('El iPhone no tiene stock disponible', 409)

      const codigoOperacion = await generarCodigoOperacion(tx)

      const nuevaVenta = await tx.venta.create({
        data: {
          clienteId: cliente.id,
          iphoneId: iphone.id,
          usuarioId: usuario.id,
          precioVenta: data.precioVenta,
          anticipoEfectivo: data.anticipoEfectivo,
          anticipoEquipo: data.anticipoEquipo,
          descripcionEquipo: data.descripcionEquipo,
          planPago: data.planPago,
          totalCuotas: data.totalCuotas,
          montoCuota: data.montoCuota,
          interesPct: data.interesPct,
          codigoOperacion,
        },
      })

      await tx.cuota.createMany({
        data: Array.from({ length: data.totalCuotas }, (_, indice) => ({
          ventaId: nuevaVenta.id,
          numeroCuota: indice + 1,
          montoOriginal: data.montoCuota,
          fechaVencimiento: sumarDiasAR(fechaPrimeraCuota, indice * dias),
          estado: 'pendiente',
        })),
      })

      await tx.iPhone.update({
        where: { id: iphone.id },
        data: { stock: { decrement: 1 } },
      })

      if (data.anticipoEfectivo > 0) {
        await registrarMovimientoCaja(tx, {
          tipo: 'venta_financiada',
          metodoPago: 'efectivo',
          monto: data.anticipoEfectivo,
          descripcion: `Anticipo financiación ${codigoOperacion}`,
          codigoOperacion,
          referenciaTipo: 'venta',
          referenciaId: nuevaVenta.id,
        })
      }

      return nuevaVenta
    })

    try {
      const [cliente, iphone] = await Promise.all([
        prisma.cliente.findUnique({ where: { id: data.clienteId } }),
        prisma.iPhone.findUnique({ where: { id: data.iphoneId } }),
      ])

      if (cliente && iphone) {
        await whatsappNuevaFinanciacion(
          cliente.telefono,
          `${cliente.nombre} ${cliente.apellido}`,
          `${iphone.modelo} ${iphone.almacenamiento}`,
          data.totalCuotas,
          data.montoCuota,
        )
      }
    } catch (error) {
      console.error('Error enviando WhatsApp de bienvenida:', error)
    }

    return NextResponse.json(resultado, { status: 201 })
  } catch (error) {
    return manejarErrorApi(error)
  }
}
