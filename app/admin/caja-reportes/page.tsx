import Tabs from '@/app/components/Tabs'
import CajaDelDia from './CajaDelDia'
import Reportes from './Reportes'

export default async function CajaReportesPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const { tab } = await searchParams
  const activo = tab === 'reportes' ? 'reportes' : 'caja'

  return (
    <div className="mx-auto max-w-5xl p-4 md:p-8">
      <Tabs
        activo={activo}
        tabs={[
          { key: 'caja', label: 'Caja del día', href: '/admin/caja-reportes?tab=caja' },
          { key: 'reportes', label: 'Reportes', href: '/admin/caja-reportes?tab=reportes' },
        ]}
      />
      {activo === 'caja' ? <CajaDelDia /> : <Reportes />}
    </div>
  )
}
