'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'

export default function Sidebar() {
  const pathname = usePathname()

  // ESTA ES LA CLAVE: Si la ruta es '/login', el Sidebar devuelve null y no se pinta.
  if (pathname === '/login') return null

  const links = [
    { name: 'Inicio', href: '/admin' },
    { name: 'Ventas', href: '/admin/ventas' },
    { name: 'Cuotas', href: '/admin/cuotas' },
    { name: 'Reportes', href: '/admin/reportes' },
    { name: 'Clientes', href: '/admin/clientes' },
    { name: 'iPhones', href: '/admin/iphones' },
  ]

  return (
    <aside className="w-64 bg-zinc-900 border-r border-zinc-800 flex flex-col h-screen flex-shrink-0">
      <div className="p-6 text-xl font-bold border-b border-zinc-800 text-white">Sistema iPhones</div>
      <nav className="flex-1 p-4 space-y-1">
        {links.map((link) => (
          <Link key={link.name} href={link.href} className={`block px-4 py-3 rounded-xl transition ${pathname === link.href ? 'bg-blue-600 text-white' : 'hover:bg-zinc-800 text-zinc-400'}`}>
            {link.name}
          </Link>
        ))}
      </nav>
      <div className="p-4 border-t border-zinc-800">
        <button onClick={() => signOut({ callbackUrl: '/login' })} className="w-full px-4 py-3 text-sm text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition text-left">
          🚪 Cerrar sesión
        </button>
      </div>
    </aside>
  )
}