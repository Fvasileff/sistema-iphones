import { z } from 'zod'

const colorSchema = z
  .string()
  .trim()
  .min(1, 'El color es obligatorio')
  .max(60, 'El color no puede superar los 60 caracteres')

const stockSchema = z.coerce
  .number()
  .int('El stock debe ser un número entero')
  .min(0, 'El stock no puede ser negativo')

export const iphoneVarianteSchema = z.object({
  id: z.string().uuid('Variante inválida').optional(),
  color: colorSchema,
  stock: stockSchema,
})

const variantesSchema = z
  .array(iphoneVarianteSchema)
  .min(1, 'Agregá al menos un color')
  .max(50, 'No se pueden agregar más de 50 colores')
  .superRefine((variantes, ctx) => {
    const vistos = new Map<string, number>()

    variantes.forEach((variante, index) => {
      const clave = variante.color.toLowerCase()
      if (vistos.has(clave)) {
        ctx.addIssue({
          code: 'custom',
          message: 'Hay colores repetidos',
          path: [index, 'color'],
        })
      } else {
        vistos.set(clave, index)
      }
    })
  })

const varianteSchema = z
  .string()
  .trim()
  .max(60, 'La variante no puede superar los 60 caracteres')
  .optional()
  .nullable()
  .transform(valor => valor ?? '')

export const iphoneCreateSchema = z.object({
  modelo: z
    .string()
    .trim()
    .min(1, 'El modelo es obligatorio')
    .max(120, 'El modelo no puede superar los 120 caracteres'),
  variante: varianteSchema,
  almacenamiento: z
    .string()
    .trim()
    .min(1, 'El almacenamiento es obligatorio')
    .max(40, 'El almacenamiento no puede superar los 40 caracteres'),
  precioBase: z.coerce.number().min(0, 'El precio no puede ser negativo'),
  variantes: variantesSchema,
})

export const iphoneUpdateSchema = z
  .object({
    id: z.string().uuid('iPhone inválido'),
    precioBase: z.coerce.number().min(0, 'El precio no puede ser negativo').optional(),
    variantes: variantesSchema.optional(),
  })
  .refine(data => data.precioBase !== undefined || data.variantes !== undefined, {
    message: 'No hay cambios para guardar',
    path: ['precioBase'],
  })
