import crypto from 'crypto'
import fs from 'fs'
import path from 'path'
import { app } from 'electron'
import archiver from 'archiver'
import AdmZip from 'adm-zip'
import { getDatabasePath, exportKeys, importKeys } from '../utils/keys.util'
import { closePrisma, initializePrisma } from '../database/client'
import {
  cloudUploadBackup,
  cloudDownloadBackup,
  cloudLogin as apiCloudLogin,
  cloudLogout as apiCloudLogout,
  cloudRegister as apiCloudRegister,
  cloudMe,
  cloudListBackups,
  cloudDeleteBackup,
  cloudSubscriptionStatus,
} from './cloud-api.service'
import {
  setCloudToken,
  clearCloudToken,
  getCloudConfig,
  isCloudLoggedIn,
  setAutoBackup as setAutoBackupConfig,
  setBackupOnCashClose as setBackupOnCashCloseConfig,
  type CloudConfig,
} from '../utils/cloud-config.util'
import { getMasterKey } from '../utils/crypto.util'
import { createLogger } from '../utils/logger.util'

const log = createLogger('Backup')

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 16
const AUTH_TAG_LENGTH = 16

function getKey(): Buffer {
  const key = getMasterKey()
  if (!key) throw new Error('La aplicación no está desbloqueada.')
  return key
}

function encryptBuffer(data: Buffer, key: Buffer): Buffer {
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)
  const encrypted = Buffer.concat([cipher.update(data), cipher.final()])
  const authTag = cipher.getAuthTag()

  // Format: [iv 16][authTag 16][encrypted data]
  return Buffer.concat([iv, authTag, encrypted])
}

function decryptBuffer(data: Buffer, key: Buffer): Buffer {
  const iv = data.subarray(0, IV_LENGTH)
  const authTag = data.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH)
  const encrypted = data.subarray(IV_LENGTH + AUTH_TAG_LENGTH)

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(authTag)

  return Buffer.concat([decipher.update(encrypted), decipher.final()])
}

function getTempDir(): string {
  const tempDir = path.join(app.getPath('temp'), 'cannagest-backup')
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true })
  }
  return tempDir
}

function cleanTempFile(filePath: string): void {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath)
    }
  } catch {
    // Ignore cleanup errors
  }
}

/**
 * Creates a .cgbackup file from the current database and keys
 */
export async function createBackup(): Promise<{ filePath: string; checksum: string }> {
  const key = getKey()
  const dbPath = getDatabasePath()
  const keys = exportKeys()
  const tempDir = getTempDir()
  const zipPath = path.join(tempDir, `backup_${Date.now()}.zip`)
  const cgbackupPath = path.join(tempDir, `cannagest_${new Date().toISOString().replace(/[:.]/g, '-')}.cgbackup`)

  try {
    // Close Prisma to ensure DB is flushed
    await closePrisma()
    log.info('Prisma closed for backup')

    // Create ZIP with database and keys
    await new Promise<void>((resolve, reject) => {
      const output = fs.createWriteStream(zipPath)
      const archive = archiver('zip', { zlib: { level: 9 } })

      output.on('close', resolve)
      archive.on('error', reject)

      archive.pipe(output)
      archive.file(dbPath, { name: 'cannagest.db' })
      archive.append(JSON.stringify(keys, null, 2), { name: 'keys.json' })
      archive.finalize()
    })

    log.info('ZIP archive created')

    // Read ZIP and encrypt
    const zipData = fs.readFileSync(zipPath)
    const encryptedData = encryptBuffer(zipData, key)

    // Write .cgbackup
    fs.writeFileSync(cgbackupPath, encryptedData)

    // Calculate checksum
    const checksum = crypto.createHash('sha256').update(encryptedData).digest('hex')

    // Cleanup temp zip
    cleanTempFile(zipPath)

    log.info(`Backup created: ${cgbackupPath} (${encryptedData.length} bytes, checksum: ${checksum})`)

    return { filePath: cgbackupPath, checksum }
  } finally {
    // Re-initialize Prisma
    await initializePrisma()
    log.info('Prisma re-initialized after backup')
  }
}

/**
 * Uploads a backup file to the cloud server
 */
export async function uploadBackup(filePath: string, checksum: string, notes?: string) {
  const res = await cloudUploadBackup(filePath, checksum, notes)

  if (!res.ok) {
    throw new Error(res.data?.message || `Upload failed with status ${res.status}`)
  }

  // Cleanup local temp file after successful upload
  cleanTempFile(filePath)

  return res.data
}

/**
 * Creates a backup and uploads it to the cloud in one step
 */
export async function createAndUpload(notes?: string) {
  const { filePath, checksum } = await createBackup()
  return await uploadBackup(filePath, checksum, notes)
}

/**
 * Downloads a backup from the cloud
 */
export async function downloadBackup(backupId: number): Promise<string> {
  const tempDir = getTempDir()
  const destPath = path.join(tempDir, `download_${backupId}_${Date.now()}.cgbackup`)

  await cloudDownloadBackup(backupId, destPath)
  log.info(`Backup downloaded to: ${destPath}`)

  return destPath
}

/**
 * Restores a .cgbackup file
 */
