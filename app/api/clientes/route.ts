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
    // 1. Agregamos "apellido" acá adentro para recibirlo desde el formulario
    const { nombre, apellido, dni, telefono, email, direccion } = body

    // 2. Lo sumamos a la validación de campos obligatorios
    if (!nombre || !apellido || !dni || !telefono) {
      return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 })
    }

    // Verificar si el DNI ya existe para no duplicar
    const existe = await prisma.cliente.findUnique({ where: { dni } })
    if (existe) {
      return NextResponse.json({ error: 'El DNI ya está registrado' }, { status: 400 })
    }

    // 3. Se lo pasamos a Prisma en el data
    const nuevoCliente = await prisma.cliente.create({
      data: { 
        nombre, 
        apellido, // ¡Ahora sí! Con esto se va el error en rojo
        dni, 
        telefono, 
        email: email || null, 
        direccion: direccion || null 
      }
    })

    return NextResponse.json(nuevoCliente, { status: 201 })
  } catch (error) {
    console.error('Error en POST /api/clientes:', error)
    return NextResponse.json({ error: 'Error al guardar el cliente' }, { status: 500 })
  }
}