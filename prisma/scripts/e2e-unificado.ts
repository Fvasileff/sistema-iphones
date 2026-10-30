import 'dotenv/config'
import assert from 'node:assert/strict'
import { execFileSync, spawn, type ChildProcess } from 'node:child_process'
import path from 'node:path'
import { setTimeout as sleep } from 'node:timers/promises'
import bcrypt from 'bcryptjs'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'
import { fechaISOAR } from '../../lib/fechas'

const RAIZ = process.cwd()
const BIN_PRISMA = path.join(RAIZ, 'node_modules', '.bin', 'prisma')
const BIN_NEXT = path.join(RAIZ, 'node_modules', '.bin', 'next')
function requerirVariable(nombre: string) {
  const valor = process.env[nombre]
  if (!valor) throw new Error(`Falta ${nombre} en el entorno`)
  return valor
}

const URL_POOL = requerirVariable('DATABASE_URL')
const URL_DIRECTA = requerirVariable('DIRECT_URL')
const SECRETO =
  process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET ?? ''
if (!SECRETO) throw new Error('Falta AUTH_SECRET o NEXTAUTH_SECRET en el entorno')

const SUFIJO = `${Date.now()}_${Math.floor(Math.random() * 1000)}`
const ESQUEMA = `e2e_unificado_${SUFIJO}`
const PUERTO = 41000 + Math.floor(Math.random() * 5000)
const BASE_URL = `http://127.0.0.1:${PUERTO}`

interface Respuesta<T> {
  datos: T
  estado: number
}

class ClienteHttp {
  private cookies = new Map<string, string>()

  constructor(private baseUrl: string) {}

  private async request(ruta: string, init: RequestInit = {}) {
    const headers = new Headers(init.headers)
    if (this.cookies.size > 0) {
      headers.set('cookie', [...this.cookies.entries()].map(([k, v]) => `${k}=${v}`).join('; '))
    }

    const respuesta = await fetch(`${this.baseUrl}${ruta}`, {
      ...init,
      headers,
      redirect: 'manual',
    })

    const getSetCookie = (
      respuesta.headers as Headers & { getSetCookie?: () => string[] }
    ).getSetCookie
    for (const cookie of getSetCookie?.call(respuesta.headers) ?? []) {
      const par = cookie.split(';')[0]
      const separador = par.indexOf('=')
      if (separador > 0) {
        this.cookies.set(par.slice(0, separador), par.slice(separador + 1))
      }
    }

    return respuesta
  }

  private async leer<T>(respuesta: Response, metodo: string, ruta: string): Promise<Respuesta<T>> {
    const texto = await respuesta.text()
    let datos: unknown = null
    try {
      datos = texto ? JSON.parse(texto) : null
    } catch {
      datos = texto
    }

    if (!respuesta.ok) {
      const detalle =
        datos && typeof datos === 'object' && 'error' in datos
          ? String((datos as { error: unknown }).error)
          : texto.slice(0, 500)
      throw new Error(`${metodo} ${ruta} respondió ${respuesta.status}: ${detalle}`)
    }

    return { datos: datos as T, estado: respuesta.status }
  }

  async get<T>(ruta: string) {
    return this.leer<T>(await this.request(ruta), 'GET', ruta)
  }

  async post<T>(ruta: string, cuerpo: unknown) {
    const respuesta = await this.request(ruta, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(cuerpo),
    })
    return this.leer<T>(respuesta, 'POST', ruta)
  }

  async patch<T>(ruta: string, cuerpo: unknown) {
    const respuesta = await this.request(ruta, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(cuerpo),
    })
    return this.leer<T>(respuesta, 'PATCH', ruta)
  }

  async postForm(ruta: string, datos: URLSearchParams) {
    return this.request(ruta, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: datos.toString(),
    })
  }
}

type ApiVentaContado = {
  id: string
  codigoOperacion: string
  total: number
  metodoPago: string
  montoEfectivo: number
  montoTransferencia: number
  anulada: boolean
}

type ApiVentaFinanciada = {
  id: string
  codigoOperacion: string
  anticipoEfectivo: number
  totalCuotas: number
}

type ApiCuota = {
  id: string
  ventaId: string
  numeroCuota: number
  estado: string
}

