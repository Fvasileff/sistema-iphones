import { z } from 'zod'
import { METODOS_PAGO } from '@/lib/constantes'
import { textoOpcional, textoOpcionalUpdate } from '@/lib/validaciones/comunes'

const ventaContadoItemBase = {
  id: z.string().uuid('Ítem inválido'),
  cantidad: z.coerce.number().int().positive('La cantidad debe ser mayor a 0'),
  precioUnitario: z.coerce.number().min(0, 'El precio no puede ser negativo').optional(),
}

export const ventaContadoItemSchema = z.discriminatedUnion('tipo', [
  z.object({
    tipo: z.literal('producto'),
    ...ventaContadoItemBase,
  }),
  z.object({
    tipo: z.literal('iphone'),
    ...ventaContadoItemBase,
    colorId: z.string({ error: 'Seleccioná un color' }).uuid('Seleccioná un color'),
  }),
])

export const pagoDetalleSchema = z.object({
  metodoPago: z.enum(METODOS_PAGO),
  monto: z.coerce.number().min(0, 'El monto no puede ser negativo'),
})

const pagosSchema = z
  .array(pagoDetalleSchema)
  .min(1, 'Indicá al menos un medio de pago')

export const ventaContadoSchema = z.object({
  clienteId: z.string().uuid('Cliente inválido').optional().nullable(),
  pagos: pagosSchema,
  observaciones: textoOpcional(500),
  items: z.array(ventaContadoItemSchema).min(1, 'Agregá al menos un ítem').max(100),
})

export const ventaFinanciadaSchema = z.object({
  clienteId: z.string().uuid('Cliente inválido'),
  iphoneId: z.string().uuid('iPhone inválido'),
  colorId: z.string({ error: 'Seleccioná un color' }).uuid('Seleccioná un color'),
  precioVenta: z.coerce.number().positive('El precio de venta debe ser mayor a 0'),
  anticipoEfectivo: z.coerce.number().min(0, 'El anticipo no puede ser negativo').default(0),
  anticipoEquipo: z.coerce.number().min(0, 'El valor del equipo no puede ser negativo').default(0),
  metodoAnticipo: z.enum(METODOS_PAGO).default('efectivo'),
  descripcionEquipo: textoOpcional(300),
  planPago: z.enum(['SEMANAL', 'QUINCENAL', 'MENSUAL']),
  totalCuotas: z.coerce.number().int().min(1, 'La cantidad de cuotas debe ser mayor a 0'),
  montoCuota: z.coerce.number().positive('El valor de la cuota debe ser mayor a 0'),
  interesPct: z.coerce.number().min(0, 'El interés no puede ser negativo').default(0),
  fechaPrimeraCuota: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Usá el formato AAAA-MM-DD para la primera cuota'),
})

export const pagoCuotaSchema = z.object({
  metodoPago: z.enum(METODOS_PAGO).default('efectivo'),
  observaciones: textoOpcionalUpdate(300),
})
