import { ipcMain, type IpcMainInvokeEvent } from 'electron'
import { fail } from '../types/ipc.types'
import { createLogger } from './logger.util'

const log = createLogger('IPC')

function isZodError(error: unknown): error is { issues: Array<{ message: string; path: (string | number)[] }> } {
  return (
    error !== null &&
    typeof error === 'object' &&
    'issues' in error &&
    Array.isArray((error as any).issues)
  )
}

export function handleIpc(
  channel: string,
  handler: (event: IpcMainInvokeEvent, ...args: any[]) => Promise<any>
) {
  // Remove existing handler if any (makes re-registration safe after reset)
  ipcMain.removeHandler(channel)
  ipcMain.handle(channel, async (event, ...args) => {
    try {
      log.debug(`-> ${channel}`, ...args)
      const result = await handler(event, ...args)
      log.debug(`<- ${channel}`, result?.success ? 'OK' : 'FAIL')
      return result
    } catch (error) {
      if (isZodError(error)) {
        const messages = error.issues
          .map(i => i.path.length ? `${i.path.join('.')}: ${i.message}` : i.message)
          .join('; ')
        log.warn(`${channel} validation error:`, messages)
        return fail(`Validacion: ${messages}`)
      }
      const message = error instanceof Error ? error.message : 'Error desconocido'
      log.error(`${channel} error:`, message)
      return fail(message)
    }
  })
}
