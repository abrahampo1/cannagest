import Store from 'electron-store'
import crypto from 'crypto'
import { app } from 'electron'
import path from 'path'

// Store encriptado para almacenar claves de forma segura
const store = new Store({
  name: 'secure-keys',
  encryptionKey: 'cannagest-secure-key-store-2024', // En producción, usar una clave más robusta
  cwd: app.getPath('userData'),
})

/**
 * Genera una clave aleatoria de 32 bytes (256 bits)
 */
function generateSecureKey(): string {
  return crypto.randomBytes(32).toString('hex')
}

/**
 * Obtiene o genera la clave de encriptación de la base de datos (SQLCipher)
 */
export function getDatabaseEncryptionKey(): string {
  const key = store.get('db_encryption_key') as string | undefined

  if (!key) {
    // Generar nueva clave
    const newKey = generateSecureKey()
    store.set('db_encryption_key', newKey)
    console.log('Generated new database encryption key')
    return newKey
  }

  return key
}

/**
 * Obtiene o genera la clave de encriptación de campos sensibles (AES-256)
 */
export function getFieldEncryptionKey(): string {
  const key = store.get('field_encryption_key') as string | undefined

  if (!key) {
    // Generar nueva clave
    const newKey = generateSecureKey()
    store.set('field_encryption_key', newKey)
    console.log('Generated new field encryption key')
    return newKey
  }

  return key
}

/**
 * Obtiene la ruta de la base de datos
 */
export function getDatabasePath(): string {
  return path.join(app.getPath('userData'), 'cannagest.db')
}

/**
 * Obtiene la ruta de la base de datos encriptada
 */
export function getEncryptedDatabasePath(): string {
  return path.join(app.getPath('userData'), 'cannagest.db.enc')
}

/**
 * Limpia todas las claves almacenadas (usar con precaución)
 * Esto hará que los datos encriptados sean irrecuperables
 */
export function clearAllKeys(): void {
  store.clear()
  console.warn('All encryption keys have been cleared!')
}

/**
 * Verifica si las claves de encriptación ya existen
 */
export function keysExist(): boolean {
  return store.has('db_encryption_key') && store.has('field_encryption_key')
}

/**
 * Exporta las claves para backup (usar con mucha precaución)
 */
export function exportKeys(): { dbKey: string; fieldKey: string } {
  return {
    dbKey: getDatabaseEncryptionKey(),
    fieldKey: getFieldEncryptionKey(),
  }
}

/**
 * Importa claves desde un backup
 */
export function importKeys(dbKey: string, fieldKey: string): void {
  store.set('db_encryption_key', dbKey)
  store.set('field_encryption_key', fieldKey)
  console.log('Encryption keys imported successfully')
}
