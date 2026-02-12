import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Nfc, Wallet, TrendingUp, TrendingDown, Calculator, Clock, Users, Coins, PlusCircle, MinusCircle, DollarSign } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { DataTable, type Column } from '@/components/ui/data-table'
import { PageSpinner } from '@/components/ui/spinner'
import { useToast } from '@/store/toast.store'
import { useAuthStore } from '@/store/auth.store'

const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
  ACTIVE: { bg: 'bg-lime-400/20', text: 'text-lime-400', label: 'ACTIVO' },
  INACTIVE: { bg: 'bg-red-500/20', text: 'text-red-400', label: 'INACTIVO' },
  SUSPENDED: { bg: 'bg-amber-400/20', text: 'text-amber-400', label: 'SUSPENDIDO' },
}

const membershipLabels: Record<string, string> = {
  NO_FEE: 'SIN CUOTA',
  MONTHLY: 'MENSUAL',
  ANNUAL: 'ANUAL',
}

const txTypeConfig: Record<string, { bg: string; text: string; label: string }> = {
  LOAD: { bg: 'bg-lime-400/15', text: 'text-lime-400', label: 'CARGA' },
  CONSUME: { bg: 'bg-red-400/15', text: 'text-red-400', label: 'CONSUMO' },
  REFUND: { bg: 'bg-cyan-400/15', text: 'text-cyan-400', label: 'DEVOLUCION' },
  ADJUSTMENT: { bg: 'bg-amber-400/15', text: 'text-amber-400', label: 'AJUSTE' },
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

function timeAgo(date: string | Date): string {
  const now = new Date()
  const d = new Date(date)
  const diffMs = now.getTime() - d.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return 'AHORA'
  if (diffMin < 60) return `${diffMin}m`
  const diffHours = Math.floor(diffMin / 60)
  if (diffHours < 24) return `${diffHours}h`
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays === 1) return '1 DIA'
  if (diffDays < 30) return `${diffDays} DIAS`
  const diffMonths = Math.floor(diffDays / 30)
  if (diffMonths === 1) return '1 MES'
  return `${diffMonths} MESES`
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

export default function MemberDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const toast = useToast()
  const { user } = useAuthStore()

  const [member, setMember] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'transactions' | 'sales' | 'payments'>('transactions')

  // Points load/adjust
  const [loadModalOpen, setLoadModalOpen] = useState(false)
  const [adjustModalOpen, setAdjustModalOpen] = useState(false)
  const [pointsAmount, setPointsAmount] = useState('')
  const [pointsNotes, setPointsNotes] = useState('')
  const [pointsSaving, setPointsSaving] = useState(false)

  // Quick open register
  const [registerModalOpen, setRegisterModalOpen] = useState(false)
  const [initialCash, setInitialCash] = useState('0')
  const [openingRegister, setOpeningRegister] = useState(false)

  const [allTransactions, setAllTransactions] = useState<any[]>([])
  const [txPage, setTxPage] = useState(1)
  const txPageSize = 10

  const [sales, setSales] = useState<any[]>([])
  const [salesPagination, setSalesPagination] = useState<any>(null)
  const [salesPage, setSalesPage] = useState(1)
  const [salesLoading, setSalesLoading] = useState(false)

  const [payments, setPayments] = useState<any[]>([])
  const [paymentsLoading, setPaymentsLoading] = useState(false)

  useEffect(() => {
    if (id) loadMember()
  }, [id])

  useEffect(() => {
    if (id && activeTab === 'sales') loadSales()
  }, [id, activeTab, salesPage])

  useEffect(() => {
    if (id && activeTab === 'payments') loadPayments()
  }, [id, activeTab])

  async function loadMember() {
    setLoading(true)
    try {
      const [memberRes, txRes] = await Promise.all([
        window.api.member.getById(id!),
        window.api.points.getTransactions(id!, { page: 1, pageSize: 1000 }),
      ])
      if (memberRes.success) setMember(memberRes.data)
      if (txRes.success) setAllTransactions(txRes.data.items)
    } finally {
      setLoading(false)
    }
  }

  async function loadSales() {
    setSalesLoading(true)
    try {
      const res = await window.api.sale.getAll({ page: salesPage, pageSize: 10, memberId: id } as any)
      if (res.success) {
        setSales(res.data.items)
        setSalesPagination(res.data)
      }
    } finally {
      setSalesLoading(false)
    }
  }

  async function loadPayments() {
    setPaymentsLoading(true)
    try {
      const res = await window.api.membershipPayment.getByMember(id!)
      if (res.success) setPayments(res.data)
    } finally {
      setPaymentsLoading(false)
    }
  }

  async function handleLoadPoints() {
    const amount = parseFloat(pointsAmount)
    if (!amount || amount <= 0) { toast.error('Monto invalido'); return }
    setPointsSaving(true)
    try {
      const res = await window.api.points.load({
        memberId: id!,
        amount,
        userId: user!.id,
        notes: pointsNotes || undefined,
      })
      if (res.success) {
        toast.success(`${amount} puntos cargados`)
        setLoadModalOpen(false)
        setMember((m: any) => m ? { ...m, pointsBalance: res.data.newBalance } : m)
        // Refresh transactions
        const txRes = await window.api.points.getTransactions(id!, { page: 1, pageSize: 1000 })
        if (txRes.success) setAllTransactions(txRes.data.items)
      } else {
        toast.error(res.error || 'Error al cargar puntos')
      }
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setPointsSaving(false)
    }
  }

  async function handleAdjustPoints() {
    const amount = parseFloat(pointsAmount)
    if (!amount || amount === 0) { toast.error('Monto invalido'); return }
    if (!pointsNotes.trim()) { toast.error('Motivo es requerido'); return }
    setPointsSaving(true)
    try {
      const res = await window.api.points.adjust({
        memberId: id!,
        amount,
        userId: user!.id,
        notes: pointsNotes,
      })
      if (res.success) {
        toast.success(`Ajuste de ${amount} puntos aplicado`)
        setAdjustModalOpen(false)
        setMember((m: any) => m ? { ...m, pointsBalance: res.data.newBalance } : m)
        const txRes = await window.api.points.getTransactions(id!, { page: 1, pageSize: 1000 })
        if (txRes.success) setAllTransactions(txRes.data.items)
      } else {
        toast.error(res.error || 'Error al ajustar puntos')
      }
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setPointsSaving(false)
    }
  }

  async function openLoadModal() {
    // Check if register is open first (points load = cash income)
    const regRes = await window.api.cashRegister.getCurrent()
    if (regRes.success && regRes.data) {
      // Register is open, proceed normally
      setPointsAmount('')
      setPointsNotes('')
      setLoadModalOpen(true)
    } else {
      // No register open, prompt to open one
      setInitialCash('0')
      setRegisterModalOpen(true)
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
        // Now open the load modal
        setPointsAmount('')
        setPointsNotes('')
        setLoadModalOpen(true)
      } else {
        toast.error(res.error || 'Error al abrir caja')
      }
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setOpeningRegister(false)
    }
  }

  function openAdjustModal() {
    setPointsAmount('')
    setPointsNotes('')
    setAdjustModalOpen(true)
  }

  const stats = useMemo(() => {
    const loads = allTransactions.filter(t => t.type === 'LOAD')
    const consumes = allTransactions.filter(t => t.type === 'CONSUME')

    const totalLoaded = loads.reduce((s, t) => s + t.amount, 0)
    const totalConsumed = consumes.reduce((s, t) => s + Math.abs(t.amount), 0)
    const avgConsume = consumes.length > 0 ? totalConsumed / consumes.length : 0

    const lastConsume = consumes.length > 0 ? consumes[0] : null

    let avgDaysBetween = 0
    if (consumes.length >= 2) {
      const sorted = [...consumes].sort((a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      )
      let totalDiffMs = 0
      for (let i = 1; i < sorted.length; i++) {
        totalDiffMs += new Date(sorted[i].createdAt).getTime() - new Date(sorted[i - 1].createdAt).getTime()
      }
      avgDaysBetween = totalDiffMs / (sorted.length - 1) / (1000 * 60 * 60 * 24)
    }

    return { totalLoaded, totalConsumed, avgConsume, lastConsume, avgDaysBetween, consumeCount: consumes.length }
  }, [allTransactions])

  const paginatedTx = useMemo(() => {
    const start = (txPage - 1) * txPageSize
    return allTransactions.slice(start, start + txPageSize)
  }, [allTransactions, txPage])

  const txPagination = useMemo(() => ({
    page: txPage,
    pageSize: txPageSize,
    total: allTransactions.length,
    totalPages: Math.ceil(allTransactions.length / txPageSize),
  }), [allTransactions.length, txPage])

  // Column definitions
  const txColumns: Column<any>[] = [
    {
      key: 'type', header: 'Tipo', render: (t) => {
        const c = txTypeConfig[t.type] || { bg: 'bg-gray-500/15', text: 'text-gray-400', label: t.type }
        return <UrbanBadge {...c} />
      },
    },
    {
      key: 'amount', header: 'Monto', render: (t) => (
        <span className={`font-mono font-bold ${t.amount >= 0 ? 'text-lime-600' : 'text-red-500'}`}>
          {t.amount >= 0 ? '+' : ''}{t.amount}
        </span>
      ),
    },
    { key: 'balanceAfter', header: 'Balance', render: (t) => <span className="font-mono">{t.balanceAfter} pts</span> },
    { key: 'notes', header: 'Notas', render: (t) => t.notes || '-' },
    { key: 'createdAt', header: 'Fecha', render: (t) => <span className="font-mono text-xs">{formatDateTime(t.createdAt)}</span> },
  ]

  const salesColumns: Column<any>[] = [
    { key: 'saleNumber', header: 'Numero', render: (s) => <span className="font-mono text-xs font-bold">{s.saleNumber}</span> },
    { key: 'totalPoints', header: 'Total', render: (s) => <span className="font-mono font-bold">{s.totalPoints} pts</span> },
    { key: 'items', header: 'Items', render: (s) => <span className="font-mono">{s._count?.items ?? s.totalItems}</span> },
    { key: 'soldBy', header: 'Vendedor', render: (s) => s.soldBy?.username || '-' },
    { key: 'saleDate', header: 'Fecha', render: (s) => <span className="font-mono text-xs">{formatDateTime(s.saleDate)}</span> },
    {
      key: 'status', header: 'Estado', render: (s) => {
        const c = saleStatusConfig[s.status] || saleStatusConfig.COMPLETED
        return <UrbanBadge {...c} />
      },
    },
  ]

  const paymentColumns: Column<any>[] = [
    { key: 'amount', header: 'Monto', render: (p) => <span className="font-mono font-bold">{p.amount} EUR</span> },
    { key: 'periodStart', header: 'Periodo', render: (p) => <span className="font-mono text-xs">{formatDate(p.periodStart)} - {formatDate(p.periodEnd)}</span> },
    { key: 'paymentType', header: 'Tipo', render: (p) => <span className="uppercase text-xs font-bold tracking-wide">{p.paymentType}</span> },
    { key: 'notes', header: 'Notas', render: (p) => p.notes || '-' },
    { key: 'paymentDate', header: 'Fecha', render: (p) => <span className="font-mono text-xs">{formatDateTime(p.paymentDate)}</span> },
  ]

  if (loading) return <PageSpinner />
  if (!member) {
    return (
      <div className="text-center py-20 space-y-4">
        <p className="text-zinc-400 font-mono">SOCIO NO ENCONTRADO</p>
        <Button variant="secondary" onClick={() => navigate('/members')}>Volver</Button>
      </div>
    )
  }

  const st = statusConfig[member.status] || statusConfig.ACTIVE
  const tabs = [
    { key: 'transactions' as const, label: 'TRANSACCIONES' },
    { key: 'sales' as const, label: 'COMPRAS' },
    { key: 'payments' as const, label: 'PAGOS' },
  ]

  function formatAvgDays(days: number): string {
    if (days < 1) {
      const hours = Math.round(days * 24)
      return hours <= 1 ? '< 1h' : `${hours}h`
    }
    const rounded = Math.round(days)
    return rounded === 1 ? '1 dia' : `${rounded} dias`
  }

  return (
    <div className="space-y-5 fade-in">
      {/* Header - dark hero */}
      <div className="bg-zinc-900 rounded-xl p-6 relative overflow-hidden">
        {/* Decorative accent line */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-lime-400 via-emerald-500 to-cyan-400" />
        <div className="flex items-start gap-4">
          <button
            onClick={() => navigate('/members')}
            className="mt-1 p-2 rounded-lg text-zinc-500 hover:text-lime-400 hover:bg-zinc-800 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-black text-white tracking-tight uppercase">
                {member.firstName} {member.lastName}
              </h1>
              <UrbanBadge {...st} />
              <span className="bg-cyan-400/15 text-cyan-400 px-2 py-0.5 text-[10px] font-bold tracking-widest uppercase font-mono">
                {membershipLabels[member.membershipType] || member.membershipType}
              </span>
              {member.nfcTagId && (
                <span className="bg-zinc-700 text-zinc-300 px-2 py-0.5 text-[10px] font-bold tracking-widest uppercase font-mono inline-flex items-center gap-1">
                  <Nfc size={10} /> NFC
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-500 mt-2 font-mono tracking-wide">
              MIEMBRO DESDE {formatDate(member.createdAt).toUpperCase()}
            </p>
          </div>
          {/* Big balance display + actions */}
          <div className="hidden sm:flex items-center gap-4">
            <div className="flex flex-col gap-1.5">
              <Button size="sm" onClick={openLoadModal} title="Cargar puntos">
                <PlusCircle size={14} /> Cargar
              </Button>
              <Button size="sm" variant="secondary" onClick={openAdjustModal} title="Ajustar puntos">
                <MinusCircle size={14} /> Ajustar
              </Button>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-zinc-500 font-mono tracking-widest uppercase">Balance</p>
              <p className="text-4xl font-black text-lime-400 font-mono leading-none mt-1">{member.pointsBalance}</p>
              <p className="text-[10px] text-zinc-600 font-mono tracking-widest">PUNTOS</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards - dark grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {/* Balance (visible on mobile since header hides it) */}
        <div className="bg-zinc-900 rounded-lg p-4 border-l-2 border-lime-400 sm:hidden col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <Wallet size={13} className="text-lime-400" />
                <span className="text-[10px] font-mono tracking-widest text-zinc-500 uppercase">Balance</span>
              </div>
              <p className="text-2xl font-black font-mono text-lime-400">{member.pointsBalance}</p>
              <p className="text-[10px] font-mono text-zinc-600 tracking-widest">PUNTOS</p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={openLoadModal}><PlusCircle size={14} /> Cargar</Button>
              <Button size="sm" variant="secondary" onClick={openAdjustModal}><MinusCircle size={14} /> Ajustar</Button>
            </div>
          </div>
        </div>

        <div className="bg-zinc-900 rounded-lg p-4 border-l-2 border-cyan-400">
          <div className="flex items-center gap-1.5 mb-2">
            <TrendingUp size={13} className="text-cyan-400" />
            <span className="text-[10px] font-mono tracking-widest text-zinc-500 uppercase">Cargado</span>
          </div>
          <p className="text-2xl font-black font-mono text-cyan-400">{stats.totalLoaded}</p>
          <p className="text-[10px] font-mono text-zinc-600 tracking-widest">TOTAL PTS</p>
        </div>

        <div className="bg-zinc-900 rounded-lg p-4 border-l-2 border-orange-400">
          <div className="flex items-center gap-1.5 mb-2">
            <TrendingDown size={13} className="text-orange-400" />
            <span className="text-[10px] font-mono tracking-widest text-zinc-500 uppercase">Canjeado</span>
          </div>
          <p className="text-2xl font-black font-mono text-orange-400">{stats.totalConsumed}</p>
          <p className="text-[10px] font-mono text-zinc-600 tracking-widest">TOTAL PTS</p>
        </div>

        <div className="bg-zinc-900 rounded-lg p-4 border-l-2 border-violet-400">
          <div className="flex items-center gap-1.5 mb-2">
            <Calculator size={13} className="text-violet-400" />
            <span className="text-[10px] font-mono tracking-widest text-zinc-500 uppercase">Media</span>
          </div>
          <p className="text-2xl font-black font-mono text-violet-400">{stats.avgConsume.toFixed(1)}</p>
          <p className="text-[10px] font-mono text-zinc-600 tracking-widest">PTS/CANJE</p>
        </div>

        <div className="bg-zinc-900 rounded-lg p-4 border-l-2 border-fuchsia-400">
          <div className="flex items-center gap-1.5 mb-2">
            <Clock size={13} className="text-fuchsia-400" />
            <span className="text-[10px] font-mono tracking-widest text-zinc-500 uppercase">Ultimo</span>
          </div>
          <p className="text-xl font-black font-mono text-fuchsia-400">
            {stats.lastConsume ? timeAgo(stats.lastConsume.createdAt) : '-'}
          </p>
          <p className="text-[10px] font-mono text-zinc-600 tracking-widest">
            {stats.consumeCount >= 2
              ? `CADA ${formatAvgDays(stats.avgDaysBetween).toUpperCase()}`
              : 'SIN DATOS'}
          </p>
        </div>
      </div>

      {/* Personal Data - dark card */}
      <div className="bg-zinc-900 rounded-lg p-5">
        <h2 className="text-xs font-mono font-bold tracking-widest text-zinc-400 uppercase mb-4 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-lime-400 inline-block" />
          Datos personales
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-4 text-sm">
          <div>
            <span className="text-[10px] font-mono tracking-widest text-zinc-600 uppercase">DNI</span>
            <p className="font-mono font-medium text-zinc-200 mt-0.5">{member.dni}</p>
          </div>
          <div>
            <span className="text-[10px] font-mono tracking-widest text-zinc-600 uppercase">Email</span>
            <p className="font-mono font-medium text-zinc-200 mt-0.5 truncate">{member.email}</p>
          </div>
          <div>
            <span className="text-[10px] font-mono tracking-widest text-zinc-600 uppercase">Telefono</span>
            <p className="font-mono font-medium text-zinc-200 mt-0.5">{member.phone || '-'}</p>
          </div>
          <div>
            <span className="text-[10px] font-mono tracking-widest text-zinc-600 uppercase">Direccion</span>
            <p className="font-mono font-medium text-zinc-200 mt-0.5">{member.address || '-'}</p>
          </div>
          <div>
            <span className="text-[10px] font-mono tracking-widest text-zinc-600 uppercase">Nacimiento</span>
            <p className="font-mono font-medium text-zinc-200 mt-0.5">{member.dateOfBirth ? formatDate(member.dateOfBirth) : '-'}</p>
          </div>
          <div>
            <span className="text-[10px] font-mono tracking-widest text-zinc-600 uppercase">Membresia</span>
            <p className="font-mono font-medium text-zinc-200 mt-0.5">
              {membershipLabels[member.membershipType] || member.membershipType}
              {member.membershipFee > 0 && <span className="text-lime-400 ml-1">({member.membershipFee} EUR)</span>}
            </p>
          </div>
          {member.referredBy && (
            <div>
              <span className="text-[10px] font-mono tracking-widest text-zinc-600 uppercase">Recomendado por</span>
              <button
                onClick={() => navigate(`/members/${member.referredBy.id}`)}
                className="block font-mono font-medium text-violet-400 mt-0.5 hover:text-violet-300 transition-colors"
              >
                {member.referredBy.firstName} {member.referredBy.lastName}
              </button>
            </div>
          )}
        </div>

        {member.referrals && member.referrals.length > 0 && (
          <div className="mt-5 pt-4 border-t border-zinc-800">
            <h3 className="text-[10px] font-mono font-bold tracking-widest text-zinc-500 uppercase mb-3 flex items-center gap-2">
              <Users size={12} className="text-violet-400" />
              Socios recomendados ({member.referrals.length})
            </h3>
            <div className="flex flex-wrap gap-2">
              {member.referrals.map((r: any) => (
                <button
                  key={r.id}
                  onClick={() => navigate(`/members/${r.id}`)}
                  className="inline-flex items-center gap-2 bg-violet-400/10 text-violet-400 px-3 py-1.5 rounded-lg text-xs font-mono
                    hover:bg-violet-400/20 transition-colors"
                >
                  {r.firstName} {r.lastName}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Tabs - urban style */}
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

        {activeTab === 'transactions' && (
          <DataTable
            columns={txColumns}
            data={paginatedTx}
            pagination={txPagination}
            onPageChange={setTxPage}
            emptyMessage="Sin transacciones"
          />
        )}

        {activeTab === 'sales' && (
          <DataTable
            columns={salesColumns}
            data={sales}
            loading={salesLoading}
            pagination={salesPagination}
            onPageChange={setSalesPage}
            emptyMessage="Sin compras"
          />
        )}

        {activeTab === 'payments' && (
          <DataTable
            columns={paymentColumns}
            data={payments}
            loading={paymentsLoading}
            emptyMessage="Sin pagos de membresia"
          />
        )}
      </div>

      {/* Load Points Modal */}
      <Modal open={loadModalOpen} onClose={() => setLoadModalOpen(false)} title="Cargar Puntos" size="sm">
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-lime-400/10 px-4 py-3 rounded-lg border border-lime-400/20">
            <div>
              <p className="font-medium text-zinc-100">{member.firstName} {member.lastName}</p>
              <p className="text-xs text-lime-400">Balance actual: {member.pointsBalance} pts</p>
            </div>
          </div>
          <Input
            label="Monto a cargar *"
            type="number"
            min="1"
            step="1"
            value={pointsAmount}
            onChange={e => setPointsAmount(e.target.value)}
            placeholder="Ej: 100"
          />
          <Input
            label="Notas (opcional)"
            value={pointsNotes}
            onChange={e => setPointsNotes(e.target.value)}
            placeholder="Motivo de la carga"
          />
        </div>
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-zinc-800">
          <Button variant="secondary" onClick={() => setLoadModalOpen(false)}>Cancelar</Button>
          <Button onClick={handleLoadPoints} loading={pointsSaving} disabled={!pointsAmount || parseFloat(pointsAmount) <= 0}>
            <Coins size={16} /> Cargar Puntos
          </Button>
        </div>
      </Modal>

      {/* Adjust Points Modal */}
      <Modal open={adjustModalOpen} onClose={() => setAdjustModalOpen(false)} title="Ajustar Puntos" size="sm">
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-amber-400/10 px-4 py-3 rounded-lg border border-amber-400/20">
            <div>
              <p className="font-medium text-zinc-100">{member.firstName} {member.lastName}</p>
              <p className="text-xs text-amber-400">Balance actual: {member.pointsBalance} pts</p>
            </div>
          </div>
          <p className="text-xs text-zinc-400">
            Usa un numero positivo para sumar y negativo para restar puntos.
          </p>
          <Input
            label="Cantidad *"
            type="number"
            step="1"
            value={pointsAmount}
            onChange={e => setPointsAmount(e.target.value)}
            placeholder="Ej: -50 o 50"
          />
          <Input
            label="Motivo del ajuste *"
            value={pointsNotes}
            onChange={e => setPointsNotes(e.target.value)}
            placeholder="Motivo obligatorio"
          />
        </div>
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-zinc-800">
          <Button variant="secondary" onClick={() => setAdjustModalOpen(false)}>Cancelar</Button>
          <Button onClick={handleAdjustPoints} loading={pointsSaving} disabled={!pointsAmount || parseFloat(pointsAmount) === 0 || !pointsNotes.trim()}>
            <Coins size={16} /> Aplicar Ajuste
          </Button>
        </div>
      </Modal>

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
    </div>
  )
}
