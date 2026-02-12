import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { createLogger } from '../utils/logger.util'

const log = createLogger('Migrate')

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/**
 * Checks if the database has been initialized (tables exist)
 */
async function isDatabaseInitialized(prisma: PrismaClient): Promise<boolean> {
  try {
    const result = await prisma.$queryRawUnsafe<{ name: string }[]>(
      `SELECT name FROM sqlite_master WHERE type='table' AND name='users'`
    )
    return result.length > 0
  } catch {
    return false
  }
}

/**
 * Runs the initial migration SQL to create all tables
 */
async function runMigration(prisma: PrismaClient): Promise<void> {
  log.info('Running database migration...')

  // Try to read from the migrations folder (development)
  const migrationPaths = [
    path.join(__dirname, '../../prisma/migrations/20260205230444_init/migration.sql'),
    path.join(__dirname, '../../../prisma/migrations/20260205230444_init/migration.sql'),
  ]

  let sql: string | null = null
  for (const p of migrationPaths) {
    try {
      sql = fs.readFileSync(p, 'utf-8')
      log.info(`Migration SQL loaded from: ${p}`)
      break
    } catch {
      // Try next path
    }
  }

  if (!sql) {
    // Fallback: inline the essential schema creation
    log.warn('Migration file not found, using inline schema')
    sql = getInlineMigrationSQL()
  }

  // Split by statement and execute each one
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'))

  for (const statement of statements) {
    try {
      await prisma.$executeRawUnsafe(statement)
    } catch (err: any) {
      // Ignore "already exists" errors
      if (!err.message?.includes('already exists')) {
        log.error(`Migration statement failed: ${statement.substring(0, 80)}...`, err)
      }
    }
  }

  log.info('Migration completed')
}

/**
 * Seeds the database with initial data (admin user + categories)
 */
async function seedDatabase(prisma: PrismaClient): Promise<void> {
  log.info('Seeding database...')

  // Check if admin already exists
  const existingAdmin = await prisma.user.findUnique({ where: { username: 'admin' } })
  if (existingAdmin) {
    log.info('Admin user already exists, skipping seed')
    return
  }

  // Create admin user
  const hashedPassword = await bcrypt.hash('admin123', 12)
  await prisma.user.create({
    data: {
      username: 'admin',
      email: 'admin@cannagest.local',
      password: hashedPassword,
      role: 'ADMIN',
      isActive: true,
    },
  })
  log.info('Created admin user (admin / admin123)')

  // Create default categories
  const categories = ['Flores', 'Extracciones', 'Comestibles', 'Accesorios', 'Otros']
  const descriptions: Record<string, string> = {
    Flores: 'Flores de cannabis',
    Extracciones: 'Concentrados y extracciones',
    Comestibles: 'Productos comestibles',
    Accesorios: 'Accesorios y parafernalia',
    Otros: 'Otros productos',
  }

  for (const name of categories) {
    await prisma.category.create({
      data: { name, description: descriptions[name] },
    })
  }
  log.info(`Created ${categories.length} default categories`)

  log.info('Database seeding completed')
}

/**
 * Ensures the database is ready (migrated + seeded)
 */
export async function ensureDatabaseReady(prisma: PrismaClient): Promise<void> {
  const initialized = await isDatabaseInitialized(prisma)

  if (!initialized) {
    await runMigration(prisma)
    await seedDatabase(prisma)
  } else {
    log.info('Database already initialized')
  }

  // Incremental migrations for existing databases
  await addNfcTagColumn(prisma)
  await addNfcTagColumnToUsers(prisma)
  await addReferredByColumn(prisma)
}

/**
 * Adds nfcTagId column to members table if it doesn't exist (incremental migration)
 */
