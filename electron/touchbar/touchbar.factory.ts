import { TouchBar } from 'electron'
import type { TouchBarContext, TouchBarAction, TouchBarRoute } from './touchbar.types'

const { TouchBarButton, TouchBarLabel, TouchBarSpacer, TouchBarPopover, TouchBarGroup } = TouchBar

type ActionEmitter = (action: TouchBarAction) => void

function createNewSaleButton(emit: ActionEmitter) {
  return new TouchBarButton({
    label: '🛒 Nueva Venta',
    backgroundColor: '#65a30d',
    click: () => emit('navigate:sales/new'),
  })
}

function createNavPopover(emit: ActionEmitter) {
  const navItems = new TouchBar({
    items: [
      new TouchBarButton({ label: '🏠 Inicio', click: () => emit('navigate:dashboard') }),
      new TouchBarButton({ label: '👥 Socios', click: () => emit('navigate:members') }),
      new TouchBarButton({ label: '📦 Productos', click: () => emit('navigate:products') }),
      new TouchBarButton({ label: '🛒 Ventas', click: () => emit('navigate:sales') }),
      new TouchBarButton({ label: '💰 Caja', click: () => emit('navigate:cash-register') }),
      new TouchBarButton({ label: '📥 Inventario', click: () => emit('navigate:stock') }),
    ],
  })

  return new TouchBarPopover({
    label: '☰ Nav',
    items: navItems,
  })
}

function createLockButton(emit: ActionEmitter) {
  return new TouchBarButton({
    label: '🔒 Bloquear',
    click: () => emit('action:lock'),
  })
}

function createContextualItems(context: TouchBarContext, emit: ActionEmitter): (Electron.TouchBarButton | Electron.TouchBarLabel)[] {
  const items: (Electron.TouchBarButton | Electron.TouchBarLabel)[] = []
  const route: TouchBarRoute = context.route

  switch (route) {
    case 'dashboard':
      items.push(new TouchBarLabel({ label: '🏠 Dashboard' }))
      break

    case 'members':
      items.push(new TouchBarButton({ label: '+ Nuevo Socio', click: () => emit('navigate:members/new') }))
      items.push(new TouchBarButton({ label: '🔍 Buscar', click: () => emit('action:search') }))
      break

    case 'members/new':
      items.push(new TouchBarButton({ label: '⬅ Socios', click: () => emit('navigate:members') }))
      items.push(new TouchBarLabel({ label: 'Nuevo Socio' }))
      break

    case 'members/detail':
      items.push(new TouchBarButton({ label: '⬅ Socios', click: () => emit('navigate:members') }))
      items.push(new TouchBarButton({ label: '💳 Cargar Puntos', click: () => emit('action:load-points') }))
      break

    case 'products':
      items.push(new TouchBarButton({ label: '+ Nuevo Producto', click: () => emit('navigate:products/new') }))
      items.push(new TouchBarButton({ label: '🔍 Buscar', click: () => emit('action:search') }))
      break

    case 'products/new':
      items.push(new TouchBarButton({ label: '⬅ Productos', click: () => emit('navigate:products') }))
      items.push(new TouchBarLabel({ label: 'Nuevo Producto' }))
      break

    case 'products/detail':
      items.push(new TouchBarButton({ label: '⬅ Productos', click: () => emit('navigate:products') }))
      break

    case 'categories':
      items.push(new TouchBarButton({ label: '+ Nueva Categoría', click: () => emit('navigate:categories/new') }))
      break

    case 'sales':
      items.push(new TouchBarButton({ label: '🔍 Buscar', click: () => emit('action:search') }))
      break

    case 'sales/new':
      items.push(new TouchBarButton({ label: '⬅ Ventas', click: () => emit('navigate:sales') }))
      items.push(new TouchBarLabel({ label: 'TPV' }))
      break

    case 'points':
      items.push(new TouchBarButton({ label: '💳 Cargar Puntos', click: () => emit('action:load-points') }))
      break

    case 'stock':
      items.push(new TouchBarButton({ label: '+ Entrada Stock', click: () => emit('action:stock-entry') }))
      items.push(new TouchBarButton({ label: '📋 Ajuste', click: () => emit('action:stock-adjustment') }))
      break

    case 'cash-register':
      if (context.cashRegisterOpen) {
        items.push(new TouchBarButton({ label: '🔴 Cerrar Caja', backgroundColor: '#dc2626', click: () => emit('action:close-cash') }))
      } else {
        items.push(new TouchBarButton({ label: '🟢 Abrir Caja', backgroundColor: '#16a34a', click: () => emit('action:open-cash') }))
      }
      break

    case 'expenses':
      items.push(new TouchBarButton({ label: '+ Nuevo Gasto', click: () => emit('navigate:expenses') }))
      break

    case 'cloud-backup':
      items.push(new TouchBarButton({ label: '☁️ Backup Ahora', click: () => emit('action:backup-now') }))
      break

    case 'users':
      items.push(new TouchBarButton({ label: '+ Nuevo Usuario', click: () => emit('navigate:users') }))
      break

    case 'settings':
      items.push(new TouchBarLabel({ label: '⚙️ Configuración' }))
      break
  }

  return items
}

export function buildTouchBar(context: TouchBarContext, emit: ActionEmitter): TouchBar {
  const contextualItems = createContextualItems(context, emit)

  return new TouchBar({
    items: [
      createNewSaleButton(emit),
      new TouchBarSpacer({ size: 'flexible' }),
      ...contextualItems,
      new TouchBarSpacer({ size: 'flexible' }),
      createNavPopover(emit),
      createLockButton(emit),
    ],
  })
}
