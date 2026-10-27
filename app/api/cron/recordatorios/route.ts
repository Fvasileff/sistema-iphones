import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ZONA_HORARIA_AR, fechaISOAR, finDiaAR, inicioDiaAR, sumarDiasAR } from '@/lib/fechas'
import { enviarWhatsapp } from '@/lib/whatsapp'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  // Verificación de seguridad básica para que nadie externo ejecute el cron de forma manual
  const { searchParams } = new URL(request.url)
  const cronToken = searchParams.get('token')
  if (cronToken !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  try {
    // 1. Calcular la fecha de acá a exactamente 2 días (en horario de Argentina)
    const fechaObjetivo = fechaISOAR(sumarDiasAR(new Date(), 2))
    const inicioDia = inicioDiaAR(fechaObjetivo)
    const finDia = finDiaAR(fechaObjetivo)

    // 2. Buscar las cuotas que venzan en ese rango y sigan impagas
    const cuotasPorVencer = await prisma.cuota.findMany({
      where: {
        fechaVencimiento: {
          gte: inicioDia,
          lte: finDia,
        },
        estado: { in: ['pendiente', 'mora'] },
        venta: { anulada: false },
      },
      include: {
        venta: {
          include: {
            cliente: true,
            iphone: true,
          },
        },
      },
    })

    if (cuotasPorVencer.length === 0) {
      return NextResponse.json({ message: 'No hay cuotas que venzan en 2 días.' })
    }

    // 3. Iterar y enviar los mensajes mediante Twilio secuencialmente (evita saturar la API)
    let mensajesEnviadosCount = 0

    for (const cuota of cuotasPorVencer) {
      try {
        const cliente = cuota.venta.cliente
        const iphone = cuota.venta.iphone
        const telefono = cliente.telefono
        const nombreCompleto = `${cliente.nombre} ${cliente.apellido}`
        
        // Formatear la fecha para que salga ej: "01 de junio" o "05 de agosto"
        const fechaFormateada = new Intl.DateTimeFormat('es-AR', {
          day: '2-digit',
          month: 'long',
          timeZone: ZONA_HORARIA_AR,
        }).format(cuota.fechaVencimiento)

        // Convertimos los Decimal de Prisma a Number para darles formato local de dinero
        const montoBase = Number(cuota.montoOriginal)
        const montoMora = Number(cuota.montoMora)
        const totalAPagar = montoBase + montoMora
        const tieneMora = montoMora > 0

        const totalCuotasVenta = cuota.venta.totalCuotas
        const nombreIphone = `${iphone.modelo} ${iphone.almacenamiento}`

        // MODIFICADO: Estructura exacta y premium para el mensaje de WhatsApp
        const mensaje = `Hola *${nombreCompleto}* 👋, te recordamos que en *2 días* vence tu cuota.\n\n` +
          `📱 *Equipo:* ${nombreIphone}\n` +
          `📊 *Estado del plan:* Cuota *${cuota.numeroCuota}* de *${totalCuotasVenta}*\n` +
          `📅 *Vence el:* ${fechaFormateada}\n\n` +
          `📋 *DETALLE DE TU CUENTA:*\n` +
          `• Cuota Base: *$${montoBase.toLocaleString('es-AR')}*\n` +
          `• Recargo por Mora: ${tieneMora ? `*$${montoMora.toLocaleString('es-AR')}* ⚠️` : `*$0* (Al día) ✅`}\n` +
          `-----------------------------------\n` +
          `💰 *TOTAL A ABONAR: *$${totalAPagar.toLocaleString('es-AR')}*`

        // Despachar a Twilio esperando la respuesta antes de pasar al siguiente cliente
        await enviarWhatsapp(telefono, mensaje)

        mensajesEnviadosCount++
      } catch (err) {
        console.error(`Error enviando mensaje a la cuota ${cuota.id}:`, err)
      }
    }

    return NextResponse.json({ success: true, mensajesEnviados: mensajesEnviadosCount })
  } catch (error) {
    console.error('Error en el Cron de recordatorios:', error)
    return NextResponse.json({ error: 'Error interno al procesar recordatorios' }, { status: 500 })
  }
}