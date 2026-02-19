import { ipcMain } from 'electron'
import type { TouchBarContext } from '../touchbar/touchbar.types'
import { updateTouchBar } from '../touchbar/touchbar.manager'
import { createLogger } from '../utils/logger.util'

const log = createLogger('TouchBar IPC')

export function registerTouchBarHandlers() {
  ipcMain.on('touchbar:routeChanged', (_event, context: TouchBarContext) => {
    updateTouchBar(context)
  })

  log.info('Touch Bar IPC handlers registered')
}
