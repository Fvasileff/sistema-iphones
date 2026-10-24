import { z } from 'zod'

export const textoOpcional = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .nullable()
    .transform(valor => (valor && valor.length > 0 ? valor : null))

export const textoOpcionalUpdate = (max: number) =>
  z.string().trim().max(max).optional().nullable()

export const anulacionSchema = z.object({
  motivo: z
    .string()
    .trim()
    .min(3, 'Indicá un motivo de al menos 3 caracteres')
    .max(300, 'El motivo no puede superar los 300 caracteres'),
})

export const fechaPromesaSchema = z
  .string()
  .trim()
  .refine(
    valor => /^\d{4}-\d{2}-\d{2}$/.test(valor) || /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(valor),
    'Fecha inválida. Usá AAAA-MM-DD o AAAA-MM-DDTHH:mm',
  )
  .optional()
  .nullable()
