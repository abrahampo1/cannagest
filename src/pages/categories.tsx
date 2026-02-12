import { useState, useEffect } from 'react'
import { Tags, Plus, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { DataTable, type Column } from '@/components/ui/data-table'
import { useToast } from '@/store/toast.store'

export default function CategoriesPage() {
  const toast = useToast()
  const [categories, setCategories] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: '', description: '' })

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try {
      const res = await window.api.category.getAll()
      if (res.success) setCategories(res.data)
    } finally {
      setLoading(false)
    }
  }

  function openCreate() {
    setEditing(null)
    setForm({ name: '', description: '' })
    setModalOpen(true)
  }

  function openEdit(cat: any) {
    setEditing(cat)
    setForm({ name: cat.name, description: cat.description || '' })
    setModalOpen(true)
  }

  async function handleSave() {
    setSaving(true)
    try {
      const data = {
        name: form.name,
        description: form.description || undefined,
      }
      const res = editing
        ? await window.api.category.update(editing.id, data)
        : await window.api.category.create(data)
      if (res.success) {
        toast.success(editing ? 'Categoria actualizada' : 'Categoria creada')
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

  async function handleDelete(cat: any) {
    if (!confirm(`Eliminar categoria "${cat.name}"?`)) return
    const res = await window.api.category.delete(cat.id)
    if (res.success) {
      toast.success('Categoria eliminada')
      load()
    } else {
      toast.error(res.error || 'Error')
    }
  }

  const columns: Column<any>[] = [
    { key: 'name', header: 'Nombre', render: (c) => <span className="font-medium text-zinc-100">{c.name}</span> },
    { key: 'description', header: 'Descripcion', render: (c) => c.description || '-' },
    { key: 'products', header: 'Productos', render: (c) => c._count?.products ?? 0 },
  ]

  return (
    <div className="space-y-6 fade-in">
      <div className="bg-zinc-900 rounded-xl p-5 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-400 via-fuchsia-500 to-pink-400" />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Tags size={20} className="text-purple-400" />
            <div>
              <h1 className="text-xl font-black text-white tracking-tight uppercase">Categorias</h1>
              <p className="text-[10px] font-mono tracking-widest text-zinc-500 uppercase mt-1">Categorias de productos</p>
            </div>
          </div>
          <Button onClick={openCreate}><Plus size={16} /> Nueva Categoria</Button>
        </div>
      </div>

      <DataTable columns={columns} data={categories} loading={loading}
        actions={(c) => (
          <>
            <Button variant="ghost" size="sm" onClick={() => openEdit(c)}><Pencil size={14} /></Button>
            <Button variant="ghost" size="sm" onClick={() => handleDelete(c)}><Trash2 size={14} className="text-red-400" /></Button>
          </>
        )}
      />

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Editar Categoria' : 'Nueva Categoria'}>
        <div className="space-y-4">
          <Input label="Nombre *" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
          <Input label="Descripcion" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
        </div>
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-zinc-800">
          <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancelar</Button>
          <Button onClick={handleSave} loading={saving}>{editing ? 'Guardar' : 'Crear'}</Button>
        </div>
      </Modal>
    </div>
  )
}
