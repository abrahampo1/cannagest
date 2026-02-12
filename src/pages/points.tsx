import { useState, useEffect } from 'react'
import { Coins, Search, Nfc, DollarSign } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Modal } from '@/components/ui/modal'
import { NfcScanner } from '@/components/ui/nfc-scanner'
import { DataTable, type Column } from '@/components/ui/data-table'
import { useToast } from '@/store/toast.store'
import { useAuthStore } from '@/store/auth.store'

const typeLabels: Record<string, { label: string; variant: 'success' | 'danger' | 'info' | 'warning' }> = {
  LOAD: { label: 'Carga', variant: 'success' },
  CONSUME: { label: 'Consumo', variant: 'danger' },
  REFUND: { label: 'Devolucion', variant: 'info' },
  ADJUSTMENT: { label: 'Ajuste', variant: 'warning' },
}

export default function PointsPage() {
  const toast = useToast()
  const { user } = useAuthStore()
  const [memberSearch, setMemberSearch] = useState('')
  const [members, setMembers] = useState<any[]>([])
  const [selectedMember, setSelectedMember] = useState<any>(null)
  const [transactions, setTransactions] = useState<any[]>([])
  const [txPagination, setTxPagination] = useState<any>(null)
  const [txPage, setTxPage] = useState(1)
  const [txLoading, setTxLoading] = useState(false)
  const [loadAmount, setLoadAmount] = useState('')
  const [loadNotes, setLoadNotes] = useState('')
  const [adjustAmount, setAdjustAmount] = useState('')
  const [adjustNotes, setAdjustNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [nfcScannerOpen, setNfcScannerOpen] = useState(false)

  // Quick open register
  const [registerModalOpen, setRegisterModalOpen] = useState(false)
  const [initialCash, setInitialCash] = useState('0')
  const [openingRegister, setOpeningRegister] = useState(false)

  useEffect(() => {
    if (memberSearch.length >= 2) {
      searchMembers(memberSearch)
    } else {
      setMembers([])
    }
  }, [memberSearch])

  useEffect(() => {
    if (selectedMember) loadTransactions()
  }, [selectedMember, txPage])

  async function searchMembers(search: string) {
    const res = await window.api.member.getAll({ page: 1, pageSize: 20, search })
    if (res.success) setMembers(res.data.items)
  }

  async function selectMember(member: any) {
    const res = await window.api.member.getById(member.id)
    if (res.success) {
      setSelectedMember(res.data)
      setMembers([])
      setMemberSearch('')
      setTxPage(1)
    }
  }

  async function handleNfcScan(tagId: string) {
    setNfcScannerOpen(false)
    const res = await window.api.member.getByNfc(tagId)
    if (res.success) {
      setSelectedMember(res.data)
      setMembers([])
      setMemberSearch('')
      setTxPage(1)
      toast.success(`Socio: ${res.data.firstName} ${res.data.lastName}`)
    } else {
      toast.error(res.error || 'Llavero no registrado')
    }
  }

  async function loadTransactions() {
    setTxLoading(true)
    try {
      const res = await window.api.points.getTransactions(selectedMember.id, { page: txPage, pageSize: 10 })
      if (res.success) {
        setTransactions(res.data.items)
        setTxPagination(res.data)
      }
    } finally {
      setTxLoading(false)
    }
  }

  async function handleLoadPoints() {
    const amount = parseFloat(loadAmount)
    if (!amount || amount <= 0) { toast.error('Monto invalido'); return }

    // Check if register is open first
    const regRes = await window.api.cashRegister.getCurrent()
    if (!regRes.success || !regRes.data) {
      setInitialCash('0')
      setRegisterModalOpen(true)
      return
    }

    await executeLoadPoints()
  }

  async function executeLoadPoints() {
    const amount = parseFloat(loadAmount)
    if (!amount || amount <= 0) return
    setSaving(true)
    try {
      const res = await window.api.points.load({
        memberId: selectedMember.id,
        amount,
        userId: user!.id,
        notes: loadNotes || undefined,
      })
      if (res.success) {
        toast.success(`${amount} puntos cargados`)
        setLoadAmount('')
        setLoadNotes('')
        setSelectedMember({ ...selectedMember, pointsBalance: res.data.newBalance })
        loadTransactions()
      } else {
        toast.error(res.error || 'Error')
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleOpenRegisterAndContinue() {
    const cash = parseFloat(initialCash)
    if (isNaN(cash) || cash < 0) { toast.error('Monto invalido'); return }
    setOpeningRegister(true)
    try {
      const res = await window.api.cashRegister.open({
        userId: user!.id,
        initialCash: cash,
      })
      if (res.success) {
        toast.success('Caja abierta')
        setRegisterModalOpen(false)
        // Now execute the pending load
        await executeLoadPoints()
      } else {
        toast.error(res.error || 'Error al abrir caja')
      }
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setOpeningRegister(false)
    }
  }

  async function handleAdjustPoints() {
    const amount = parseFloat(adjustAmount)
    if (!amount) { toast.error('Monto invalido'); return }
    if (!adjustNotes) { toast.error('El motivo es requerido'); return }
    setSaving(true)
    try {
      const res = await window.api.points.adjust({
        memberId: selectedMember.id,
        amount,
        userId: user!.id,
        notes: adjustNotes,
      })
      if (res.success) {
        toast.success('Ajuste realizado')
        setAdjustAmount('')
        setAdjustNotes('')
        setSelectedMember({ ...selectedMember, pointsBalance: res.data.newBalance })
        loadTransactions()
      } else {
        toast.error(res.error || 'Error')
      }
    } finally {
      setSaving(false)
    }
  }

  const txColumns: Column<any>[] = [
    { key: 'type', header: 'Tipo', render: (t) => {
      const l = typeLabels[t.type] || { label: t.type, variant: 'default' as const }
      return <Badge variant={l.variant}>{l.label}</Badge>
    }},
    { key: 'amount', header: 'Monto', render: (t) => (
      <span className={t.amount >= 0 ? 'text-lime-400 font-semibold' : 'text-red-400 font-semibold'}>
        {t.amount >= 0 ? '+' : ''}{t.amount}
      </span>
    )},
    { key: 'balanceAfter', header: 'Balance', render: (t) => `${t.balanceAfter} pts` },
    { key: 'notes', header: 'Notas', render: (t) => t.notes || '-' },
    { key: 'createdAt', header: 'Fecha', render: (t) => new Date(t.createdAt).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }) },
  ]

  return (
    <div className="space-y-6 fade-in">
      <div className="bg-zinc-900 rounded-xl p-5 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-yellow-400 via-amber-500 to-orange-400" />
        <div className="flex items-center gap-3">
          <Coins size={20} className="text-yellow-400" />
          <div>
            <h1 className="text-xl font-black text-white tracking-tight uppercase">Puntos</h1>
            <p className="text-[10px] font-mono tracking-widest text-zinc-500 uppercase mt-1">Gestion de puntos de socios</p>
          </div>
        </div>
      </div>

      {/* Member Search */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
        <div className="flex items-center gap-2 max-w-md">
          <Search size={18} className="text-zinc-500" />
          <Input
            placeholder="Buscar socio por nombre, DNI o email..."
            value={memberSearch}
            onChange={e => setMemberSearch(e.target.value)}
          />
          <Button variant="secondary" onClick={() => setNfcScannerOpen(true)} title="Buscar por NFC">
            <Nfc size={18} />
          </Button>
        </div>
        {members.length > 0 && (
          <div className="mt-2 border border-zinc-800 rounded-lg max-h-40 overflow-y-auto divide-y divide-zinc-800">
            {members.map(m => (
              <button key={m.id} onClick={() => selectMember(m)} className="w-full px-3 py-2 text-left text-sm hover:bg-zinc-800 flex justify-between text-zinc-300">
                <span>{m.firstName} {m.lastName} - {m.dni}</span>
                <span className="text-zinc-500">{m.pointsBalance} pts</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {selectedMember && (
        <>
          {/* Balance Card */}
          <div className="bg-zinc-900 rounded-xl p-6 flex items-center justify-between border-l-2 border-lime-400">
            <div>
              <span className="text-[10px] font-mono tracking-widest text-zinc-600 uppercase">Socio</span>
              <p className="text-xl font-black font-mono text-white mt-0.5">{selectedMember.firstName} {selectedMember.lastName}</p>
              <span className="text-[10px] font-mono tracking-widest text-zinc-600 uppercase">DNI: {selectedMember.dni}</span>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-mono tracking-widest text-zinc-600 uppercase">Balance actual</span>
              <p className="text-4xl font-black font-mono text-lime-400 mt-0.5">{selectedMember.pointsBalance}</p>
              <span className="text-[10px] font-mono tracking-widest text-zinc-600 uppercase">puntos</span>
            </div>
          </div>

          {/* Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4 space-y-3">
              <h3 className="text-xs font-mono font-bold tracking-widest text-zinc-400 uppercase flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-lime-400 inline-block" />
                Cargar Puntos
              </h3>
              <Input label="Monto" type="number" min="0" step="1" value={loadAmount} onChange={e => setLoadAmount(e.target.value)} placeholder="Ej: 100" />
              <Input label="Notas (opcional)" value={loadNotes} onChange={e => setLoadNotes(e.target.value)} />
              <Button onClick={handleLoadPoints} loading={saving} disabled={!loadAmount} className="w-full">Cargar</Button>
            </div>
            <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4 space-y-3">
              <h3 className="text-xs font-mono font-bold tracking-widest text-zinc-400 uppercase flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
                Ajuste Manual
              </h3>
              <Input label="Monto (+ o -)" type="number" step="1" value={adjustAmount} onChange={e => setAdjustAmount(e.target.value)} placeholder="Ej: -50" />
              <Input label="Motivo *" value={adjustNotes} onChange={e => setAdjustNotes(e.target.value)} placeholder="Motivo del ajuste" />
              <Button onClick={handleAdjustPoints} loading={saving} disabled={!adjustAmount || !adjustNotes} variant="secondary" className="w-full">Ajustar</Button>
            </div>
          </div>

          {/* Transaction History */}
          <div>
            <h3 className="text-xs font-mono font-bold tracking-widest text-zinc-400 uppercase flex items-center gap-2 mb-3">
              <span className="w-2 h-2 rounded-full bg-lime-400 inline-block" />
              Historial de Transacciones
            </h3>
            <DataTable columns={txColumns} data={transactions} loading={txLoading} pagination={txPagination} onPageChange={setTxPage} />
          </div>
        </>
      )}
      {/* Quick Open Register Modal */}
      <Modal open={registerModalOpen} onClose={() => setRegisterModalOpen(false)} title="Abrir Caja" size="sm">
        <div className="space-y-4">
          <div className="flex items-center gap-3 bg-amber-400/10 px-4 py-3 rounded-lg border border-amber-400/20">
            <DollarSign size={20} className="text-amber-400" />
            <div>
              <p className="text-sm font-medium text-zinc-100">No hay caja abierta</p>
              <p className="text-xs text-zinc-400">La carga de puntos se registra como ingreso en caja. Abre una caja para continuar.</p>
            </div>
          </div>
          <Input
            label="Efectivo inicial en caja"
            type="number"
            min="0"
            step="0.01"
            value={initialCash}
            onChange={e => setInitialCash(e.target.value)}
            placeholder="0.00"
          />
        </div>
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-zinc-800">
          <Button variant="secondary" onClick={() => setRegisterModalOpen(false)}>Cancelar</Button>
          <Button onClick={handleOpenRegisterAndContinue} loading={openingRegister}>
            <DollarSign size={16} /> Abrir Caja y Continuar
          </Button>
        </div>
      </Modal>

      <NfcScanner
        open={nfcScannerOpen}
        onClose={() => setNfcScannerOpen(false)}
        onScan={handleNfcScan}
      />
    </div>
  )
}
