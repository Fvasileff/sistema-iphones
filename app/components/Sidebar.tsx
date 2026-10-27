'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { useState } from 'react'

type NavItem = {
  name: string
  href: string
  icon: React.ReactNode
}

function Icon({ name }: { name: string }) {
  const paths: Record<string, React.ReactNode> = {
    home: (
      <>
        <path d="M3 10.5 12 3l9 7.5" />
        <path d="M5.5 9.5V21h13V9.5" />
        <path d="M9.5 21v-6h5v6" />
      </>
    ),
    pos: (
      <>
        <path d="M5 4h14v17l-3-2-4 2-4-2-3 2V4Z" />
        <path d="M8.5 8h7M8.5 12h7M8.5 16h4" />
      </>
    ),
    finance: (
      <>
        <rect x="3" y="6" width="18" height="13" rx="2" />
        <path d="M3 10h18M7 15h3" />
      </>
    ),
    repair: (
      <>
        <path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L4 17l3 3 5.3-5.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.9-2.9 2.4-2.6Z" />
      </>
    ),
    inventory: (
      <>
        <path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z" />
        <path d="m4.5 7.5 7.5 4 7.5-4M12 11.5V21" />
      </>
    ),
    clients: (
      <>
        <circle cx="9" cy="8" r="3" />
        <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
        <path d="M16 5.5a3 3 0 0 1 0 5.5M18.5 14.5c1.6.8 2.5 2.3 2.5 4.5" />
      </>
    ),
    cash: (
      <>
        <rect x="3" y="6" width="18" height="13" rx="2" />
        <circle cx="12" cy="12.5" r="2.5" />
        <path d="M7 6V4.5A1.5 1.5 0 0 1 8.5 3h9A1.5 1.5 0 0 1 19 4.5V6" />
      </>
    ),
  }

  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name] ?? paths.home}
    </svg>
  )
}

const links: NavItem[] = [
  { name: 'Inicio', href: '/admin', icon: <Icon name="home" /> },
  { name: 'Vender', href: '/admin/pos', icon: <Icon name="pos" /> },
  { name: 'Financiaciones', href: '/admin/financiaciones', icon: <Icon name="finance" /> },
  { name: 'Reparaciones', href: '/admin/reparaciones', icon: <Icon name="repair" /> },
  { name: 'Inventario', href: '/admin/inventario', icon: <Icon name="inventory" /> },
  { name: 'Clientes', href: '/admin/clientes', icon: <Icon name="clients" /> },
  { name: 'Caja y reportes', href: '/admin/caja-reportes', icon: <Icon name="cash" /> },
]

function NavLinks({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <>
      {links.map(link => {
        const active =
          pathname === link.href ||
          (link.href !== '/admin' && pathname.startsWith(`${link.href}/`))
        return (
          <Link
            key={link.name}
            href={link.href}
            onClick={onNavigate}
            aria-current={active ? 'page' : undefined}
            className={`group relative flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all ${
              active
                ? 'border border-blue-400/20 bg-blue-500/10 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]'
                : 'border border-transparent text-zinc-400 hover:bg-white/4 hover:text-white'
            }`}
          >
            {active && (
              <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-blue-400" />
            )}
            <span
              className={`transition-colors ${
                active ? 'text-blue-300' : 'text-zinc-500 group-hover:text-zinc-300'
              }`}
            >
              {link.icon}
            </span>
            {link.name}
          </Link>
        )
      })}
    </>
  )
}

function Brand() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-blue-400/25 bg-linear-to-br from-blue-500/25 to-cyan-500/10 text-sm font-black text-blue-200 shadow-lg shadow-blue-950/30">
        iP
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-bold tracking-tight text-white">Sistema iPhones</p>
        <p className="truncate text-[11px] text-zinc-500">Panel de gestión</p>
      </div>
    </div>
  )
}

export default function Sidebar() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  if (pathname === '/login') return null

  return (
    <>
      <aside className="hidden w-60 shrink-0 flex-col border-r border-zinc-800/70 bg-zinc-950/75 backdrop-blur-xl md:flex lg:w-64">
        <div className="shrink-0 border-b border-zinc-800/70 px-5 py-5">
          <Brand />
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          <p className="px-3 pb-2 pt-1 text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-600">
            Menú
          </p>
          <NavLinks pathname={pathname} />
        </nav>
        <div className="shrink-0 border-t border-zinc-800/70 p-3">
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="flex w-full items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-sm text-zinc-500 transition hover:bg-white/4 hover:text-white"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M10 17l5-5-5-5M15 12H3" />
              <path d="M14 3h5a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-5" />
            </svg>
            Cerrar sesión
          </button>
        </div>
      </aside>

      <div className="fixed left-0 right-0 top-0 z-40 flex h-14 items-center justify-between border-b border-zinc-800/70 bg-zinc-950/85 px-4 backdrop-blur-xl md:hidden">
        <Brand />
        <button
          onClick={() => setOpen(true)}
          aria-label="Abrir menú"
          className="rounded-xl p-2 text-zinc-400 transition hover:bg-zinc-800 hover:text-white"
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex md:hidden" onClick={() => setOpen(false)}>
          <div className="animate-fade-in absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <aside
            className="animate-toast-in relative flex h-full w-72 max-w-[85vw] flex-col border-r border-zinc-800/70 bg-zinc-950"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex shrink-0 items-center justify-between border-b border-zinc-800/70 px-5 py-4">
              <Brand />
              <button
                onClick={() => setOpen(false)}
                aria-label="Cerrar menú"
                className="rounded-lg p-1.5 text-zinc-400 transition hover:bg-zinc-800 hover:text-white"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <nav className="flex-1 space-y-1 overflow-y-auto p-3">
              <NavLinks pathname={pathname} onNavigate={() => setOpen(false)} />
            </nav>
            <div className="shrink-0 border-t border-zinc-800/70 p-3">
              <button
                onClick={() => signOut({ callbackUrl: '/login' })}
                className="flex w-full items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-sm text-zinc-500 transition hover:bg-white/4 hover:text-white"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M10 17l5-5-5-5M15 12H3" />
                  <path d="M14 3h5a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-5" />
                </svg>
                Cerrar sesión
              </button>
            </div>
          </aside>
        </div>
      )}
    </>
  )
}
