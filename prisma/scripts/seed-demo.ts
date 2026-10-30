import 'dotenv/config'
import { prisma } from '../../lib/prisma'

const PREFIJO = 'DEMO'
const SOLO_LIMPIAR = process.argv.includes('--clean')

function fechaEnDias(dias: number) {
  const fecha = new Date()
  fecha.setDate(fecha.getDate() + dias)
  return fecha
}

async function limpiarDemo() {
  const clientes = await prisma.cliente.findMany({
    where: {
      OR: [{ dni: { startsWith: PREFIJO } }, { nombre: { startsWith: PREFIJO } }],
    },
    select: { id: true },
  })
  const productos = await prisma.producto.findMany({
    where: {
      OR: [{ sku: { startsWith: PREFIJO } }, { nombre: { startsWith: PREFIJO } }],
    },
    select: { id: true },
  })
  const iphones = await prisma.iPhone.findMany({
    where: { modelo: { startsWith: PREFIJO } },
    select: { id: true },
  })

  const clienteIds = clientes.map(cliente => cliente.id)
  const productoIds = productos.map(producto => producto.id)
  const iphoneIds = iphones.map(iphone => iphone.id)

  const reparaciones = await prisma.reparacion.findMany({
    where: {
      OR: [
        { codigoOperacion: { startsWith: PREFIJO } },
        { equipo: { startsWith: PREFIJO } },
        ...(clienteIds.length > 0 ? [{ clienteId: { in: clienteIds } }] : []),
      ],
    },
    select: { id: true },
  })
  const reparacionIds = reparaciones.map(reparacion => reparacion.id)

  if (reparacionIds.length > 0) {
    const repuestos = await prisma.reparacionProducto.findMany({
      where: { reparacionId: { in: reparacionIds }, anulada: false },
      select: { productoId: true, cantidad: true },
    })
    for (const repuesto of repuestos) {
      await prisma.producto.update({
        where: { id: repuesto.productoId },
        data: { stock: { increment: repuesto.cantidad } },
      })
    }

    await prisma.movimientoStock.deleteMany({
      where: { referenciaTipo: 'reparacion', referenciaId: { in: reparacionIds } },
    })

    const pagos = await prisma.pagoReparacion.findMany({
      where: { reparacionId: { in: reparacionIds } },
      select: { id: true },
    })
    const pagoIds = pagos.map(pago => pago.id)
    if (pagoIds.length > 0) {
      await prisma.movimientoCaja.deleteMany({
        where: { referenciaTipo: 'pago_reparacion', referenciaId: { in: pagoIds } },
      })
    }

    await prisma.reparacionProducto.deleteMany({
      where: { reparacionId: { in: reparacionIds } },
    })
    await prisma.pagoReparacion.deleteMany({
      where: { reparacionId: { in: reparacionIds } },
    })
    await prisma.historialReparacion.deleteMany({
      where: { reparacionId: { in: reparacionIds } },
    })
    await prisma.reparacion.deleteMany({ where: { id: { in: reparacionIds } } })
  }

  if (iphoneIds.length > 0) {
    await prisma.iPhone.deleteMany({ where: { id: { in: iphoneIds } } })
  }

  if (productoIds.length > 0) {
    await prisma.movimientoStock.deleteMany({ where: { productoId: { in: productoIds } } })

    const items = await prisma.ventaContadoItem.findMany({
      where: { productoId: { in: productoIds } },
      select: { ventaId: true },
    })
    const ventaIds = [...new Set(items.map(item => item.ventaId))]

    if (ventaIds.length > 0) {
      await prisma.movimientoCaja.deleteMany({
        where: { referenciaTipo: 'venta_producto', referenciaId: { in: ventaIds } },
      })
      await prisma.ventaContadoItem.deleteMany({ where: { productoId: { in: productoIds } } })
      for (const ventaId of ventaIds) {
        const restantes = await prisma.ventaContadoItem.count({ where: { ventaId } })
        if (restantes === 0) {
          await prisma.ventaContado.delete({ where: { id: ventaId } })
        }
      }
    }

    await prisma.reparacionProducto.deleteMany({
      where: { productoId: { in: productoIds } },
    })
    await prisma.producto.deleteMany({ where: { id: { in: productoIds } } })
  }

  if (clienteIds.length > 0) {
    await prisma.ventaContado.updateMany({
      where: { clienteId: { in: clienteIds } },
      data: { clienteId: null },
    })

    for (const clienteId of clienteIds) {
      const ventasFinanciadas = await prisma.venta.count({ where: { clienteId } })
      if (ventasFinanciadas > 0) {
        console.warn(
          `⚠️  Se conserva el cliente DEMO ${clienteId}: tiene ventas financiadas asociadas.`,
        )
        continue
      }
      await prisma.cliente.delete({ where: { id: clienteId } })
    }
  }
}

