import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Package, Pencil, PackagePlus, PackageMinus,
  BarChart3, ShoppingCart, Coins, TrendingUp, Calculator,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Modal } from '@/components/ui/modal'
import { DataTable, type Column } from '@/components/ui/data-table'
import { PageSpinner } from '@/components/ui/spinner'
import { useToast } from '@/store/toast.store'
import { useAuthStore } from '@/store/auth.store'

const stockTypeConfig: Record<string, { bg: string; text: string; label: string }> = {
  ENTRY: { bg: 'bg-lime-400/15', text: 'text-lime-400', label: 'ENTRADA' },
  EXIT: { bg: 'bg-red-400/15', text: 'text-red-400', label: 'SALIDA' },
  ADJUSTMENT: { bg: 'bg-amber-400/15', text: 'text-amber-400', label: 'AJUSTE' },
  RETURN: { bg: 'bg-cyan-400/15', text: 'text-cyan-400', label: 'DEVOLUCION' },
}

const saleStatusConfig: Record<string, { bg: string; text: string; label: string }> = {
  COMPLETED: { bg: 'bg-lime-400/15', text: 'text-lime-400', label: 'COMPLETADA' },
  REFUNDED: { bg: 'bg-amber-400/15', text: 'text-amber-400', label: 'REEMBOLSADA' },
  CANCELLED: { bg: 'bg-red-400/15', text: 'text-red-400', label: 'CANCELADA' },
}

function UrbanBadge({ bg, text, label }: { bg: string; text: string; label: string }) {
  return (
    <span className={`${bg} ${text} px-2 py-0.5 text-[10px] font-bold tracking-widest uppercase font-mono`}>
      {label}
    </span>
  )
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('es-ES', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  })
}

