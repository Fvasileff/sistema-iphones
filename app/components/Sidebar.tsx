'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { useState } from 'react'

const links = [
  { name: 'Inicio',    href: '/admin',           icon: '🏠' },
  { name: 'Ventas',    href: '/admin/ventas',     icon: '💰' },
  { name: 'Cuotas',   href: '/admin/cuotas',     icon: '📅' },
  { name: 'Reportes', href: '/admin/reportes',   icon: '📊' },
  { name: 'Clientes', href: '/admin/clientes',   icon: '👥' },
  { name: 'iPhones',  href: '/admin/iphones',    icon: '📱' },
]

function NavLinks({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <>
      {links.map((link) => {
        const active = pathname === link.href
        return (
          <Link
            key={link.name}
            href={link.href}
            onClick={onNavigate}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition text-sm font-medium ${
              active ? 'bg-blue-600 text-white' : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
            }`}
          >
            <span className="text-base">{link.icon}</span>
            {link.name}
          </Link>
        )
      })}
    </>
  )
}

export default function Sidebar() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  if (pathname === '/login') return null

  return (
    <>
      {/* ── DESKTOP sidebar — solo visible en md+ ── */}
      <aside className="hidden md:flex w-56 lg:w-64 bg-zinc-900 border-r border-zinc-800 flex-col flex-shrink-0">
        <div className="p-5 lg:p-6 text-lg lg:text-xl font-bold border-b border-zinc-800 text-white shrink-0">
          Sistema iPhones
        </div>
        <nav className="flex-1 p-3 lg:p-4 space-y-1 overflow-y-auto">
          <NavLinks pathname={pathname} />
        </nav>
        <div className="p-3 lg:p-4 border-t border-zinc-800 shrink-0">
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-xl transition"
          >
            <span>🚪</span> Cerrar sesión
          </button>
        </div>
      </aside>

      {/* ── MOBILE: top bar fija ── */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 h-14 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between px-4">
        <span className="text-white font-bold text-base">Sistema iPhones</span>
        <button
          onClick={() => setOpen(true)}
          aria-label="Abrir menú"
          className="text-zinc-400 hover:text-white p-2 rounded-lg hover:bg-zinc-800 transition"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="3" y1="6"  x2="21" y2="6"  />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
      </div>

      {/* ── MOBILE: drawer ── */}
      {open && (
        <div className="md:hidden fixed inset-0 z-50 flex" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-black/60" />
          <aside
            className="relative w-72 max-w-[85vw] bg-zinc-900 border-r border-zinc-800 flex flex-col h-full"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800 shrink-0">
              <span className="text-white font-bold">Sistema iPhones</span>
              <button onClick={() => setOpen(false)} aria-label="Cerrar menú" className="text-zinc-400 hover:text-white p-1.5 rounded-lg hover:bg-zinc-800 transition">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
              <NavLinks pathname={pathname} onNavigate={() => setOpen(false)} />
            </nav>
            <div className="p-3 border-t border-zinc-800 shrink-0">
              <button
                onClick={() => signOut({ callbackUrl: '/login' })}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-xl transition"
              >
                <span>🚪</span> Cerrar sesión
              </button>
            </div>
          </aside>
        </div>
      )}
    </>
  )
}