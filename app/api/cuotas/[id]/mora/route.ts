import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { porcentaje } = await req.json()
    if (!porcentaje || isNaN(Number(porcentaje))) {
      return NextResponse.json({ error: 'Porcentaje de mora inválido' }, { status: 400 })
    }

    const cuotaActual = await prisma.cuota.findUnique({ where: { id } })
    if (!cuotaActual) {
      return NextResponse.json({ error: 'Cuota no encontrada' }, { status: 404 })
    }

    const montoMora = Number(cuotaActual.montoOriginal) * (Number(porcentaje) / 100)

    const cuota = await prisma.cuota.update({
      where: { id },
      data: { montoMora, estado: 'mora' }
    })
    return NextResponse.json(cuota)
  } catch (error) {
    return NextResponse.json({ error: 'Error al aplicar mora' }, { status: 500 })
  }
}