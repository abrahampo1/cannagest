import crypto from 'crypto'
import fs from 'fs'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 16
const AUTH_TAG_LENGTH = 16
const KEY_LENGTH = 32
const PBKDF2_ITERATIONS = 100000
const SALT_LENGTH = 32
const VERIFICATION_PLAINTEXT = 'CANNAGEST_VERIFIED'

// Clave de encriptación para campos sensibles
// En producción, esta clave debería generarse y almacenarse de forma segura
let FIELD_ENCRYPTION_KEY: Buffer | null = null

// Clave maestra derivada, en memoria solo mientras la app está desbloqueada
let MASTER_KEY: Buffer | null = null

/**
 * Inicializa la clave de encriptación de campos
 * Si no existe, genera una nueva clave aleatoria
 */
export function initializeEncryptionKey(key?: string): void {
  if (key) {
    // Usar clave proporcionada
    FIELD_ENCRYPTION_KEY = Buffer.from(key, 'hex')
  } else {
    // Generar nueva clave aleatoria de 32 bytes (256 bits)
    FIELD_ENCRYPTION_KEY = crypto.randomBytes(KEY_LENGTH)
  }
}

/**
 * Obtiene la clave de encriptación como string hexadecimal
 * Útil para almacenarla de forma segura
 */
export function getEncryptionKey(): string {
  if (!FIELD_ENCRYPTION_KEY) {
    throw new Error('Encryption key not initialized. Call initializeEncryptionKey() first.')
  }
  return FIELD_ENCRYPTION_KEY.toString('hex')
}

/**
 * Genera una nueva clave de encriptación aleatoria
 */
export function generateEncryptionKey(): string {
  return crypto.randomBytes(KEY_LENGTH).toString('hex')
}

/**
 * Encripta un campo de texto usando AES-256-GCM
 * @param text - Texto plano a encriptar
 * @returns String en formato "iv:authTag:encrypted" (todos en hexadecimal)
 */
