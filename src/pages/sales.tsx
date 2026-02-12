import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShoppingCart, Plus, Eye, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Modal } from '@/components/ui/modal'
import { DataTable, type Column } from '@/components/ui/data-table'
import { useToast } from '@/store/toast.store'
import { useAuthStore } from '@/store/auth.store'

const statusMap: Record<string, { variant: 'success' | 'warning' | 'danger'; label: string }> = {
  COMPLETED: { variant: 'success', label: 'Completada' },
  REFUNDED: { variant: 'warning', label: 'Reembolsada' },
  CANCELLED: { variant: 'danger', label: 'Cancelada' },
}

export default function SalesPage() {
  const toast = useToast()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [sales, setSales] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState<any>(null)
  const [search, setSearch] = useState('')
  const [detailOpen, setDetailOpen] = useState(false)
  const [selectedSale, setSelectedSale] = useState<any>(null)

  useEffect(() => { load() }, [page, search])

  async function load() {
    setLoading(true)
    try {
      const res = await window.api.sale.getAll({ page, pageSize: 15, search })
      if (res.success) {
        setSales(res.data.items)
        setPagination(res.data)
      }
    } finally {
      setLoading(false)
    }
  }

  async function viewDetail(sale: any) {
    const res = await window.api.sale.getById(sale.id)
    if (res.success) {
      setSelectedSale(res.data)
      setDetailOpen(true)
    }
  }

  async function handleRefund(saleId: string) {
    if (!confirm('Reembolsar esta venta? Se devolvera el stock y los puntos al socio.')) return
    const res = await window.api.sale.refund(saleId, user!.id)
    if (res.success) {
      toast.success('Venta reembolsada')
      setDetailOpen(false)
      load()
    } else {
      toast.error(res.error || 'Error')
    }
  }

  const formatDate = (d: string) => new Date(d).toLocaleDateString('es-ES', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })

  const columns: Column<any>[] = [
    { key: 'saleNumber', header: 'Numero', render: (s) => <span className="font-mono text-sm">{s.saleNumber}</span> },
    { key: 'member', header: 'Socio', render: (s) => `${s.member?.firstName || ''} ${s.member?.lastName || ''}` },
    { key: 'totalPoints', header: 'Total', render: (s) => <span className="font-mono font-bold text-lime-400">{s.totalPoints} pts</span> },
    { key: 'items', header: 'Items', render: (s) => s._count?.items ?? s.totalItems },
    { key: 'soldBy', header: 'Vendedor', render: (s) => s.soldBy?.username || '-' },
    { key: 'saleDate', header: 'Fecha', render: (s) => formatDate(s.saleDate) },
    { key: 'status', header: 'Estado', render: (s) => {
      const st = statusMap[s.status] || statusMap.COMPLETED
      return <Badge variant={st.variant}>{st.label}</Badge>
    }},
  ]

  return (
    <div className="space-y-6 fade-in">
      <div className="bg-zinc-900 rounded-xl p-5 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-400 via-amber-500 to-yellow-400" />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ShoppingCart size={20} className="text-orange-400" />
            <div>
              <h1 className="text-xl font-black text-white tracking-tight uppercase">Ventas</h1>
              <p className="text-[10px] font-mono tracking-widest text-zinc-500 uppercase mt-1">Historial de ventas</p>
            </div>
          </div>
          <Button onClick={() => navigate('/sales/new')}><Plus size={16} /> Nueva Venta</Button>
        </div>
      </div>

      <div className="max-w-sm">
        <Input placeholder="Buscar por numero de venta..." value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
      </div>

      <DataTable columns={columns} data={sales} loading={loading} pagination={pagination} onPageChange={setPage}
        actions={(s) => (
          <>
            <Button variant="ghost" size="sm" onClick={() => viewDetail(s)}><Eye size={14} /></Button>
            {s.status === 'COMPLETED' && (
              <Button variant="ghost" size="sm" onClick={() => handleRefund(s.id)}><RotateCcw size={14} className="text-amber-400" /></Button>
            )}
          </>
        )}
      />

      <Modal open={detailOpen} onClose={() => setDetailOpen(false)} title={`Venta ${selectedSale?.saleNumber || ''}`} size="lg">
        {selectedSale && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-[10px] font-mono tracking-widest text-zinc-600 uppercase">Socio:</span> <span className="font-mono font-medium text-zinc-200">{selectedSale.member?.firstName} {selectedSale.member?.lastName}</span></div>
              <div><span className="text-[10px] font-mono tracking-widest text-zinc-600 uppercase">Vendedor:</span> <span className="font-mono font-medium text-zinc-200">{selectedSale.soldBy?.username}</span></div>
              <div><span className="text-[10px] font-mono tracking-widest text-zinc-600 uppercase">Fecha:</span> <span className="font-mono text-zinc-300">{formatDate(selectedSale.saleDate)}</span></div>
              <div><span className="text-[10px] font-mono tracking-widest text-zinc-600 uppercase">Estado:</span> <Badge variant={statusMap[selectedSale.status]?.variant || 'default'}>{statusMap[selectedSale.status]?.label || selectedSale.status}</Badge></div>
            </div>

            <div className="border border-zinc-800 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-zinc-800">
                  <tr>
                    <th className="px-4 py-2 text-left text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-widest">Producto</th>
                    <th className="px-4 py-2 text-right text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-widest">Cantidad</th>
                    <th className="px-4 py-2 text-right text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-widest">Precio</th>
                    <th className="px-4 py-2 text-right text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-widest">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {selectedSale.items?.map((item: any) => (
                    <tr key={item.id}>
                      <td className="px-4 py-2 font-mono text-zinc-300">{item.product?.name}</td>
                      <td className="px-4 py-2 text-right font-mono text-zinc-300">{item.quantity}</td>
                      <td className="px-4 py-2 text-right font-mono text-zinc-300">{item.pointsPrice} pts</td>
                      <td className="px-4 py-2 text-right font-mono font-bold text-lime-400">{item.totalPoints} pts</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-zinc-800">
                  <tr>
                    <td colSpan={3} className="px-4 py-2 text-right font-mono font-bold text-zinc-300 uppercase text-[10px] tracking-widest">Total:</td>
                    <td className="px-4 py-2 text-right font-black font-mono text-lg text-lime-400">{selectedSale.totalPoints} pts</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {selectedSale.status === 'COMPLETED' && (
              <div className="flex justify-end pt-2">
                <Button variant="danger" size="sm" onClick={() => handleRefund(selectedSale.id)}>
                  <RotateCcw size={14} /> Reembolsar
                </Button>
              </div>
            )}
          </div>
        )}
      </Modal>

    </div>
  )
}
