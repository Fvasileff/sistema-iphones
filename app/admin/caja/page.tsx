import { redirect } from 'next/navigation'

export default function CajaRedirectPage() {
  redirect('/admin/caja-reportes?tab=caja')
}
