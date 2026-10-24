import { NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { requerirSesion } from '@/lib/api-auth'
import { registrarMovimientoCaja } from '@/lib/caja'
import { ESTADOS_REPARACION } from '@/lib/constantes'
import { ErrorApi, manejarErrorApi } from '@/lib/errores'
import { rangoFechasAR } from '@/lib/fechas'
import { generarCodigoOperacion } from '@/lib/operaciones'
import { includeReparacion, parseFechaPromesa } from '@/lib/reparaciones'
import { reparacionCreateSchema } from '@/lib/validaciones/reparaciones'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const sinSesion = await requerirSesion()
  if (sinSesion) return sinSesion

  try {
    const { searchParams } = new URL(request.url)
    const estado = searchParams.get('estado')
    const clienteId = searchParams.get('clienteId')
    const busqueda = searchParams.get('busqueda')?.trim()
    const desde = searchParams.get('desde')
    const hasta = searchParams.get('hasta')

    const where: Prisma.ReparacionWhereInput = {}

    if (estado && ESTADOS_REPARACION.includes(estado as (typeof ESTADOS_REPARACION)[number])) {
      where.estado = estado
    }

    if (clienteId) where.clienteId = clienteId

    if (desde && hasta) {
      const { inicio, fin } = rangoFechasAR(desde, hasta)
      where.fechaIngreso = { gte: inicio, lte: fin }
    }

    if (busqueda) {
      where.OR = [
        { codigoOperacion: { contains: busqueda, mode: 'insensitive' } },
        { equipo: { contains: busqueda, mode: 'insensitive' } },
        { imei: { contains: busqueda, mode: 'insensitive' } },
        {
          cliente: {
            is: {
              OR: [
                { nombre: { contains: busqueda, mode: 'insensitive' } },
                { apellido: { contains: busqueda, mode: 'insensitive' } },
                { dni: { contains: busqueda, mode: 'insensitive' } },
              ],
            },
          },
        },
      ]
    }

    const reparaciones = await prisma.reparacion.findMany({
      where,
      include: includeReparacion,
      orderBy: { fechaIngreso: 'desc' },
      take: 300,
    })

    return NextResponse.json(reparaciones)
  } catch (error) {
    return manejarErrorApi(error)
  }
}

export async function POST(request: Request) {
  const sinSesion = await requerirSesion()
  if (sinSesion) return sinSesion

  try {
    const data = reparacionCreateSchema.parse(await request.json())
    const fechaPromesa = parseFechaPromesa(data.fechaPromesa)

    const reparacion = await prisma.$transaction(async tx => {
      const cliente = await tx.cliente.findUnique({ where: { id: data.clienteId } })
      if (!cliente) throw new ErrorApi('Cliente no encontrado', 404)

      const codigoOperacion = await generarCodigoOperacion(tx)

      const creada = await tx.reparacion.create({
        data: {
          codigoOperacion,
          clienteId: data.clienteId,
          equipo: data.equipo,
          marca: data.marca,
          modelo: data.modelo,
          claveEquipo: data.claveEquipo,
          imei: data.imei,
          color: data.color,
          almacenamiento: data.almacenamiento,
          accesoriosRecibidos: data.accesoriosRecibidos,
          estadoFisico: data.estadoFisico,
          falla: data.falla,
          diagnostico: data.diagnostico,
          presupuesto: data.presupuesto,
          fechaPromesa,
          observaciones: data.observaciones,
          historial: {
            create: {
              estadoNuevo: 'recibido',
              nota: 'Ingreso a taller',
            },
          },
        },
        include: includeReparacion,
      })

      if (data.sena > 0) {
        const codigoPago = await generarCodigoOperacion(tx)
        const pago = await tx.pagoReparacion.create({
          data: {
            codigoOperacion: codigoPago,
            reparacionId: creada.id,
            monto: data.sena,
            metodoPago: data.metodoPago,
            concepto: 'Seña',
          },
        })

        await registrarMovimientoCaja(tx, {
          tipo: 'cobro_reparacion',
          metodoPago: data.metodoPago,
          monto: data.sena,
          descripcion: `Seña reparación ${codigoOperacion}`,
          codigoOperacion: codigoPago,
          referenciaTipo: 'pago_reparacion',
          referenciaId: pago.id,
        })

        return tx.reparacion.findUniqueOrThrow({
          where: { id: creada.id },
          include: includeReparacion,
        })
      }

      return creada
    })

    return NextResponse.json(reparacion, { status: 201 })
  } catch (error) {
    return manejarErrorApi(error)
  }
}
