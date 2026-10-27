export const TIPOS_OPERACION_REPORTE = [
  'venta_contado',
  'venta_financiada',
  'anticipo_financiacion',
  'pago_cuota',
  'pago_reparacion',
  'repuesto_reparacion',
  'movimiento_caja',
] as const

export type TipoOperacionReporte = (typeof TIPOS_OPERACION_REPORTE)[number]

export const ETIQUETAS_TIPO_OPERACION: Record<TipoOperacionReporte, string> = {
  venta_contado: 'Venta',
  venta_financiada: 'Venta financiada',
  anticipo_financiacion: 'Anticipo financiación',
  pago_cuota: 'Pago de cuota',
  pago_reparacion: 'Cobro de reparación',
  repuesto_reparacion: 'Repuesto',
  movimiento_caja: 'Caja',
}

export interface OperacionReporte {
  tipo: TipoOperacionReporte
  id: string
  fecha: string
  codigo: string | null
  clienteId: string | null
  clienteNombre: string | null
  clienteApellido: string | null
  clienteDni: string | null
  resumen: string
  metodoPago: string | null
  monto: number
  montoEfectivo: number
  montoTransferencia: number
  montoTarjeta: number
  anulada: boolean
  referenciaTipo: string
  referenciaId: string
}
