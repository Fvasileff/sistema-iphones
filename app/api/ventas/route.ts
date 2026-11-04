import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { registrarMovimientoCaja } from '@/lib/caja'
import { ErrorApi, manejarErrorApi } from '@/lib/errores'
import { parseFechaAR, sumarDiasAR } from '@/lib/fechas'
import { generarCodigoOperacion } from '@/lib/operaciones'
import { aCentavos } from '@/lib/pagos'
import { ventaFinanciadaSchema } from '@/lib/validaciones/ventas'
import { whatsappNuevaFinanciacion } from '@/lib/whatsapp'

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

    const saldoAFinanciar = data.precioVenta - data.anticipoEfectivo - data.anticipoEquipo
    const totalConInteres = saldoAFinanciar * (1 + data.interesPct / 100)
    const montoCuotaCanonico =
      Math.round((totalConInteres / data.totalCuotas) * 100) / 100

    if (Math.abs(aCentavos(data.montoCuota) - aCentavos(montoCuotaCanonico)) > 1) {
      throw new ErrorApi(
        `El valor de la cuota no coincide con el plan calculado (esperado ${montoCuotaCanonico.toFixed(2)})`,
        400,
      )
    }

    const resultado = await prisma.$transaction(async tx => {
      const [cliente, iphone] = await Promise.all([
        tx.cliente.findUnique({ where: { id: data.clienteId } }),
        tx.iPhone.findUnique({
          where: { id: data.iphoneId },
          include: { variantes: true },
        }),
      ])

      if (!cliente) throw new ErrorApi('Cliente no encontrado', 404)
      if (!iphone) throw new ErrorApi('iPhone no encontrado', 404)

      const variante = iphone.variantes.find(color => color.id === data.colorId)
      if (!variante) throw new ErrorApi('El color seleccionado no pertenece al iPhone', 400)

      const descuento = await tx.iphoneVariant.updateMany({
        where: { id: variante.id, iphoneId: iphone.id, iphone: { activo: true }, stock: { gt: 0 } },
        data: { stock: { decrement: 1 } },
      })
      if (descuento.count === 0) throw new ErrorApi('El color seleccionado no tiene stock disponible', 409)

      const codigoOperacion = await generarCodigoOperacion(tx)

      const nuevaVenta = await tx.venta.create({
        data: {
          clienteId: cliente.id,
          iphoneId: iphone.id,
          colorId: variante.id,
          usuarioId: usuario.id,
          precioVenta: data.precioVenta,
          anticipoEfectivo: data.anticipoEfectivo,
          metodoAnticipo: data.metodoAnticipo,
          anticipoEquipo: data.anticipoEquipo,
          descripcionEquipo: data.descripcionEquipo,
          planPago: data.planPago,
          totalCuotas: data.totalCuotas,
          montoCuota: montoCuotaCanonico,
          interesPct: data.interesPct,
          codigoOperacion,
        },
      })

      await tx.cuota.createMany({
        data: Array.from({ length: data.totalCuotas }, (_, indice) => ({
          ventaId: nuevaVenta.id,
          numeroCuota: indice + 1,
          montoOriginal: montoCuotaCanonico,
          fechaVencimiento: sumarDiasAR(fechaPrimeraCuota, indice * dias),
          estado: 'pendiente',
        })),
      })

      if (data.anticipoEquipo > 0 && data.equipoPermuta) {
        const equipo = data.equipoPermuta
        const precioVentaEquipo = equipo.precioVentaEquipo ?? data.anticipoEquipo

        const datosPermuta = {
          nombre: `${equipo.modelo} ${equipo.capacidad} ${equipo.color} (usado/permuta)`,
          descripcion: `Equipo recibido en permuta. Estado: ${equipo.estado}. IMEI: ${equipo.imei}. Venta origen: ${codigoOperacion}`,
          categoria: 'accesorio',
          condicion: 'permuta',
          sku: equipo.imei,
          precioCompra: data.anticipoEquipo,
          precioVenta: precioVentaEquipo,
          stock: 1,
          stockMinimo: 0,
          activo: true,
          modelo: equipo.modelo,
          capacidad: equipo.capacidad,
          color: equipo.color,
          imei: equipo.imei,
          estadoEquipo: equipo.estado,
          ventaOrigenId: nuevaVenta.id,
        }

        const existente = await tx.producto.findFirst({
          where: { OR: [{ imei: equipo.imei }, { sku: equipo.imei }] },
          select: { id: true },
        })

        const productoPermuta = existente
          ? await tx.producto.update({ where: { id: existente.id }, data: datosPermuta })
          : await tx.producto.create({ data: datosPermuta })

        await tx.movimientoStock.create({
          data: {
            productoId: productoPermuta.id,
            tipo: 'ingreso',
            cantidad: 1,
            motivo: `${existente ? 'Reactivación' : 'Alta'} de permuta ${codigoOperacion}`,
            referenciaTipo: 'venta_financiada',
            referenciaId: nuevaVenta.id,
          },
        })
      }

      if (data.anticipoEfectivo > 0) {
        await registrarMovimientoCaja(tx, {
          tipo: 'venta_financiada',
          pagos: [{ metodoPago: data.metodoAnticipo, monto: data.anticipoEfectivo }],
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
        prisma.iPhone.findUnique({
          where: { id: data.iphoneId },
          include: { variantes: true },
        }),
      ])

      if (cliente && iphone) {
        const color = iphone.variantes.find(variante => variante.id === data.colorId)
        await whatsappNuevaFinanciacion(
          cliente.telefono,
          `${cliente.nombre} ${cliente.apellido}`,
          `${iphone.modelo} ${iphone.almacenamiento}${color ? ` ${color.color}` : ''}`,
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
