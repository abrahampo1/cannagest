import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Users, Package, Tags, ShoppingCart,
  Coins, Warehouse, DollarSign, Receipt, UserCog, LogOut, Cloud, Settings
} from 'lucide-react'
import { useAuthStore } from '@/store/auth.store'
import { cn } from '@/lib/utils'

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/members', icon: Users, label: 'Socios' },
  { to: '/products', icon: Package, label: 'Productos' },
  { to: '/categories', icon: Tags, label: 'Categorias' },
  { to: '/sales', icon: ShoppingCart, label: 'Ventas' },
  { to: '/points', icon: Coins, label: 'Puntos' },
  { to: '/stock', icon: Warehouse, label: 'Inventario' },
  { to: '/cash-register', icon: DollarSign, label: 'Caja' },
  { to: '/expenses', icon: Receipt, label: 'Gastos' },
  { to: '/cloud-backup', icon: Cloud, label: 'Cloud Backup' },
]

const adminItems = [
  { to: '/users', icon: UserCog, label: 'Usuarios' },
  { to: '/settings', icon: Settings, label: 'Configuracion' },
]

export function Sidebar() {
  const { user, logout } = useAuthStore()
  const isAdmin = user?.role === 'ADMIN'

  return (
    <aside className="w-60 h-screen bg-zinc-950 text-white flex flex-col fixed left-0 top-0 z-40 border-r border-zinc-800">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-zinc-800">
        <h1 className="text-xl font-black tracking-wider font-mono">
          <span className="text-lime-400">CANNA</span>GEST
        </h1>
        <p className="text-[10px] font-mono tracking-widest text-zinc-600 uppercase mt-0.5">Gestion de Club</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {navItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) => cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-mono font-medium tracking-wide transition-colors',
              isActive
                ? 'bg-lime-400 text-zinc-900'
                : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100'
            )}
          >
            <item.icon size={18} />
            {item.label}
          </NavLink>
        ))}

        {isAdmin && (
          <>
            <div className="pt-4 pb-2 px-3">
              <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-zinc-600">
                Admin
              </p>
            </div>
            {adminItems.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-mono font-medium tracking-wide transition-colors',
                  isActive
                    ? 'bg-lime-400 text-zinc-900'
                    : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100'
                )}
              >
                <item.icon size={18} />
                {item.label}
              </NavLink>
            ))}
          </>
        )}
      </nav>

      {/* User */}
      <div className="px-3 py-4 border-t border-zinc-800">
        <div className="flex items-center gap-3 px-3 mb-3">
          <div className="w-8 h-8 rounded-full bg-lime-400 text-zinc-900 flex items-center justify-center text-sm font-bold">
            {user?.username?.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-mono font-medium truncate">{user?.username}</p>
            <p className="text-[10px] font-mono tracking-widest text-zinc-500 uppercase">{user?.role}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-3 px-3 py-2 w-full rounded-lg text-sm font-mono tracking-wide text-zinc-500 hover:bg-zinc-800 hover:text-zinc-100 transition-colors"
        >
          <LogOut size={18} />
          Cerrar sesion
        </button>
      </div>
    </aside>
  )
}
