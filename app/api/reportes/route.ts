import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requerirSesion } from '@/lib/api-auth'
import { ErrorApi, manejarErrorApi } from '@/lib/errores'
import { mesAnioAR, rangoAnioAR, rangoMesAR, sumarDiasAR } from '@/lib/fechas'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const sinSesion = await requerirSesion()
  if (sinSesion) return sinSesion

  try {
    const { searchParams } = new URL(req.url)
    const tipo = searchParams.get('tipo') || 'mensual'
    const { anio: anioActual, mes: mesActual } = mesAnioAR()

    const mes = Number(searchParams.get('mes') ?? mesActual)
    const anio = Number(searchParams.get('anio') ?? anioActual)

    if (!Number.isInteger(mes) || mes < 1 || mes > 12) {
      throw new ErrorApi('Mes inválido', 400)
    }
    if (!Number.isInteger(anio) || anio < 2000 || anio > 2100) {
      throw new ErrorApi('Año inválido', 400)
    }

    let rango: { inicio: Date; fin: Date }

    if (tipo === 'semanal') {
      const fin = new Date()
      rango = { inicio: sumarDiasAR(fin, -7), fin }
    } else if (tipo === 'anual') {
      rango = rangoAnioAR(anio)
    } else {
      rango = rangoMesAR(anio, mes)
    }

    const { inicio, fin } = rango
    const ahora = new Date()
    const en7dias = sumarDiasAR(ahora, 7)

    const [
      cuotasPagadas,
      cuotasVencidas,
      cuotasProximas,
      ventasDelMes,
      ventasContado,
      pagosReparacion,
    ] = await Promise.all([
      prisma.cuota.findMany({
        where: {
          estado: 'pagada',
          fechaPago: { gte: inicio, lte: fin },
          venta: { anulada: false },
        },
        include: { venta: { include: { cliente: true, iphone: true, iphoneVariant: true } } },
      }),
      prisma.cuota.findMany({
        where: {
          estado: { in: ['pendiente', 'vencida', 'mora'] },
          fechaVencimiento: { lt: ahora },
          venta: { anulada: false },
        },
        include: { venta: { include: { cliente: true, iphone: true, iphoneVariant: true } } },
      }),
      prisma.cuota.findMany({
        where: {
          estado: { in: ['pendiente', 'mora'] },
          fechaVencimiento: { gte: ahora, lte: en7dias },
          venta: { anulada: false },
        },
        include: { venta: { include: { cliente: true, iphone: true, iphoneVariant: true } } },
        orderBy: { fechaVencimiento: 'asc' },
      }),
      prisma.venta.findMany({
        where: {
          fechaVenta: { gte: inicio, lte: fin },
          anulada: false,
        },
        include: { cliente: true, iphone: true, iphoneVariant: true, cuotas: true },
      }),
      prisma.ventaContado.aggregate({
        where: {
          fechaVenta: { gte: inicio, lte: fin },
          anulada: false,
        },
        _sum: { total: true },
        _count: { _all: true },
      }),
      prisma.pagoReparacion.aggregate({
        where: {
          fecha: { gte: inicio, lte: fin },
          anulada: false,
          reparacion: { anulada: false },
        },
        _sum: { monto: true },
      }),
    ])

    const totalVentasContadoMes = Number(ventasContado._sum.total ?? 0)
    const totalVentasFinanciadasMes = ventasDelMes.reduce(
      (acc, venta) => acc + Number(venta.precioVenta),
      0,
    )
    const totalAnticiposMes = ventasDelMes.reduce(
      (acc, venta) => acc + Number(venta.anticipoEfectivo),
      0,
    )
    const totalCuotasPagadasMes = cuotasPagadas.reduce(
      (acc, cuota) => acc + Number(cuota.montoOriginal) + Number(cuota.montoMora),
      0,
    )
    const totalReparacionesMes = Number(pagosReparacion._sum.monto ?? 0)

    const totalDeudaVencida = cuotasVencidas.reduce(
      (acc, cuota) => acc + Number(cuota.montoOriginal) + Number(cuota.montoMora),
      0,
    )

    const totalVentasMes = totalVentasContadoMes + totalVentasFinanciadasMes
    const totalCobradoMes =
      totalVentasContadoMes +
      totalAnticiposMes +
      totalCuotasPagadasMes +
      totalReparacionesMes

    return NextResponse.json({
      totalCobradoMes,
      totalDeudaVencida,
      totalVentasMes,
      totalVentasContadoMes,
      totalVentasFinanciadasMes,
      totalAnticiposMes,
      totalCuotasPagadasMes,
      totalReparacionesMes,
      cuotasPagadas,
      cuotasVencidas,
      cuotasProximas,
      ventasDelMes,
      cantVentasMes: ventasContado._count._all + ventasDelMes.length,
      cantVentasContadoMes: ventasContado._count._all,
      cantVentasFinanciadasMes: ventasDelMes.length,
    })
  } catch (error) {
    return manejarErrorApi(error)
  }
}
