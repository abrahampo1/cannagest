import fs from 'fs'
import { ok, fail, type IpcResponse } from '../types/ipc.types'
import { initializePrisma, closePrisma, getPrismaClient, isDatabaseConnected } from '../database/client'
import { getDatabasePath, getEncryptedDatabasePath, keysExist, getFieldEncryptionKey, clearAllKeys } from '../utils/keys.util'
import {
  initializeEncryptionKey, generateSalt, deriveKeyFromPassword,
  createVerificationToken, verifyWithToken,
  setMasterKey, getMasterKey, clearMasterKey, hasMasterKey,
  encryptFile, decryptFile,
} from '../utils/crypto.util'
import {
  isSetupComplete, markSetupComplete, markSetupIncomplete,
  getClubName, setClubName, getSetupCompletedAt, clearAllSettings,
  hasMasterPassword, getMasterPasswordSalt, setMasterPasswordSalt,
  getVerificationToken, setVerificationToken,
} from '../utils/settings.util'
import { registerAllHandlers } from '../ipc/index'
import { startAutoBackup, stopAutoBackup } from '../utils/auto-backup.util'
import { createLogger } from '../utils/logger.util'
import bcrypt from 'bcryptjs'

const log = createLogger('Setup')

export interface SetupStatus {
  isComplete: boolean
  completedAt: string | null
  clubName: string
  database: { exists: boolean; path: string; tables: number }
  encryption: { keysExist: boolean; hasMasterPassword: boolean; encryptedFields: string[] }
  admin: { exists: boolean; username: string | null }
  categories: { count: number; names: string[] }
}

export async function getSetupStatus(): Promise<IpcResponse<SetupStatus>> {
  const dbPath = getDatabasePath()
  const dbExists = fs.existsSync(dbPath)
  let tables = 0
  let adminExists = false
  let adminUsername: string | null = null
  let categoryCount = 0
  let categoryNames: string[] = []

  if (dbExists && isSetupComplete() && isDatabaseConnected()) {
    try {
      const prisma = await getPrismaClient()
      const tableResult = await prisma.$queryRawUnsafe<{ count: number }[]>(
        `SELECT COUNT(*) as count FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_prisma_%'`
      )
      tables = tableResult[0]?.count ?? 0

      const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } })
      if (admin) {
        adminExists = true
        adminUsername = admin.username
      }

      const cats = await prisma.category.findMany({ select: { name: true } })
      categoryCount = cats.length
      categoryNames = cats.map(c => c.name)
    } catch (err) {
      log.warn('Could not query DB for status', err)
    }
  }

  return ok({
    isComplete: isSetupComplete(),
    completedAt: getSetupCompletedAt(),
    clubName: getClubName(),
    database: { exists: dbExists, path: dbPath, tables },
    encryption: {
      keysExist: keysExist(),
      hasMasterPassword: hasMasterPassword(),
      encryptedFields: ['dni', 'email', 'phone', 'address', 'dateOfBirth'],
    },
    admin: { exists: adminExists, username: adminUsername },
    categories: { count: categoryCount, names: categoryNames },
  })
}

export async function initializeDatabase(): Promise<IpcResponse<{ tables: number }>> {
  try {
    const prisma = await initializePrisma()
    const tableResult = await prisma.$queryRawUnsafe<{ count: number }[]>(
      `SELECT COUNT(*) as count FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_prisma_%'`
    )
    const tables = tableResult[0]?.count ?? 0
    log.info(`Database initialized with ${tables} tables`)
    return ok({ tables })
  } catch (err: any) {
    log.error('Failed to initialize database', err)
    return fail(err.message || 'Error al inicializar la base de datos')
  }
}

export async function initializeEncryption(): Promise<IpcResponse<{ keysExist: boolean }>> {
  try {
    const fieldKey = getFieldEncryptionKey()
    initializeEncryptionKey(fieldKey)
    log.info('Encryption keys initialized')
    return ok({ keysExist: keysExist() })
  } catch (err: any) {
    log.error('Failed to initialize encryption', err)
    return fail(err.message || 'Error al inicializar la encriptacion')
  }
}

// ============================================
// Master Password
// ============================================

export async function setMasterPasswordService(
  password: string,
  confirmPassword: string
): Promise<IpcResponse<void>> {
  if (!password || password.length < 8) {
    return fail('La clave maestra debe tener al menos 8 caracteres')
  }
  if (password !== confirmPassword) {
    return fail('Las claves no coinciden')
  }

  try {
    // Generate salt and derive key
    const salt = generateSalt()
    const key = deriveKeyFromPassword(password, salt)

    // Store salt and verification token in settings
    setMasterPasswordSalt(salt.toString('hex'))
    const token = createVerificationToken(key)
    setVerificationToken(token)

    // Keep key in memory for the rest of setup
    setMasterKey(key)

    // Also initialize field encryption (existing behavior)
    const fieldKey = getFieldEncryptionKey()
    initializeEncryptionKey(fieldKey)

    log.info('Master password set and field encryption initialized')
    return ok(undefined)
  } catch (err: any) {
    log.error('Failed to set master password', err)
    return fail(err.message || 'Error al establecer la clave maestra')
  }
}