async function addNfcTagColumn(prisma: PrismaClient): Promise<void> {
  try {
    const cols = await prisma.$queryRawUnsafe<{ name: string }[]>(
      `PRAGMA table_info('members')`
    )
    if (cols.some(c => c.name === 'nfcTagId')) return

    log.info('Adding nfcTagId column to members table...')
    await prisma.$executeRawUnsafe(`ALTER TABLE "members" ADD COLUMN "nfcTagId" TEXT`)
    await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "members_nfcTagId_key" ON "members"("nfcTagId")`)
    log.info('nfcTagId column added successfully')
  } catch (err: any) {
    if (!err.message?.includes('duplicate column') && !err.message?.includes('already exists')) {
      log.error('Failed to add nfcTagId column', err)
    }
  }
}

/**
 * Adds nfcTagId column to users table if it doesn't exist (incremental migration)
 */
async function addNfcTagColumnToUsers(prisma: PrismaClient): Promise<void> {
  try {
    const cols = await prisma.$queryRawUnsafe<{ name: string }[]>(
      `PRAGMA table_info('users')`
    )
    if (cols.some(c => c.name === 'nfcTagId')) return

    log.info('Adding nfcTagId column to users table...')
    await prisma.$executeRawUnsafe(`ALTER TABLE "users" ADD COLUMN "nfcTagId" TEXT`)
    await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "users_nfcTagId_key" ON "users"("nfcTagId")`)
    log.info('nfcTagId column added to users table successfully')
  } catch (err: any) {
    if (!err.message?.includes('duplicate column') && !err.message?.includes('already exists')) {
      log.error('Failed to add nfcTagId column to users', err)
    }
  }
}

/**
 * Adds referredById column to members table if it doesn't exist (incremental migration)
 */
async function addReferredByColumn(prisma: PrismaClient): Promise<void> {
  try {
    const cols = await prisma.$queryRawUnsafe<{ name: string }[]>(
      `PRAGMA table_info('members')`
    )
    if (cols.some(c => c.name === 'referredById')) return

    log.info('Adding referredById column to members table...')
    await prisma.$executeRawUnsafe(`ALTER TABLE "members" ADD COLUMN "referredById" TEXT REFERENCES "members"("id")`)
    log.info('referredById column added successfully')
  } catch (err: any) {
    if (!err.message?.includes('duplicate column') && !err.message?.includes('already exists')) {
      log.error('Failed to add referredById column', err)
    }
  }
}

/**
 * Inline migration SQL as fallback when migration file is not available
 */
