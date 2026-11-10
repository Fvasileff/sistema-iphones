'use client'
import { SessionProvider } from 'next-auth/react'
import DelayProvider from './components/DelayProvider'
import { ToastProvider } from './components/ToastProvider'

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <DelayProvider>
        <ToastProvider>{children}</ToastProvider>
      </DelayProvider>
    </SessionProvider>
  )
}
