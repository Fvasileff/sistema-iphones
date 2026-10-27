import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requerirSesion } from '@/lib/api-auth'
import { buscarMovimientoPorReferencia, revertirMovimientoCaja } from '@/lib/caja'
import { ErrorApi, manejarErrorApi } from '@/lib/errores'
import { anulacionSchema } from '@/lib/validaciones/comunes'
import {
  TIPOS_OPERACION_REPORTE,
  type TipoOperacionReporte,
} from '@/lib/reportes'

export const dynamic = 'force-dynamic'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ tipo: string; id: string }> },
) {
  const sinSesion = await requerirSesion()
  if (sinSesion) return sinSesion

  try {
    const { tipo, id } = await params

    if (!TIPOS_OPERACION_REPORTE.includes(tipo as TipoOperacionReporte)) {
      throw new ErrorApi('Tipo de operación inválido', 400)
    }

    const { motivo } = anulacionSchema.parse(await request.json())

    if (tipo === 'venta_contado') {
      const venta = await prisma.$transaction(async tx => {
        const actual = await tx.ventaContado.findUnique({
          where: { id },
          include: { items: true },
        })

        if (!actual) throw new ErrorApi('Venta no encontrada', 404)
        if (actual.anulada) throw new ErrorApi('La venta ya está anulada', 409)

        const anulada = await tx.ventaContado.update({
          where: { id },
          data: {
            anulada: true,
            motivoAnulacion: motivo,
            fechaAnulacion: new Date(),
          },
          include: {
            cliente: true,
            items: { include: { producto: true, iphone: true } },
          },
        })

        for (const item of actual.items) {
          if (item.productoId) {
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
                referenciaTipo: 'venta_contado',
                referenciaId: actual.id,
              },
            })
          }

          if (item.iphoneId) {
            await tx.iPhone.update({
              where: { id: item.iphoneId },
              data: { stock: { increment: item.cantidad } },
            })
          }
        }

        const movimientoCaja =
          (await buscarMovimientoPorReferencia(tx, 'venta_contado', actual.id)) ??
          (await buscarMovimientoPorReferencia(tx, 'venta_producto', actual.id))
        if (movimientoCaja) {
          await revertirMovimientoCaja(tx, movimientoCaja.id, motivo)
        }

        return anulada
      })

      return NextResponse.json(venta)
    }

    if (tipo === 'venta_financiada' || tipo === 'anticipo_financiacion') {
      const venta = await prisma.$transaction(async tx => {
        const actual = await tx.venta.findUnique({
          where: { id },
          include: {
            iphone: true,
            cuotas: {
              include: {
                pagos: { where: { anulada: false }, select: { id: true } },
              },
            },
          },
        })

        if (!actual) throw new ErrorApi('Venta financiada no encontrada', 404)
        if (actual.anulada) throw new ErrorApi('La venta ya está anulada', 409)

        const pagosActivos = actual.cuotas.reduce(
          (total, cuota) => total + cuota.pagos.length,
          0,
        )
        if (pagosActivos > 0) {
          throw new ErrorApi(
            'Anulá primero los pagos de cuotas registrados de esta financiación',
            409,
          )
        }

        const anulada = await tx.venta.update({
          where: { id },
          data: {
            anulada: true,
            motivoAnulacion: motivo,
            fechaAnulacion: new Date(),
          },
          include: {
            cliente: true,
            iphone: true,
            cuotas: { orderBy: { numeroCuota: 'asc' } },
          },
        })

        await tx.iPhone.update({
          where: { id: actual.iphoneId },
          data: { stock: { increment: 1 } },
        })

        if (Number(actual.anticipoEfectivo) > 0) {
          const movimientoCaja = await buscarMovimientoPorReferencia(tx, 'venta', actual.id)
          if (movimientoCaja) {
            await revertirMovimientoCaja(tx, movimientoCaja.id, motivo)
          }
        }

        return anulada
      })

      return NextResponse.json(venta)
    }

    if (tipo === 'pago_cuota') {
      const pago = await prisma.$transaction(async tx => {
        const actual = await tx.pagoCuota.findUnique({
          where: { id },
          include: { cuota: true },
        })

        if (!actual) throw new ErrorApi('Pago de cuota no encontrado', 404)
        if (actual.anulada) throw new ErrorApi('El pago ya está anulado', 409)

        const anulado = await tx.pagoCuota.update({
          where: { id },
          data: {
            anulada: true,
            motivoAnulacion: motivo,
            fechaAnulacion: new Date(),
          },
        })

        const ahora = new Date()
        const estado =
          Number(actual.cuota.montoMora) > 0
            ? 'mora'
            : actual.cuota.fechaVencimiento < ahora
              ? 'vencida'
              : 'pendiente'

        await tx.cuota.update({
          where: { id: actual.cuotaId },
          data: { estado, fechaPago: null },
        })

        const movimientoCaja = await buscarMovimientoPorReferencia(tx, 'pago_cuota', actual.id)
        if (movimientoCaja) {
          await revertirMovimientoCaja(tx, movimientoCaja.id, motivo)
        }

        return anulado
      })

      return NextResponse.json(pago)
    }

    if (tipo === 'pago_reparacion') {
      const pago = await prisma.$transaction(async tx => {
        const actual = await tx.pagoReparacion.findUnique({ where: { id } })
        if (!actual) throw new ErrorApi('Pago de reparación no encontrado', 404)
        if (actual.anulada) throw new ErrorApi('El pago ya está anulado', 409)

        const anulado = await tx.pagoReparacion.update({
          where: { id },
          data: {
            anulada: true,
            motivoAnulacion: motivo,
            fechaAnulacion: new Date(),
          },
        })

        const movimientoCaja = await buscarMovimientoPorReferencia(
          tx,
          'pago_reparacion',
          actual.id,
        )
        if (movimientoCaja) {
          await revertirMovimientoCaja(tx, movimientoCaja.id, motivo)
        }

        return anulado
      })

      return NextResponse.json(pago)
    }

    if (tipo === 'repuesto_reparacion') {
      const repuesto = await prisma.$transaction(async tx => {
        const actual = await tx.reparacionProducto.findUnique({
          where: { id },
          include: { reparacion: true },
        })

        if (!actual) throw new ErrorApi('Repuesto de reparación no encontrado', 404)
        if (actual.anulada) throw new ErrorApi('El repuesto ya está anulado', 409)
        if (actual.reparacion.anulada) throw new ErrorApi('La reparación está anulada', 409)

        const anulado = await tx.reparacionProducto.update({
          where: { id },
          data: {
            anulada: true,
            motivoAnulacion: motivo,
            fechaAnulacion: new Date(),
          },
          include: { producto: true },
        })

        await tx.producto.update({
          where: { id: actual.productoId },
          data: { stock: { increment: actual.cantidad } },
        })

        await tx.movimientoStock.create({
          data: {
            productoId: actual.productoId,
            tipo: 'anulacion',
            cantidad: actual.cantidad,
            motivo: `Anulación repuesto en ${actual.reparacion.codigoOperacion}: ${motivo}`,
            referenciaTipo: 'reparacion',
            referenciaId: actual.reparacionId,
          },
        })

        return anulado
      })

      return NextResponse.json(repuesto)
    }

    const movimiento = await prisma.$transaction(async tx => {
      const actual = await tx.movimientoCaja.findUnique({ where: { id } })
      if (!actual) throw new ErrorApi('Movimiento de caja no encontrado', 404)
      if (actual.anulada) throw new ErrorApi('El movimiento ya está anulado', 409)
      if (!['ingreso', 'egreso', 'ajuste'].includes(actual.tipo)) {
        throw new ErrorApi('Este movimiento no es una operación manual anulable', 400)
      }

      const revertido = await revertirMovimientoCaja(tx, id, motivo)

      if (revertido && revertido.id === id) {
        return revertido
      }

      return tx.movimientoCaja.update({
        where: { id },
        data: {
          anulada: true,
          motivoAnulacion: motivo,
          fechaAnulacion: new Date(),
        },
      })
    })

    return NextResponse.json(movimiento)
  } catch (error) {
    return manejarErrorApi(error)
  }
}