function getInlineMigrationSQL(): string {
  return `
CREATE TABLE IF NOT EXISTS "users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "email" TEXT,
    "role" TEXT NOT NULL DEFAULT 'EMPLOYEE',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdBy" TEXT,
    "nfcTagId" TEXT
);

CREATE TABLE IF NOT EXISTS "members" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "dni" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "address" TEXT,
    "dateOfBirth" TEXT,
    "photo" TEXT,
    "nfcTagId" TEXT,
    "membershipType" TEXT NOT NULL DEFAULT 'NO_FEE',
    "membershipFee" REAL NOT NULL DEFAULT 0,
    "membershipStart" DATETIME,
    "membershipEnd" DATETIME,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "pointsBalance" REAL NOT NULL DEFAULT 0,
    "referredById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "members_referredById_fkey" FOREIGN KEY ("referredById") REFERENCES "members" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "membership_payments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "memberId" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "paymentDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "periodStart" DATETIME NOT NULL,
    "periodEnd" DATETIME NOT NULL,
    "paymentType" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "membership_payments_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "points_transactions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "memberId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "balanceBefore" REAL NOT NULL,
    "balanceAfter" REAL NOT NULL,
    "saleId" TEXT,
    "loadedById" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "points_transactions_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "points_transactions_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "sales" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "points_transactions_loadedById_fkey" FOREIGN KEY ("loadedById") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "categories" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE TABLE IF NOT EXISTS "products" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sku" TEXT,
    "pointsPrice" REAL NOT NULL,
    "categoryId" TEXT NOT NULL,
    "currentStock" REAL NOT NULL DEFAULT 0,
    "minStock" REAL NOT NULL DEFAULT 0,
    "unit" TEXT NOT NULL DEFAULT 'unit',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "products_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "stock_movements" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "quantity" REAL NOT NULL,
    "stockBefore" REAL NOT NULL,
    "stockAfter" REAL NOT NULL,
    "reason" TEXT,
    "notes" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "stock_movements_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "stock_movements_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "sales" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "saleNumber" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "totalPoints" REAL NOT NULL,
    "totalItems" INTEGER NOT NULL,
    "soldById" TEXT NOT NULL,
    "cashRegisterId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'COMPLETED',
    "notes" TEXT,
    "saleDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "sales_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "sales_soldById_fkey" FOREIGN KEY ("soldById") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "sales_cashRegisterId_fkey" FOREIGN KEY ("cashRegisterId") REFERENCES "cash_registers" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "sale_items" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "saleId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" REAL NOT NULL,
    "pointsPrice" REAL NOT NULL,
    "totalPoints" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "sale_items_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "sales" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "sale_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "expenses" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "description" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "category" TEXT NOT NULL,
    "cashRegisterId" TEXT,
    "recordedById" TEXT NOT NULL,
    "expenseDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    CONSTRAINT "expenses_cashRegisterId_fkey" FOREIGN KEY ("cashRegisterId") REFERENCES "cash_registers" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "expenses_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "cash_registers" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "openDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closeDate" DATETIME,
    "openedById" TEXT NOT NULL,
    "initialCash" REAL NOT NULL,
    "totalSales" REAL NOT NULL DEFAULT 0,
    "totalExpenses" REAL NOT NULL DEFAULT 0,
    "expectedCash" REAL NOT NULL DEFAULT 0,
    "actualCash" REAL,
    "difference" REAL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "cash_registers_openedById_fkey" FOREIGN KEY ("openedById") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "users_username_key" ON "users"("username");
CREATE UNIQUE INDEX IF NOT EXISTS "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX IF NOT EXISTS "users_nfcTagId_key" ON "users"("nfcTagId");
CREATE UNIQUE INDEX IF NOT EXISTS "members_dni_key" ON "members"("dni");
CREATE UNIQUE INDEX IF NOT EXISTS "members_email_key" ON "members"("email");
CREATE UNIQUE INDEX IF NOT EXISTS "members_nfcTagId_key" ON "members"("nfcTagId");
CREATE UNIQUE INDEX IF NOT EXISTS "points_transactions_saleId_key" ON "points_transactions"("saleId");
CREATE INDEX IF NOT EXISTS "points_transactions_memberId_idx" ON "points_transactions"("memberId");
CREATE INDEX IF NOT EXISTS "points_transactions_type_idx" ON "points_transactions"("type");
CREATE UNIQUE INDEX IF NOT EXISTS "categories_name_key" ON "categories"("name");
CREATE UNIQUE INDEX IF NOT EXISTS "products_sku_key" ON "products"("sku");
CREATE INDEX IF NOT EXISTS "products_categoryId_idx" ON "products"("categoryId");
CREATE INDEX IF NOT EXISTS "stock_movements_productId_idx" ON "stock_movements"("productId");
CREATE INDEX IF NOT EXISTS "stock_movements_type_idx" ON "stock_movements"("type");
CREATE UNIQUE INDEX IF NOT EXISTS "sales_saleNumber_key" ON "sales"("saleNumber");
CREATE INDEX IF NOT EXISTS "sales_memberId_idx" ON "sales"("memberId");
CREATE INDEX IF NOT EXISTS "sales_soldById_idx" ON "sales"("soldById");
CREATE INDEX IF NOT EXISTS "sales_saleDate_idx" ON "sales"("saleDate");
CREATE INDEX IF NOT EXISTS "sale_items_saleId_idx" ON "sale_items"("saleId");
CREATE INDEX IF NOT EXISTS "expenses_category_idx" ON "expenses"("category");
CREATE INDEX IF NOT EXISTS "expenses_expenseDate_idx" ON "expenses"("expenseDate");
CREATE INDEX IF NOT EXISTS "cash_registers_status_idx" ON "cash_registers"("status");
CREATE INDEX IF NOT EXISTS "cash_registers_openDate_idx" ON "cash_registers"("openDate");
`
}
