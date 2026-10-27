import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requerirSesion } from '@/lib/api-auth'
import { registrarMovimientoCaja } from '@/lib/caja'
import { ErrorApi, manejarErrorApi } from '@/lib/errores'
import { generarCodigoOperacion } from '@/lib/operaciones'
import { pagoReparacionSchema } from '@/lib/validaciones/reparaciones'

export const dynamic = 'force-dynamic'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const sinSesion = await requerirSesion()
  if (sinSesion) return sinSesion

  try {
    const { id } = await params

    const pagos = await prisma.pagoReparacion.findMany({
      where: { reparacionId: id },
      orderBy: { fecha: 'asc' },
    })

    return NextResponse.json(pagos)
  } catch (error) {
    return manejarErrorApi(error)
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const sinSesion = await requerirSesion()
  if (sinSesion) return sinSesion

  try {
    const { id } = await params
    const data = pagoReparacionSchema.parse(await request.json())

    const pago = await prisma.$transaction(async tx => {
      const reparacion = await tx.reparacion.findUnique({ where: { id } })
      if (!reparacion) throw new ErrorApi('Reparación no encontrada', 404)
      if (reparacion.anulada) throw new ErrorApi('La reparación está anulada', 409)

      const codigoOperacion = await generarCodigoOperacion(tx)

      const creado = await tx.pagoReparacion.create({
        data: {
          codigoOperacion,
          reparacionId: reparacion.id,
          monto: data.monto,
          metodoPago: data.metodoPago,
          concepto: data.concepto,
          observaciones: data.observaciones,
        },
      })

      await registrarMovimientoCaja(tx, {
        tipo: 'cobro_reparacion',
        pagos: [{ metodoPago: data.metodoPago, monto: data.monto }],
        descripcion: `Cobro reparación ${reparacion.codigoOperacion}`,
        codigoOperacion,
        referenciaTipo: 'pago_reparacion',
        referenciaId: creado.id,
      })

      return creado
    })

    return NextResponse.json(pago, { status: 201 })
  } catch (error) {
    return manejarErrorApi(error)
  }
}
