// app/api/clientes/route.ts
import { NextResponse, after } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { Logger } from 'next-axiom'

export const dynamic = 'force-dynamic'

// Traer la lista de clientes
export async function GET() {
  const logger = new Logger()
  try {
    const session = await auth()
    if (!session) {
      logger.warn('GET /api/clientes: sin sesión válida')
      after(() => logger.flush())
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const clientes = await prisma.cliente.findMany({ orderBy: { nombre: 'asc' } })
    logger.info('GET /api/clientes: ok', { cantidad: clientes.length })
    after(() => logger.flush())
    return NextResponse.json(clientes)
  } catch (error) {
    logger.error('GET /api/clientes: error', { error: String(error) })
    after(() => logger.flush())
    return NextResponse.json({ error: 'Error al obtener clientes' }, { status: 500 })
  }
}

// Registrar un nuevo cliente
export async function POST(request: Request) {
  const logger = new Logger()
  try {
    const session = await auth()
    if (!session) {
      logger.warn('POST /api/clientes: sin sesión válida')
      after(() => logger.flush())
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { nombre, apellido, dni, telefono, email, direccion } = body

    if (!nombre || !apellido || !dni || !telefono) {
      logger.warn('POST /api/clientes: faltan campos obligatorios', { body })
      after(() => logger.flush())
      return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 })
    }

    const existe = await prisma.cliente.findUnique({ where: { dni } })
    if (existe) {
      logger.warn('POST /api/clientes: DNI duplicado', { dni })
      after(() => logger.flush())
      return NextResponse.json({ error: 'El DNI ya está registrado' }, { status: 400 })
    }

    const nuevoCliente = await prisma.cliente.create({
      data: {
        nombre,
        apellido,
        dni,
        telefono,
        email: email ?? null,
        direccion: direccion ?? null,
      }
    })

    logger.info('POST /api/clientes: cliente creado', { id: nuevoCliente.id })
    after(() => logger.flush())
    return NextResponse.json(nuevoCliente, { status: 201 })
  } catch (error) {
    logger.error('POST /api/clientes: error', { error: String(error) })
    after(() => logger.flush())
    return NextResponse.json({ error: 'Error al guardar el cliente' }, { status: 500 })
  }
}