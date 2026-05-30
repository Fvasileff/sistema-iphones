import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const cuota = await prisma.cuota.update({
      where: { id },
      data: {
        estado: 'pagada',
        fechaPago: new Date()
      }
    })
    return NextResponse.json(cuota)
  } catch (error) {
    return NextResponse.json({ error: 'Error al registrar pago' }, { status: 500 })
  }
}