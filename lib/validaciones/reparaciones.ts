import { z } from 'zod'
import { ESTADOS_REPARACION, METODOS_PAGO } from '@/lib/constantes'
import {
  fechaPromesaSchema,
  textoOpcional,
  textoOpcionalUpdate,
} from '@/lib/validaciones/comunes'

export const reparacionCreateSchema = z.object({
  clienteId: z.string().uuid('Cliente inválido'),
  equipo: z.string().trim().min(1, 'El equipo es obligatorio').max(120),
  marca: textoOpcional(60),
  modelo: textoOpcional(80),
  claveEquipo: textoOpcional(120),
  imei: textoOpcional(60),
  color: textoOpcional(40),
  almacenamiento: textoOpcional(40),
  accesoriosRecibidos: textoOpcional(300),
  estadoFisico: textoOpcional(300),
  falla: z.string().trim().min(1, 'La falla es obligatoria').max(1000),
  diagnostico: textoOpcional(1000),
  presupuesto: z.coerce.number().min(0, 'El presupuesto no puede ser negativo').default(0),
  sena: z.coerce.number().min(0, 'La seña no puede ser negativa').default(0),
  metodoPago: z.enum(METODOS_PAGO).default('efectivo'),
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
  metodoPago: z.enum(METODOS_PAGO),
  concepto: textoOpcional(120),
  observaciones: textoOpcional(300),
})
