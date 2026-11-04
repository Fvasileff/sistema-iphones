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

export const equipoPermutaSchema = z.object({
  modelo: z.string().trim().min(1, 'El modelo del equipo es obligatorio').max(120),
  capacidad: z.string().trim().min(1, 'La capacidad del equipo es obligatoria').max(60),
  color: z.string().trim().min(1, 'El color del equipo es obligatorio').max(60),
  imei: z.string().trim().min(1, 'El IMEI es obligatorio').max(60),
  estado: z.string().trim().min(1, 'El estado del equipo es obligatorio').max(200),
  precioVentaEquipo: z.coerce
    .number()
    .min(0, 'El precio de venta del equipo no puede ser negativo')
    .optional(),
})

export const ventaFinanciadaSchema = z
  .object({
    clienteId: z.string().uuid('Cliente inválido'),
    iphoneId: z.string().uuid('iPhone inválido'),
    colorId: z.string({ error: 'Seleccioná un color' }).uuid('Seleccioná un color'),
    precioVenta: z.coerce.number().positive('El precio de venta debe ser mayor a 0'),
    anticipoEfectivo: z.coerce.number().min(0, 'El anticipo no puede ser negativo').default(0),
    anticipoEquipo: z.coerce.number().min(0, 'El valor del equipo no puede ser negativo').default(0),
    metodoAnticipo: z.enum(METODOS_PAGO).default('efectivo'),
    descripcionEquipo: textoOpcional(300),
    equipoPermuta: equipoPermutaSchema.optional(),
    planPago: z.enum(['SEMANAL', 'QUINCENAL', 'MENSUAL']),
    totalCuotas: z.coerce.number().int().min(1, 'La cantidad de cuotas debe ser mayor a 0'),
    montoCuota: z.coerce.number().positive('El valor de la cuota debe ser mayor a 0'),
    interesPct: z.coerce.number().min(0, 'El interés no puede ser negativo').default(0),
    fechaPrimeraCuota: z
      .string()
      .trim()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Usá el formato AAAA-MM-DD para la primera cuota'),
  })
  .superRefine((data, ctx) => {
    const anticipoTotal = data.anticipoEfectivo + data.anticipoEquipo

    if (anticipoTotal > data.precioVenta) {
      ctx.addIssue({
        code: 'custom',
        path: ['anticipoEfectivo'],
        message: 'Los anticipos no pueden superar el precio de venta',
      })
    }

    if (data.precioVenta - anticipoTotal <= 0) {
      ctx.addIssue({
        code: 'custom',
        path: ['precioVenta'],
        message: 'El saldo a financiar debe ser mayor a 0',
      })
    }

    if (data.anticipoEquipo > 0 && !data.equipoPermuta) {
      ctx.addIssue({
        code: 'custom',
        path: ['equipoPermuta'],
        message: 'Completá los datos del equipo recibido en permuta',
      })
    }
  })

export const pagoCuotaSchema = z.object({
  metodoPago: z.enum(METODOS_PAGO).default('efectivo'),
  observaciones: textoOpcionalUpdate(300),
})
