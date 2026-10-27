import { redirect } from 'next/navigation'

export default function VentasRedirectPage() {
  redirect('/admin/financiaciones?tab=nueva')
}
