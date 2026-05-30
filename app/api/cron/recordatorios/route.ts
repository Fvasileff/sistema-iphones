import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma' 
import twilio from 'twilio'

const accountSid = process.env.TWILIO_ACCOUNT_SID
const authToken = process.env.TWILIO_AUTH_TOKEN
const twilioNumber = process.env.TWILIO_WHATSAPP_NUMBER

const client = twilio(accountSid, authToken)

export async function GET(request: Request) {
  // Verificación de seguridad básica para que nadie externo ejecute el cron de forma manual
  const { searchParams } = new URL(request.url)
  const cronToken = searchParams.get('token')
  if (cronToken !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  try {
    // 1. Calcular la fecha de acá a exactamente 2 días
    const hoy = new Date()
    const fechaObjetivo = new Date(hoy)
    fechaObjetivo.setDate(hoy.getDate() + 2)

    // Formateamos el inicio y fin del día objetivo para la consulta en la BD
    const inicioDia = new Date(fechaObjetivo.setHours(0, 0, 0, 0))
    const finDia = new Date(fechaObjetivo.setHours(23, 59, 59, 999))

    // 2. Buscar en Supabase las cuotas que venzan en ese rango y estén pendientes
    // AGREGADO: iphone true para poder traer los detalles del celular en el mensaje
    const cuotasPorVencer = await prisma.cuota.findMany({
      where: {
        fechaVencimiento: {
          gte: inicioDia,
          lte: finDia,
        },
        estado: 'pendiente', 
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
        const opciones: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'long' }
        const fechaFormateada = cuota.fechaVencimiento.toLocaleDateString('es-AR', opciones)

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

        // Formatear número celular para Twilio
        let limpioTo = telefono.trim()
        if (!limpioTo.startsWith('+')) limpioTo = '+' + limpioTo
        const formattedTo = limpioTo.startsWith('whatsapp:') ? limpioTo : `whatsapp:${limpioTo}`

        // Despachar a Twilio esperando la respuesta antes de pasar al siguiente cliente
        await client.messages.create({
          body: mensaje,
          from: twilioNumber,
          to: formattedTo,
        })

        mensajesEnviadosCount++
      } catch (err) {
        console.error(`Error enviando mensaje a la cuota ${cuota.id}:`, err)
      }
    }

    return NextResponse.json({ success: true, mensajesEnviados: mensajesEnviadosCount })
  } catch (error: any) {
    console.error('Error en el Cron de recordatorios:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}