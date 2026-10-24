import { z } from 'zod'
import { CATEGORIAS_PRODUCTO } from '@/lib/constantes'
import { textoOpcional, textoOpcionalUpdate } from '@/lib/validaciones/comunes'

const skuSchema = z
  .string()
  .trim()
  .max(60, 'El SKU no puede superar los 60 caracteres')
  .optional()
  .nullable()
  .transform(valor => (valor && valor.length > 0 ? valor : null))

export const productoCreateSchema = z.object({
  nombre: z.string().trim().min(1, 'El nombre es obligatorio').max(120),
  descripcion: textoOpcional(500),
  categoria: z.enum(CATEGORIAS_PRODUCTO),
  sku: skuSchema,
  precioCompra: z.coerce.number().min(0, 'El precio de compra no puede ser negativo').default(0),
  precioVenta: z.coerce.number().min(0, 'El precio de venta no puede ser negativo'),
  stock: z.coerce.number().int().min(0, 'El stock no puede ser negativo').default(0),
  stockMinimo: z.coerce.number().int().min(0, 'El stock mínimo no puede ser negativo').default(0),
  activo: z.boolean().default(true),
})

export const productoUpdateSchema = z.object({
  nombre: z.string().trim().min(1, 'El nombre es obligatorio').max(120).optional(),
  descripcion: textoOpcionalUpdate(500),
  categoria: z.enum(CATEGORIAS_PRODUCTO).optional(),
  sku: z.string().trim().max(60).optional().nullable(),
  precioCompra: z.coerce.number().min(0).optional(),
  precioVenta: z.coerce.number().min(0).optional(),
  stockMinimo: z.coerce.number().int().min(0).optional(),
  activo: z.boolean().optional(),
})

export const movimientoStockSchema = z
  .object({
    tipo: z.enum(['ingreso', 'egreso', 'ajuste']),
    cantidad: z.coerce.number().int().min(0, 'La cantidad no puede ser negativa'),
    motivo: textoOpcional(300),
  })
  .refine(data => data.tipo === 'ajuste' || data.cantidad > 0, {
    message: 'La cantidad debe ser mayor a 0',
    path: ['cantidad'],
  })
