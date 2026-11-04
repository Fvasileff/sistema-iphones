import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

export const proxy = auth(request => {
  const { nextUrl } = request
  const isLoggedIn = !!request.auth

  const esRutaAdmin = nextUrl.pathname.startsWith('/admin')
  const esRutaApiPublica =
    nextUrl.pathname.startsWith('/api/auth') || nextUrl.pathname.startsWith('/api/health')
  const esRutaApiProtegida =
    nextUrl.pathname.startsWith('/api') && !esRutaApiPublica

  if ((esRutaAdmin || esRutaApiProtegida) && !isLoggedIn) {
    if (esRutaApiProtegida) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    return NextResponse.redirect(new URL('/login', nextUrl))
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    '/admin/:path*',
    '/api/health/:path*',
    '/api/iphones/:path*',
    '/api/clientes/:path*',
    '/api/productos/:path*',
    '/api/reparaciones/:path*',
    '/api/caja/:path*',
    '/api/ventas/:path*',
    '/api/cuotas/:path*',
    '/api/reportes/:path*',
    '/api/send-whatsapp/:path*',
  ],
}
