// app/api/iphones/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

// 1. GET: Traer todos los iPhones del catálogo
export async function GET() {
  try {
    // Quitamos el 'where: { activo: true }' porque esa columna ya no existe
    const iphones = await prisma.iPhone.findMany({
      orderBy: { modelo: 'asc' }
    })
    
    return NextResponse.json(iphones)
  } catch (error) {
    console.error('Error en GET /api/iphones:', error)
    return NextResponse.json({ error: 'Error al obtener el catálogo' }, { status: 500 })
  }
}

// 2. POST: Guardar un nuevo iPhone
export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const body = await request.json()
    // Asegurate que los campos coincidan con los que envías desde el formulario
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
        stock: parseInt(stock || 1) // Guardamos el stock como número
      }
    })

    return NextResponse.json(nuevoIphone, { status: 201 })
  } catch (error) {
    console.error('Error en POST /api/iphones:', error)
    return NextResponse.json({ error: 'Error al guardar el iPhone' }, { status: 500 })
  }
}