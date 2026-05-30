'use client' // Asegúrate de incluir esto al inicio si no lo tenías, al usar SessionProvider
import { SessionProvider } from 'next-auth/react'
import Sidebar from '../components/Sidebar'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <div className="min-h-screen bg-gray-950 flex flex-col md:flex-row">
        <Sidebar /> 
        {/* Agregamos pt-14 para móviles y quitamos el padding superior en escritorio */}
        <main className="flex-1 p-4 md:p-8 pt-14 md:pt-8 overflow-auto">
          {children} 
        </main>
      </div>
    </SessionProvider>
  )
}