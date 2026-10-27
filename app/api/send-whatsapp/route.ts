import { NextResponse } from 'next/server'
import { requerirSesion } from '@/lib/api-auth'
import { ErrorApi, manejarErrorApi } from '@/lib/errores'
import { enviarWhatsapp } from '@/lib/whatsapp'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const sinSesion = await requerirSesion()
  if (sinSesion) return sinSesion

  try {
    const { to, message } = await request.json()

    if (!to || !message) {
      throw new ErrorApi('Faltan parámetros obligatorios: "to" (teléfono) o "message" (texto)', 400)
    }

    const response = await enviarWhatsapp(String(to), String(message))

    return NextResponse.json({ success: true, sid: response.sid })
  } catch (error) {
    return manejarErrorApi(error)
  }
}