export async function unlockDatabase(password: string): Promise<IpcResponse<void>> {
  try {
    const saltHex = getMasterPasswordSalt()
    const token = getVerificationToken()

    if (!saltHex || !token) {
      return fail('No hay clave maestra configurada')
    }

    // Derive key and verify
    const salt = Buffer.from(saltHex, 'hex')
    const key = deriveKeyFromPassword(password, salt)

    if (!verifyWithToken(key, token)) {
      return fail('Clave maestra incorrecta')
    }

    // Store key in memory
    setMasterKey(key)

    const dbPath = getDatabasePath()
    const encPath = getEncryptedDatabasePath()
    const dbExists = fs.existsSync(dbPath)
    const encExists = fs.existsSync(encPath)

    if (encExists && !dbExists) {
      // Normal case: decrypt .db.enc → .db
      decryptFile(encPath, dbPath, key)
      log.info('Database decrypted successfully')
    } else if (dbExists && encExists) {
      // Crash recovery: .db has more recent data, use it as-is
      log.warn('Both .db and .db.enc exist (crash recovery), using .db')
    } else if (dbExists && !encExists) {
      // First run after setup or missing enc — use existing .db
      log.warn('Only .db exists (no .db.enc), using plaintext database')
    } else {
      clearMasterKey()
      return fail('No se encontro ninguna base de datos')
    }

    // Initialize Prisma
    await initializePrisma()
    log.info('Database unlocked and Prisma initialized')

    // Register all handlers and start auto-backup
    registerAllHandlers()
    startAutoBackup()

    return ok(undefined)
  } catch (err: any) {
    clearMasterKey()
    log.error('Failed to unlock database', err)
    return fail(err.message || 'Error al desbloquear la base de datos')
  }
}

export function isUnlocked(): boolean {
  return isDatabaseConnected()
}

// ============================================
// Existing setup functions
// ============================================

export async function createAdminAccount(
  username: string,
  password: string,
  email?: string
): Promise<IpcResponse<{ username: string }>> {
  if (!username || username.length < 3) {
    return fail('El nombre de usuario debe tener al menos 3 caracteres')
  }
  if (!password || password.length < 6) {
    return fail('La contraseña debe tener al menos 6 caracteres')
  }

  try {
    const prisma = await getPrismaClient()
    const hashedPassword = await bcrypt.hash(password, 12)

    // Check if admin already exists, update or create
    const existingAdmin = await prisma.user.findFirst({ where: { role: 'ADMIN' } })

    if (existingAdmin) {
      await prisma.user.update({
        where: { id: existingAdmin.id },
        data: {
          username,
          password: hashedPassword,
          email: email || existingAdmin.email,
        },
      })
      log.info(`Admin account updated: ${username}`)
    } else {
      await prisma.user.create({
        data: {
          username,
          password: hashedPassword,
          email: email || `${username}@cannagest.local`,
          role: 'ADMIN',
          isActive: true,
        },
      })
      log.info(`Admin account created: ${username}`)
    }

    return ok({ username })
  } catch (err: any) {
    log.error('Failed to create admin', err)
    return fail(err.message || 'Error al crear la cuenta de administrador')
  }
}

export async function getDefaultCategories(): Promise<IpcResponse<{ name: string; description: string | null }[]>> {
  try {
    const prisma = await getPrismaClient()
    const categories = await prisma.category.findMany({
      select: { name: true, description: true },
      orderBy: { name: 'asc' },
    })
    return ok(categories)
  } catch (err: any) {
    log.error('Failed to get categories', err)
    return fail(err.message || 'Error al obtener las categorias')
  }
}

export async function completeSetup(clubName?: string): Promise<IpcResponse<{ completedAt: string }>> {
  try {
    if (clubName) {
      setClubName(clubName)
    }
    markSetupComplete()

    if (hasMasterKey()) {
      // Encrypt the database before finishing
      const dbPath = getDatabasePath()
      const encPath = getEncryptedDatabasePath()
      const key = getMasterKey()!

      // Close Prisma to flush WAL
      await closePrisma()

      // Encrypt .db → .db.enc
      encryptFile(dbPath, encPath, key)
      log.info('Database encrypted on setup completion')

      // Delete plaintext files
      fs.unlinkSync(dbPath)
      for (const suffix of ['-wal', '-shm', '-journal']) {
        const filePath = dbPath + suffix
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath)
        }
      }

      // Clear master key from memory
      clearMasterKey()
    } else {
      // No master password — legacy mode, register handlers directly
      registerAllHandlers()
      startAutoBackup()
    }

    const completedAt = getSetupCompletedAt()!
    log.info(`Setup completed at ${completedAt}`)
    return ok({ completedAt })
  } catch (err: any) {
    log.error('Failed to complete setup', err)
    return fail(err.message || 'Error al completar la configuracion')
  }
}

export async function resetEverything(): Promise<IpcResponse<void>> {
  try {
    log.warn('RESET: Starting full reset...')

    // Stop auto-backup
    stopAutoBackup()

    // Close Prisma connection
    await closePrisma()

    // Delete database file
    const dbPath = getDatabasePath()
    if (fs.existsSync(dbPath)) {
      fs.unlinkSync(dbPath)
      log.warn(`RESET: Deleted database at ${dbPath}`)
    }
    // Also delete WAL and SHM files
    for (const suffix of ['-wal', '-shm', '-journal']) {
      const filePath = dbPath + suffix
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath)
      }
    }

    // Delete encrypted database
    const encPath = getEncryptedDatabasePath()
    if (fs.existsSync(encPath)) {
      fs.unlinkSync(encPath)
      log.warn(`RESET: Deleted encrypted database at ${encPath}`)
    }

    // Clear master key from memory
    clearMasterKey()

    // Clear encryption keys
    clearAllKeys()
    log.warn('RESET: Cleared encryption keys')

    // Mark setup as incomplete
    clearAllSettings()
    log.warn('RESET: Cleared all settings')

    return ok(undefined)
  } catch (err: any) {
    log.error('Failed to reset', err)
    return fail(err.message || 'Error al resetear la aplicacion')
  }
}
