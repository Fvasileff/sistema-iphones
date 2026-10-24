export function aNumero(valor: unknown): number {
  const numero = typeof valor === 'number' ? valor : Number(valor)
  return Number.isFinite(numero) ? numero : 0
}

export function formatARS(valor: unknown): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(aNumero(valor))
}

export function formatARSEntero(valor: unknown): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(aNumero(valor))
}

export function formatCantidad(valor: unknown): string {
  return new Intl.NumberFormat('es-AR').format(aNumero(valor))
}
