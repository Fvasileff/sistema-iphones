import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requerirSesion } from '@/lib/api-auth'
import { ErrorApi, manejarErrorApi } from '@/lib/errores'
import {
  TIPOS_OPERACION_REPORTE,
  type TipoOperacionReporte,
} from '@/lib/reportes'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ tipo: string; id: string }> },
) {
  const sinSesion = await requerirSesion()
  if (sinSesion) return sinSesion

  try {
    const { tipo, id } = await params

    if (!TIPOS_OPERACION_REPORTE.includes(tipo as TipoOperacionReporte)) {
      throw new ErrorApi('Tipo de operación inválido', 400)
    }

    if (tipo === 'venta_contado') {
      const detalle = await prisma.ventaContado.findUnique({
        where: { id },
        include: {
          cliente: true,
          items: { include: { producto: true, iphone: true, iphoneVariant: true } },
        },
      })
      if (!detalle) throw new ErrorApi('Venta no encontrada', 404)
      return NextResponse.json({ tipo, detalle })
    }

    if (tipo === 'venta_financiada' || tipo === 'anticipo_financiacion') {
      const detalle = await prisma.venta.findUnique({
        where: { id },
        include: {
          cliente: true,
          iphone: true,
          cuotas: {
            include: {
              pagos: { where: { anulada: false }, orderBy: { fecha: 'asc' } },
            },
            orderBy: { numeroCuota: 'asc' },
          },
        },
      })
      if (!detalle) throw new ErrorApi('Venta financiada no encontrada', 404)
      return NextResponse.json({ tipo, detalle })
    }

    if (tipo === 'pago_cuota') {
      const detalle = await prisma.pagoCuota.findUnique({
        where: { id },
        include: {
          cuota: {
            include: {
              pagos: { orderBy: { fecha: 'asc' } },
              venta: {
                include: {
                  cliente: true,
                  iphone: true,
                  iphoneVariant: true,
                },
              },
            },
          },
        },
      })
      if (!detalle) throw new ErrorApi('Pago de cuota no encontrado', 404)
      return NextResponse.json({ tipo, detalle })
    }

    if (tipo === 'pago_reparacion') {
      const detalle = await prisma.pagoReparacion.findUnique({
        where: { id },
        include: {
          reparacion: {
            include: {
              cliente: true,
              repuestos: {
                include: { producto: true },
                orderBy: { createdAt: 'asc' },
              },
              pagos: {
                where: { anulada: false },
                orderBy: { fecha: 'asc' },
              },
            },
          },
        },
      })
      if (!detalle) throw new ErrorApi('Pago de reparación no encontrado', 404)
      return NextResponse.json({ tipo, detalle })
    }

    if (tipo === 'repuesto_reparacion') {
      const detalle = await prisma.reparacionProducto.findUnique({
        where: { id },
        include: {
          producto: true,
          reparacion: {
            include: {
              cliente: true,
              repuestos: {
                include: { producto: true },
                orderBy: { createdAt: 'asc' },
              },
              pagos: {
                where: { anulada: false },
                orderBy: { fecha: 'asc' },
              },
            },
          },
        },
      })
      if (!detalle) throw new ErrorApi('Repuesto de reparación no encontrado', 404)
      return NextResponse.json({ tipo, detalle })
    }

    const detalle = await prisma.movimientoCaja.findUnique({
      where: { id },
      include: {
        caja: { select: { id: true, fechaDia: true, estado: true } },
      },
    })
    if (!detalle) throw new ErrorApi('Movimiento de caja no encontrado', 404)

    return NextResponse.json({ tipo, detalle })
  } catch (error) {
    return manejarErrorApi(error)
  }
}
