// app/api/clientes/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

// Traer la lista de clientes
export async function GET() {
  try {
    const session = await auth()
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const clientes = await prisma.cliente.findMany({ orderBy: { nombre: 'asc' } })
    return NextResponse.json(clientes)
  } catch (error) {
    return NextResponse.json({ error: 'Error al obtener clientes' }, { status: 500 })
  }
}

// Registrar un nuevo cliente
export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const body = await request.json()
    const { nombre, apellido, dni, telefono, email, direccion } = body

    if (!nombre || !apellido || !dni || !telefono) {
      return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 })
    }

    const existe = await prisma.cliente.findUnique({ where: { dni } })
    if (existe) {
      return NextResponse.json({ error: 'El DNI ya está registrado' }, { status: 400 })
    }

    const nuevoCliente = await prisma.cliente.create({
      data: {
        nombre,
        apellido,
        dni,
        telefono,
        email: email ?? null,        // ← cambiado
        direccion: direccion ?? null,
      }
    })

    return NextResponse.json(nuevoCliente, { status: 201 })
  } catch (error) {
    console.error('Error en POST /api/clientes:', error)
    return NextResponse.json({ error: 'Error al guardar el cliente' }, { status: 500 })
  }
}