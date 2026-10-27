import twilio from 'twilio'

export function formatearTelefonoWhatsapp(telefono: string) {
  const limpio = telefono.replace(/^whatsapp:/, '').replace(/\D/g, '')
  return `whatsapp:+${limpio}`
}

export async function enviarWhatsapp(telefono: string, mensaje: string) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken = process.env.TWILIO_AUTH_TOKEN
  const from = process.env.TWILIO_WHATSAPP_NUMBER

  if (!accountSid || !authToken || !from) {
    throw new Error('La configuración de Twilio está incompleta')
  }

  const client = twilio(accountSid, authToken)

  return client.messages.create({
    body: mensaje,
    from,
    to: formatearTelefonoWhatsapp(telefono),
  })
}
