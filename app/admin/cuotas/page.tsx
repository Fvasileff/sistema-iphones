import { redirect } from 'next/navigation'

export default function CuotasRedirectPage() {
  redirect('/admin/financiaciones?tab=cuotas')
}
