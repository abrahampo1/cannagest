import { getCloudConfig, setLastAutoBackup, isCloudLoggedIn } from './cloud-config.util'
import { createAndUpload } from '../services/backup.service'
import { hasMasterKey } from './crypto.util'
import { createLogger } from './logger.util'

const log = createLogger('AutoBackup')

let autoBackupTimer: ReturnType<typeof setInterval> | null = null

const CHECK_INTERVAL = 60 * 60 * 1000 // Check every hour

function shouldRunBackup(): boolean {
  const config = getCloudConfig()

  if (config.autoBackup === 'off') return false
  if (!isCloudLoggedIn()) return false
  if (!hasMasterKey()) return false

  const lastBackup = config.lastAutoBackup ? new Date(config.lastAutoBackup) : null
  const now = new Date()

  if (!lastBackup) return true

  const hoursSinceLastBackup = (now.getTime() - lastBackup.getTime()) / (1000 * 60 * 60)

  if (config.autoBackup === 'daily' && hoursSinceLastBackup >= 24) return true
  if (config.autoBackup === 'weekly' && hoursSinceLastBackup >= 168) return true

  return false
}

async function runAutoBackup(): Promise<void> {
  if (!shouldRunBackup()) return

  try {
    log.info('Starting auto-backup...')

    await createAndUpload(`Auto-backup ${new Date().toLocaleString('es-ES')}`)
    setLastAutoBackup(new Date().toISOString())

    log.info('Auto-backup completed successfully')
  } catch (error) {
    log.error('Auto-backup failed:', error instanceof Error ? error.message : error)
  }
}

export function startAutoBackup(): void {
  if (autoBackupTimer) {
    clearInterval(autoBackupTimer)
  }

  // Run check immediately after a short delay (let app initialize)
  setTimeout(() => {
    runAutoBackup()
  }, 30000) // 30 seconds after startup

  // Then check periodically
  autoBackupTimer = setInterval(() => {
    runAutoBackup()
  }, CHECK_INTERVAL)

  log.info('Auto-backup scheduler started')
}

export function stopAutoBackup(): void {
  if (autoBackupTimer) {
    clearInterval(autoBackupTimer)
    autoBackupTimer = null
    log.info('Auto-backup scheduler stopped')
  }
}
