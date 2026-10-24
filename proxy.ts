// proxy.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function proxy(request: NextRequest) {
  // NextAuth guarda la sesión en una cookie. En desarrollo se suele llamar de estas formas:
  const token = 
    request.cookies.get('authjs.session-token') || 
    request.cookies.get('next-auth.session-token') ||
    request.cookies.get('__Secure-authjs.session-token');

  const isLoggedIn = !!token
  const { nextUrl } = request

  const esRutaAdmin = nextUrl.pathname.startsWith('/admin')
  const esRutaApiProtegida = nextUrl.pathname.startsWith('/api') && !nextUrl.pathname.startsWith('/api/auth')

  // Si intenta entrar a administración o APIs privadas y NO está logueado, al login
  if ((esRutaAdmin || esRutaApiProtegida) && !isLoggedIn) {
    return NextResponse.redirect(new URL('/login', nextUrl))
  }

  return NextResponse.next()
}

// Configuración de rutas a interceptar
export const config = {
  matcher: [
    '/admin/:path*',
    '/api/iphones/:path*',
    '/api/clientes/:path*',
    '/api/productos/:path*',
    '/api/ventas-productos/:path*',
    '/api/reparaciones/:path*',
    '/api/caja/:path*',
    '/api/ventas/:path*',
    '/api/cuotas/:path*',
  ],
}