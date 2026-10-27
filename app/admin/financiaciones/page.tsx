import Tabs from '@/app/components/Tabs'
import NuevaFinanciacion from './NuevaFinanciacion'
import Cuotas from './Cuotas'

export default async function FinanciacionesPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const { tab } = await searchParams
  const activo = tab === 'cuotas' ? 'cuotas' : 'nueva'

  return (
    <div className="mx-auto max-w-4xl p-4 md:p-8">
      <Tabs
        activo={activo}
        tabs={[
          { key: 'nueva', label: 'Nueva financiación', href: '/admin/financiaciones?tab=nueva' },
          { key: 'cuotas', label: 'Cuotas', href: '/admin/financiaciones?tab=cuotas' },
        ]}
      />
      {activo === 'nueva' ? <NuevaFinanciacion /> : <Cuotas />}
    </div>
  )
}
