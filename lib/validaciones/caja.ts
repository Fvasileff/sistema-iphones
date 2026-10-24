import { z } from 'zod'
import { METODOS_PAGO } from '@/lib/constantes'
import { textoOpcional } from '@/lib/validaciones/comunes'

const montoNoNegativo = z.coerce.number().min(0, 'El monto no puede ser negativo')

export const aperturaCajaSchema = z.object({
  montoInicial: montoNoNegativo.default(0),
})

export const cierreCajaSchema = z.object({
  montoContadoEfectivo: montoNoNegativo,
  montoContadoTransferencia: montoNoNegativo,
  observaciones: textoOpcional(500),
})

export const movimientoCajaSchema = z.object({
  tipo: z.enum(['ingreso', 'egreso']),
  metodoPago: z.enum(METODOS_PAGO),
  monto: z.coerce.number().positive('El monto debe ser mayor a 0'),
  descripcion: textoOpcional(300),
})
