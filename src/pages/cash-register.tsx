import { useState, useEffect } from 'react'
import { DollarSign, Lock, Unlock, Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Modal } from '@/components/ui/modal'
import { DataTable, type Column } from '@/components/ui/data-table'
import { useToast } from '@/store/toast.store'
import { useAuthStore } from '@/store/auth.store'

export default function CashRegisterPage() {
  const toast = useToast()
  const { user } = useAuthStore()
  const [currentRegister, setCurrentRegister] = useState<any>(null)
  const [registers, setRegisters] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState<any>(null)
  const [openAmount, setOpenAmount] = useState('')
  const [closeAmount, setCloseAmount] = useState('')
  const [closeNotes, setCloseNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const [selectedRegister, setSelectedRegister] = useState<any>(null)

  useEffect(() => { loadAll() }, [page])

  async function loadAll() {
    setLoading(true)
    try {
      const [currentRes, historyRes] = await Promise.all([
        window.api.cashRegister.getCurrent(),
        window.api.cashRegister.getAll({ page, pageSize: 10 }),
      ])
      if (currentRes.success) setCurrentRegister(currentRes.data)
      if (historyRes.success) {
        setRegisters(historyRes.data.items)
        setPagination(historyRes.data)
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleOpen() {
    const amount = parseFloat(openAmount)
    if (isNaN(amount) || amount < 0) { toast.error('Monto invalido'); return }
    setSaving(true)
    try {
      const res = await window.api.cashRegister.open({
        userId: user!.id,
        initialCash: amount,
      })
      if (res.success) {
        toast.success('Caja abierta')
        setOpenAmount('')
        loadAll()
      } else {
        toast.error(res.error || 'Error')
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleClose() {
    if (!currentRegister) return
    const amount = parseFloat(closeAmount)
    if (isNaN(amount) || amount < 0) { toast.error('Monto invalido'); return }
    setSaving(true)
    try {
      const res = await window.api.cashRegister.close(currentRegister.id, {
        actualCash: amount,
        notes: closeNotes || undefined,
      })
      if (res.success) {
        toast.success('Caja cerrada')
        setCloseAmount('')
        setCloseNotes('')
        setCurrentRegister(null)
        loadAll()
      } else {
        toast.error(res.error || 'Error')
      }
    } finally {
      setSaving(false)
    }
  }

  async function viewDetail(register: any) {
    const res = await window.api.cashRegister.getById(register.id)
    if (res.success) {
      setSelectedRegister(res.data)
      setDetailOpen(true)
    }
  }

  const formatDate = (d: string) => new Date(d).toLocaleDateString('es-ES', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })

  const columns: Column<any>[] = [
    { key: 'openDate', header: 'Apertura', render: (r) => formatDate(r.openDate) },
    { key: 'closeDate', header: 'Cierre', render: (r) => r.closeDate ? formatDate(r.closeDate) : '-' },
    { key: 'openedBy', header: 'Abierta por', render: (r) => r.openedBy?.username || '-' },
    { key: 'initialCash', header: 'Inicial', render: (r) => `${r.initialCash.toFixed(2)} €` },
    { key: 'expectedCash', header: 'Esperado', render: (r) => `${r.expectedCash.toFixed(2)} €` },
    { key: 'difference', header: 'Diferencia', render: (r) => {
      if (r.difference == null) return '-'
      const color = r.difference === 0 ? 'text-zinc-400' : r.difference > 0 ? 'text-lime-400' : 'text-red-400'
      return <span className={`font-semibold ${color}`}>{r.difference.toFixed(2)} €</span>
    }},
    { key: 'status', header: 'Estado', render: (r) => (
      <Badge variant={r.status === 'OPEN' ? 'success' : 'default'}>
        {r.status === 'OPEN' ? 'Abierta' : 'Cerrada'}
      </Badge>
    )},
  ]

  return (
    <div className="space-y-6 fade-in">
      <div className="bg-zinc-900 rounded-xl p-5 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-teal-400 via-cyan-500 to-blue-400" />
        <div className="flex items-center gap-3">
          <DollarSign size={20} className="text-teal-400" />
          <div>
            <h1 className="text-xl font-black text-white tracking-tight uppercase">Caja</h1>
            <p className="text-[10px] font-mono tracking-widest text-zinc-500 uppercase mt-1">Gestion de arqueos de caja</p>
          </div>
        </div>
      </div>

      {/* Current Register Status */}
      {currentRegister ? (
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Unlock className="text-lime-400" size={18} />
              <h2 className="text-xs font-mono font-bold tracking-widest text-zinc-400 uppercase">Caja Abierta</h2>
              <Badge variant="success">Activa</Badge>
            </div>
            <p className="text-[10px] font-mono tracking-widest text-zinc-600 uppercase">Abierta por {currentRegister.openedBy?.username} - {formatDate(currentRegister.openDate)}</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-zinc-800 rounded-lg p-3 border-l-2 border-zinc-500">
              <span className="text-[10px] font-mono tracking-widest text-zinc-600 uppercase">Inicial</span>
              <p className="text-lg font-black font-mono text-zinc-100 mt-0.5">{currentRegister.initialCash.toFixed(2)} €</p>
            </div>
            <div className="bg-zinc-800 rounded-lg p-3 border-l-2 border-lime-400">
              <span className="text-[10px] font-mono tracking-widest text-zinc-600 uppercase">Ventas (pts)</span>
              <p className="text-lg font-black font-mono text-lime-400 mt-0.5">{currentRegister.totalSales.toFixed(1)}</p>
            </div>
            <div className="bg-zinc-800 rounded-lg p-3 border-l-2 border-red-400">
              <span className="text-[10px] font-mono tracking-widest text-zinc-600 uppercase">Gastos</span>
              <p className="text-lg font-black font-mono text-red-400 mt-0.5">{currentRegister.totalExpenses.toFixed(2)} €</p>
            </div>
            <div className="bg-zinc-800 rounded-lg p-3 border-l-2 border-cyan-400">
              <span className="text-[10px] font-mono tracking-widest text-zinc-600 uppercase">Efectivo Esperado</span>
              <p className="text-lg font-black font-mono text-zinc-100 mt-0.5">{currentRegister.expectedCash.toFixed(2)} €</p>
            </div>
          </div>
          <div className="border-t border-zinc-800 pt-4">
            <h3 className="text-xs font-mono font-bold tracking-widest text-zinc-400 uppercase flex items-center gap-2 mb-3">
              <span className="w-2 h-2 rounded-full bg-red-400 inline-block" />
              Cerrar Caja
            </h3>
            <div className="flex items-end gap-3 max-w-lg">
              <div className="flex-1">
                <Input label="Efectivo real" type="number" step="0.01" min="0" value={closeAmount} onChange={e => setCloseAmount(e.target.value)} placeholder="0.00" />
              </div>
              <div className="flex-1">
                <Input label="Notas" value={closeNotes} onChange={e => setCloseNotes(e.target.value)} />
              </div>
              <Button variant="danger" onClick={handleClose} loading={saving} disabled={!closeAmount}>
                <Lock size={16} /> Cerrar
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Lock className="text-zinc-500" size={18} />
            <h2 className="text-xs font-mono font-bold tracking-widest text-zinc-400 uppercase">Caja Cerrada</h2>
          </div>
          <div className="flex items-end gap-3 max-w-md">
            <div className="flex-1">
              <Input label="Efectivo inicial" type="number" step="0.01" min="0" value={openAmount} onChange={e => setOpenAmount(e.target.value)} placeholder="0.00" />
            </div>
            <Button onClick={handleOpen} loading={saving} disabled={!openAmount}>
              <Unlock size={16} /> Abrir Caja
            </Button>
          </div>
        </div>
      )}

      {/* History */}
      <div>
        <h2 className="text-xs font-mono font-bold tracking-widest text-zinc-400 uppercase flex items-center gap-2 mb-3">
          <span className="w-2 h-2 rounded-full bg-lime-400 inline-block" />
          Historial
        </h2>
        <DataTable columns={columns} data={registers} loading={loading} pagination={pagination} onPageChange={setPage}
          actions={(r) => (
            <Button variant="ghost" size="sm" onClick={() => viewDetail(r)}><Eye size={14} /></Button>
          )}
        />
      </div>

      {/* Detail Modal */}
      <Modal open={detailOpen} onClose={() => setDetailOpen(false)} title="Detalle de Caja" size="lg">
        {selectedRegister && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-[10px] font-mono tracking-widest text-zinc-600 uppercase">Apertura:</span> <span className="font-mono text-zinc-300">{formatDate(selectedRegister.openDate)}</span></div>
              <div><span className="text-[10px] font-mono tracking-widest text-zinc-600 uppercase">Cierre:</span> <span className="font-mono text-zinc-300">{selectedRegister.closeDate ? formatDate(selectedRegister.closeDate) : '-'}</span></div>
              <div><span className="text-[10px] font-mono tracking-widest text-zinc-600 uppercase">Inicial:</span> <span className="font-mono font-medium text-zinc-200">{selectedRegister.initialCash.toFixed(2)} €</span></div>
              <div><span className="text-[10px] font-mono tracking-widest text-zinc-600 uppercase">Esperado:</span> <span className="font-mono font-medium text-zinc-200">{selectedRegister.expectedCash.toFixed(2)} €</span></div>
              <div><span className="text-[10px] font-mono tracking-widest text-zinc-600 uppercase">Real:</span> <span className="font-mono font-medium text-zinc-200">{selectedRegister.actualCash != null ? `${selectedRegister.actualCash.toFixed(2)} €` : '-'}</span></div>
              <div><span className="text-[10px] font-mono tracking-widest text-zinc-600 uppercase">Diferencia:</span> <span className={`font-mono font-bold ${selectedRegister.difference > 0 ? 'text-lime-400' : selectedRegister.difference < 0 ? 'text-red-400' : 'text-zinc-400'}`}>{selectedRegister.difference != null ? `${selectedRegister.difference.toFixed(2)} €` : '-'}</span></div>
            </div>

            {selectedRegister.sales?.length > 0 && (
              <div>
                <h4 className="text-xs font-mono font-bold tracking-widest text-zinc-400 uppercase flex items-center gap-2 mb-2">
                  <span className="w-2 h-2 rounded-full bg-lime-400 inline-block" />
                  Ventas ({selectedRegister.sales.length})
                </h4>
                <div className="border border-zinc-800 rounded-lg divide-y divide-zinc-800 max-h-40 overflow-y-auto">
                  {selectedRegister.sales.map((s: any) => (
                    <div key={s.id} className="px-3 py-2 flex justify-between text-sm">
                      <span className="font-mono text-zinc-300">{s.saleNumber}</span>
                      <span className="font-mono font-bold text-lime-400">{s.totalPoints} pts</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedRegister.expenses?.length > 0 && (
              <div>
                <h4 className="text-xs font-mono font-bold tracking-widest text-zinc-400 uppercase flex items-center gap-2 mb-2">
                  <span className="w-2 h-2 rounded-full bg-red-400 inline-block" />
                  Gastos ({selectedRegister.expenses.length})
                </h4>
                <div className="border border-zinc-800 rounded-lg divide-y divide-zinc-800 max-h-40 overflow-y-auto">
                  {selectedRegister.expenses.map((e: any) => (
                    <div key={e.id} className="px-3 py-2 flex justify-between text-sm">
                      <span className="font-mono text-zinc-300">{e.description}</span>
                      <span className="font-mono font-bold text-red-400">{e.amount.toFixed(2)} €</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}