async function crearDemo() {
  const ana = await prisma.cliente.create({
    data: {
      nombre: 'DEMO Ana',
      apellido: 'Gómez',
      dni: 'DEMO-1001',
      telefono: '3815550001',
      email: 'demo.ana@example.com',
      direccion: 'Calle Demo 123',
    },
  })

  const bruno = await prisma.cliente.create({
    data: {
      nombre: 'DEMO Bruno',
      apellido: 'Pérez',
      dni: 'DEMO-1002',
      telefono: '3815550002',
      email: 'demo.bruno@example.com',
      direccion: 'Calle Demo 456',
    },
  })

  await prisma.producto.createMany({
    data: [
      {
        nombre: 'DEMO Repuesto pantalla iPhone 11',
        descripcion: 'Pantalla de prueba para demostración',
        categoria: 'repuesto',
        sku: 'DEMO-REP-001',
        precioCompra: 45000,
        precioVenta: 82000,
        stock: 8,
        stockMinimo: 2,
      },
      {
        nombre: 'DEMO Batería iPhone 13',
        descripcion: 'Batería de prueba para demostración',
        categoria: 'repuesto',
        sku: 'DEMO-REP-002',
        precioCompra: 28000,
        precioVenta: 55000,
        stock: 4,
        stockMinimo: 2,
      },
      {
        nombre: 'DEMO Funda silicona',
        descripcion: 'Accesorio de prueba para demostración',
        categoria: 'accesorio',
        sku: 'DEMO-ACC-001',
        precioCompra: 4000,
        precioVenta: 12000,
        stock: 15,
        stockMinimo: 5,
      },
    ],
  })

  const iphone13 = await prisma.iPhone.create({
    data: {
      modelo: 'DEMO iPhone 13',
      variante: 'Demo',
      almacenamiento: '128 GB',
      precioBase: 950000,
      activo: true,
      variantes: {
        create: [
          { color: 'Negro', stock: 3 },
          { color: 'Blanco', stock: 2 },
        ],
      },
    },
  })

  await prisma.iPhone.create({
    data: {
      modelo: 'DEMO iPhone 14 Pro',
      almacenamiento: '256 GB',
      precioBase: 1450000,
      activo: true,
      variantes: {
        create: [{ color: 'Blanco', stock: 3 }],
      },
    },
  })

  await prisma.reparacion.create({
    data: {
      codigoOperacion: 'DEMO-REP-001',
      clienteId: ana.id,
      equipo: 'DEMO iPhone 12',
      marca: 'Apple',
      modelo: 'iPhone 12',
      imei: 'DEMO-IMEI-001',
      claveEquipo: '1234',
      color: 'Azul',
      almacenamiento: '64 GB',
      accesoriosRecibidos: 'DEMO funda y cargador',
      estadoFisico: 'DEMO rayas leves en el marco',
      falla: 'DEMO no enciende y no carga',
      diagnostico: 'DEMO revisar placa y conector de carga',
      presupuesto: 85000,
      estado: 'en_diagnostico',
      fechaPromesa: fechaEnDias(3),
      observaciones: 'DEMO reparación de prueba',
      historial: {
        create: [
          { estadoNuevo: 'recibido', nota: 'DEMO ingreso del equipo' },
          {
            estadoAnterior: 'recibido',
            estadoNuevo: 'en_diagnostico',
            nota: 'DEMO diagnóstico en curso',
          },
        ],
      },
    },
  })

  await prisma.reparacion.create({
    data: {
      codigoOperacion: 'DEMO-REP-002',
      clienteId: bruno.id,
      equipo: 'DEMO iPhone 13 Pro',
      marca: 'Apple',
      modelo: 'iPhone 13 Pro',
      imei: 'DEMO-IMEI-002',
      color: 'Gris',
      almacenamiento: '256 GB',
      accesoriosRecibidos: 'DEMO solo equipo',
      estadoFisico: 'DEMO pantalla astillada',
      falla: 'DEMO pantalla rota',
      diagnostico: 'DEMO cambio de pantalla',
      presupuesto: 120000,
      montoFinal: 120000,
      estado: 'listo_para_retirar',
      fechaPromesa: fechaEnDias(1),
      observaciones: 'DEMO listo para avisar al cliente',
      historial: {
        create: [
          { estadoNuevo: 'recibido', nota: 'DEMO ingreso del equipo' },
          {
            estadoAnterior: 'recibido',
            estadoNuevo: 'en_diagnostico',
            nota: 'DEMO diagnóstico realizado',
          },
          {
            estadoAnterior: 'en_diagnostico',
            estadoNuevo: 'listo_para_retirar',
            nota: 'DEMO reparación terminada',
          },
        ],
      },
    },
  })

  return { iphone13 }
}

async function main() {
  await limpiarDemo()

  if (SOLO_LIMPIAR) {
    console.log('🧹 Datos DEMO eliminados.')
    return
  }

  await crearDemo()
  console.log('✅ Datos DEMO creados:')
  console.log('   • 2 clientes (DNI DEMO-1001 y DEMO-1002)')
  console.log('   • 3 productos de inventario (SKU DEMO-*)')
  console.log('   • 2 iPhones del catálogo (modelo DEMO *)')
  console.log('   • 2 reparaciones (DEMO-REP-001 y DEMO-REP-002)')
  console.log('')
  console.log('Para borrarlos después: npx tsx prisma/scripts/seed-demo.ts --clean')
}

main()
  .catch(error => {
    console.error('❌ Error en seed demo:', error)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
