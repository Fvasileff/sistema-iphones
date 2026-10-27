import Link from 'next/link'

export interface TabItem {
  key: string
  label: string
  href: string
  cantidad?: number
}

export default function Tabs({ tabs, activo }: { tabs: TabItem[]; activo: string }) {
  return (
    <div className="mb-5 flex gap-1 overflow-x-auto rounded-2xl border border-zinc-800/70 bg-zinc-900/60 p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] backdrop-blur">
      {tabs.map(tab => {
        const activa = tab.key === activo
        return (
          <Link
            key={tab.key}
            href={tab.href}
            scroll={false}
            aria-current={activa ? 'page' : undefined}
            className={`flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold transition-all ${
              activa
                ? 'bg-zinc-800 text-white shadow-sm shadow-black/30'
                : 'text-zinc-500 hover:bg-white/4 hover:text-zinc-200'
            }`}
          >
            {activa && <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />}
            {tab.label}
            {tab.cantidad !== undefined && (
              <span
                className={`rounded-full px-1.5 py-0.5 text-[10px] tabular-nums ${
                  activa ? 'bg-blue-500/20 text-blue-300' : 'bg-zinc-800 text-zinc-500'
                }`}
              >
                {tab.cantidad}
              </span>
            )}
          </Link>
        )
      })}
    </div>
  )
}
