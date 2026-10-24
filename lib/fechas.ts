export const ZONA_HORARIA_AR = 'America/Argentina/Tucuman'

const OFFSET_AR_MS = 3 * 60 * 60 * 1000
const MS_POR_DIA = 24 * 60 * 60 * 1000

function pad2(valor: number) {
  return String(valor).padStart(2, '0')
}

function partesEnAR(fecha: Date) {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: ZONA_HORARIA_AR,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(fecha)

  const obtener = (tipo: Intl.DateTimeFormatPartTypes) =>
    Number(partes.find(parte => parte.type === tipo)?.value ?? 0)

  return {
    anio: obtener('year'),
    mes: obtener('month'),
    dia: obtener('day'),
    hora: obtener('hour'),
    minuto: obtener('minute'),
    segundo: obtener('second'),
  }
}

function validarFecha(anio: number, mes: number, dia: number) {
  const fecha = new Date(Date.UTC(anio, mes - 1, dia, 12, 0, 0, 0))
  if (
    fecha.getUTCFullYear() !== anio ||
    fecha.getUTCMonth() !== mes - 1 ||
    fecha.getUTCDate() !== dia
  ) {
    throw new Error('La fecha indicada no existe')
  }
  return fecha
}

function aFecha(fecha: Date | string): Date {
  if (fecha instanceof Date) return fecha
  if (/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return parseFechaAR(fecha)
  return new Date(fecha)
}

export function hoyAR() {
  const { anio, mes, dia } = partesEnAR(new Date())
  return `${anio}-${pad2(mes)}-${pad2(dia)}`
}

export function fechaDiaAR(fecha = new Date()) {
  const { anio, mes, dia } = partesEnAR(fecha)
  return new Date(Date.UTC(anio, mes - 1, dia, 15, 0, 0, 0))
}

export function parseFechaAR(valor: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(valor)
  if (!match) throw new Error('Fecha inválida. Usá el formato AAAA-MM-DD')

  const anio = Number(match[1])
  const mes = Number(match[2])
  const dia = Number(match[3])

  const fecha = validarFecha(anio, mes, dia)
  return new Date(fecha.getTime() + OFFSET_AR_MS)
}

export function parseFechaHoraAR(valor: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(valor)
  if (!match) throw new Error('Fecha y hora inválidas. Usá el formato AAAA-MM-DDTHH:mm')

  const anio = Number(match[1])
  const mes = Number(match[2])
  const dia = Number(match[3])
  const hora = Number(match[4])
  const minuto = Number(match[5])

  if (hora > 23 || minuto > 59) throw new Error('La hora indicada no existe')

  validarFecha(anio, mes, dia)
  return new Date(Date.UTC(anio, mes - 1, dia, hora, minuto, 0, 0) + OFFSET_AR_MS)
}

export function parseFechaOPromesaAR(valor: string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(valor)) return parseFechaAR(valor)
  return parseFechaHoraAR(valor)
}

export function sumarDiasAR(fecha: Date, dias: number) {
  return new Date(fecha.getTime() + dias * MS_POR_DIA)
}

export function inicioDiaAR(valor: string) {
  const fecha = parseFechaAR(valor)
  return new Date(fecha.getTime() - 12 * 60 * 60 * 1000)
}

export function finDiaAR(valor: string) {
  const inicio = inicioDiaAR(valor)
  return new Date(inicio.getTime() + MS_POR_DIA - 1)
}

export function rangoFechasAR(desde: string, hasta: string) {
  return { inicio: inicioDiaAR(desde), fin: finDiaAR(hasta) }
}

export function formatFechaAR(fecha: Date | string | null | undefined) {
  if (!fecha) return '—'
  const valor = aFecha(fecha)
  if (Number.isNaN(valor.getTime())) return '—'

  return new Intl.DateTimeFormat('es-AR', {
    timeZone: ZONA_HORARIA_AR,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(valor)
}

export function formatFechaHoraAR(fecha: Date | string | null | undefined) {
  if (!fecha) return '—'
  const valor = aFecha(fecha)
  if (Number.isNaN(valor.getTime())) return '—'

  return new Intl.DateTimeFormat('es-AR', {
    timeZone: ZONA_HORARIA_AR,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(valor)
}

export function fechaISOAR(fecha: Date | string | null | undefined) {
  if (!fecha) return ''
  const valor = aFecha(fecha)
  if (Number.isNaN(valor.getTime())) return ''
  const { anio, mes, dia } = partesEnAR(valor)
  return `${anio}-${pad2(mes)}-${pad2(dia)}`
}

export function fechaHoraInputAR(fecha: Date | string | null | undefined) {
  if (!fecha) return ''
  const valor = aFecha(fecha)
  if (Number.isNaN(valor.getTime())) return ''
  const { anio, mes, dia, hora, minuto } = partesEnAR(valor)
  return `${anio}-${pad2(mes)}-${pad2(dia)}T${pad2(hora)}:${pad2(minuto)}`
}
