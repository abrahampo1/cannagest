import { useState, useEffect } from 'react'
import { Warehouse, Plus, ArrowUpDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Modal } from '@/components/ui/modal'
import { DataTable, type Column } from '@/components/ui/data-table'
import { useToast } from '@/store/toast.store'
import { useAuthStore } from '@/store/auth.store'

const typeLabels: Record<string, { label: string; variant: 'success' | 'danger' | 'warning' | 'info' }> = {
  ENTRY: { label: 'Entrada', variant: 'success' },
  EXIT: { label: 'Salida', variant: 'danger' },
  ADJUSTMENT: { label: 'Ajuste', variant: 'warning' },
  RETURN: { label: 'Devolucion', variant: 'info' },
}

export default function StockPage() {
  const toast = useToast()
  const { user } = useAuthStore()
  const [movements, setMovements] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState<any>(null)
  const [productFilter, setProductFilter] = useState('')
  const [entryModalOpen, setEntryModalOpen] = useState(false)
  const [adjustModalOpen, setAdjustModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [entryForm, setEntryForm] = useState({ productId: '', quantity: '', notes: '' })
  const [adjustForm, setAdjustForm] = useState({ productId: '', quantity: '', reason: '', notes: '' })

  useEffect(() => { loadProducts() }, [])
  useEffect(() => { load() }, [page, productFilter])

  async function loadProducts() {
    const res = await window.api.product.getAll({ page: 1, pageSize: 200 })
    if (res.success) setProducts(res.data.items)
  }

  async function load() {
    setLoading(true)
    try {
      const params: any = { page, pageSize: 15 }
      if (productFilter) params.productId = productFilter
      const res = productFilter
        ? await window.api.stock.getByProduct(productFilter, { page, pageSize: 15 })
        : await window.api.stock.getMovements(params)
      if (res.success) {
        setMovements(res.data.items)
        setPagination(res.data)
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleEntry() {
    setSaving(true)
    try {
      const res = await window.api.stock.addEntry({
        productId: entryForm.productId,
        quantity: parseFloat(entryForm.quantity),
        userId: user!.id,
        notes: entryForm.notes || undefined,
      })
      if (res.success) {
        toast.success('Entrada registrada')
        setEntryModalOpen(false)
        setEntryForm({ productId: '', quantity: '', notes: '' })
        load()
        loadProducts()
      } else {
        toast.error(res.error || 'Error')
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleAdjustment() {
    setSaving(true)
    try {
      const res = await window.api.stock.addAdjustment({
        productId: adjustForm.productId,
        quantity: parseFloat(adjustForm.quantity),
        userId: user!.id,
        reason: adjustForm.reason,
        notes: adjustForm.notes || undefined,
      })
      if (res.success) {
        toast.success('Ajuste registrado')
        setAdjustModalOpen(false)
        setAdjustForm({ productId: '', quantity: '', reason: '', notes: '' })
        load()
        loadProducts()
      } else {
        toast.error(res.error || 'Error')
      }
    } finally {
      setSaving(false)
    }
  }

  const productOptions = products.map(p => ({
    value: p.id,
    label: `${p.name} (stock: ${p.currentStock} ${p.unit})`,
  }))

  const columns: Column<any>[] = [
    { key: 'product', header: 'Producto', render: (m) => <span className="font-medium text-zinc-100">{m.product?.name}</span> },
    { key: 'type', header: 'Tipo', render: (m) => {
      const l = typeLabels[m.type] || { label: m.type, variant: 'default' as const }
      return <Badge variant={l.variant}>{l.label}</Badge>
    }},
    { key: 'quantity', header: 'Cantidad', render: (m) => (
      <span className={m.quantity >= 0 ? 'text-lime-400 font-semibold' : 'text-red-400 font-semibold'}>
        {m.quantity >= 0 ? '+' : ''}{m.quantity}
      </span>
    )},
    { key: 'stockAfter', header: 'Stock Res.', render: (m) => m.stockAfter },
    { key: 'reason', header: 'Motivo', render: (m) => m.reason || '-' },
    { key: 'user', header: 'Usuario', render: (m) => m.user?.username || '-' },
    { key: 'createdAt', header: 'Fecha', render: (m) => new Date(m.createdAt).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }) },
  ]

  return (
    <div className="space-y-6 fade-in">
      <div className="bg-zinc-900 rounded-xl p-5 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-400 via-violet-500 to-purple-400" />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Warehouse size={20} className="text-indigo-400" />
            <div>
              <h1 className="text-xl font-black text-white tracking-tight uppercase">Inventario</h1>
              <p className="text-[10px] font-mono tracking-widest text-zinc-500 uppercase mt-1">Movimientos de stock</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setEntryModalOpen(true)}><Plus size={16} /> Entrada</Button>
            <Button variant="secondary" onClick={() => setAdjustModalOpen(true)}><ArrowUpDown size={16} /> Ajuste</Button>
          </div>
        </div>
      </div>

      <div className="max-w-sm">
        <Select options={[{ value: '', label: 'Todos los productos' }, ...productOptions]} value={productFilter} onChange={e => { setProductFilter(e.target.value); setPage(1) }} />
      </div>

      <DataTable columns={columns} data={movements} loading={loading} pagination={pagination} onPageChange={setPage} />

      {/* Entry Modal */}
      <Modal open={entryModalOpen} onClose={() => setEntryModalOpen(false)} title="Nueva Entrada de Stock">
        <div className="space-y-4">
          <Select label="Producto *" options={productOptions} placeholder="Seleccionar..." value={entryForm.productId} onChange={e => setEntryForm(f => ({ ...f, productId: e.target.value }))} />
          <Input label="Cantidad *" type="number" min="0.1" step="0.1" value={entryForm.quantity} onChange={e => setEntryForm(f => ({ ...f, quantity: e.target.value }))} />
          <Input label="Notas" value={entryForm.notes} onChange={e => setEntryForm(f => ({ ...f, notes: e.target.value }))} />
        </div>
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-zinc-800">
          <Button variant="secondary" onClick={() => setEntryModalOpen(false)}>Cancelar</Button>
          <Button onClick={handleEntry} loading={saving} disabled={!entryForm.productId || !entryForm.quantity}>Registrar</Button>
        </div>
      </Modal>

      {/* Adjustment Modal */}
      <Modal open={adjustModalOpen} onClose={() => setAdjustModalOpen(false)} title="Ajuste de Stock">
        <div className="space-y-4">
          <Select label="Producto *" options={productOptions} placeholder="Seleccionar..." value={adjustForm.productId} onChange={e => setAdjustForm(f => ({ ...f, productId: e.target.value }))} />
          <Input label="Cantidad (+ o -) *" type="number" step="0.1" value={adjustForm.quantity} onChange={e => setAdjustForm(f => ({ ...f, quantity: e.target.value }))} placeholder="Ej: -5 o 10" />
          <Input label="Motivo *" value={adjustForm.reason} onChange={e => setAdjustForm(f => ({ ...f, reason: e.target.value }))} />
          <Input label="Notas" value={adjustForm.notes} onChange={e => setAdjustForm(f => ({ ...f, notes: e.target.value }))} />
        </div>
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-zinc-800">
          <Button variant="secondary" onClick={() => setAdjustModalOpen(false)}>Cancelar</Button>
          <Button onClick={handleAdjustment} loading={saving} disabled={!adjustForm.productId || !adjustForm.quantity || !adjustForm.reason}>Registrar</Button>
        </div>
      </Modal>
    </div>
  )
}
