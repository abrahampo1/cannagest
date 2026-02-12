import { handleIpc } from '../utils/ipc.util'
import { ok } from '../types/ipc.types'
import {
  createBackup,
  uploadBackup,
  createAndUpload,
  downloadBackup,
  restoreBackup,
  cloudLogin,
  cloudRegister,
  cloudLogout,
  getCloudStatus,
  listCloudBackups,
  deleteCloudBackup,
  setAutoBackup,
  setBackupOnCashClose,
} from '../services/backup.service'

export function registerBackupHandlers() {
  handleIpc('backup:createLocal', async () => {
    const result = await createBackup()
    return ok(result)
  })

  handleIpc('backup:upload', async (_event, filePath: string, checksum: string, notes?: string) => {
    const result = await uploadBackup(filePath, checksum, notes)
    return ok(result)
  })

  handleIpc('backup:createAndUpload', async (_event, notes?: string) => {
    const result = await createAndUpload(notes)
    return ok(result)
  })

  handleIpc('backup:download', async (_event, backupId: number) => {
    const filePath = await downloadBackup(backupId)
    return ok({ filePath })
  })

  handleIpc('backup:restore', async (_event, filePath: string) => {
    await restoreBackup(filePath)
    return ok({ message: 'Backup restaurado correctamente' })
  })

  handleIpc('backup:cloudLogin', async (_event, email: string, password: string) => {
    const result = await cloudLogin(email, password)
    return ok(result)
  })

  handleIpc('backup:cloudRegister', async (_event, name: string, email: string, password: string, passwordConfirmation: string) => {
    const result = await cloudRegister(name, email, password, passwordConfirmation)
    return ok(result)
  })

  handleIpc('backup:cloudLogout', async () => {
    await cloudLogout()
    return ok({ message: 'Sesión cloud cerrada' })
  })

  handleIpc('backup:cloudStatus', async () => {
    const status = await getCloudStatus()
    return ok(status)
  })

  handleIpc('backup:listCloud', async () => {
    const result = await listCloudBackups()
    return ok(result)
  })

  handleIpc('backup:deleteCloud', async (_event, backupId: number) => {
    const result = await deleteCloudBackup(backupId)
    return ok(result)
  })

  handleIpc('backup:setAutoBackup', async (_event, mode: 'off' | 'daily' | 'weekly') => {
    setAutoBackup(mode)
    return ok({ mode })
  })

  handleIpc('backup:setBackupOnCashClose', async (_event, enabled: boolean) => {
    setBackupOnCashClose(enabled)
    return ok({ enabled })
  })

  handleIpc('backup:downloadAndRestore', async (_event, backupId: number) => {
    const filePath = await downloadBackup(backupId)
    await restoreBackup(filePath)
    return ok({ message: 'Backup descargado y restaurado correctamente' })
  })
}
