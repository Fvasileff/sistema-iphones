import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

export async function GET() {
  try {
    const iphones = await prisma.iPhone.findMany({
      orderBy: { modelo: 'asc' }
    })
    return NextResponse.json(iphones)
  } catch (error) {
    console.error('Error en GET /api/iphones:', error)
    return NextResponse.json({ error: 'Error al obtener el catálogo' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const body = await request.json()
    const { modelo, color, almacenamiento, precioBase, stock } = body

    if (!modelo || !color || !almacenamiento || !precioBase) {
      return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 })
    }

    const nuevoIphone = await prisma.iPhone.create({
      data: {
        modelo,
        color,
        almacenamiento,
        precioBase: parseFloat(precioBase),
        stock: parseInt(stock || 1)
      }
    })

    return NextResponse.json(nuevoIphone, { status: 201 })
  } catch (error) {
    console.error('Error en POST /api/iphones:', error)
    return NextResponse.json({ error: 'Error al guardar el iPhone' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await auth()
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const body = await request.json()
    const { id, precioBase, stock } = body

    if (!id) return NextResponse.json({ error: 'Falta el id' }, { status: 400 })

    const data: { precioBase?: number; stock?: number } = {}
    if (precioBase !== undefined) data.precioBase = parseFloat(precioBase)
    if (stock !== undefined) data.stock = parseInt(stock)

    const actualizado = await prisma.iPhone.update({
      where: { id },
      data
    })

    return NextResponse.json(actualizado)
  } catch (error) {
    console.error('Error en PATCH /api/iphones:', error)
    return NextResponse.json({ error: 'Error al actualizar' }, { status: 500 })
  }
}