function formatDateTime(d: string) {
  return new Date(d).toLocaleDateString('es-ES', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const toast = useToast()
  const { user } = useAuthStore()

  const [product, setProduct] = useState<any>(null)
  const [stats, setStats] = useState<any>(null)
  const [categories, setCategories] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'sales' | 'stock'>('sales')

  // Sales tab
  const [sales, setSales] = useState<any[]>([])
  const [salesPagination, setSalesPagination] = useState<any>(null)
  const [salesPage, setSalesPage] = useState(1)
  const [salesLoading, setSalesLoading] = useState(false)

  // Stock tab
  const [movements, setMovements] = useState<any[]>([])
  const [movementsPagination, setMovementsPagination] = useState<any>(null)
  const [movementsPage, setMovementsPage] = useState(1)
  const [movementsLoading, setMovementsLoading] = useState(false)

  // Edit modal
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editSaving, setEditSaving] = useState(false)
  const [editForm, setEditForm] = useState({
    name: '', description: '', sku: '', pointsPrice: '',
    categoryId: '', minStock: '0', unit: 'unidad',
  })

  // Stock entry modal
  const [entryModalOpen, setEntryModalOpen] = useState(false)
  const [entryQty, setEntryQty] = useState('')
  const [entryNotes, setEntryNotes] = useState('')
  const [entrySaving, setEntrySaving] = useState(false)

  // Stock adjustment modal
  const [adjustModalOpen, setAdjustModalOpen] = useState(false)
  const [adjustQty, setAdjustQty] = useState('')
  const [adjustReason, setAdjustReason] = useState('')
  const [adjustNotes, setAdjustNotes] = useState('')
  const [adjustSaving, setAdjustSaving] = useState(false)

  useEffect(() => {
    if (id) loadProduct()
  }, [id])

  useEffect(() => {
    if (id && activeTab === 'sales') loadSales()
  }, [id, activeTab, salesPage])

  useEffect(() => {
    if (id && activeTab === 'stock') loadMovements()
  }, [id, activeTab, movementsPage])

  async function loadProduct() {
    setLoading(true)
    try {
      const [prodRes, statsRes, catRes] = await Promise.all([
        window.api.product.getById(id!),
        window.api.product.getStats(id!),
        window.api.category.getAll(),
      ])
      if (prodRes.success) setProduct(prodRes.data)
      if (statsRes.success) setStats(statsRes.data)
      if (catRes.success) setCategories(catRes.data)
    } finally {
      setLoading(false)
    }
  }

  async function loadSales() {
    setSalesLoading(true)
    try {
      const res = await window.api.product.getSales(id!, { page: salesPage, pageSize: 10 })
      if (res.success) {
        setSales(res.data.items)
        setSalesPagination(res.data)
      }
    } finally {
      setSalesLoading(false)
    }
  }

  async function loadMovements() {
    setMovementsLoading(true)
    try {
      const res = await window.api.stock.getByProduct(id!, { page: movementsPage, pageSize: 10 })
      if (res.success) {
        setMovements(res.data.items)
        setMovementsPagination(res.data)
      }
    } finally {
      setMovementsLoading(false)
    }
  }

  function openEditModal() {
    if (!product) return
    setEditForm({
      name: product.name,
      description: product.description || '',
      sku: product.sku || '',
      pointsPrice: String(product.pointsPrice),
      categoryId: product.categoryId,
      minStock: String(product.minStock),
      unit: product.unit || 'unidad',
    })
    setEditModalOpen(true)
  }

  async function handleEditSave() {
    setEditSaving(true)
    try {
      const res = await window.api.product.update(id!, {
        name: editForm.name,
        description: editForm.description || undefined,
        sku: editForm.sku || undefined,
        pointsPrice: parseFloat(editForm.pointsPrice),
        categoryId: editForm.categoryId,
        minStock: parseFloat(editForm.minStock) || 0,
        unit: editForm.unit,
      })
      if (res.success) {
        toast.success('Producto actualizado')
        setEditModalOpen(false)
        setProduct(res.data)
      } else {
        toast.error(res.error || 'Error')
      }
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setEditSaving(false)
    }
  }

  function openEntryModal() {
    setEntryQty('')
    setEntryNotes('')
    setEntryModalOpen(true)
  }

  async function handleStockEntry() {
    const qty = parseFloat(entryQty)
    if (!qty || qty <= 0) { toast.error('Cantidad invalida'); return }
    setEntrySaving(true)
    try {
      const res = await window.api.stock.addEntry({
        productId: id!,
        quantity: qty,
        userId: user!.id,
        notes: entryNotes || undefined,
      })
      if (res.success) {
        toast.success(`+${qty} unidades añadidas`)
        setEntryModalOpen(false)
        // Refresh product + stats + movements
        const [prodRes, statsRes] = await Promise.all([
          window.api.product.getById(id!),
          window.api.product.getStats(id!),
        ])
        if (prodRes.success) setProduct(prodRes.data)
        if (statsRes.success) setStats(statsRes.data)
        if (activeTab === 'stock') loadMovements()
      } else {
        toast.error(res.error || 'Error')
      }
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setEntrySaving(false)
    }
  }

  function openAdjustModal() {
    setAdjustQty('')
    setAdjustReason('')
    setAdjustNotes('')
    setAdjustModalOpen(true)
  }

  async function handleStockAdjust() {
    const qty = parseFloat(adjustQty)
    if (!qty || qty === 0) { toast.error('Cantidad invalida'); return }
    if (!adjustReason.trim()) { toast.error('Motivo es requerido'); return }
    setAdjustSaving(true)
    try {
      const res = await window.api.stock.addAdjustment({
        productId: id!,
        quantity: qty,
        userId: user!.id,
        reason: adjustReason,
        notes: adjustNotes || undefined,
      })
      if (res.success) {
        toast.success(`Ajuste de ${qty} aplicado`)
        setAdjustModalOpen(false)
        const [prodRes, statsRes] = await Promise.all([
          window.api.product.getById(id!),
          window.api.product.getStats(id!),
        ])
        if (prodRes.success) setProduct(prodRes.data)
        if (statsRes.success) setStats(statsRes.data)
        if (activeTab === 'stock') loadMovements()
      } else {
        toast.error(res.error || 'Error')
      }
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setAdjustSaving(false)
    }
  }

  // Column definitions
  const salesColumns: Column<any>[] = [
    { key: 'saleNumber', header: 'Numero', render: (s) => <span className="font-mono text-xs font-bold">{s.saleNumber}</span> },
    {
      key: 'member', header: 'Socio', render: (s) => (
        <button
          onClick={(e) => { e.stopPropagation(); navigate(`/members/${s.member.id}`) }}
          className="text-violet-400 hover:text-violet-300 transition-colors font-medium"
        >
          {s.member.firstName} {s.member.lastName}
        </button>
      ),
    },
    {
      key: 'quantity', header: 'Cantidad', render: (s) => {
        const item = s.items[0]
        return <span className="font-mono">{item?.quantity ?? '-'}</span>
      },
    },
    {
      key: 'points', header: 'Puntos', render: (s) => {
        const item = s.items[0]
        return <span className="font-mono font-bold text-lime-400">{item?.totalPoints ?? '-'} pts</span>
      },
    },
    { key: 'soldBy', header: 'Vendedor', render: (s) => s.soldBy?.username || '-' },
    { key: 'saleDate', header: 'Fecha', render: (s) => <span className="font-mono text-xs">{formatDateTime(s.saleDate)}</span> },
    {
      key: 'status', header: 'Estado', render: (s) => {
        const c = saleStatusConfig[s.status] || saleStatusConfig.COMPLETED
        return <UrbanBadge {...c} />
      },
    },
  ]

  const movementsColumns: Column<any>[] = [
    {
      key: 'type', header: 'Tipo', render: (m) => {
        const c = stockTypeConfig[m.type] || { bg: 'bg-gray-500/15', text: 'text-gray-400', label: m.type }
        return <UrbanBadge {...c} />
      },
    },
    {
      key: 'quantity', header: 'Cantidad', render: (m) => (
        <span className={`font-mono font-bold ${m.quantity >= 0 ? 'text-lime-400' : 'text-red-400'}`}>
          {m.quantity >= 0 ? '+' : ''}{m.quantity}
        </span>
      ),
    },
    { key: 'stockAfter', header: 'Stock despues', render: (m) => <span className="font-mono">{m.stockAfter}</span> },
    { key: 'reason', header: 'Motivo', render: (m) => m.reason || '-' },
    { key: 'user', header: 'Usuario', render: (m) => m.user?.username || '-' },
    { key: 'createdAt', header: 'Fecha', render: (m) => <span className="font-mono text-xs">{formatDateTime(m.createdAt)}</span> },
  ]

  if (loading) return <PageSpinner />
  if (!product) {
    return (
      <div className="text-center py-20 space-y-4">
        <p className="text-zinc-400 font-mono">PRODUCTO NO ENCONTRADO</p>
        <Button variant="secondary" onClick={() => navigate('/products')}>Volver</Button>
      </div>
    )
  }

  const categoryOptions = categories.map(c => ({ value: c.id, label: c.name }))
  const isLowStock = product.currentStock <= product.minStock

  const tabs = [
    { key: 'sales' as const, label: 'VENTAS' },
    { key: 'stock' as const, label: 'MOVIMIENTOS DE STOCK' },
  ]

  return (
    <div className="space-y-5 fade-in">
      {/* Hero Header */}
      <div className="bg-zinc-900 rounded-xl p-6 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-400 via-indigo-500 to-violet-400" />
        <div className="flex items-start gap-4">
          <button
            onClick={() => navigate('/products')}
            className="mt-1 p-2 rounded-lg text-zinc-500 hover:text-blue-400 hover:bg-zinc-800 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-black text-white tracking-tight uppercase">
                {product.name}
              </h1>
              {product.sku && (
                <span className="bg-zinc-700 text-zinc-300 px-2 py-0.5 text-[10px] font-bold tracking-widest uppercase font-mono">
                  {product.sku}
                </span>
              )}
              <span className="bg-blue-400/15 text-blue-400 px-2 py-0.5 text-[10px] font-bold tracking-widest uppercase font-mono">
                {product.category?.name}
              </span>
              {isLowStock && <Badge variant="warning">Stock Bajo</Badge>}
              {!product.isActive && (
                <UrbanBadge bg="bg-red-500/20" text="text-red-400" label="INACTIVO" />
              )}
            </div>
            {product.description && (
              <p className="text-xs text-zinc-500 mt-2 font-mono tracking-wide">
                {product.description}
              </p>
            )}
          </div>
          {/* Price display + actions */}
          <div className="hidden sm:flex items-center gap-4">
            <div className="flex flex-col gap-1.5">
              <Button size="sm" onClick={openEditModal}>
                <Pencil size={14} /> Editar
              </Button>
              <Button size="sm" variant="secondary" onClick={openEntryModal}>
                <PackagePlus size={14} /> Entrada
              </Button>
              <Button size="sm" variant="secondary" onClick={openAdjustModal}>
                <PackageMinus size={14} /> Ajustar
              </Button>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-zinc-500 font-mono tracking-widest uppercase">Precio</p>
              <p className="text-4xl font-black text-lime-400 font-mono leading-none mt-1">{product.pointsPrice}</p>
              <p className="text-[10px] text-zinc-600 font-mono tracking-widest">PUNTOS</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="bg-zinc-900 rounded-lg p-4 border-l-2 border-lime-400">
          <div className="flex items-center gap-1.5 mb-2">
            <Package size={13} className="text-lime-400" />
            <span className="text-[10px] font-mono tracking-widest text-zinc-500 uppercase">Stock</span>
          </div>
          <p className="text-2xl font-black font-mono text-lime-400">{product.currentStock}</p>
          <p className="text-[10px] font-mono text-zinc-600 tracking-widest">{product.unit?.toUpperCase() || 'UNIDADES'}</p>
        </div>

        <div className="bg-zinc-900 rounded-lg p-4 border-l-2 border-cyan-400">
          <div className="flex items-center gap-1.5 mb-2">
            <TrendingUp size={13} className="text-cyan-400" />
            <span className="text-[10px] font-mono tracking-widest text-zinc-500 uppercase">Vendido</span>
          </div>
          <p className="text-2xl font-black font-mono text-cyan-400">{stats?.totalUnitsSold ?? 0}</p>
          <p className="text-[10px] font-mono text-zinc-600 tracking-widest">UNIDADES TOTAL</p>
        </div>

        <div className="bg-zinc-900 rounded-lg p-4 border-l-2 border-orange-400">
          <div className="flex items-center gap-1.5 mb-2">
            <Coins size={13} className="text-orange-400" />
            <span className="text-[10px] font-mono tracking-widest text-zinc-500 uppercase">Puntos</span>
          </div>
          <p className="text-2xl font-black font-mono text-orange-400">{stats?.totalPointsGenerated ?? 0}</p>
          <p className="text-[10px] font-mono text-zinc-600 tracking-widest">PTS GENERADOS</p>
        </div>

        <div className="bg-zinc-900 rounded-lg p-4 border-l-2 border-violet-400">
          <div className="flex items-center gap-1.5 mb-2">
            <ShoppingCart size={13} className="text-violet-400" />
            <span className="text-[10px] font-mono tracking-widest text-zinc-500 uppercase">Ventas</span>
          </div>
          <p className="text-2xl font-black font-mono text-violet-400">{stats?.salesCount ?? 0}</p>
          <p className="text-[10px] font-mono text-zinc-600 tracking-widest">OPERACIONES</p>
        </div>

        <div className="bg-zinc-900 rounded-lg p-4 border-l-2 border-fuchsia-400">
          <div className="flex items-center gap-1.5 mb-2">
            <Calculator size={13} className="text-fuchsia-400" />
            <span className="text-[10px] font-mono tracking-widest text-zinc-500 uppercase">Media</span>
          </div>
          <p className="text-2xl font-black font-mono text-fuchsia-400">{(stats?.avgPerSale ?? 0).toFixed(1)}</p>
          <p className="text-[10px] font-mono text-zinc-600 tracking-widest">UDS/VENTA</p>
        </div>
      </div>

      {/* Product Info Card */}
      <div className="bg-zinc-900 rounded-lg p-5">
        <h2 className="text-xs font-mono font-bold tracking-widest text-zinc-400 uppercase mb-4 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-blue-400 inline-block" />
          Informacion del producto
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-4 text-sm">
          <div>
            <span className="text-[10px] font-mono tracking-widest text-zinc-600 uppercase">SKU</span>
            <p className="font-mono font-medium text-zinc-200 mt-0.5">{product.sku || '-'}</p>
          </div>
          <div>
            <span className="text-[10px] font-mono tracking-widest text-zinc-600 uppercase">Categoria</span>
            <p className="font-mono font-medium text-zinc-200 mt-0.5">{product.category?.name || '-'}</p>
          </div>
          <div>
            <span className="text-[10px] font-mono tracking-widest text-zinc-600 uppercase">Precio</span>
            <p className="font-mono font-medium text-lime-400 mt-0.5">{product.pointsPrice} pts</p>
          </div>
          <div>
            <span className="text-[10px] font-mono tracking-widest text-zinc-600 uppercase">Unidad</span>
            <p className="font-mono font-medium text-zinc-200 mt-0.5">{product.unit || 'unidad'}</p>
          </div>
          <div>
            <span className="text-[10px] font-mono tracking-widest text-zinc-600 uppercase">Stock Actual</span>
            <p className={`font-mono font-medium mt-0.5 ${isLowStock ? 'text-amber-400' : 'text-zinc-200'}`}>
              {product.currentStock}
            </p>
          </div>
          <div>
            <span className="text-[10px] font-mono tracking-widest text-zinc-600 uppercase">Stock Minimo</span>
            <p className="font-mono font-medium text-zinc-200 mt-0.5">{product.minStock}</p>
          </div>
          <div>
            <span className="text-[10px] font-mono tracking-widest text-zinc-600 uppercase">Creado</span>
            <p className="font-mono font-medium text-zinc-200 mt-0.5">{formatDate(product.createdAt)}</p>
          </div>
          <div>
            <span className="text-[10px] font-mono tracking-widest text-zinc-600 uppercase">Actualizado</span>
            <p className="font-mono font-medium text-zinc-200 mt-0.5">{formatDate(product.updatedAt)}</p>
          </div>
        </div>
      </div>

      {/* Mobile actions */}
      <div className="flex gap-2 sm:hidden">
        <Button size="sm" onClick={openEditModal} className="flex-1"><Pencil size={14} /> Editar</Button>
        <Button size="sm" variant="secondary" onClick={openEntryModal} className="flex-1"><PackagePlus size={14} /> Entrada</Button>
        <Button size="sm" variant="secondary" onClick={openAdjustModal} className="flex-1"><PackageMinus size={14} /> Ajustar</Button>
      </div>

      {/* Tabs */}
      <div>
        <div className="flex gap-0 mb-4 bg-zinc-900 rounded-lg p-1 inline-flex">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 text-[11px] font-mono font-bold tracking-widest transition-all rounded-md ${
                activeTab === tab.key
                  ? 'bg-lime-400 text-zinc-900'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'sales' && (
          <DataTable
            columns={salesColumns}
            data={sales}
            loading={salesLoading}
            pagination={salesPagination}
            onPageChange={setSalesPage}
            emptyMessage="Sin ventas para este producto"
          />
        )}

        {activeTab === 'stock' && (
          <DataTable
            columns={movementsColumns}
            data={movements}
            loading={movementsLoading}
            pagination={movementsPagination}
            onPageChange={setMovementsPage}
            emptyMessage="Sin movimientos de stock"
          />
        )}
      </div>

      {/* Edit Modal */}
      <Modal open={editModalOpen} onClose={() => setEditModalOpen(false)} title="Editar Producto" size="lg">
        <div className="grid grid-cols-2 gap-4">
          <Input label="Nombre *" value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} required />
          <Input label="SKU" value={editForm.sku} onChange={e => setEditForm(f => ({ ...f, sku: e.target.value }))} />
          <div className="col-span-2">
            <Input label="Descripcion" value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          <Select label="Categoria *" options={categoryOptions} placeholder="Seleccionar..." value={editForm.categoryId} onChange={e => setEditForm(f => ({ ...f, categoryId: e.target.value }))} />
          <Input label="Precio (puntos) *" type="number" step="0.01" min="0" value={editForm.pointsPrice} onChange={e => setEditForm(f => ({ ...f, pointsPrice: e.target.value }))} required />
          <Input label="Stock Minimo" type="number" step="0.01" min="0" value={editForm.minStock} onChange={e => setEditForm(f => ({ ...f, minStock: e.target.value }))} />
          <Select label="Unidad" options={[
            { value: 'unidad', label: 'Unidad' }, { value: 'gramo', label: 'Gramo' },
            { value: 'ml', label: 'Mililitro' }, { value: 'kg', label: 'Kilogramo' },
          ]} value={editForm.unit} onChange={e => setEditForm(f => ({ ...f, unit: e.target.value }))} />
        </div>
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-zinc-800">
          <Button variant="secondary" onClick={() => setEditModalOpen(false)}>Cancelar</Button>
          <Button onClick={handleEditSave} loading={editSaving}>Guardar</Button>
        </div>
      </Modal>

      {/* Stock Entry Modal */}
      <Modal open={entryModalOpen} onClose={() => setEntryModalOpen(false)} title="Entrada de Stock" size="sm">
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-lime-400/10 px-4 py-3 rounded-lg border border-lime-400/20">
            <div>
              <p className="font-medium text-zinc-100">{product.name}</p>
              <p className="text-xs text-lime-400">Stock actual: {product.currentStock} {product.unit}</p>
            </div>
          </div>
          <Input
            label="Cantidad *"
            type="number"
            min="0.01"
            step="0.01"
            value={entryQty}
            onChange={e => setEntryQty(e.target.value)}
            placeholder="Ej: 50"
          />
          <Input
            label="Notas (opcional)"
            value={entryNotes}
            onChange={e => setEntryNotes(e.target.value)}
            placeholder="Proveedor, lote, etc."
          />
        </div>
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-zinc-800">
          <Button variant="secondary" onClick={() => setEntryModalOpen(false)}>Cancelar</Button>
          <Button onClick={handleStockEntry} loading={entrySaving} disabled={!entryQty || parseFloat(entryQty) <= 0}>
            <PackagePlus size={16} /> Registrar Entrada
          </Button>
        </div>
      </Modal>

      {/* Stock Adjustment Modal */}
      <Modal open={adjustModalOpen} onClose={() => setAdjustModalOpen(false)} title="Ajuste de Stock" size="sm">
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-amber-400/10 px-4 py-3 rounded-lg border border-amber-400/20">
            <div>
              <p className="font-medium text-zinc-100">{product.name}</p>
              <p className="text-xs text-amber-400">Stock actual: {product.currentStock} {product.unit}</p>
            </div>
          </div>
          <p className="text-xs text-zinc-400">
            Usa un numero positivo para sumar y negativo para restar stock.
          </p>
          <Input
            label="Cantidad *"
            type="number"
            step="0.01"
            value={adjustQty}
            onChange={e => setAdjustQty(e.target.value)}
            placeholder="Ej: -10 o 10"
          />
          <Input
            label="Motivo *"
            value={adjustReason}
            onChange={e => setAdjustReason(e.target.value)}
            placeholder="Motivo obligatorio"
          />
          <Input
            label="Notas (opcional)"
            value={adjustNotes}
            onChange={e => setAdjustNotes(e.target.value)}
            placeholder="Detalles adicionales"
          />
        </div>
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-zinc-800">
          <Button variant="secondary" onClick={() => setAdjustModalOpen(false)}>Cancelar</Button>
          <Button
            onClick={handleStockAdjust}
            loading={adjustSaving}
            disabled={!adjustQty || parseFloat(adjustQty) === 0 || !adjustReason.trim()}
          >
            <BarChart3 size={16} /> Aplicar Ajuste
          </Button>
        </div>
      </Modal>
    </div>
  )
}
