import type { BrowserWindow } from 'electron'
import type { TouchBarContext, TouchBarAction } from './touchbar.types'
import { buildTouchBar } from './touchbar.factory'
import { createLogger } from '../utils/logger.util'

const log = createLogger('TouchBar')

let mainWindow: BrowserWindow | null = null

function emitAction(action: TouchBarAction) {
  if (!mainWindow || mainWindow.isDestroyed()) return
  mainWindow.webContents.send('touchbar:action', action)
}

export function initializeTouchBar(win: BrowserWindow) {
  if (process.platform !== 'darwin') return

  mainWindow = win
  const defaultContext: TouchBarContext = { route: 'dashboard' }
  win.setTouchBar(buildTouchBar(defaultContext, emitAction))
  log.info('Touch Bar initialized')
}

export function updateTouchBar(context: TouchBarContext) {
  if (process.platform !== 'darwin') return
  if (!mainWindow || mainWindow.isDestroyed()) return

  mainWindow.setTouchBar(buildTouchBar(context, emitAction))
}

export function clearTouchBar() {
  if (process.platform !== 'darwin') return

  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.setTouchBar(null)
  }
  mainWindow = null
  log.info('Touch Bar cleared')
}