type ApiReparacion = {
  id: string
  codigoOperacion: string
  estado: string
}

type ApiCaja = {
  caja: { id: string; estado: string } | null
  estado: string
  abierta: boolean
  totales: {
    efectivo: number
    transferencia: number
    tarjeta: number
    porTipo: Record<string, number>
    montoInicial?: number
  }
}

type ApiReporte = {
  operaciones: Array<{
    tipo: string
    id: string
    monto: number
    montoEfectivo: number
    montoTransferencia: number
    montoTarjeta: number
    anulada: boolean
  }>
  total: number
  resumen: {
    total: number
    cobrado: number
    anuladas: number
    ventasContado: number
    ventasFinanciadas: number
    montoVentas: number
  }
}

function numero(valor: unknown) {
  return Number(valor)
}

function fechaMasDias(dias: number) {
  return fechaISOAR(new Date(Date.now() + dias * 24 * 60 * 60 * 1000))
}

let prismaPrueba: PrismaClient | null = null
let servidor: ChildProcess | null = null
let logsServidor = ''

function registrarLogs(chunk: Buffer) {
  logsServidor = `${logsServidor}${chunk.toString()}`.slice(-12000)
}

async function prepararEsquema() {
  console.log(`\n▶ Preparando esquema aislado ${ESQUEMA}`)
  const urlMigracion = new URL(URL_DIRECTA)
  urlMigracion.searchParams.set('schema', ESQUEMA)

  execFileSync(BIN_PRISMA, ['migrate', 'deploy'], {
    cwd: RAIZ,
    env: { ...process.env, DIRECT_URL: urlMigracion.toString() },
    stdio: 'pipe',
  })

  const adapter = new PrismaPg({ connectionString: URL_DIRECTA }, { schema: ESQUEMA })
  prismaPrueba = new PrismaClient({ adapter })
  console.log('  ✓ Migraciones aplicadas')
}

async function sembrarDatos() {
  if (!prismaPrueba) throw new Error('Prisma de prueba no inicializado')
  const prisma = prismaPrueba

  const password = `E2E-${SUFIJO}`
  const usuario = await prisma.usuario.create({
    data: {
      nombre: 'Usuario E2E',
      email: `e2e-${SUFIJO}@test.local`,
      password: await bcrypt.hash(password, 10),
      rol: 'admin',
    },
  })

  const productoSimple = await prisma.producto.create({
    data: {
      nombre: 'Producto E2E contado',
      categoria: 'accesorio',
      sku: `E2E-SIMPLE-${SUFIJO}`,
      precioCompra: 500,
      precioVenta: 1000,
      stock: 10,
      activo: true,
    },
  })

  const productoMixto = await prisma.producto.create({
    data: {
      nombre: 'Accesorio E2E mixto',
      categoria: 'accesorio',
      sku: `E2E-MIXTO-${SUFIJO}`,
      precioCompra: 1000,
      precioVenta: 2000,
      stock: 10,
      activo: true,
    },
  })

  const productoRepuesto = await prisma.producto.create({
    data: {
      nombre: 'Repuesto E2E reparación',
      categoria: 'repuesto',
      sku: `E2E-REPUESTO-${SUFIJO}`,
      precioCompra: 700,
      precioVenta: 1500,
      stock: 10,
      activo: true,
    },
  })

  const iphone = await prisma.iPhone.create({
    data: {
      modelo: 'iPhone E2E',
      almacenamiento: '128 GB',
      precioBase: 5000,
      activo: true,
      variantes: {
        create: [{ color: 'Negro', stock: 2 }],
      },
    },
  })
  const iphoneVariant = await prisma.iphoneVariant.findFirstOrThrow({
    where: { iphoneId: iphone.id },
  })

  const cliente = await prisma.cliente.create({
    data: {
      nombre: 'Cliente',
      apellido: `E2E ${SUFIJO}`,
      dni: `9${String(Date.now()).slice(-7)}`,
      telefono: '+5493810000000',
      email: `cliente-${SUFIJO}@test.local`,
    },
  })

  console.log('  ✓ Datos base creados')
  return {
    usuario,
    password,
    productoSimple,
    productoMixto,
    productoRepuesto,
    iphone,
    iphoneVariant,
    cliente,
  }
}

