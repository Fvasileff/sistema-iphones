import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const clienteId = searchParams.get('clienteId')
  const estado = searchParams.get('estado')

  try {
    const cuotas = await prisma.cuota.findMany({
      where: {
        ...(estado && estado !== 'todos' && { estado }),
        venta: {
          ...(clienteId && { clienteId })
        }
      },
      include: {
        venta: {
          include: {
            cliente: true,
            iphone: true
          }
        }
      },
      orderBy: { fechaVencimiento: 'asc' }
    })

    // Declaramos 'hoy' aquí, antes del .map()
    const hoy = new Date()

    const cuotasConEstado = cuotas.map((c: any) => ({
      ...c,
      estado: c.estado === 'pendiente' && new Date(c.fechaVencimiento) < hoy 
        ? 'vencida' 
        : c.estado
    }))

    return NextResponse.json(cuotasConEstado)
  } catch (error) {
    return NextResponse.json({ error: 'Error al obtener cuotas' }, { status: 500 })
  }
}