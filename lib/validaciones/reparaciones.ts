import { z } from 'zod'
import { ESTADOS_REPARACION } from '@/lib/constantes'
import {
  fechaPromesaSchema,
  textoOpcional,
  textoOpcionalUpdate,
} from '@/lib/validaciones/comunes'

export const reparacionCreateSchema = z.object({
  clienteId: z.string().uuid('Cliente inválido'),
  equipo: z.string().trim().min(1, 'El equipo es obligatorio').max(120),
  imei: textoOpcional(60),
  color: textoOpcional(40),
  almacenamiento: textoOpcional(40),
  accesoriosRecibidos: textoOpcional(300),
  estadoFisico: textoOpcional(300),
  falla: z.string().trim().min(1, 'La falla es obligatoria').max(1000),
  diagnostico: textoOpcional(1000),
  presupuesto: z.coerce.number().min(0, 'El presupuesto no puede ser negativo').default(0),
  fechaPromesa: fechaPromesaSchema,
  observaciones: textoOpcional(1000),
})

export const reparacionUpdateSchema = z.object({
  estado: z.enum(ESTADOS_REPARACION).optional(),
  diagnostico: textoOpcionalUpdate(1000),
  presupuesto: z.coerce.number().min(0, 'El presupuesto no puede ser negativo').optional(),
  montoFinal: z.coerce.number().min(0, 'El monto final no puede ser negativo').optional().nullable(),
  fechaPromesa: fechaPromesaSchema,
  observaciones: textoOpcionalUpdate(1000),
  nota: z.string().trim().max(300).optional().nullable(),
})

export const reparacionRepuestoSchema = z.object({
  productoId: z.string().uuid('Producto inválido'),
  cantidad: z.coerce.number().int().positive('La cantidad debe ser mayor a 0'),
  precioUnitario: z.coerce.number().min(0, 'El precio no puede ser negativo').optional(),
})

export const pagoReparacionSchema = z.object({
  monto: z.coerce.number().positive('El monto debe ser mayor a 0'),
  metodoPago: z.enum(['efectivo', 'transferencia']),
  concepto: textoOpcional(120),
  observaciones: textoOpcional(300),
})