async function iniciarServidor() {
  console.log(`\n▶ Iniciando servidor aislado en ${BASE_URL}`)

  servidor = spawn(BIN_NEXT, ['start', '-p', String(PUERTO)], {
    cwd: RAIZ,
    env: {
      ...process.env,
      DATABASE_URL: URL_POOL,
      PRISMA_SCHEMA: ESQUEMA,
      NEXTAUTH_URL: BASE_URL,
      AUTH_URL: BASE_URL,
      NEXTAUTH_SECRET: SECRETO,
      AUTH_SECRET: SECRETO,
      AUTH_TRUST_HOST: 'true',
      TWILIO_ACCOUNT_SID: '',
      TWILIO_AUTH_TOKEN: '',
      TWILIO_WHATSAPP_NUMBER: '',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  servidor.stdout?.on('data', registrarLogs)
  servidor.stderr?.on('data', registrarLogs)

  for (let intento = 0; intento < 120; intento += 1) {
    if (servidor.exitCode !== null) {
      throw new Error(`El servidor terminó antes de iniciar.\n${logsServidor}`)
    }
    try {
      const respuesta = await fetch(`${BASE_URL}/api/auth/csrf`)
      if (respuesta.ok) {
        console.log('  ✓ Servidor listo')
        return
      }
    } catch {
      // El servidor todavía no está escuchando.
    }
    await sleep(250)
  }

  throw new Error(`Timeout esperando el servidor.\n${logsServidor}`)
}

async function iniciarSesion(api: ClienteHttp, email: string, password: string) {
  console.log('\n▶ Autenticación')
  const csrf = await api.get<{ csrfToken: string }>('/api/auth/csrf')

  const respuesta = await api.postForm(
    '/api/auth/callback/credentials',
    new URLSearchParams({
      csrfToken: csrf.datos.csrfToken,
      email,
      password,
      callbackUrl: `${BASE_URL}/admin`,
    }),
  )

  if (![200, 302, 303].includes(respuesta.status)) {
    throw new Error(`Login falló con estado ${respuesta.status}: ${(await respuesta.text()).slice(0, 500)}`)
  }

  const sesion = await api.get<{ user?: { email?: string } }>('/api/auth/session')
  assert.equal(sesion.datos.user?.email, email, 'La sesión no quedó autenticada')
  console.log('  ✓ Sesión iniciada correctamente')
}

async function ejecutarFlujos() {
  if (!prismaPrueba) throw new Error('Prisma de prueba no inicializado')
  const prisma = prismaPrueba

  const {
    usuario,
    password,
    productoSimple,
    productoMixto,
    productoRepuesto,
    iphone,
    iphoneVariant,
    cliente,
  } = await sembrarDatos()

  await iniciarServidor()
  const api = new ClienteHttp(BASE_URL)
  await iniciarSesion(api, usuario.email, password)

  const hoy = fechaISOAR(new Date())
  const consultaReporte = `/api/reportes/operaciones?desde=${hoy}&hasta=${hoy}&limit=100`

  console.log('\n▶ Flujo 1: Caja, venta simple y anulación')
  const apertura = await api.post<{ id: string; estado: string }>('/api/caja', {
    montoInicial: 1000,
  })
  assert.equal(apertura.datos.estado, 'abierta', 'La caja no quedó abierta')
  console.log('  ✓ Caja abierta con $1.000 iniciales')

  const ventaSimple = await api.post<ApiVentaContado>('/api/ventas-contado', {
    clienteId: cliente.id,
    items: [{ tipo: 'producto', id: productoSimple.id, cantidad: 2 }],
    pagos: [{ metodoPago: 'efectivo', monto: 2000 }],
  })
  assert.equal(numero(ventaSimple.datos.total), 2000, 'Total de venta simple incorrecto')

  const simpleStock = await prisma.producto.findUniqueOrThrow({ where: { id: productoSimple.id } })
  assert.equal(simpleStock.stock, 8, 'El stock no se descontó en la venta simple')

  const movSimple = await prisma.movimientoCaja.findFirstOrThrow({
    where: { referenciaTipo: 'venta_contado', referenciaId: ventaSimple.datos.id },
  })
  assert.equal(movSimple.tipo, 'venta', 'Tipo de movimiento de caja incorrecto')
  assert.equal(numero(movSimple.monto), 2000, 'Monto de caja incorrecto en venta simple')
  assert.equal(numero(movSimple.montoEfectivo), 2000, 'Efectivo de caja incorrecto')
  console.log('  ✓ Venta simple: stock -2 y movimiento de caja por $2.000')

  const anulacion = await api.post<ApiVentaContado>(
    `/api/ventas-contado/${ventaSimple.datos.id}/anular`,
    { motivo: 'Prueba E2E de anulación de venta' },
  )
  assert.equal(anulacion.datos.anulada, true, 'La venta no quedó anulada')

  const stockRestituido = await prisma.producto.findUniqueOrThrow({
    where: { id: productoSimple.id },
  })
  assert.equal(stockRestituido.stock, 10, 'El stock no se restituyó al anular')

  const movAnulado = await prisma.movimientoCaja.findUniqueOrThrow({ where: { id: movSimple.id } })
  assert.equal(movAnulado.anulada, true, 'El movimiento de caja no se anuló')
  console.log('  ✓ Anulación: stock restituido y caja revertida')

  console.log('\n▶ Flujo 2: Venta mixta con múltiples medios de pago')
  const ventaMixta = await api.post<ApiVentaContado>('/api/ventas-contado', {
    clienteId: cliente.id,
    items: [
      { tipo: 'producto', id: productoMixto.id, cantidad: 1 },
      { tipo: 'iphone', id: iphone.id, colorId: iphoneVariant.id, cantidad: 1 },
    ],
    pagos: [
      { metodoPago: 'efectivo', monto: 3000 },
      { metodoPago: 'transferencia', monto: 4000 },
    ],
  })

  assert.equal(numero(ventaMixta.datos.total), 7000, 'Total de venta mixta incorrecto')
  assert.equal(ventaMixta.datos.metodoPago, 'mixto', 'La venta mixta no quedó como mixta')
  assert.equal(numero(ventaMixta.datos.montoEfectivo), 3000, 'Efectivo de venta mixta incorrecto')
  assert.equal(numero(ventaMixta.datos.montoTransferencia), 4000, 'Transferencia de venta mixta incorrecta')

  const [stockMixto, stockIphone] = await Promise.all([
    prisma.producto.findUniqueOrThrow({ where: { id: productoMixto.id } }),
    prisma.iphoneVariant.findUniqueOrThrow({ where: { id: iphoneVariant.id } }),
  ])
  assert.equal(stockMixto.stock, 9, 'El stock del accesorio no se descontó')
  assert.equal(stockIphone.stock, 1, 'El stock del iPhone no se descontó')

  const movMixto = await prisma.movimientoCaja.findFirstOrThrow({
    where: { referenciaTipo: 'venta_contado', referenciaId: ventaMixta.datos.id },
  })
  assert.equal(numero(movMixto.monto), 7000, 'Monto de caja incorrecto en venta mixta')
  assert.equal(numero(movMixto.montoEfectivo), 3000, 'Efectivo de caja incorrecto en venta mixta')
  assert.equal(
    numero(movMixto.montoTransferencia),
    4000,
    'Transferencia de caja incorrecta en venta mixta',
  )
  console.log('  ✓ Venta mixta: stock -1 producto, -1 iPhone y caja desglosada $3.000 + $4.000')

  console.log('\n▶ Flujo 3: Financiación y cobro de cuota')
  const financiacion = await api.post<ApiVentaFinanciada>('/api/ventas', {
    clienteId: cliente.id,
    iphoneId: iphone.id,
    colorId: iphoneVariant.id,
    precioVenta: 10000,
    anticipoEfectivo: 2000,
    anticipoEquipo: 0,
    metodoAnticipo: 'efectivo',
    descripcionEquipo: null,
    planPago: 'SEMANAL',
    totalCuotas: 3,
    montoCuota: 3000,
    interesPct: 10,
    fechaPrimeraCuota: fechaMasDias(7),
  })

  const [ventaFinanciadaDb, iphoneFinanciado] = await Promise.all([
    prisma.venta.findUniqueOrThrow({
      where: { id: financiacion.datos.id },
      include: { cuotas: { orderBy: { numeroCuota: 'asc' } } },
    }),
    prisma.iphoneVariant.findUniqueOrThrow({ where: { id: iphoneVariant.id } }),
  ])
  assert.equal(ventaFinanciadaDb.cuotas.length, 3, 'No se generaron las 3 cuotas')
  assert.equal(iphoneFinanciado.stock, 0, 'El stock del iPhone financiado no se descontó')

  const movAnticipo = await prisma.movimientoCaja.findFirstOrThrow({
    where: { referenciaTipo: 'venta', referenciaId: financiacion.datos.id },
  })
  assert.equal(movAnticipo.tipo, 'venta_financiada', 'Tipo de movimiento de anticipo incorrecto')
  assert.equal(numero(movAnticipo.monto), 2000, 'Monto del anticipo en caja incorrecto')
  console.log('  ✓ Financiación creada: 3 cuotas, stock -1 y anticipo de $2.000 en caja')

  const cuotas = await api.get<ApiCuota[]>(`/api/cuotas?clienteId=${cliente.id}`)
  const primeraCuota = cuotas.datos.find(cuota => cuota.ventaId === financiacion.datos.id)
  assert.ok(primeraCuota, 'No se encontró la cuota de la financiación')

  const pagoCuota = await api.post<{ id: string; codigoOperacion: string }>(
    `/api/cuotas/${primeraCuota.id}/pagar`,
    { metodoPago: 'efectivo', observaciones: 'Pago E2E' },
  )

  const cuotaPagada = await prisma.cuota.findUniqueOrThrow({ where: { id: primeraCuota.id } })
  assert.equal(cuotaPagada.estado, 'pagada', 'La cuota no quedó pagada')

  const movCuota = await prisma.movimientoCaja.findFirstOrThrow({
    where: { referenciaTipo: 'pago_cuota', referenciaId: pagoCuota.datos.id },
  })
  assert.equal(movCuota.tipo, 'cobro_cuota', 'Tipo de movimiento de cuota incorrecto')
  assert.equal(numero(movCuota.monto), 3000, 'Monto de cuota en caja incorrecto')
  console.log('  ✓ Cuota 1/3 cobrada por $3.000 e impactada en caja')

  const historialCliente = await api.get<{
    ventas: Array<{
      id: string
      cuotas: Array<{ estado: string; pagos: unknown[] }>
    }>
    ventasContado: unknown[]
  }>(`/api/clientes/${cliente.id}`)

  const ventaHistorial = historialCliente.datos.ventas.find(
    venta => venta.id === financiacion.datos.id,
  )
  assert.ok(ventaHistorial, 'La financiación no aparece en el historial del cliente')
  assert.equal(
    ventaHistorial.cuotas.filter(cuota => cuota.pagos.length > 0).length,
    1,
    'El pago no aparece en el historial del cliente',
  )
  assert.equal(
    historialCliente.datos.ventasContado.length,
    2,
    'Las ventas de contado no aparecen en el historial del cliente',
  )
  console.log('  ✓ Historial del cliente actualizado con ventas, cuotas y pago')

  console.log('\n▶ Flujo 4: Reparación, repuesto y cobro final')
  const reparacion = await api.post<ApiReparacion>('/api/reparaciones', {
    clienteId: cliente.id,
    equipo: 'iPhone 13 Pro E2E',
    marca: 'Apple',
    modelo: 'A2487',
    falla: 'Pantalla sin imagen',
    presupuesto: 5000,
    sena: 0,
    metodoPago: 'efectivo',
    fechaPromesa: null,
  })

  const repuesto = await api.post<{ id: string; subtotal: number }>(
    `/api/reparaciones/${reparacion.datos.id}/repuestos`,
    {
      productoId: productoRepuesto.id,
      cantidad: 1,
      precioUnitario: 1500,
    },
  )
  assert.equal(numero(repuesto.datos.subtotal), 1500, 'Subtotal del repuesto incorrecto')

  const stockRepuesto = await prisma.producto.findUniqueOrThrow({
    where: { id: productoRepuesto.id },
  })
  assert.equal(stockRepuesto.stock, 9, 'El stock del repuesto no se descontó')

  const pagoReparacion = await api.post<{ id: string }>(
    `/api/reparaciones/${reparacion.datos.id}/pagos`,
    {
      monto: 5000,
      metodoPago: 'efectivo',
      concepto: 'Cobro final E2E',
      observaciones: 'Prueba integral',
    },
  )

  await api.patch(`/api/reparaciones/${reparacion.datos.id}`, {
    estado: 'entregado',
    montoFinal: 5000,
    nota: 'Entrega E2E',
  })

  const movReparacion = await prisma.movimientoCaja.findFirstOrThrow({
    where: { referenciaTipo: 'pago_reparacion', referenciaId: pagoReparacion.datos.id },
  })
  assert.equal(movReparacion.tipo, 'cobro_reparacion', 'Tipo de movimiento de reparación incorrecto')
  assert.equal(numero(movReparacion.monto), 5000, 'Monto de reparación en caja incorrecto')
  console.log('  ✓ Reparación: repuesto -1 en stock y cobro final de $5.000 en caja')

  console.log('\n▶ Flujo 5: Reportes, Caja del Día y arqueo')
  const reporte = await api.get<ApiReporte>(consultaReporte)
  assert.equal(reporte.datos.total, 7, 'Cantidad de operaciones en reportes incorrecta')
  assert.equal(reporte.datos.resumen.anuladas, 1, 'No se reporta la venta anulada')
  assert.equal(reporte.datos.resumen.ventasContado, 1, 'Ventas de contado activas incorrectas')
  assert.equal(reporte.datos.resumen.ventasFinanciadas, 1, 'Ventas financiadas activas incorrectas')
  assert.equal(reporte.datos.resumen.montoVentas, 17000, 'Total vendido incorrecto')
  assert.equal(reporte.datos.resumen.cobrado, 17000, 'Total cobrado incorrecto o duplicado')

  const tiposEsperados: Record<string, number> = {
    venta_contado: 2,
    venta_financiada: 1,
    anticipo_financiacion: 1,
    pago_cuota: 1,
    pago_reparacion: 1,
    repuesto_reparacion: 1,
  }
  for (const [tipo, cantidad] of Object.entries(tiposEsperados)) {
    const cantidadReal = reporte.datos.operaciones.filter(
      operacion => operacion.tipo === tipo,
    ).length
    assert.equal(cantidadReal, cantidad, `Cantidad incorrecta de operaciones ${tipo}`)
  }

  const reporteCuotas = await api.get<ApiReporte>(`${consultaReporte}&tipo=pago_cuota`)
  assert.equal(reporteCuotas.datos.operaciones.length, 1, 'Filtro por pago de cuota incorrecto')

  const reporteFinanciacion = await api.get<ApiReporte>(
    `${consultaReporte}&tipo=venta_financiada,anticipo_financiacion`,
  )
  assert.equal(
    reporteFinanciacion.datos.operaciones.length,
    2,
    'Filtro de financiación y anticipo incorrecto',
  )

  const ventaAnuladaReporte = reporte.datos.operaciones.find(
    operacion => operacion.tipo === 'venta_contado' && operacion.anulada,
  )
  assert.ok(ventaAnuladaReporte, 'La venta anulada no aparece en reportes')
  console.log('  ✓ Reportes: 7 operaciones, $17.000 vendidos y $17.000 cobrados sin duplicar')

  const caja = await api.get<ApiCaja>('/api/caja')
  assert.ok(caja.datos.caja, 'No se encontró la caja del día')
  assert.equal(caja.datos.totales.efectivo, 13000, 'Total efectivo de caja incorrecto')
  assert.equal(caja.datos.totales.transferencia, 4000, 'Total transferencia de caja incorrecto')
  assert.equal(caja.datos.totales.tarjeta, 0, 'Total tarjeta de caja incorrecto')
  assert.equal(caja.datos.totales.porTipo.venta, 7000, 'Caja: ventas de contado incorrectas')
  assert.equal(
    caja.datos.totales.porTipo.venta_financiada,
    2000,
    'Caja: anticipo de financiación incorrecto',
  )
  assert.equal(caja.datos.totales.porTipo.cobro_cuota, 3000, 'Caja: cobro de cuota incorrecto')
  assert.equal(
    caja.datos.totales.porTipo.cobro_reparacion,
    5000,
    'Caja: cobro de reparación incorrecto',
  )
  assert.equal(caja.datos.totales.montoInicial, 1000, 'Monto inicial de caja incorrecto')

  const cierre = await api.post<{
    esperado: { efectivo: number; transferencia: number }
    diferencia: { efectivo: number; transferencia: number }
    caja: { estado: string }
  }>(`/api/caja/${caja.datos.caja.id}/cerrar`, {
    montoContadoEfectivo: 14000,
    montoContadoTransferencia: 4000,
    observaciones: 'Cierre E2E',
  })

  assert.equal(cierre.datos.esperado.efectivo, 14000, 'Efectivo esperado de caja incorrecto')
  assert.equal(
    cierre.datos.esperado.transferencia,
    4000,
    'Transferencia esperada de caja incorrecta',
  )
  assert.equal(cierre.datos.diferencia.efectivo, 0, 'El arqueo de efectivo no cuadra')
  assert.equal(cierre.datos.diferencia.transferencia, 0, 'El arqueo de transferencia no cuadra')
  assert.equal(cierre.datos.caja.estado, 'cerrada', 'La caja no quedó cerrada')
  console.log('  ✓ Caja del Día: resumen limpio y arqueo exacto ($14.000 + $4.000)')

  const dashboard = await api.get<{
    totalVentasMes: number
    totalCobradoMes: number
    totalVentasContadoMes: number
    totalVentasFinanciadasMes: number
    totalAnticiposMes: number
    totalCuotasPagadasMes: number
    totalReparacionesMes: number
  }>('/api/dashboard')

  assert.equal(dashboard.datos.totalVentasMes, 17000, 'Dashboard: total vendido incorrecto')
  assert.equal(dashboard.datos.totalCobradoMes, 17000, 'Dashboard: total cobrado incorrecto')
  assert.equal(
    dashboard.datos.totalVentasContadoMes,
    7000,
    'Dashboard: ventas de contado incorrectas',
  )
  assert.equal(
    dashboard.datos.totalVentasFinanciadasMes,
    10000,
    'Dashboard: ventas financiadas incorrectas',
  )
  assert.equal(dashboard.datos.totalAnticiposMes, 2000, 'Dashboard: anticipos incorrectos')
  assert.equal(
    dashboard.datos.totalCuotasPagadasMes,
    3000,
    'Dashboard: cuotas cobradas incorrectas',
  )
  assert.equal(
    dashboard.datos.totalReparacionesMes,
    5000,
    'Dashboard: reparaciones cobradas incorrectas',
  )
  console.log('  ✓ Dashboard consistente: vendido y cobrado sin duplicaciones')

  assert.equal(
    ventaSimple.datos.id,
    anulacion.datos.id,
    'La venta anulada no coincide con la venta original',
  )
}

async function limpiar() {
  if (servidor && servidor.exitCode === null) {
    servidor.kill('SIGTERM')
    for (let intento = 0; intento < 40 && servidor.exitCode === null; intento += 1) {
      await sleep(100)
    }
    if (servidor.exitCode === null) servidor.kill('SIGKILL')
  }

  if (prismaPrueba) {
    await prismaPrueba.$disconnect().catch(() => undefined)
    prismaPrueba = null
  }

  const admin = new pg.Client({ connectionString: URL_DIRECTA })
  await admin.connect()
  try {
    await admin.query(`DROP SCHEMA IF EXISTS "${ESQUEMA}" CASCADE`)
  } finally {
    await admin.end()
  }

  console.log(`\n✓ Esquema aislado ${ESQUEMA} eliminado`)
}

async function principal() {
  let error: unknown = null
  try {
    await prepararEsquema()
    await ejecutarFlujos()
    console.log('\n══════════════════════════════════════════════════')
    console.log('  TODAS LAS PRUEBAS E2E PASARON CORRECTAMENTE')
    console.log('══════════════════════════════════════════════════')
  } catch (e) {
    error = e
    console.error('\n✗ Falló la prueba E2E')
    console.error(error instanceof Error ? error.stack ?? error.message : error)
    if (logsServidor) {
      console.error('\nÚltimos logs del servidor:')
      console.error(logsServidor)
    }
  } finally {
    try {
      await limpiar()
    } catch (e) {
      console.error('No se pudo limpiar el entorno de prueba:', e)
      if (!error) error = e
    }
  }

  if (error) process.exitCode = 1
}

void principal()
