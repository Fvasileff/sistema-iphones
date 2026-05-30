// utils/whatsapp.ts

interface EnviarMsgProps {
  telefono: string
  mensaje: string
}

/**
 * Función helper interna.
 * Formatea el número y se comunica con el Route Handler backend.
 */
async function ejecutarEnvio({ telefono, mensaje }: EnviarMsgProps) {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_URL}/api/send-whatsapp`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        to: telefono.startsWith('whatsapp:') ? telefono : `whatsapp:${telefono}`, 
        message: mensaje 
      }),
    })
    
    const data = await res.json()
    
    if (!res.ok) {
      console.error('Error del servidor Twilio:', data.error)
      throw new Error(data.error || 'Error al despachar el mensaje')
    }
    
    return { success: true, data }
  } catch (error: any) {
    console.error('Error crítico en el envío de WhatsApp:', error.message)
    return { success: false, error: error.message }
  }
}

/**
 * Plantilla 1: Comprobante automático de Cuota Cobrada
 */
export async function whatsappComprobantePago(
  telefono: string,
  clienteNombre: string,
  nroCuota: number,
  totalCuotas: number,
  montoPagado: number
) {
  const mensaje = `¡Hola *${clienteNombre}*! 👋\n\n` +
    `Registramos con éxito el pago de tu *Cuota ${nroCuota}/${totalCuotas}*.\n` +
    `💰 *Monto abonado:* *$${montoPagado.toLocaleString('es-AR')}*\n\n` +
    `El movimiento ya impactó en nuestro sistema. ¡Muchas gracias por tu pago! ✅`

  return ejecutarEnvio({ telefono, mensaje })
}

/**
 * Plantilla 2: Mensaje de Bienvenida al dar de Alta una Financiación
 */
export async function whatsappNuevaFinanciacion(
  telefono: string,
  clienteNombre: string,
  modeloIphone: string,
  cantidadCuotas: number,
  montoCuota: number
) {
  const mensaje = `¡Hola *${clienteNombre}*! 🎉 Gracias por elegirnos.\n\n` +
    `Te confirmamos el alta de tu financiación para el *${modeloIphone}*.\n` +
    `📌 *Detalles de tu plan:*\n` +
    `• Financiado en: *${cantidadCuotas} cuotas.*\n` +
    `• Valor de cada cuota: *$${montoCuota.toLocaleString('es-AR')}*\n\n` +
    `Mensualmente vas a ir recibiendo los avisos de vencimiento. ¡Que disfrutes tu nuevo iPhone! 📱`

  return ejecutarEnvio({ telefono, mensaje })
}

/**
 * Plantilla 3: Recordatorio Detallado de Vencimiento (2 días antes)
 */
export async function whatsappRecordatorioVencimiento(
  telefono: string,
  clienteNombre: string,
  nroCuota: number,
  totalCuotas: number,
  montoOriginal: number,
  montoMora: number,
  modeloIphone: string,
  fechaVencimiento: string
) {
  const totalAPagar = montoOriginal + montoMora
  const tieneMora = montoMora > 0

  const mensaje = 
    `Hola *${clienteNombre}* 👋, te recordamos que en *2 días* vence tu cuota.\n\n` +
    `📱 *Equipo:* ${modeloIphone}\n` +
    `📊 *Estado del plan:* Cuota *${nroCuota}* de *${totalCuotas}*\n` +
    `📅 *Vence el:* ${fechaVencimiento}\n\n` +
    `📋 *DETALLE DE TU CUENTA:*\n` +
    `• Cuota Base: *$${montoOriginal.toLocaleString('es-AR')}*\n` +
    `• Recargo por Mora: ${tieneMora ? `*$${montoMora.toLocaleString('es-AR')}* ⚠️` : `*$0* (Al día) ✅`}\n` +
    `-----------------------------------\n` +
    `💰 *TOTAL A ABONAR: $${totalAPagar.toLocaleString('es-AR')}*\n\n` +
    `Evitá recargos adicionales abonando a término. Si ya realizaste el pago, por favor desestimá este mensaje. ¡Muchas gracias! 🙏`

  return ejecutarEnvio({ telefono, mensaje })
}