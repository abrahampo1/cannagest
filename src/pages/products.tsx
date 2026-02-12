import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Package, Plus, Pencil, Trash2, Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Modal } from '@/components/ui/modal'
import { DataTable, type Column } from '@/components/ui/data-table'
import { useToast } from '@/store/toast.store'

export default function ProductsPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const [products, setProducts] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState<any>(null)
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: '', description: '', sku: '', pointsPrice: '',
    categoryId: '', currentStock: '0', minStock: '0', unit: 'unidad',
  })

  useEffect(() => { load() }, [page, search])
  useEffect(() => { loadCategories() }, [])

  async function loadCategories() {
    const res = await window.api.category.getAll()
    if (res.success) setCategories(res.data)
  }

  async function load() {
    setLoading(true)
    try {
      const res = await window.api.product.getAll({ page, pageSize: 15, search })
      if (res.success) {
        setProducts(res.data.items)
        setPagination(res.data)
      }
    } finally {
      setLoading(false)
    }
  }

  function openEdit(p: any) {
    setEditing(p)
    setForm({
      name: p.name, description: p.description || '', sku: p.sku || '',
      pointsPrice: String(p.pointsPrice), categoryId: p.categoryId,
      currentStock: String(p.currentStock), minStock: String(p.minStock), unit: p.unit || 'unidad',
    })
    setModalOpen(true)
  }

  async function handleSave() {
    setSaving(true)
    try {
      const data: any = {
        name: form.name,
        description: form.description || undefined,
        sku: form.sku || undefined,
        pointsPrice: parseFloat(form.pointsPrice),
        categoryId: form.categoryId,
        minStock: parseFloat(form.minStock) || 0,
        unit: form.unit,
      }
      if (!editing) data.currentStock = parseFloat(form.currentStock) || 0
      const res = editing
        ? await window.api.product.update(editing.id, data)
        : await window.api.product.create(data)
      if (res.success) {
        toast.success(editing ? 'Producto actualizado' : 'Producto creado')
        setModalOpen(false)
        load()
      } else {
        toast.error(res.error || 'Error')
      }
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(product: any) {
    if (!confirm(`Eliminar ${product.name}?`)) return
    const res = await window.api.product.delete(product.id)
    if (res.success) {
      toast.success('Producto eliminado')
      load()
    } else {
      toast.error(res.error || 'Error')
    }
  }

  const columns: Column<any>[] = [
    { key: 'name', header: 'Nombre', render: (p) => (
      <div>
        <p className="font-medium text-zinc-100">{p.name}</p>
        {p.description && <p className="text-xs text-zinc-500 truncate max-w-xs">{p.description}</p>}
      </div>
    )},
    { key: 'sku', header: 'SKU', render: (p) => p.sku || '-' },
    { key: 'category', header: 'Categoria', render: (p) => p.category?.name || '-' },
    { key: 'pointsPrice', header: 'Precio', render: (p) => <span className="font-mono font-bold text-lime-400">{p.pointsPrice} pts</span> },
    { key: 'stock', header: 'Stock', render: (p) => (
      <div className="flex items-center gap-2">
        <span>{p.currentStock} {p.unit}</span>
        {p.currentStock <= p.minStock && <Badge variant="warning">Bajo</Badge>}
      </div>
    )},
  ]

  const categoryOptions = categories.map(c => ({ value: c.id, label: c.name }))

  return (
    <div className="space-y-6 fade-in">
      <div className="bg-zinc-900 rounded-xl p-5 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-400 via-indigo-500 to-violet-400" />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Package size={20} className="text-blue-400" />
            <div>
              <h1 className="text-xl font-black text-white tracking-tight uppercase">Productos</h1>
              <p className="text-[10px] font-mono tracking-widest text-zinc-500 uppercase mt-1">Catalogo de productos del club</p>
            </div>
          </div>
          <Button onClick={() => navigate('/products/new')}><Plus size={16} /> Nuevo Producto</Button>
        </div>
      </div>

      <div className="max-w-sm">
        <Input placeholder="Buscar por nombre o SKU..." value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
      </div>

      <DataTable columns={columns} data={products} loading={loading} pagination={pagination} onPageChange={setPage}
        onRowClick={(p) => navigate(`/products/${p.id}`)}
        actions={(p) => (
          <>
            <Button variant="ghost" size="sm" onClick={() => navigate(`/products/${p.id}`)}><Eye size={14} /></Button>
            <Button variant="ghost" size="sm" onClick={() => openEdit(p)}><Pencil size={14} /></Button>
            <Button variant="ghost" size="sm" onClick={() => handleDelete(p)}><Trash2 size={14} className="text-red-400" /></Button>
          </>
        )}
      />

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Editar Producto' : 'Nuevo Producto'} size="lg">
        <div className="grid grid-cols-2 gap-4">
          <Input label="Nombre *" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
          <Input label="SKU" value={form.sku} onChange={e => setForm(f => ({ ...f, sku: e.target.value }))} />
          <div className="col-span-2">
            <Input label="Descripcion" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          <Select label="Categoria *" options={categoryOptions} placeholder="Seleccionar..." value={form.categoryId} onChange={e => setForm(f => ({ ...f, categoryId: e.target.value }))} />
          <Input label="Precio (puntos) *" type="number" step="0.01" min="0" value={form.pointsPrice} onChange={e => setForm(f => ({ ...f, pointsPrice: e.target.value }))} required />
          {!editing && (
            <Input label="Stock Inicial" type="number" step="0.01" min="0" value={form.currentStock} onChange={e => setForm(f => ({ ...f, currentStock: e.target.value }))} />
          )}
          <Input label="Stock Minimo" type="number" step="0.01" min="0" value={form.minStock} onChange={e => setForm(f => ({ ...f, minStock: e.target.value }))} />
          <Select label="Unidad" options={[
            { value: 'unidad', label: 'Unidad' }, { value: 'gramo', label: 'Gramo' },
            { value: 'ml', label: 'Mililitro' }, { value: 'kg', label: 'Kilogramo' },
          ]} value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} />
        </div>
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-zinc-800">
          <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancelar</Button>
          <Button onClick={handleSave} loading={saving}>{editing ? 'Guardar' : 'Crear'}</Button>
        </div>
      </Modal>
    </div>
  )
}
