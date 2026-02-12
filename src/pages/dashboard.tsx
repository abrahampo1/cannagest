import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Users, Package, AlertTriangle, DollarSign, ShoppingCart, Plus, Coins, Clock } from 'lucide-react'
import { useAuthStore } from '@/store/auth.store'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'

interface Stats {
  members: number
  products: number
  lowStock: number
  registerOpen: boolean
  recentSales: any[]
  inactiveMembers: any[]
}

export default function DashboardPage() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStats()
  }, [])

  async function loadStats() {
    try {
      const [membersRes, productsRes, lowStockRes, registerRes, salesRes, inactiveRes] = await Promise.all([
        window.api.member.getAll({ page: 1, pageSize: 1 }),
        window.api.product.getAll({ page: 1, pageSize: 1 }),
        window.api.product.getLowStock(),
        window.api.cashRegister.getCurrent(),
        window.api.sale.getAll({ page: 1, pageSize: 5 }),
        window.api.member.getInactive(3),
      ])

      setStats({
        members: membersRes.success ? membersRes.data.total : 0,
        products: productsRes.success ? productsRes.data.total : 0,
        lowStock: lowStockRes.success ? lowStockRes.data.length : 0,
        registerOpen: registerRes.success && registerRes.data !== null,
        recentSales: salesRes.success ? salesRes.data.items : [],
        inactiveMembers: inactiveRes.success ? inactiveRes.data : [],
      })
    } catch {
      // Stats will show 0
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="lg" />
      </div>
    )
  }

  const statCards = [
    {
      label: 'Socios Activos',
      value: stats?.members ?? 0,
      icon: Users,
      color: 'lime',
      onClick: () => navigate('/members'),
    },
    {
      label: 'Productos',
      value: stats?.products ?? 0,
      icon: Package,
      color: 'blue',
      onClick: () => navigate('/products'),
    },
    {
      label: 'Stock Bajo',
      value: stats?.lowStock ?? 0,
      icon: AlertTriangle,
      color: stats?.lowStock ? 'amber' : 'zinc',
      onClick: () => navigate('/stock'),
    },
    {
      label: 'Caja',
      value: stats?.registerOpen ? 'ABIERTA' : 'CERRADA',
      icon: DollarSign,
      color: stats?.registerOpen ? 'lime' : 'zinc',
      onClick: () => navigate('/cash-register'),
    },
  ]

  const colorClasses: Record<string, { border: string; text: string; icon: string }> = {
    lime: { border: 'border-lime-400', text: 'text-lime-400', icon: 'text-lime-400' },
    blue: { border: 'border-blue-400', text: 'text-blue-400', icon: 'text-blue-400' },
    amber: { border: 'border-amber-400', text: 'text-amber-400', icon: 'text-amber-400' },
    zinc: { border: 'border-zinc-600', text: 'text-zinc-500', icon: 'text-zinc-500' },
  }

  return (
    <div className="space-y-6 fade-in">
      {/* Hero Header */}
      <div className="bg-zinc-900 rounded-xl p-5 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-lime-400 via-emerald-500 to-cyan-400" />
        <div>
          <h1 className="text-xl font-black text-white tracking-tight uppercase">
            Hola, {user?.username}
          </h1>
          <p className="text-[10px] font-mono tracking-widest text-zinc-500 uppercase mt-1">Panel de control de CannaGest</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(card => {
          const c = colorClasses[card.color]
          return (
            <button
              key={card.label}
              onClick={card.onClick}
              className={`bg-zinc-900 rounded-lg p-4 border-l-2 ${c.border} text-left hover:bg-zinc-800/50 transition-colors`}
            >
              <div className="flex items-center gap-1.5 mb-2">
                <card.icon size={13} className={c.icon} />
                <span className="text-[10px] font-mono tracking-widest text-zinc-500 uppercase">{card.label}</span>
              </div>
              <p className={`text-2xl font-black font-mono ${c.text}`}>{card.value}</p>
            </button>
          )
        })}
      </div>

      {/* Inactive Members Alert */}
      {stats?.inactiveMembers && stats.inactiveMembers.length > 0 && (
        <div className="bg-zinc-900 rounded-xl border border-amber-400/30 p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-amber-400/15 flex items-center justify-center">
                <Clock size={18} className="text-amber-400" />
              </div>
              <div>
                <h2 className="text-sm font-mono font-bold tracking-widest text-amber-400 uppercase">
                  Socios Inactivos
                </h2>
                <p className="text-xs text-zinc-500 mt-0.5">
                  {stats.inactiveMembers.length} socio{stats.inactiveMembers.length !== 1 ? 's' : ''} sin canjear en +3 meses
                </p>
              </div>
            </div>
            <Button variant="secondary" size="sm" onClick={() => navigate('/members')}>
              Ver todos
            </Button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {stats.inactiveMembers.slice(0, 6).map((m: any) => (
              <button
                key={m.id}
                onClick={() => navigate(`/members/${m.id}`)}
                className="flex items-center justify-between bg-zinc-800/50 hover:bg-zinc-800 rounded-lg px-3 py-2.5 transition-colors text-left"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-zinc-200 truncate">{m.firstName} {m.lastName}</p>
                  <p className="text-[10px] font-mono tracking-widest text-zinc-500 uppercase">
                    {m.lastConsumeDate
                      ? `Ultimo: ${new Date(m.lastConsumeDate).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: '2-digit' })}`
                      : 'Nunca ha canjeado'}
                  </p>
                </div>
                <span className="text-xs font-mono font-bold text-amber-400 ml-2 shrink-0">{m.pointsBalance} pts</span>
              </button>
            ))}
          </div>
          {stats.inactiveMembers.length > 6 && (
            <p className="text-xs text-zinc-500 text-center mt-3 font-mono">
              +{stats.inactiveMembers.length - 6} mas...
            </p>
          )}
        </div>
      )}

      {/* Quick Actions + Recent Sales */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
          <h2 className="text-xs font-mono font-bold tracking-widest text-zinc-400 uppercase flex items-center gap-2 mb-4">
            <span className="w-2 h-2 rounded-full bg-lime-400 inline-block" />
            Acciones Rapidas
          </h2>
          <div className="space-y-2">
            <Button onClick={() => navigate('/sales/new')} className="w-full justify-start" variant="ghost">
              <ShoppingCart size={18} />
              Nueva Venta
            </Button>
            <Button onClick={() => navigate('/points')} className="w-full justify-start" variant="ghost">
              <Coins size={18} />
              Cargar Puntos
            </Button>
            <Button onClick={() => navigate('/members')} className="w-full justify-start" variant="ghost">
              <Plus size={18} />
              Nuevo Socio
            </Button>
          </div>
        </div>

        {/* Recent Sales */}
        <div className="lg:col-span-2 bg-zinc-900 rounded-xl border border-zinc-800 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-mono font-bold tracking-widest text-zinc-400 uppercase flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-lime-400 inline-block" />
              Ventas Recientes
            </h2>
            <Button variant="ghost" size="sm" onClick={() => navigate('/sales')}>
              Ver todas
            </Button>
          </div>

          {stats?.recentSales.length === 0 ? (
            <p className="text-sm font-mono text-zinc-500 py-8 text-center">No hay ventas recientes</p>
          ) : (
            <div className="space-y-3">
              {stats?.recentSales.map((sale: any) => (
                <div
                  key={sale.id}
                  className="flex items-center justify-between py-2 border-b border-zinc-800 last:border-0"
                >
                  <div>
                    <p className="text-sm font-mono font-medium text-zinc-100">{sale.saleNumber}</p>
                    <p className="text-[10px] font-mono tracking-widest text-zinc-500 uppercase">
                      {sale.member?.firstName} {sale.member?.lastName}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-mono font-bold text-lime-400">{sale.totalPoints} pts</p>
                    <Badge
                      variant={sale.status === 'COMPLETED' ? 'success' : sale.status === 'REFUNDED' ? 'warning' : 'danger'}
                    >
                      {sale.status === 'COMPLETED' ? 'Completada' : sale.status === 'REFUNDED' ? 'Reembolsada' : 'Cancelada'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
