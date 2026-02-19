import { useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/auth.store'

type TouchBarRoute =
  | 'dashboard'
  | 'members' | 'members/new' | 'members/detail'
  | 'products' | 'products/new' | 'products/detail'
  | 'categories'
  | 'sales' | 'sales/new'
  | 'points'
  | 'stock'
  | 'cash-register'
  | 'expenses'
  | 'cloud-backup'
  | 'users'
  | 'settings'

function pathToRoute(pathname: string): TouchBarRoute {
  // Order matters: check more specific paths first
  if (pathname === '/members/new') return 'members/new'
  if (/^\/members\/.+/.test(pathname)) return 'members/detail'
  if (pathname === '/members') return 'members'

  if (pathname === '/products/new') return 'products/new'
  if (/^\/products\/.+/.test(pathname)) return 'products/detail'
  if (pathname === '/products') return 'products'

  if (pathname === '/categories') return 'categories'

  if (pathname === '/sales/new') return 'sales/new'
  if (pathname === '/sales') return 'sales'

  if (pathname === '/points') return 'points'
  if (pathname === '/stock') return 'stock'
  if (pathname === '/cash-register') return 'cash-register'
  if (pathname === '/expenses') return 'expenses'
  if (pathname === '/cloud-backup') return 'cloud-backup'
  if (pathname === '/users') return 'users'
  if (pathname === '/settings') return 'settings'

  return 'dashboard'
}

export function useTouchBarSync() {
  const location = useLocation()
  const navigate = useNavigate()
  const logout = useAuthStore((s) => s.logout)
  const lastRouteRef = useRef<string>('')

  // Send route changes to main process
  useEffect(() => {
    const route = pathToRoute(location.pathname)
    if (route === lastRouteRef.current) return
    lastRouteRef.current = route

    if (route === 'cash-register') {
      window.api.cashRegister.getCurrent().then((res: { success: boolean; data?: unknown }) => {
        window.api.touchbar.sendRouteChange({
          route,
          cashRegisterOpen: res.success && res.data !== null,
        })
      })
    } else {
      window.api.touchbar.sendRouteChange({ route })
    }
  }, [location.pathname])

  // Listen for Touch Bar actions
  useEffect(() => {
    const cleanup = window.api.touchbar.onAction((action: string) => {
      if (action.startsWith('navigate:')) {
        const target = action.replace('navigate:', '')
        const routeMap: Record<string, string> = {
          'dashboard': '/',
          'members': '/members',
          'members/new': '/members/new',
          'products': '/products',
          'products/new': '/products/new',
          'categories': '/categories',
          'categories/new': '/categories',
          'sales': '/sales',
          'sales/new': '/sales/new',
          'points': '/points',
          'stock': '/stock',
          'cash-register': '/cash-register',
          'expenses': '/expenses',
          'cloud-backup': '/cloud-backup',
          'users': '/users',
          'settings': '/settings',
        }
        const path = routeMap[target]
        if (path) navigate(path)
        return
      }

      if (action === 'action:lock') {
        logout()
        navigate('/login')
        return
      }

      // Dispatch custom events for page-specific actions
      window.dispatchEvent(new CustomEvent('touchbar:action', { detail: action }))
    })

    return cleanup
  }, [navigate, logout])
}
