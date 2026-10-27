import Tabs from '@/app/components/Tabs'
import CatalogoIphones from './CatalogoIphones'
import InventarioProductos from './InventarioProductos'

const TABS = ['iphones', 'repuestos', 'accesorios'] as const
type TabInventario = (typeof TABS)[number]

export default async function InventarioPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const { tab } = await searchParams
  const activo: TabInventario = TABS.includes(tab as TabInventario)
    ? (tab as TabInventario)
    : 'iphones'

  return (
    <div className="mx-auto max-w-5xl p-4 md:p-8">
      <Tabs
        activo={activo}
        tabs={[
          { key: 'iphones', label: 'iPhones financiados', href: '/admin/inventario?tab=iphones' },
          { key: 'repuestos', label: 'Repuestos', href: '/admin/inventario?tab=repuestos' },
          { key: 'accesorios', label: 'Accesorios', href: '/admin/inventario?tab=accesorios' },
        ]}
      />
      {activo === 'iphones' ? (
        <CatalogoIphones />
      ) : (
        <InventarioProductos
          key={activo}
          categoriaInicial={activo === 'repuestos' ? 'repuesto' : 'accesorio'}
        />
      )}
    </div>
  )
}
