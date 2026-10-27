import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requerirSesion } from '@/lib/api-auth'
import { manejarErrorApi } from '@/lib/errores'
import { mesAnioAR, rangoMesAR, sumarDiasAR } from '@/lib/fechas'

export const dynamic = 'force-dynamic'

export async function GET() {
  const sinSesion = await requerirSesion()
  if (sinSesion) return sinSesion

  try {
    const { anio, mes } = mesAnioAR()
    const { inicio, fin } = rangoMesAR(anio, mes)
    const ahora = new Date()
    const en7dias = sumarDiasAR(ahora, 7)

    const [
      ventasFinanciadas,
      ventasContado,
      clientesFinanciados,
      clientesContado,
      cuotasPagadas,
      pagosReparacion,
      cuotasVencidas,
      cuotasProximas,
    ] = await Promise.all([
      prisma.venta.aggregate({
        where: { fechaVenta: { gte: inicio, lte: fin }, anulada: false },
        _sum: { precioVenta: true, anticipoEfectivo: true },
        _count: { _all: true },
      }),
      prisma.ventaContado.aggregate({
        where: { fechaVenta: { gte: inicio, lte: fin }, anulada: false },
        _sum: { total: true },
        _count: { _all: true },
      }),
      prisma.venta.groupBy({
        by: ['clienteId'],
        where: { fechaVenta: { gte: inicio, lte: fin }, anulada: false },
      }),
      prisma.ventaContado.groupBy({
        by: ['clienteId'],
        where: {
          fechaVenta: { gte: inicio, lte: fin },
          anulada: false,
          clienteId: { not: null },
        },
      }),
      prisma.cuota.aggregate({
        where: {
          estado: 'pagada',
          fechaPago: { gte: inicio, lte: fin },
          venta: { anulada: false },
        },
        _sum: { montoOriginal: true, montoMora: true },
      }),
      prisma.pagoReparacion.aggregate({
        where: {
          fecha: { gte: inicio, lte: fin },
          anulada: false,
          reparacion: { anulada: false },
        },
        _sum: { monto: true },
      }),
      prisma.cuota.findMany({
        where: {
          estado: { in: ['pendiente', 'vencida', 'mora'] },
          fechaVencimiento: { lt: ahora },
          venta: { anulada: false },
        },
        select: {
          id: true,
          fechaVencimiento: true,
          montoOriginal: true,
          montoMora: true,
          venta: {
            select: {
              cliente: { select: { nombre: true, apellido: true, telefono: true } },
            },
          },
        },
        orderBy: { fechaVencimiento: 'asc' },
      }),
      prisma.cuota.findMany({
        where: {
          estado: { in: ['pendiente', 'mora'] },
          fechaVencimiento: { gte: ahora, lte: en7dias },
          venta: { anulada: false },
        },
        select: {
          id: true,
          fechaVencimiento: true,
          montoOriginal: true,
          venta: {
            select: {
              cliente: { select: { nombre: true, apellido: true } },
            },
          },
        },
        orderBy: { fechaVencimiento: 'asc' },
      }),
    ])

    const clientesActivos = new Set<string>()
    for (const cliente of clientesFinanciados) {
      clientesActivos.add(cliente.clienteId)
    }
    for (const cliente of clientesContado) {
      if (cliente.clienteId) clientesActivos.add(cliente.clienteId)
    }

    const totalVentasFinanciadasMes = Number(ventasFinanciadas._sum.precioVenta ?? 0)
    const totalVentasContadoMes = Number(ventasContado._sum.total ?? 0)
    const totalAnticiposMes = Number(ventasFinanciadas._sum.anticipoEfectivo ?? 0)
    const totalCuotasPagadasMes =
      Number(cuotasPagadas._sum.montoOriginal ?? 0) +
      Number(cuotasPagadas._sum.montoMora ?? 0)
    const totalReparacionesMes = Number(pagosReparacion._sum.monto ?? 0)

    return NextResponse.json({
      totalVentasMes: totalVentasContadoMes + totalVentasFinanciadasMes,
      totalVentasContadoMes,
      totalVentasFinanciadasMes,
      cantVentasMes: ventasContado._count._all + ventasFinanciadas._count._all,
      cantVentasContadoMes: ventasContado._count._all,
      cantVentasFinanciadasMes: ventasFinanciadas._count._all,
      clientesActivosMes: clientesActivos.size,
      totalCobradoMes:
        totalVentasContadoMes +
        totalAnticiposMes +
        totalCuotasPagadasMes +
        totalReparacionesMes,
      totalAnticiposMes,
      totalCuotasPagadasMes,
      totalReparacionesMes,
      cuotasVencidas,
      cuotasProximas,
    })
  } catch (error) {
    return manejarErrorApi(error)
  }
}
