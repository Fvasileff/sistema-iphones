import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

export async function requerirSesion() {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }
  return null
}
