import { useState, useEffect } from 'react'
import { Receipt, Plus, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Modal } from '@/components/ui/modal'
import { DataTable, type Column } from '@/components/ui/data-table'
import { useToast } from '@/store/toast.store'
import { useAuthStore } from '@/store/auth.store'

const categoryOptions = [
  { value: 'SUPPLIES', label: 'Suministros' },
  { value: 'UTILITIES', label: 'Servicios' },
  { value: 'RENT', label: 'Alquiler' },
  { value: 'SALARY', label: 'Salarios' },
  { value: 'MAINTENANCE', label: 'Mantenimiento' },
  { value: 'OTHER', label: 'Otros' },
]

const categoryLabels: Record<string, string> = {
  SUPPLIES: 'Suministros', UTILITIES: 'Servicios', RENT: 'Alquiler',
  SALARY: 'Salarios', MAINTENANCE: 'Mantenimiento', OTHER: 'Otros',
}

export default function ExpensesPage() {
  const toast = useToast()
  const { user } = useAuthStore()
  const [expenses, setExpenses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState<any>(null)
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    description: '', amount: '', category: 'OTHER', notes: '', expenseDate: '',
  })

  useEffect(() => { load() }, [page, search])

  async function load() {
    setLoading(true)
    try {
      const res = await window.api.expense.getAll({ page, pageSize: 15, search })
      if (res.success) {
        setExpenses(res.data.items)
        setPagination(res.data)
      }
    } finally {
      setLoading(false)
    }
  }

  function openCreate() {
    setEditing(null)
    setForm({ description: '', amount: '', category: 'OTHER', notes: '', expenseDate: '' })
    setModalOpen(true)
  }

  function openEdit(exp: any) {
    setEditing(exp)
    setForm({
      description: exp.description,
      amount: String(exp.amount),
      category: exp.category,
      notes: exp.notes || '',
      expenseDate: '',
    })
    setModalOpen(true)
  }

  async function handleSave() {
    setSaving(true)
    try {
      let res
      if (editing) {
        res = await window.api.expense.update(editing.id, {
          description: form.description,
          amount: parseFloat(form.amount),
          category: form.category,
          notes: form.notes || undefined,
        })
      } else {
        // Get current register if open
        const regRes = await window.api.cashRegister.getCurrent()
        const cashRegisterId = regRes.success && regRes.data ? regRes.data.id : undefined
        res = await window.api.expense.create({
          description: form.description,
          amount: parseFloat(form.amount),
          category: form.category,
          recordedById: user!.id,
          cashRegisterId,
          expenseDate: form.expenseDate || undefined,
          notes: form.notes || undefined,
        })
      }
      if (res.success) {
        toast.success(editing ? 'Gasto actualizado' : 'Gasto registrado')
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

  async function handleDelete(exp: any) {
    if (!confirm(`Eliminar gasto "${exp.description}"?`)) return
    const res = await window.api.expense.delete(exp.id)
    if (res.success) {
      toast.success('Gasto eliminado')
      load()
    } else {
      toast.error(res.error || 'Error')
    }
  }

  const columns: Column<any>[] = [
    { key: 'description', header: 'Descripcion', render: (e) => <span className="font-medium text-zinc-100">{e.description}</span> },
    { key: 'amount', header: 'Monto', render: (e) => <span className="font-mono font-bold text-red-400">{e.amount.toFixed(2)} €</span> },
    { key: 'category', header: 'Categoria', render: (e) => <Badge>{categoryLabels[e.category] || e.category}</Badge> },
    { key: 'recordedBy', header: 'Registrado por', render: (e) => e.recordedBy?.username || '-' },
    { key: 'expenseDate', header: 'Fecha', render: (e) => new Date(e.expenseDate).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }) },
  ]

  return (
    <div className="space-y-6 fade-in">
      <div className="bg-zinc-900 rounded-xl p-5 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-400 via-rose-500 to-pink-400" />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Receipt size={20} className="text-red-400" />
            <div>
              <h1 className="text-xl font-black text-white tracking-tight uppercase">Gastos</h1>
              <p className="text-[10px] font-mono tracking-widest text-zinc-500 uppercase mt-1">Gastos operativos</p>
            </div>
          </div>
          <Button onClick={openCreate}><Plus size={16} /> Nuevo Gasto</Button>
        </div>
      </div>

      <div className="max-w-sm">
        <Input placeholder="Buscar..." value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
      </div>

      <DataTable columns={columns} data={expenses} loading={loading} pagination={pagination} onPageChange={setPage}
        actions={(e) => (
          <>
            <Button variant="ghost" size="sm" onClick={() => openEdit(e)}><Pencil size={14} /></Button>
            <Button variant="ghost" size="sm" onClick={() => handleDelete(e)}><Trash2 size={14} className="text-red-400" /></Button>
          </>
        )}
      />

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Editar Gasto' : 'Nuevo Gasto'}>
        <div className="space-y-4">
          <Input label="Descripcion *" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} required />
          <Input label="Monto *" type="number" step="0.01" min="0" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} required />
          <Select label="Categoria" options={categoryOptions} value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} />
          {!editing && <Input label="Fecha" type="date" value={form.expenseDate} onChange={e => setForm(f => ({ ...f, expenseDate: e.target.value }))} />}
          <Input label="Notas" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
        </div>
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-zinc-800">
          <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancelar</Button>
          <Button onClick={handleSave} loading={saving}>{editing ? 'Guardar' : 'Registrar'}</Button>
        </div>
      </Modal>
    </div>
  )
}
