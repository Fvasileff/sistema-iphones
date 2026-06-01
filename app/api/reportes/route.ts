import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const tipo = searchParams.get('tipo') || 'mensual'
  const mes = parseInt(searchParams.get('mes') || String(new Date().getMonth() + 1))
  const anio = parseInt(searchParams.get('anio') || String(new Date().getFullYear()))

  let inicio: Date, fin: Date

  if (tipo === 'semanal') {
    fin = new Date()
    inicio = new Date()
    inicio.setDate(inicio.getDate() - 7)
  } else if (tipo === 'anual') {
    inicio = new Date(anio, 0, 1)
    fin = new Date(anio, 11, 31, 23, 59, 59)
  } else {
    inicio = new Date(anio, mes - 1, 1)
    fin = new Date(anio, mes, 0, 23, 59, 59)
  }

  try {
    const cuotasPagadas = await prisma.cuota.findMany({
      where: {
        estado: 'pagada',
        fechaPago: { gte: inicio, lte: fin }
      },
      include: { venta: { include: { cliente: true, iphone: true } } }
    })

    const cuotasVencidas = await prisma.cuota.findMany({
      where: {
        estado: { in: ['pendiente', 'vencida'] },
        fechaVencimiento: { lt: new Date() }
      },
      include: { venta: { include: { cliente: true, iphone: true } } }
    })

    const en7dias = new Date()
    en7dias.setDate(en7dias.getDate() + 7)
    const cuotasProximas = await prisma.cuota.findMany({
      where: {
        estado: 'pendiente',
        fechaVencimiento: { gte: new Date(), lte: en7dias }
      },
      include: { venta: { include: { cliente: true, iphone: true } } },
      orderBy: { fechaVencimiento: 'asc' }
    })

    const ventasDelMes = await prisma.venta.findMany({
      where: { fechaVenta: { gte: inicio, lte: fin } },
      include: { cliente: true, iphone: true, cuotas: true }
    })

    const totalCobradoMes = cuotasPagadas.reduce((acc: number, c: { montoOriginal: unknown, montoMora: unknown }) => 
      acc + Number(c.montoOriginal) + Number(c.montoMora), 0)

    const totalDeudaVencida = cuotasVencidas.reduce((acc: number, c: { montoOriginal: unknown, montoMora: unknown }) => 
      acc + Number(c.montoOriginal) + Number(c.montoMora), 0)

    return NextResponse.json({
      totalCobradoMes,
      totalDeudaVencida,
      cuotasPagadas,
      cuotasVencidas,
      cuotasProximas,
      ventasDelMes,
      cantVentasMes: ventasDelMes.length
    })
  } catch (error) {
    return NextResponse.json({ error: 'Error al generar reporte' }, { status: 500 })
  }
}