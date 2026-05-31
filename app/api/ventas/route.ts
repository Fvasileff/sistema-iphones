import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { whatsappNuevaFinanciacion } from '@/utils/whatsapp';

export async function POST(request: Request) {
  try {
    const session = await auth(); 
    
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const usuario = await prisma.usuario.findUnique({
      where: { email: session.user.email as string }
    });

    if (!usuario) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    const body = await request.json();
    const { 
      clienteId, iphoneId, precioVenta, anticipoEfectivo, 
      anticipoEquipo, descripcionEquipo, planPago, totalCuotas, 
      montoCuota, interesPct, fechaPrimeraCuota
    } = body;

    const resultado = await prisma.$transaction(async (tx: any) => {
      const nuevaVenta = await tx.venta.create({
        data: {
          cliente: { connect: { id: clienteId } },
          iphone: { connect: { id: iphoneId } },
          usuario: { connect: { id: usuario.id } },
          precioVenta: parseFloat(precioVenta),
          anticipoEfectivo: parseFloat(anticipoEfectivo || 0),
          anticipoEquipo: parseFloat(anticipoEquipo || 0),
          descripcionEquipo: descripcionEquipo || "",
          planPago: planPago,
          totalCuotas: parseInt(totalCuotas),
          montoCuota: parseFloat(montoCuota),
          interesPct: parseFloat(interesPct),
        }
      });

      const cuotasData = [];
      const dias = planPago === 'SEMANAL' ? 7 : planPago === 'QUINCENAL' ? 15 : 30;
      const fechaBase = new Date(fechaPrimeraCuota)

      for (let i = 1; i <= parseInt(totalCuotas); i++) {
        const fechaVenc = new Date(fechaBase)
        fechaVenc.setDate(fechaBase.getDate() + ((i - 1) * dias))

        cuotasData.push({
          ventaId: nuevaVenta.id,
          numeroCuota: i,
          montoOriginal: parseFloat(montoCuota),
          fechaVencimiento: fechaVenc,
          estado: "pendiente"
        });
      }

      await tx.cuota.createMany({ data: cuotasData });

      await tx.iPhone.update({
        where: { id: iphoneId },
        data: { stock: { decrement: 1 } }
      });

      return nuevaVenta;
    });

    try {
      const cliente = await prisma.cliente.findUnique({ where: { id: clienteId } });
      const iphone = await prisma.iPhone.findUnique({ where: { id: iphoneId } });

      if (cliente && iphone) {
        await whatsappNuevaFinanciacion(
          cliente.telefono,
          `${cliente.nombre} ${cliente.apellido}`,
          `${iphone.modelo} ${iphone.almacenamiento}`,
          parseInt(totalCuotas),
          parseFloat(montoCuota)
        )
      }
    } catch (wpError) {
      console.error('Error enviando WhatsApp de bienvenida:', wpError)
    }

    return NextResponse.json(resultado, { status: 201 });
  } catch (error) {
    console.error("Error en API Ventas:", error);
    return NextResponse.json({ error: "No se pudo registrar la venta" }, { status: 500 });
  }
}