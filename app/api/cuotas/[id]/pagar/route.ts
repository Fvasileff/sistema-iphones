import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requerirSesion } from '@/lib/api-auth'
import { registrarMovimientoCaja } from '@/lib/caja'
import { ErrorApi, manejarErrorApi } from '@/lib/errores'
import { generarCodigoOperacion } from '@/lib/operaciones'
import { pagoCuotaSchema } from '@/lib/validaciones/ventas'

export const dynamic = 'force-dynamic'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const sinSesion = await requerirSesion()
  if (sinSesion) return sinSesion

  try {
    const { id } = await params
    const body = await request.json().catch(() => ({}))
    const data = pagoCuotaSchema.parse(body)

    const pago = await prisma.$transaction(async tx => {
      const cuota = await tx.cuota.findUnique({
        where: { id },
        include: {
          venta: true,
          pagos: { where: { anulada: false } },
        },
      })

      if (!cuota) throw new ErrorApi('Cuota no encontrada', 404)
      if (cuota.venta.anulada) throw new ErrorApi('La venta está anulada', 409)
      if (cuota.estado === 'pagada' || cuota.pagos.length > 0) {
        throw new ErrorApi('La cuota ya está pagada', 409)
      }

      const monto = Number(cuota.montoOriginal)
      const montoMora = Number(cuota.montoMora)
      const total = monto + montoMora
      const codigoOperacion = await generarCodigoOperacion(tx)

      const creado = await tx.pagoCuota.create({
        data: {
          codigoOperacion,
          cuotaId: cuota.id,
          monto,
          montoMora,
          metodoPago: data.metodoPago,
          observaciones: data.observaciones,
        },
      })

      await tx.cuota.update({
        where: { id: cuota.id },
        data: {
          estado: 'pagada',
          fechaPago: new Date(),
        },
      })

      if (total > 0) {
        await registrarMovimientoCaja(tx, {
          tipo: 'cobro_cuota',
          pagos: [{ metodoPago: data.metodoPago, monto: total }],
          descripcion: `Cobro cuota ${cuota.numeroCuota}/${cuota.venta.totalCuotas}`,
          codigoOperacion,
          referenciaTipo: 'pago_cuota',
          referenciaId: creado.id,
        })
      }

      return creado
    })

    return NextResponse.json(pago, { status: 201 })
  } catch (error) {
    return manejarErrorApi(error)
  }
}
