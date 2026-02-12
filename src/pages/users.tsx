import { useState, useEffect } from 'react'
import { UserCog, Plus, Pencil, Trash2, Key, Users, UserCheck, Nfc, Check, ChevronRight, ChevronLeft, X, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Modal } from '@/components/ui/modal'
import { DataTable, type Column } from '@/components/ui/data-table'
import { NfcScanner } from '@/components/ui/nfc-scanner'
import { useToast } from '@/store/toast.store'

const roleOptions = [
  { value: 'ADMIN', label: 'Administrador' },
  { value: 'MANAGER', label: 'Manager' },
  { value: 'EMPLOYEE', label: 'Empleado' },
]

const roleLabels: Record<string, { label: string; variant: 'info' | 'warning' | 'default' }> = {
  ADMIN: { label: 'Admin', variant: 'info' },
  MANAGER: { label: 'Manager', variant: 'warning' },
  EMPLOYEE: { label: 'Empleado', variant: 'default' },
}

const STEPS = [
  { label: 'Datos', icon: User },
  { label: 'NFC', icon: Nfc },
  { label: 'Confirmar', icon: Check },
]

export default function UsersPage() {
  const toast = useToast()
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState<any>(null)
  const [search, setSearch] = useState('')

  // Create stepper
  const [createOpen, setCreateOpen] = useState(false)
  const [step, setStep] = useState(0)
  const [slideDir, setSlideDir] = useState<'left' | 'right'>('left')
  const [createForm, setCreateForm] = useState({ username: '', email: '', password: '', role: 'EMPLOYEE', nfcTagId: '' })
  const [creating, setCreating] = useState(false)
  const [createSuccess, setCreateSuccess] = useState(false)

  // Edit modal
  const [editOpen, setEditOpen] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [editForm, setEditForm] = useState({ username: '', email: '', role: 'EMPLOYEE', nfcTagId: '' })
  const [saving, setSaving] = useState(false)

  // NFC scanner
  const [nfcScannerOpen, setNfcScannerOpen] = useState(false)
  const [nfcTarget, setNfcTarget] = useState<'create' | 'edit'>('create')

  // Password modal
  const [pwModalOpen, setPwModalOpen] = useState(false)
  const [pwUser, setPwUser] = useState<any>(null)
  const [pwForm, setPwForm] = useState({ oldPassword: '', newPassword: '' })

  useEffect(() => { load() }, [page, search])

  async function load() {
    setLoading(true)
    try {
      const res = await window.api.auth.getUsers({ page, pageSize: 15, search })
      if (res.success) {
        setUsers(res.data.items)
        setPagination(res.data)
      }
    } finally {
      setLoading(false)
    }
  }

  // Stats
  const totalUsers = pagination?.total ?? users.length
  const activeUsers = users.filter(u => u.isActive).length
  const nfcUsers = users.filter(u => u.nfcTagId).length

  // === CREATE STEPPER ===
  function openCreate() {
    setCreateForm({ username: '', email: '', password: '', role: 'EMPLOYEE', nfcTagId: '' })
    setStep(0)
    setSlideDir('left')
    setCreateSuccess(false)
    setCreateOpen(true)
  }

  function goToStep(target: number) {
    setSlideDir(target > step ? 'left' : 'right')
    setStep(target)
  }

  function canAdvanceStep0() {
    return createForm.username.length >= 3 && createForm.password.length >= 6
  }

  async function handleCreate() {
    setCreating(true)
    try {
      const res = await window.api.auth.createUser({
        username: createForm.username,
        email: createForm.email,
        password: createForm.password,
        role: createForm.role,
        nfcTagId: createForm.nfcTagId || null,
      })
      if (res.success) {
        setCreateSuccess(true)
        toast.success('Usuario creado exitosamente')
        setTimeout(() => {
          setCreateOpen(false)
          load()
        }, 1200)
      } else {
        toast.error(res.error || 'Error al crear usuario')
      }
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setCreating(false)
    }
  }

  // === EDIT ===
  function openEdit(u: any) {
    setEditing(u)
    setEditForm({ username: u.username, email: u.email, role: u.role, nfcTagId: u.nfcTagId || '' })
    setEditOpen(true)
  }

  async function handleSaveEdit() {
    setSaving(true)
    try {
      const res = await window.api.auth.updateUser(editing.id, {
        username: editForm.username,
        email: editForm.email,
        role: editForm.role,
        nfcTagId: editForm.nfcTagId || null,
      })
      if (res.success) {
        toast.success('Usuario actualizado')
        setEditOpen(false)
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

  // === DELETE ===
  async function handleDelete(u: any) {
    if (!confirm(`Desactivar usuario "${u.username}"?`)) return
    const res = await window.api.auth.deleteUser(u.id)
    if (res.success) {
      toast.success('Usuario desactivado')
      load()
    } else {
      toast.error(res.error || 'Error')
    }
  }

  // === PASSWORD ===
  function openChangePassword(u: any) {
    setPwUser(u)
    setPwForm({ oldPassword: '', newPassword: '' })
    setPwModalOpen(true)
  }

  async function handleChangePassword() {
    setSaving(true)
    try {
      const res = await window.api.auth.changePassword(pwUser.id, pwForm.oldPassword, pwForm.newPassword)
      if (res.success) {
        toast.success('contraseña cambiada')
        setPwModalOpen(false)
      } else {
        toast.error(res.error || 'Error')
      }
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  // === NFC SCAN ===
  function handleNfcScan(tagId: string) {
    setNfcScannerOpen(false)
    if (nfcTarget === 'create') {
      setCreateForm(f => ({ ...f, nfcTagId: tagId }))
    } else {
      setEditForm(f => ({ ...f, nfcTagId: tagId }))
    }
  }

  // === COLUMNS ===
  const columns: Column<any>[] = [
    { key: 'username', header: 'Usuario', render: (u) => <span className="font-medium text-zinc-100">{u.username}</span> },
    { key: 'email', header: 'Email' },
    { key: 'role', header: 'Rol', render: (u) => {
      const r = roleLabels[u.role] || { label: u.role, variant: 'default' as const }
      return <Badge variant={r.variant}>{r.label}</Badge>
    }},
    { key: 'nfcTagId', header: 'NFC', render: (u) => (
      u.nfcTagId
        ? <Badge variant="success"><Nfc size={12} className="mr-1" />Asignado</Badge>
        : <span className="text-zinc-600 text-xs">-</span>
    )},
    { key: 'isActive', header: 'Estado', render: (u) => (
      <Badge variant={u.isActive ? 'success' : 'danger'}>{u.isActive ? 'Activo' : 'Inactivo'}</Badge>
    )},
    { key: 'createdAt', header: 'Creado', render: (u) => new Date(u.createdAt).toLocaleDateString('es-ES') },
  ]

  return (
    <div className="space-y-6 fade-in">
      {/* Header */}
      <div className="bg-zinc-900 rounded-xl p-5 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-zinc-400 via-zinc-500 to-zinc-400" />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <UserCog size={20} className="text-zinc-400" />
            <div>
              <h1 className="text-xl font-black text-white tracking-tight uppercase">Usuarios</h1>
              <p className="text-[10px] font-mono tracking-widest text-zinc-500 uppercase mt-1">Gestion de usuarios del sistema</p>
            </div>
          </div>
          <Button onClick={openCreate}><Plus size={16} /> Nuevo Usuario</Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-zinc-900 rounded-lg p-4 border-l-2 border-blue-400">
          <div className="flex items-center gap-1.5 mb-2">
            <Users size={13} className="text-blue-400" />
            <span className="text-[10px] font-mono tracking-widest text-zinc-500 uppercase">Total usuarios</span>
          </div>
          <p className="text-2xl font-black font-mono text-blue-400">{totalUsers}</p>
        </div>
        <div className="bg-zinc-900 rounded-lg p-4 border-l-2 border-lime-400">
          <div className="flex items-center gap-1.5 mb-2">
            <UserCheck size={13} className="text-lime-400" />
            <span className="text-[10px] font-mono tracking-widest text-zinc-500 uppercase">Activos</span>
          </div>
          <p className="text-2xl font-black font-mono text-lime-400">{activeUsers}</p>
        </div>
        <div className="bg-zinc-900 rounded-lg p-4 border-l-2 border-violet-400">
          <div className="flex items-center gap-1.5 mb-2">
            <Nfc size={13} className="text-violet-400" />
            <span className="text-[10px] font-mono tracking-widest text-zinc-500 uppercase">Con NFC</span>
          </div>
          <p className="text-2xl font-black font-mono text-violet-400">{nfcUsers}</p>
        </div>
      </div>

      {/* Search */}
      <div className="max-w-sm">
        <Input placeholder="Buscar..." value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
      </div>

      {/* Table */}
      <DataTable columns={columns} data={users} loading={loading} pagination={pagination} onPageChange={setPage}
        actions={(u) => (
          <>
            <Button variant="ghost" size="sm" onClick={() => openEdit(u)}><Pencil size={14} /></Button>
            <Button variant="ghost" size="sm" onClick={() => openChangePassword(u)}><Key size={14} /></Button>
            {u.isActive && <Button variant="ghost" size="sm" onClick={() => handleDelete(u)}><Trash2 size={14} className="text-red-400" /></Button>}
          </>
        )}
      />

      {/* ========== CREATE STEPPER MODAL ========== */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Nuevo Usuario" size="lg">
        {createSuccess ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 rounded-full bg-lime-400/15 flex items-center justify-center step-check-enter">
              <Check size={32} className="text-lime-400" />
            </div>
            <p className="mt-4 text-lg font-semibold text-zinc-100">Usuario creado</p>
            <p className="text-sm text-zinc-500 mt-1">{createForm.username} esta listo</p>
          </div>
        ) : (
          <>
            {/* Stepper indicator */}
            <div className="flex items-center justify-center mb-8">
              {STEPS.map((s, i) => (
                <div key={i} className="flex items-center">
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300 ${
                        i < step
                          ? 'bg-lime-400 text-zinc-900'
                          : i === step
                            ? 'bg-lime-400 text-zinc-900 pulse-ring'
                            : 'bg-zinc-800 text-zinc-500'
                      }`}
                    >
                      {i < step ? <Check size={18} /> : <s.icon size={18} />}
                    </div>
                    <span className={`text-[10px] font-mono tracking-widest uppercase mt-1.5 font-bold ${i <= step ? 'text-lime-400' : 'text-zinc-600'}`}>
                      {s.label}
                    </span>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div className={`w-20 h-0.5 mx-2 mb-5 transition-colors duration-300 ${i < step ? 'bg-lime-400' : 'bg-zinc-800'}`} />
                  )}
                </div>
              ))}
            </div>

            {/* Step content */}
            <div key={step} className={slideDir === 'left' ? 'step-slide-left' : 'step-slide-right'}>
              {step === 0 && (
                <div className="space-y-4">
                  <div className="text-center mb-6">
                    <div className="w-12 h-12 mx-auto rounded-full bg-lime-400/15 flex items-center justify-center mb-3">
                      <User size={24} className="text-lime-400" />
                    </div>
                    <h3 className="text-xs font-mono font-bold tracking-widest text-zinc-400 uppercase">Datos del usuario</h3>
                    <p className="text-[10px] font-mono tracking-widest text-zinc-500 uppercase mt-1">Informacion basica de la cuenta</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label="Username *"
                      value={createForm.username}
                      onChange={e => setCreateForm(f => ({ ...f, username: e.target.value }))}
                      placeholder="usuario123"
                    />
                    <Input
                      label="contraseña *"
                      type="password"
                      value={createForm.password}
                      onChange={e => setCreateForm(f => ({ ...f, password: e.target.value }))}
                      placeholder="Min. 6 caracteres"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <Select
                      label="Rol"
                      options={roleOptions}
                      value={createForm.role}
                      onChange={e => setCreateForm(f => ({ ...f, role: e.target.value }))}
                    />
                    <Input
                      label="Email (opcional)"
                      type="email"
                      value={createForm.email}
                      onChange={e => setCreateForm(f => ({ ...f, email: e.target.value }))}
                      placeholder="user@ejemplo.com"
                    />
                  </div>
                </div>
              )}

              {step === 1 && (
                <div className="space-y-6">
                  <div className="text-center mb-4">
                    <div className="relative w-20 h-20 mx-auto mb-4">
                      <div className="absolute inset-0 rounded-full bg-lime-400/15 nfc-wave" />
                      <div className="absolute inset-0 rounded-full bg-lime-400/15 nfc-wave-delay-1" />
                      <div className="absolute inset-0 rounded-full bg-lime-400/15 nfc-wave-delay-2" />
                      <div className="relative w-20 h-20 rounded-full bg-lime-400/10 flex items-center justify-center">
                        <Nfc size={32} className="text-lime-400" />
                      </div>
                    </div>
                    <h3 className="text-xs font-mono font-bold tracking-widest text-zinc-400 uppercase">Llavero NFC</h3>
                    <p className="text-[10px] font-mono tracking-widest text-zinc-500 uppercase mt-1">Asigna un llavero NFC para acceso rapido (opcional)</p>
                  </div>

                  {createForm.nfcTagId ? (
                    <div className="flex items-center justify-center gap-3 p-4 bg-lime-400/10 rounded-xl border border-lime-400/20">
                      <Nfc size={20} className="text-lime-400" />
                      <span className="font-mono text-sm text-lime-400">{createForm.nfcTagId}</span>
                      <button
                        onClick={() => setCreateForm(f => ({ ...f, nfcTagId: '' }))}
                        className="p-1 rounded-full hover:bg-lime-400/20 text-lime-400 transition-colors"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex justify-center">
                      <Button
                        variant="secondary"
                        onClick={() => { setNfcTarget('create'); setNfcScannerOpen(true) }}
                      >
                        <Nfc size={16} /> Leer NFC
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {step === 2 && (
                <div className="space-y-4">
                  <div className="text-center mb-6">
                    <div className="w-12 h-12 mx-auto rounded-full bg-lime-400/15 flex items-center justify-center mb-3">
                      <Check size={24} className="text-lime-400" />
                    </div>
                    <h3 className="text-xs font-mono font-bold tracking-widest text-zinc-400 uppercase">Confirmar datos</h3>
                    <p className="text-[10px] font-mono tracking-widest text-zinc-500 uppercase mt-1">Revisa los datos antes de crear el usuario</p>
                  </div>

                  <div className="bg-zinc-800 rounded-xl p-5 space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-mono tracking-widest text-zinc-600 uppercase">Usuario</span>
                      <span className="font-mono font-medium text-zinc-100">{createForm.username}</span>
                    </div>
                    <div className="border-t border-zinc-700" />
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-mono tracking-widest text-zinc-600 uppercase">Email</span>
                      <span className="font-mono font-medium text-zinc-100">{createForm.email}</span>
                    </div>
                    <div className="border-t border-zinc-700" />
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-mono tracking-widest text-zinc-600 uppercase">Rol</span>
                      <Badge variant={roleLabels[createForm.role]?.variant || 'default'}>
                        {roleLabels[createForm.role]?.label || createForm.role}
                      </Badge>
                    </div>
                    <div className="border-t border-zinc-700" />
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-mono tracking-widest text-zinc-600 uppercase">NFC</span>
                      {createForm.nfcTagId ? (
                        <Badge variant="success"><Nfc size={12} className="mr-1" />{createForm.nfcTagId}</Badge>
                      ) : (
                        <span className="text-zinc-600 text-sm">No asignado</span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Navigation buttons */}
            <div className="flex justify-between mt-8 pt-4 border-t border-zinc-800">
              <div>
                {step > 0 && (
                  <Button variant="secondary" onClick={() => goToStep(step - 1)}>
                    <ChevronLeft size={16} /> Anterior
                  </Button>
                )}
              </div>
              <div className="flex gap-3">
                {step === 1 && !createForm.nfcTagId && (
                  <Button variant="secondary" onClick={() => goToStep(2)}>
                    Omitir
                  </Button>
                )}
                {step < 2 ? (
                  <Button
                    onClick={() => goToStep(step + 1)}
                    disabled={step === 0 && !canAdvanceStep0()}
                  >
                    Siguiente <ChevronRight size={16} />
                  </Button>
                ) : (
                  <Button onClick={handleCreate} loading={creating}>
                    Crear Usuario <Check size={16} />
                  </Button>
                )}
              </div>
            </div>
          </>
        )}
      </Modal>

      {/* ========== EDIT MODAL ========== */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title={`Editar - ${editing?.username}`}>
        <div className="space-y-4">
          <Input
            label="Username *"
            value={editForm.username}
            onChange={e => setEditForm(f => ({ ...f, username: e.target.value }))}
          />
          <Input
            label="Email (opcional)"
            type="email"
            value={editForm.email}
            onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))}
            placeholder="user@ejemplo.com"
          />
          <Select
            label="Rol"
            options={roleOptions}
            value={editForm.role}
            onChange={e => setEditForm(f => ({ ...f, role: e.target.value }))}
          />

          {/* NFC field */}
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">Llavero NFC</label>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={editForm.nfcTagId}
                placeholder="Sin llavero asignado"
                className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-300 font-mono placeholder:text-zinc-600"
              />
              <Button
                variant="secondary"
                size="sm"
                onClick={() => { setNfcTarget('edit'); setNfcScannerOpen(true) }}
              >
                <Nfc size={14} /> Leer
              </Button>
              {editForm.nfcTagId && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setEditForm(f => ({ ...f, nfcTagId: '' }))}
                >
                  <X size={14} />
                </Button>
              )}
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-zinc-800">
          <Button variant="secondary" onClick={() => setEditOpen(false)}>Cancelar</Button>
          <Button onClick={handleSaveEdit} loading={saving}>Guardar</Button>
        </div>
      </Modal>

      {/* ========== CHANGE PASSWORD MODAL ========== */}
      <Modal open={pwModalOpen} onClose={() => setPwModalOpen(false)} title={`Cambiar contraseña - ${pwUser?.username}`}>
        <div className="space-y-4">
          <Input label="contraseña actual *" type="password" value={pwForm.oldPassword} onChange={e => setPwForm(f => ({ ...f, oldPassword: e.target.value }))} required />
          <Input label="Nueva contraseña *" type="password" value={pwForm.newPassword} onChange={e => setPwForm(f => ({ ...f, newPassword: e.target.value }))} required />
        </div>
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-zinc-800">
          <Button variant="secondary" onClick={() => setPwModalOpen(false)}>Cancelar</Button>
          <Button onClick={handleChangePassword} loading={saving} disabled={!pwForm.oldPassword || !pwForm.newPassword}>Cambiar</Button>
        </div>
      </Modal>

      {/* NFC Scanner */}
      <NfcScanner
        open={nfcScannerOpen}
        onClose={() => setNfcScannerOpen(false)}
        onScan={handleNfcScan}
      />
    </div>
  )
}
