import { NextResponse } from 'next/server'
import twilio from 'twilio'

const accountSid = process.env.TWILIO_ACCOUNT_SID
const authToken = process.env.TWILIO_AUTH_TOKEN
const twilioNumber = process.env.TWILIO_WHATSAPP_NUMBER

const client = twilio(accountSid, authToken)

export async function POST(request: Request) {
  try {
    const { to, message } = await request.json()

    if (!to || !message) {
      return NextResponse.json(
        { error: 'Faltan parámetros obligatorios: "to" (teléfono) o "message" (texto)' },
        { status: 400 }
      )
    }

    // Limpiamos cualquier prefijo duplicado y formateamos correctamente
    let limpioTo = to.trim()
    limpioTo = limpioTo.replace('whatsapp:', '').replace(/^\+/, '')
    const formattedTo = `whatsapp:+${limpioTo}`

    const response = await client.messages.create({
      body: message,
      from: twilioNumber,
      to: formattedTo,
    })

    return NextResponse.json({ success: true, sid: response.sid })
  } catch (error: any) {
    console.error('Error enviando WhatsApp vía Twilio:', error)
    return NextResponse.json(
      { error: error.message || 'Error interno al procesar el envío de WhatsApp' },
      { status: 500 }
    )
  }
}