import { PrismaClient } from '@prisma/client'
import { getDatabasePath, getFieldEncryptionKey } from '../utils/keys.util'
import { initializeEncryptionKey } from '../utils/crypto.util'
import { ensureDatabaseReady } from './migrate'

// Singleton del cliente Prisma
let prisma: PrismaClient | null = null

/**
 * Inicializa el cliente Prisma
 * Debe llamarse antes de usar la base de datos
 */
export async function initializePrisma(): Promise<PrismaClient> {
  if (prisma) {
    return prisma
  }

  try {
    // Obtener ruta de la base de datos
    const dbPath = getDatabasePath()

    // Inicializar la clave de encriptación de campos
    const fieldKey = getFieldEncryptionKey()
    initializeEncryptionKey(fieldKey)

    // Crear cliente Prisma
    prisma = new PrismaClient({
      datasources: {
        db: {
          url: `file:${dbPath}`,
        },
      },
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    })

    // Probar conexión
    await prisma.$connect()
    console.log(`Database location: ${dbPath}`)

    // Ensure tables exist and seed if needed
    await ensureDatabaseReady(prisma)
    console.log('Prisma client initialized successfully')

    return prisma
  } catch (error) {
    console.error('Failed to initialize Prisma client:', error)
    throw error
  }
}

/**
 * Obtiene el cliente Prisma
 * Si no está inicializado, lo inicializa primero
 */
export async function getPrismaClient(): Promise<PrismaClient> {
  if (!prisma) {
    return await initializePrisma()
  }
  return prisma
}

/**
 * Cierra la conexión con la base de datos
 */
export async function closePrisma(): Promise<void> {
  if (prisma) {
    await prisma.$disconnect()
    prisma = null
    console.log('Prisma client disconnected')
  }
}

/**
 * Verifica si la base de datos está conectada
 */
export function isDatabaseConnected(): boolean {
  return prisma !== null
}

/**
 * Exporta el cliente para uso directo (después de inicialización)
 * IMPORTANTE: Asegurarse de que initializePrisma() se haya llamado primero
 */
export { prisma }