export function encryptField(text: string): string {
  if (!FIELD_ENCRYPTION_KEY) {
    throw new Error('Encryption key not initialized. Call initializeEncryptionKey() first.')
  }

  if (!text) {
    return ''
  }

  try {
    // Generar IV aleatorio
    const iv = crypto.randomBytes(IV_LENGTH)

    // Crear cipher
    const cipher = crypto.createCipheriv(ALGORITHM, FIELD_ENCRYPTION_KEY, iv)

    // Encriptar
    let encrypted = cipher.update(text, 'utf8', 'hex')
    encrypted += cipher.final('hex')

    // Obtener authentication tag
    const authTag = cipher.getAuthTag()

    // Retornar en formato "iv:authTag:encrypted"
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`
  } catch (error) {
    console.error('Error encrypting field:', error)
    throw new Error('Failed to encrypt field')
  }
}

/**
 * Desencripta un campo encriptado con AES-256-GCM
 * @param encryptedData - String en formato "iv:authTag:encrypted"
 * @returns Texto plano desencriptado
 */
export function decryptField(encryptedData: string): string {
  if (!FIELD_ENCRYPTION_KEY) {
    throw new Error('Encryption key not initialized. Call initializeEncryptionKey() first.')
  }

  if (!encryptedData) {
    return ''
  }

  try {
    // Parsear componentes
    const parts = encryptedData.split(':')
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted data format. Expected "iv:authTag:encrypted"')
    }

    const [ivHex, authTagHex, encrypted] = parts

    // Convertir de hex a Buffer
    const iv = Buffer.from(ivHex, 'hex')
    const authTag = Buffer.from(authTagHex, 'hex')

    // Crear decipher
    const decipher = crypto.createDecipheriv(ALGORITHM, FIELD_ENCRYPTION_KEY, iv)
    decipher.setAuthTag(authTag)

    // Desencriptar
    let decrypted = decipher.update(encrypted, 'hex', 'utf8')
    decrypted += decipher.final('utf8')

    return decrypted
  } catch (error) {
    console.error('Error decrypting field:', error)
    throw new Error('Failed to decrypt field. Data may be corrupted or key is incorrect.')
  }
}

// ============================================
// Master Key Management (in-memory)
// ============================================

export function setMasterKey(key: Buffer): void {
  MASTER_KEY = Buffer.from(key)
}

export function getMasterKey(): Buffer | null {
  return MASTER_KEY
}

export function clearMasterKey(): void {
  if (MASTER_KEY) {
    MASTER_KEY.fill(0)
    MASTER_KEY = null
  }
}

export function hasMasterKey(): boolean {
  return MASTER_KEY !== null
}

// ============================================
// PBKDF2 Key Derivation
// ============================================

export function generateSalt(): Buffer {
  return crypto.randomBytes(SALT_LENGTH)
}

export function deriveKeyFromPassword(password: string, salt: Buffer): Buffer {
  return crypto.pbkdf2Sync(password, salt, PBKDF2_ITERATIONS, KEY_LENGTH, 'sha512')
}

// ============================================
// File Encryption / Decryption
// ============================================

/**
 * Encripta un archivo completo con AES-256-GCM
 * Formato de salida: [iv 16][authTag 16][datos encriptados]
 */
export function encryptFile(inputPath: string, outputPath: string, key: Buffer): void {
  const data = fs.readFileSync(inputPath)
  const iv = crypto.randomBytes(IV_LENGTH)

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)
  const encrypted = Buffer.concat([cipher.update(data), cipher.final()])
  const authTag = cipher.getAuthTag()

  // Format: [iv 16][authTag 16][encrypted data]
  const output = Buffer.concat([iv, authTag, encrypted])
  fs.writeFileSync(outputPath, output)
}

/**
 * Desencripta un archivo encriptado con AES-256-GCM
 * Espera formato: [iv 16][authTag 16][datos encriptados]
 */
export function decryptFile(inputPath: string, outputPath: string, key: Buffer): void {
  const data = fs.readFileSync(inputPath)

  const iv = data.subarray(0, IV_LENGTH)
  const authTag = data.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH)
  const encrypted = data.subarray(IV_LENGTH + AUTH_TAG_LENGTH)

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(authTag)

  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()])
  fs.writeFileSync(outputPath, decrypted)
}

// ============================================
// Verification Token
// ============================================

/**
 * Crea un token de verificación encriptando un string conocido con la clave derivada
 * Se almacena para verificar la contraseña sin desencriptar la BD completa
 */
export function createVerificationToken(key: Buffer): string {
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)
  const encrypted = Buffer.concat([cipher.update(VERIFICATION_PLAINTEXT, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()

  // Formato: iv:authTag:encrypted (todo en hex)
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`
}

/**
 * Verifica que la clave derivada puede desencriptar el token correctamente
 */
export function verifyWithToken(key: Buffer, token: string): boolean {
  try {
    const parts = token.split(':')
    if (parts.length !== 3) return false

    const [ivHex, authTagHex, encryptedHex] = parts
    const iv = Buffer.from(ivHex, 'hex')
    const authTag = Buffer.from(authTagHex, 'hex')
    const encrypted = Buffer.from(encryptedHex, 'hex')

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
    decipher.setAuthTag(authTag)

    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()])
    return decrypted.toString('utf8') === VERIFICATION_PLAINTEXT
  } catch {
    return false
  }
}

/**
 * Verifica si un string está encriptado (tiene el formato correcto)
 * @param data - String a verificar
 * @returns true si tiene formato de dato encriptado
 */
export function isEncrypted(data: string): boolean {
  if (!data) return false
  const parts = data.split(':')
  return parts.length === 3 && parts.every(part => /^[0-9a-f]+$/i.test(part))
}

/**
 * Encripta múltiples campos de un objeto
 * @param obj - Objeto con campos a encriptar
 * @param fields - Array de nombres de campos a encriptar
 * @returns Nuevo objeto con campos encriptados
 */
export function encryptFields<T extends Record<string, any>>(
  obj: T,
  fields: (keyof T)[]
): T {
  const result = { ...obj }
  for (const field of fields) {
    if (result[field] && typeof result[field] === 'string') {
      result[field] = encryptField(result[field] as string) as any
    }
  }
  return result
}

/**
 * Desencripta múltiples campos de un objeto
 * @param obj - Objeto con campos encriptados
 * @param fields - Array de nombres de campos a desencriptar
 * @returns Nuevo objeto con campos desencriptados
 */
export function decryptFields<T extends Record<string, any>>(
  obj: T,
  fields: (keyof T)[]
): T {
  const result = { ...obj }
  for (const field of fields) {
    if (result[field] && typeof result[field] === 'string') {
      result[field] = decryptField(result[field] as string) as any
    }
  }
  return result
}
