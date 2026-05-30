// app/layout.tsx
import { Geist } from 'next/font/google'
import './globals.css'

const geist = Geist({ subsets: ['latin'] })

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="h-full">
      <body className={`${geist.className} h-screen bg-zinc-950 text-white`}>
        {/* AQUÍ NO VA EL SIDEBAR. Solo el contenido principal. */}
        {children}
      </body>
    </html>
  )
}