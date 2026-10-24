import type { Prisma } from '@prisma/client'

export function formatearCodigoOperacion(valor: number) {
  return `OP-${String(valor).padStart(6, '0')}`
}

export async function generarCodigoOperacion(tx: Prisma.TransactionClient) {
  const secuencia = await tx.secuencia.upsert({
    where: { clave: 'operacion' },
    create: { clave: 'operacion', valor: 1 },
    update: { valor: { increment: 1 } },
  })

  return formatearCodigoOperacion(secuencia.valor)
}
