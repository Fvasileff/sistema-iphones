import type { Prisma } from '@prisma/client'
import { parseFechaOPromesaAR } from '@/lib/fechas'
import { ErrorApi } from '@/lib/errores'

export const includeReparacion = {
  cliente: true,
  historial: { orderBy: { fecha: 'asc' } },
  pagos: { where: { anulada: false }, orderBy: { fecha: 'asc' } },
  repuestos: {
    where: { anulada: false },
    include: { producto: true },
    orderBy: { createdAt: 'asc' },
  },
} satisfies Prisma.ReparacionInclude

export function parseFechaPromesa(valor: string | null | undefined) {
  if (!valor) return null
  try {
    return parseFechaOPromesaAR(valor)
  } catch (error) {
    throw new ErrorApi(error instanceof Error ? error.message : 'Fecha inválida', 400)
  }
}
