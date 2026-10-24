import { NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { requerirSesion } from '@/lib/api-auth'
import { ErrorApi, manejarErrorApi } from '@/lib/errores'
import { includeReparacion, parseFechaPromesa } from '@/lib/reparaciones'
import { reparacionUpdateSchema } from '@/lib/validaciones/reparaciones'

export const dynamic = 'force-dynamic'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const sinSesion = await requerirSesion()
  if (sinSesion) return sinSesion

  try {
    const { id } = await params

    const reparacion = await prisma.reparacion.findUnique({
      where: { id },
      include: includeReparacion,
    })

    if (!reparacion) throw new ErrorApi('Reparación no encontrada', 404)

    return NextResponse.json(reparacion)
  } catch (error) {
    return manejarErrorApi(error)
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const sinSesion = await requerirSesion()
  if (sinSesion) return sinSesion

  try {
    const { id } = await params
    const data = reparacionUpdateSchema.parse(await request.json())

    const reparacion = await prisma.$transaction(async tx => {
      const actual = await tx.reparacion.findUnique({ where: { id } })
      if (!actual) throw new ErrorApi('Reparación no encontrada', 404)
      if (actual.anulada) throw new ErrorApi('La reparación está anulada', 409)

      const cambios: Prisma.ReparacionUpdateInput = {}
      let nuevoEstado: string | undefined

      if (data.estado !== undefined && data.estado !== actual.estado) {
        nuevoEstado = data.estado
        cambios.estado = data.estado

        if (data.estado === 'entregado') {
          cambios.fechaEntrega = new Date()
        } else if (actual.estado === 'entregado') {
          cambios.fechaEntrega = null
        }
      }

      if (data.diagnostico !== undefined) cambios.diagnostico = data.diagnostico
      if (data.presupuesto !== undefined) cambios.presupuesto = data.presupuesto
      if (data.montoFinal !== undefined) cambios.montoFinal = data.montoFinal
      if (data.observaciones !== undefined) cambios.observaciones = data.observaciones
      if (data.fechaPromesa !== undefined) {
        cambios.fechaPromesa = parseFechaPromesa(data.fechaPromesa)
      }

      if (Object.keys(cambios).length === 0) {
        throw new ErrorApi('No hay cambios para guardar', 400)
      }

      if (nuevoEstado) {
        cambios.historial = {
          create: {
            estadoAnterior: actual.estado,
            estadoNuevo: nuevoEstado,
            nota: data.nota ?? null,
          },
        }
      }

      return tx.reparacion.update({
        where: { id },
        data: cambios,
        include: includeReparacion,
      })
    })

    return NextResponse.json(reparacion)
  } catch (error) {
    return manejarErrorApi(error)
  }
}
