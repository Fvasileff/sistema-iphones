import { redirect } from 'next/navigation'

export default function IphonesRedirectPage() {
  redirect('/admin/inventario?tab=iphones')
}
