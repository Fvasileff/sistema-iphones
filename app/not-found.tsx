import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-3xl border border-zinc-800/80 bg-zinc-950/70 p-8 text-center shadow-2xl shadow-black/50 backdrop-blur-xl">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-blue-400/25 bg-blue-500/15 text-lg font-black text-blue-200">
          404
        </div>
        <h1 className="mt-6 text-2xl font-bold tracking-tight text-white">Página no encontrada</h1>
        <p className="mt-2 text-sm leading-relaxed text-zinc-400">
          La página que buscás no existe o fue movida.
        </p>
        <Link
          href="/admin"
          className="mt-7 inline-flex w-full items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-950/30 transition hover:bg-blue-500"
        >
          Volver al panel
        </Link>
      </div>
    </div>
  )
}
