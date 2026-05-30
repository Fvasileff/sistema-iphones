'use client'
import { SessionProvider } from 'next-auth/react'
import Sidebar from '../components/Sidebar'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <div className="min-h-screen bg-gray-950 flex flex-col md:flex-row">
        <Sidebar /> {/* El menú aparece aquí siempre */}
        <main className="flex-1 p-8 overflow-auto">
          {children} {/* Aquí se inyecta el contenido de cada página */}
        </main>
      </div>
    </SessionProvider>
  )
}