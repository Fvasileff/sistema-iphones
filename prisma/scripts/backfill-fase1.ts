import 'dotenv/config'
import { prisma } from '../../lib/prisma'

const APLICAR = process.argv.includes('--apply')

function formatearCodigo(valor: number) {
  return `OP-${String(valor).padStart(6, '0')}`
}

function numeroDeCodigo(codigo: string | null | undefined) {
  if (!codigo) return 0
  const numero = Number(codigo.replace(/^OP-/, ''))
  return Number.isFinite(numero) ? numero : 0
}

async function main() {
  const [
    ventasSinCodigo,
    cuotasSinPago,
    secuencia,
    ultimaVenta,
    ultimoPagoCuota,
    ultimaVentaProducto,
    ultimaReparacion,
    ultimoPagoReparacion,
  ] = await Promise.all([
    prisma.venta.findMany({
      where: { codigoOperacion: null },
      orderBy: { fechaVenta: 'asc' },
      select: { id: true, fechaVenta: true },
    }),
    prisma.cuota.findMany({
      where: { estado: 'pagada', pagos: { none: {} } },
      orderBy: { fechaPago: 'asc' },
      select: {
        id: true,
        fechaPago: true,
        montoOriginal: true,
        montoMora: true,
      },
    }),
    prisma.secuencia.findUnique({ where: { clave: 'operacion' } }),
    prisma.venta.findFirst({
      where: { codigoOperacion: { not: null } },
      orderBy: { codigoOperacion: 'desc' },
      select: { codigoOperacion: true },
    }),
    prisma.pagoCuota.findFirst({
      orderBy: { codigoOperacion: 'desc' },
      select: { codigoOperacion: true },
    }),
    prisma.ventaContado.findFirst({
      orderBy: { codigoOperacion: 'desc' },
      select: { codigoOperacion: true },
    }),
    prisma.reparacion.findFirst({
      orderBy: { codigoOperacion: 'desc' },
      select: { codigoOperacion: true },
    }),
    prisma.pagoReparacion.findFirst({
      orderBy: { codigoOperacion: 'desc' },
      select: { codigoOperacion: true },
    }),
  ])

  const maxExistente = Math.max(
    numeroDeCodigo(ultimaVenta?.codigoOperacion),
    numeroDeCodigo(ultimoPagoCuota?.codigoOperacion),
    numeroDeCodigo(ultimaVentaProducto?.codigoOperacion),
    numeroDeCodigo(ultimaReparacion?.codigoOperacion),
    numeroDeCodigo(ultimoPagoReparacion?.codigoOperacion),
    secuencia?.valor ?? 0,
  )

  const total = ventasSinCodigo.length + cuotasSinPago.length

  console.log(`Modo: ${APLICAR ? 'APPLY (escribe)' : 'DRY-RUN (no escribe nada)'}`)
  console.log(`Secuencia actual: ${secuencia?.valor ?? 0}`)
  console.log(`Último código existente: ${maxExistente > 0 ? formatearCodigo(maxExistente) : 'ninguno'}`)
  console.log(`Ventas sin código: ${ventasSinCodigo.length}`)
  console.log(`Cuotas pagadas sin PagoCuota: ${cuotasSinPago.length}`)
  console.log(`Operaciones a generar: ${total}`)

  if (total === 0) {
    console.log('No hay nada para backfillear. El script es idempotente: no crea duplicados.')
    return
  }

  let preview = maxExistente
  const ejemplos = [
    ...ventasSinCodigo.slice(0, 5).map(v => ({
      tipo: 'VENTA',
      fecha: v.fechaVenta,
      codigo: formatearCodigo(++preview),
    })),
    ...cuotasSinPago.slice(0, 5).map(c => ({
      tipo: 'PAGO_CUOTA',
      fecha: c.fechaPago,
      codigo: formatearCodigo(++preview),
    })),
  ]

  console.log('Ejemplos:')
  for (const ejemplo of ejemplos) {
    console.log(`  ${ejemplo.codigo}  ${ejemplo.tipo}  ${ejemplo.fecha?.toISOString() ?? 'sin fecha'}`)
  }

  if (!APLICAR) {
    console.log('Dry-run: no se escribió nada. Para aplicar: npm run backfill:fase1 -- --apply')
    return
  }

  await prisma.$transaction(
    async tx => {
      const siguienteCodigo = async () => {
        const seq = await tx.secuencia.upsert({
          where: { clave: 'operacion' },
          create: { clave: 'operacion', valor: 1 },
          update: { valor: { increment: 1 } },
        })
        return formatearCodigo(seq.valor)
      }

      for (const venta of ventasSinCodigo) {
        const codigo = await siguienteCodigo()
        await tx.venta.update({
          where: { id: venta.id },
          data: { codigoOperacion: codigo },
        })
      }

      for (const cuota of cuotasSinPago) {
        const codigo = await siguienteCodigo()
        await tx.pagoCuota.create({
          data: {
            codigoOperacion: codigo,
            cuotaId: cuota.id,
            monto: cuota.montoOriginal,
            montoMora: cuota.montoMora,
            metodoPago: 'efectivo',
            fecha: cuota.fechaPago ?? new Date(),
            observaciones: 'Backfill Fase 1',
          },
        })
      }
    },
    { timeout: 120_000 },
  )

  console.log('Backfill aplicado correctamente.')
}

main()
  .catch(error => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