export async function restoreBackup(filePath: string): Promise<void> {
  const key = getKey()
  const dbPath = getDatabasePath()
  const tempDir = getTempDir()
  const extractDir = path.join(tempDir, `extract_${Date.now()}`)

  try {
    // Read and decrypt
    const encryptedData = fs.readFileSync(filePath)
    let zipData: Buffer

    try {
      zipData = decryptBuffer(encryptedData, key)
    } catch {
      throw new Error('No se pudo descifrar el backup. El archivo puede estar corrupto.')
    }

    // Extract ZIP
    const zip = new AdmZip(zipData)
    zip.extractAllTo(extractDir, true)

    const extractedDb = path.join(extractDir, 'cannagest.db')
    const extractedKeys = path.join(extractDir, 'keys.json')

    if (!fs.existsSync(extractedDb) || !fs.existsSync(extractedKeys)) {
      throw new Error('El archivo de backup no contiene los datos esperados.')
    }

    // Parse keys
    const keysData = JSON.parse(fs.readFileSync(extractedKeys, 'utf-8'))
    if (!keysData.dbKey || !keysData.fieldKey) {
      throw new Error('Las claves de encriptación del backup son inválidas.')
    }

    // Close Prisma before replacing files
    await closePrisma()
    log.info('Prisma closed for restore')

    // Create safety backup of current DB
    const safetyBackup = dbPath + '.safety-' + Date.now()
    if (fs.existsSync(dbPath)) {
      fs.copyFileSync(dbPath, safetyBackup)
      log.info(`Safety backup created: ${safetyBackup}`)
    }

    try {
      // Replace database
      fs.copyFileSync(extractedDb, dbPath)

      // Import keys
      importKeys(keysData.dbKey, keysData.fieldKey)

      log.info('Backup restored successfully')
    } catch (error) {
      // Rollback: restore safety backup
      if (fs.existsSync(safetyBackup)) {
        fs.copyFileSync(safetyBackup, dbPath)
        log.error('Restore failed, rolled back to safety backup')
      }
      throw error
    } finally {
      // Clean up safety backup (keep for manual recovery if needed)
      // cleanTempFile(safetyBackup)
    }
  } finally {
    // Clean up extraction directory
    if (fs.existsSync(extractDir)) {
      fs.rmSync(extractDir, { recursive: true, force: true })
    }

    // Re-initialize Prisma with new database
    await initializePrisma()
    log.info('Prisma re-initialized after restore')
  }
}

// Cloud session management
export async function cloudLogin(email: string, password: string) {
  const res = await apiCloudLogin(email, password)

  if (!res.ok) {
    throw new Error(res.data?.message || 'Error al iniciar sesión')
  }

  setCloudToken(res.data.token, res.data.user.email, res.data.user.name)
  return res.data
}

export async function cloudRegister(name: string, email: string, password: string, passwordConfirmation: string) {
  const res = await apiCloudRegister(name, email, password, passwordConfirmation)

  if (!res.ok) {
    const errors = res.data?.errors
    if (errors) {
      const firstError = Object.values(errors).flat()[0]
      throw new Error(firstError as string || 'Error al registrarse')
    }
    throw new Error(res.data?.message || 'Error al registrarse')
  }

  setCloudToken(res.data.token, res.data.user.email, res.data.user.name)
  return res.data
}

export async function cloudLogout() {
  try {
    await apiCloudLogout()
  } catch {
    // Ignore errors, clear local token anyway
  }
  clearCloudToken()
}

export async function getCloudStatus() {
  const config = getCloudConfig()
  const loggedIn = isCloudLoggedIn()

  if (!loggedIn) {
    return {
      loggedIn: false,
      email: null,
      userName: null,
      subscriptionActive: false,
      autoBackup: config.autoBackup,
      lastAutoBackup: config.lastAutoBackup,
      backupOnCashClose: config.backupOnCashClose,
    }
  }

  try {
    const [meRes, subRes] = await Promise.all([
      cloudMe(),
      cloudSubscriptionStatus(),
    ])

    // Token inválido o expirado → limpiar sesión local
    if (meRes.status === 401) {
      log.warn('Cloud token invalid, clearing local session')
      clearCloudToken()
      return {
        loggedIn: false,
        email: null,
        userName: null,
        subscriptionActive: false,
        autoBackup: config.autoBackup,
        lastAutoBackup: config.lastAutoBackup,
      }
    }

    return {
      loggedIn: true,
      email: config.email,
      userName: config.userName,
      subscriptionActive: meRes.ok ? meRes.data.subscription_active : false,
      subscriptionDetails: subRes.ok ? subRes.data : null,
      autoBackup: config.autoBackup,
      lastAutoBackup: config.lastAutoBackup,
      backupOnCashClose: config.backupOnCashClose,
    }
  } catch {
    return {
      loggedIn: true,
      email: config.email,
      userName: config.userName,
      subscriptionActive: false,
      autoBackup: config.autoBackup,
      lastAutoBackup: config.lastAutoBackup,
      backupOnCashClose: config.backupOnCashClose,
    }
  }
}

export async function listCloudBackups() {
  const res = await cloudListBackups()
  if (!res.ok) {
    throw new Error(res.data?.message || 'Error al obtener la lista de backups')
  }
  return res.data
}

export async function deleteCloudBackup(backupId: number) {
  const res = await cloudDeleteBackup(backupId)
  if (!res.ok) {
    throw new Error(res.data?.message || 'Error al eliminar el backup')
  }
  return res.data
}

export function setAutoBackup(mode: CloudConfig['autoBackup']) {
  setAutoBackupConfig(mode)
}

export function setBackupOnCashClose(enabled: boolean) {
  setBackupOnCashCloseConfig(enabled)
}
