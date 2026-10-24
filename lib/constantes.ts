export const METODOS_PAGO = ['efectivo', 'transferencia', 'tarjeta'] as const
export type MetodoPago = (typeof METODOS_PAGO)[number]

export const ETIQUETAS_METODO_PAGO: Record<MetodoPago, string> = {
  efectivo: 'Efectivo',
  transferencia: 'Transferencia',
  tarjeta: 'Tarjeta',
}

export const CATEGORIAS_PRODUCTO = ['repuesto', 'accesorio'] as const
export type CategoriaProducto = (typeof CATEGORIAS_PRODUCTO)[number]

export const ESTADOS_REPARACION = [
  'recibido',
  'en_diagnostico',
  'esperando_repuesto',
  'listo_para_retirar',
  'entregado',
] as const
export type EstadoReparacion = (typeof ESTADOS_REPARACION)[number]

export const ETIQUETAS_ESTADO_REPARACION: Record<EstadoReparacion, string> = {
  recibido: 'Recibido',
  en_diagnostico: 'En Diagnóstico',
  esperando_repuesto: 'Esperando Repuesto',
  listo_para_retirar: 'Listo para Retirar',
  entregado: 'Entregado',
}

export const TIPOS_MOVIMIENTO_STOCK = [
  'ingreso',
  'egreso',
  'ajuste',
  'venta',
  'reparacion',
  'anulacion',
] as const
export type TipoMovimientoStock = (typeof TIPOS_MOVIMIENTO_STOCK)[number]

export const TIPOS_MOVIMIENTO_CAJA = [
  'venta_financiada',
  'cobro_cuota',
  'venta_producto',
  'venta_iphone',
  'cobro_reparacion',
  'ingreso',
  'egreso',
  'anulacion',
] as const
export type TipoMovimientoCaja = (typeof TIPOS_MOVIMIENTO_CAJA)[number]
