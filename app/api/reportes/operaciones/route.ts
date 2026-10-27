import { NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { requerirSesion } from '@/lib/api-auth'
import { ErrorApi, manejarErrorApi } from '@/lib/errores'
import { mesAnioAR, rangoFechasAR, rangoMesAR } from '@/lib/fechas'
import { METODOS_PAGO_CAJA } from '@/lib/constantes'
import {
  TIPOS_OPERACION_REPORTE,
  type OperacionReporte,
  type TipoOperacionReporte,
} from '@/lib/reportes'

export const dynamic = 'force-dynamic'

interface OperacionRow {
  tipo: TipoOperacionReporte
  id: string
  fecha: Date
  codigo: string | null
  clienteId: string | null
  clienteNombre: string | null
  clienteApellido: string | null
  clienteDni: string | null
  resumen: string
  metodoPago: string | null
  monto: string | number
  montoEfectivo: string | number
  montoTransferencia: string | number
  montoTarjeta: string | number
  anulada: boolean
  referenciaTipo: string
  referenciaId: string
}

function parsearLista(valor: string | null) {
  if (!valor) return []
  return valor
    .split(',')
    .map(item => item.trim())
    .filter(Boolean)
}

export async function GET(request: Request) {
  const sinSesion = await requerirSesion()
  if (sinSesion) return sinSesion

  try {
    const { searchParams } = new URL(request.url)
    const desde = searchParams.get('desde')
    const hasta = searchParams.get('hasta')
    const tipos = parsearLista(searchParams.get('tipo'))
    const metodos = parsearLista(searchParams.get('metodo'))
    const busqueda = (searchParams.get('busqueda') ?? '').trim().slice(0, 100)
    const paginaSolicitada = Number(searchParams.get('page') ?? 1)
    const limiteSolicitado = Number(searchParams.get('limit') ?? 50)

    if ((desde && !hasta) || (!desde && hasta)) {
      throw new ErrorApi('Indicá desde y hasta juntos', 400)
    }

    for (const tipo of tipos) {
      if (!TIPOS_OPERACION_REPORTE.includes(tipo as TipoOperacionReporte)) {
        throw new ErrorApi(`Tipo de operación inválido: ${tipo}`, 400)
      }
    }

    for (const metodo of metodos) {
      if (!METODOS_PAGO_CAJA.includes(metodo as (typeof METODOS_PAGO_CAJA)[number])) {
        throw new ErrorApi(`Método de pago inválido: ${metodo}`, 400)
      }
    }

    let rango: { inicio: Date; fin: Date }
    if (desde && hasta) {
      try {
        rango = rangoFechasAR(desde, hasta)
      } catch {
        throw new ErrorApi('Rango de fechas inválido', 400)
      }
    } else {
      const { anio, mes } = mesAnioAR()
      rango = rangoMesAR(anio, mes)
    }

    const pagina =
      Number.isFinite(paginaSolicitada) && paginaSolicitada > 0
        ? Math.floor(paginaSolicitada)
        : 1
    const limite =
      Number.isFinite(limiteSolicitado) && limiteSolicitado > 0
        ? Math.min(Math.floor(limiteSolicitado), 100)
        : 50
    const offset = (pagina - 1) * limite

    const filtros: Prisma.Sql[] = [
      Prisma.sql`"fecha" >= ${rango.inicio}`,
      Prisma.sql`"fecha" <= ${rango.fin}`,
    ]

    if (tipos.length > 0) {
      filtros.push(Prisma.sql`"tipo" IN (${Prisma.join(tipos)})`)
    }

    if (metodos.length > 0) {
      filtros.push(Prisma.sql`"metodoPago" IN (${Prisma.join(metodos)})`)
    }

    if (busqueda) {
      const patron = `%${busqueda}%`
      filtros.push(
        Prisma.sql`(
          "codigo" ILIKE ${patron}
          OR "clienteNombre" ILIKE ${patron}
          OR "clienteApellido" ILIKE ${patron}
          OR "clienteDni" ILIKE ${patron}
          OR "resumen" ILIKE ${patron}
        )`,
      )
    }

    const where = Prisma.join(filtros, ' AND ')

    const [filas, conteo, resumenFilas] = await Promise.all([
      prisma.$queryRaw<OperacionRow[]>(Prisma.sql`
        SELECT
          "tipo", "id", "fecha", "codigo",
          "clienteId", "clienteNombre", "clienteApellido", "clienteDni",
          "resumen", "metodoPago", "monto", "montoEfectivo", "montoTransferencia", "montoTarjeta",
          "anulada", "referenciaTipo", "referenciaId"
        FROM "reporte_operaciones"
        WHERE ${where}
        ORDER BY "fecha" DESC, "tipo" ASC, "id" ASC
        LIMIT ${limite} OFFSET ${offset}
      `),
      prisma.$queryRaw<{ total: bigint }[]>(Prisma.sql`
        SELECT COUNT(*)::bigint AS total
        FROM "reporte_operaciones"
        WHERE ${where}
      `),
      prisma.$queryRaw<
        {
          total: bigint
          cobrado: string | number
          anuladas: bigint
          ventasContado: bigint
          ventasFinanciadas: bigint
          montoVentas: string | number
        }[]
      >(Prisma.sql`
        SELECT
          COUNT(*)::bigint AS total,
          COALESCE(SUM(CASE WHEN NOT "anulada" THEN "montoEfectivo" + "montoTransferencia" + "montoTarjeta" ELSE 0 END), 0) AS cobrado,
          COUNT(*) FILTER (WHERE "anulada")::bigint AS anuladas,
          COUNT(*) FILTER (WHERE "tipo" = 'venta_contado' AND NOT "anulada")::bigint AS "ventasContado",
          COUNT(*) FILTER (WHERE "tipo" = 'venta_financiada' AND NOT "anulada")::bigint AS "ventasFinanciadas",
          COALESCE(SUM(CASE WHEN "tipo" IN ('venta_contado', 'venta_financiada') AND NOT "anulada" THEN "monto" ELSE 0 END), 0) AS "montoVentas"
        FROM "reporte_operaciones"
        WHERE ${where}
      `),
    ])

    const total = Number(conteo[0]?.total ?? 0)
    const resumenFila = resumenFilas[0]

    const operaciones: OperacionReporte[] = filas.map(fila => ({
      tipo: fila.tipo,
      id: fila.id,
      fecha: new Date(fila.fecha).toISOString(),
      codigo: fila.codigo,
      clienteId: fila.clienteId,
      clienteNombre: fila.clienteNombre,
      clienteApellido: fila.clienteApellido,
      clienteDni: fila.clienteDni,
      resumen: fila.resumen,
      metodoPago: fila.metodoPago,
      monto: Number(fila.monto),
      montoEfectivo: Number(fila.montoEfectivo),
      montoTransferencia: Number(fila.montoTransferencia),
      montoTarjeta: Number(fila.montoTarjeta),
      anulada: fila.anulada,
      referenciaTipo: fila.referenciaTipo,
      referenciaId: fila.referenciaId,
    }))

    return NextResponse.json({
      operaciones,
      total,
      pagina,
      limite,
      totalPaginas: Math.max(1, Math.ceil(total / limite)),
      resumen: {
        total,
        cobrado: Number(resumenFila?.cobrado ?? 0),
        anuladas: Number(resumenFila?.anuladas ?? 0),
        ventasContado: Number(resumenFila?.ventasContado ?? 0),
        ventasFinanciadas: Number(resumenFila?.ventasFinanciadas ?? 0),
        montoVentas: Number(resumenFila?.montoVentas ?? 0),
      },
    })
  } catch (error) {
    return manejarErrorApi(error)
  }
}
