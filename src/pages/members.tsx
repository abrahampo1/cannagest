import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Users, Plus, Pencil, Trash2, Nfc, X, Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Modal } from '@/components/ui/modal'
import { NfcScanner } from '@/components/ui/nfc-scanner'
import { DataTable, type Column } from '@/components/ui/data-table'
import { useToast } from '@/store/toast.store'

const statusBadge: Record<string, { variant: 'success' | 'warning' | 'danger'; label: string }> = {
  ACTIVE: { variant: 'success', label: 'Activo' },
  INACTIVE: { variant: 'danger', label: 'Inactivo' },
  SUSPENDED: { variant: 'warning', label: 'Suspendido' },
}

const membershipOptions = [
  { value: 'NO_FEE', label: 'Sin cuota' },
  { value: 'MONTHLY', label: 'Mensual' },
  { value: 'ANNUAL', label: 'Anual' },
]

export default function MembersPage() {
  const toast = useToast()
  const navigate = useNavigate()
  const [members, setMembers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState<any>(null)
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const [nfcScannerOpen, setNfcScannerOpen] = useState(false)
  const [inactiveFilter, setInactiveFilter] = useState('0')
  const [form, setForm] = useState({
    firstName: '', lastName: '', dni: '', email: '',
    phone: '', address: '', dateOfBirth: '',
    membershipType: 'NO_FEE', membershipFee: '0',
    nfcTagId: '',
  })

  useEffect(() => { load() }, [page, search, inactiveFilter])

  async function load() {
    setLoading(true)
    try {
      const inactiveMonths = parseInt(inactiveFilter) || undefined
      const res = await window.api.member.getAll({ page, pageSize: 15, search, inactiveMonths })
      if (res.success) {
        setMembers(res.data.items)
        setPagination(res.data)
      }
    } finally {
      setLoading(false)
    }
  }

  function openEdit(member: any) {
    setEditing(member)
    setForm({
      firstName: member.firstName || '',
      lastName: member.lastName || '',
      dni: member.dni || '',
      email: member.email || '',
      phone: member.phone || '',
      address: member.address || '',
      dateOfBirth: member.dateOfBirth || '',
      membershipType: member.membershipType || 'NO_FEE',
      membershipFee: String(member.membershipFee || 0),
      nfcTagId: member.nfcTagId || '',
    })
    setModalOpen(true)
  }

  async function handleSave() {
    if (!editing) return
    setSaving(true)
    try {
      const data = {
        ...form,
        membershipFee: parseFloat(form.membershipFee) || 0,
        phone: form.phone || undefined,
        address: form.address || undefined,
        dateOfBirth: form.dateOfBirth || undefined,
        nfcTagId: form.nfcTagId || null,
      }
      const res = await window.api.member.update(editing.id, data)
      if (res.success) {
        toast.success('Socio actualizado')
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

  async function handleDelete(member: any) {
    if (!confirm(`Eliminar a ${member.firstName} ${member.lastName}?`)) return
    const res = await window.api.member.delete(member.id)
    if (res.success) {
      toast.success('Socio eliminado')
      load()
    } else {
      toast.error(res.error || 'Error')
    }
  }

  const inactiveOptions = [
    { value: '0', label: 'Todos los socios' },
    { value: '1', label: 'Sin canjear +1 mes' },
    { value: '3', label: 'Sin canjear +3 meses' },
    { value: '6', label: 'Sin canjear +6 meses' },
  ]

  function formatLastConsume(dateStr: string | null) {
    if (!dateStr) return <span className="text-zinc-600 text-xs font-mono">NUNCA</span>
    const d = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - d.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    const diffMonths = Math.floor(diffDays / 30)

    const label = d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: '2-digit' })
    if (diffMonths >= 3) return <span className="text-red-400 text-xs font-mono">{label}</span>
    if (diffMonths >= 1) return <span className="text-amber-400 text-xs font-mono">{label}</span>
    return <span className="text-zinc-400 text-xs font-mono">{label}</span>
  }

  const columns: Column<any>[] = [
    { key: 'name', header: 'Nombre', render: (m) => `${m.firstName} ${m.lastName}` },
    { key: 'dni', header: 'DNI' },
    { key: 'email', header: 'Email' },
    {
      key: 'lastConsumeDate', header: 'Ult. Canje',
      render: (m) => formatLastConsume(m.lastConsumeDate),
    },
    {
      key: 'status', header: 'Estado',
      render: (m) => {
        const s = statusBadge[m.status] || statusBadge.ACTIVE
        return <Badge variant={s.variant}>{s.label}</Badge>
      },
    },
    {
      key: 'pointsBalance', header: 'Balance',
      render: (m) => <span className="font-mono font-bold text-lime-400">{m.pointsBalance} pts</span>,
    },
  ]

  return (
    <div className="space-y-6 fade-in">
      <div className="bg-zinc-900 rounded-xl p-5 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-lime-400 via-emerald-500 to-cyan-400" />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Users size={20} className="text-lime-400" />
            <div>
              <h1 className="text-xl font-black text-white tracking-tight uppercase">Socios</h1>
              <p className="text-[10px] font-mono tracking-widest text-zinc-500 uppercase mt-1">Gestion de socios del club</p>
            </div>
          </div>
          <Button onClick={() => navigate('/members/new')}><Plus size={16} /> Nuevo Socio</Button>
        </div>
      </div>

      <div className="flex gap-3 items-end">
        <div className="max-w-sm flex-1">
          <Input
            placeholder="Buscar por nombre, DNI o email..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
          />
        </div>
        <div className="w-52">
          <Select
            label=""
            options={inactiveOptions}
            value={inactiveFilter}
            onChange={e => { setInactiveFilter(e.target.value); setPage(1) }}
          />
        </div>
      </div>

      <DataTable
        columns={columns}
        data={members}
        loading={loading}
        pagination={pagination}
        onPageChange={setPage}
        onRowClick={(m) => navigate('/members/' + m.id)}
        actions={(m) => (
          <>
            <Button variant="ghost" size="sm" onClick={() => navigate('/members/' + m.id)}><Eye size={14} /></Button>
            <Button variant="ghost" size="sm" onClick={() => openEdit(m)}><Pencil size={14} /></Button>
            <Button variant="ghost" size="sm" onClick={() => handleDelete(m)}><Trash2 size={14} className="text-red-400" /></Button>
          </>
        )}
      />

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Editar Socio" size="lg">
        <div className="grid grid-cols-2 gap-4">
          <Input label="Nombre *" value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} required />
          <Input label="Apellido *" value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} required />
          <Input label="DNI *" value={form.dni} onChange={e => setForm(f => ({ ...f, dni: e.target.value }))} required />
          <Input label="Email *" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
          <Input label="Telefono" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
          <Input label="Fecha de Nacimiento" type="date" value={form.dateOfBirth} onChange={e => setForm(f => ({ ...f, dateOfBirth: e.target.value }))} />
          <div className="col-span-2">
            <Input label="Direccion" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
          </div>
          <Select label="Tipo de Membresia" options={membershipOptions} value={form.membershipType} onChange={e => setForm(f => ({ ...f, membershipType: e.target.value }))} />
          <Input label="Cuota" type="number" step="0.01" min="0" value={form.membershipFee} onChange={e => setForm(f => ({ ...f, membershipFee: e.target.value }))} />
          <div className="col-span-2">
            <label className="block text-sm font-medium text-zinc-400 mb-1">Llavero NFC</label>
            <div className="flex items-center gap-2">
              <Input
                value={form.nfcTagId}
                readOnly
                placeholder="Sin llavero asignado"
                className="flex-1"
              />
              <Button type="button" variant="secondary" size="sm" onClick={() => setNfcScannerOpen(true)}>
                <Nfc size={16} /> Leer NFC
              </Button>
              {form.nfcTagId && (
                <button
                  type="button"
                  onClick={() => setForm(f => ({ ...f, nfcTagId: '' }))}
                  className="p-2 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-400/10 transition-colors"
                  title="Quitar llavero"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-zinc-800">
          <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancelar</Button>
          <Button onClick={handleSave} loading={saving}>Guardar</Button>
        </div>
      </Modal>

      <NfcScanner
        open={nfcScannerOpen}
        onClose={() => setNfcScannerOpen(false)}
        onScan={(tagId) => {
          setForm(f => ({ ...f, nfcTagId: tagId }))
          setNfcScannerOpen(false)
        }}
      />
    </div>
  )
}
