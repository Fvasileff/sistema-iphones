import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requerirSesion } from '@/lib/api-auth'
import { ErrorApi, manejarErrorApi } from '@/lib/errores'

export const dynamic = 'force-dynamic'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const sinSesion = await requerirSesion()
  if (sinSesion) return sinSesion

  try {
    const { id } = await params

    const cliente = await prisma.cliente.findUnique({
      where: { id },
      include: {
        ventas: {
          include: {
            iphone: true,
            cuotas: {
              include: {
                pagos: { where: { anulada: false }, orderBy: { fecha: 'asc' } },
              },
              orderBy: { numeroCuota: 'asc' },
            },
          },
          orderBy: { fechaVenta: 'desc' },
        },
        ventasContado: {
          include: {
            items: { include: { producto: true, iphone: true } },
          },
          orderBy: { fechaVenta: 'desc' },
        },
        reparaciones: {
          include: {
            historial: { orderBy: { fecha: 'asc' } },
            pagos: { where: { anulada: false }, orderBy: { fecha: 'asc' } },
            repuestos: {
              where: { anulada: false },
              include: { producto: true },
              orderBy: { createdAt: 'asc' },
            },
          },
          orderBy: { fechaIngreso: 'desc' },
        },
      },
    })

    if (!cliente) throw new ErrorApi('Cliente no encontrado', 404)

    return NextResponse.json(cliente)
  } catch (error) {
    return manejarErrorApi(error)
  }
}
