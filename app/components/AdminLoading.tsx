type Variant = 'dashboard' | 'list' | 'board' | 'form' | 'pos'

function Box({ className }: { className: string }) {
  return <div className={`skeleton rounded-xl ${className}`} />
}

export default function AdminLoading({
  label = 'Cargando...',
  variant = 'list',
}: {
  label?: string
  variant?: Variant
}) {
  return (
    <div
      className="mx-auto max-w-6xl p-4 md:p-8"
      role="status"
      aria-label={label}
      aria-busy="true"
    >
      <div className="mb-7 space-y-3">
        <Box className="h-8 w-52" />
        <Box className="h-3.5 w-72 max-w-full opacity-60" />
      </div>

      {variant === 'dashboard' && (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
            {Array.from({ length: 5 }).map((_, index) => (
              <div
                key={index}
                className="rounded-2xl border border-zinc-800/70 bg-zinc-900/50 p-5"
              >
                <Box className="h-3 w-24 opacity-60" />
                <Box className="mt-4 h-7 w-28" />
                <Box className="mt-3 h-3 w-16 opacity-40" />
              </div>
            ))}
          </div>
          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            {Array.from({ length: 2 }).map((_, index) => (
              <div
                key={index}
                className="rounded-2xl border border-zinc-800/70 bg-zinc-900/50 p-5"
              >
                <Box className="h-4 w-40" />
                <div className="mt-5 space-y-3">
                  {Array.from({ length: 4 }).map((_, row) => (
                    <Box key={row} className="h-12 w-full opacity-70" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {variant === 'list' && (
        <>
          <Box className="mb-4 h-12 w-full" />
          <div className="overflow-hidden rounded-2xl border border-zinc-800/70 bg-zinc-900/50">
            <div className="border-b border-zinc-800/70 px-5 py-4">
              <Box className="h-4 w-40" />
            </div>
            <div className="divide-y divide-zinc-800/60">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="flex items-center gap-4 px-5 py-4">
                  <Box className="h-10 w-10 shrink-0 rounded-full" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <Box className="h-3.5 w-48 max-w-full" />
                    <Box className="h-3 w-64 max-w-full opacity-50" />
                  </div>
                  <Box className="hidden h-3 w-24 opacity-50 sm:block" />
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {variant === 'board' && (
        <>
          <div className="mb-4 flex gap-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <Box key={index} className="h-9 w-28" />
            ))}
          </div>
          <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-5">
            {Array.from({ length: 5 }).map((_, column) => (
              <div
                key={column}
                className="rounded-2xl border border-zinc-800/70 bg-zinc-950/40 p-3"
              >
                <Box className="mb-3 h-4 w-28" />
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, card) => (
                    <Box key={card} className="h-28 w-full opacity-70" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {variant === 'form' && (
        <div className="grid gap-5 lg:grid-cols-[1fr_0.7fr]">
          <div className="space-y-4 rounded-2xl border border-zinc-800/70 bg-zinc-900/50 p-5">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="space-y-2">
                <Box className="h-3 w-24 opacity-60" />
                <Box className="h-12 w-full" />
              </div>
            ))}
          </div>
          <div className="space-y-4 rounded-2xl border border-zinc-800/70 bg-zinc-900/50 p-5">
            <Box className="h-4 w-36" />
            <Box className="h-24 w-full opacity-70" />
            <Box className="h-12 w-full" />
          </div>
        </div>
      )}

      {variant === 'pos' && (
        <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-4">
            <Box className="h-24 w-full" />
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <Box key={index} className="h-36 w-full" />
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-zinc-800/70 bg-zinc-900/50 p-5">
            <Box className="h-5 w-28" />
            <div className="mt-5 space-y-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <Box key={index} className="h-16 w-full opacity-70" />
              ))}
            </div>
            <Box className="mt-5 h-24 w-full opacity-60" />
          </div>
        </div>
      )}

      <span className="sr-only">{label}</span>
    </div>
  )
}
