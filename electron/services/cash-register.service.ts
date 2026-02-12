import { z } from 'zod'
import { getPrismaClient } from '../database/client'
import { ok, fail, type IpcResponse, type PaginatedData, type ListParams } from '../types/ipc.types'
import { getCloudConfig, isCloudLoggedIn } from '../utils/cloud-config.util'
import { hasMasterKey } from '../utils/crypto.util'
import { createLogger } from '../utils/logger.util'

const log = createLogger('CashRegisterService')

const openRegisterSchema = z.object({
  userId: z.string().min(1, 'Usuario es requerido'),
  initialCash: z.number().min(0, 'Monto inicial debe ser >= 0'),
  notes: z.string().optional(),
})

const closeRegisterSchema = z.object({
  actualCash: z.number().min(0, 'Monto real debe ser >= 0'),
  notes: z.string().optional(),
})

export async function openRegister(data: unknown): Promise<IpcResponse> {
  const validated = openRegisterSchema.parse(data)
  const prisma = await getPrismaClient()

  const existing = await prisma.cashRegister.findFirst({
    where: { status: 'OPEN' },
  })
  if (existing) {
    return fail('Ya hay una caja abierta. Cierre la caja actual antes de abrir una nueva.')
  }

  const register = await prisma.cashRegister.create({
    data: {
      openedById: validated.userId,
      initialCash: validated.initialCash,
      expectedCash: validated.initialCash,
      status: 'OPEN',
      notes: validated.notes,
    },
    include: { openedBy: { select: { id: true, username: true } } },
  })

  log.info(`Cash register opened by user ${validated.userId}`)
  return ok(register)
}

export async function closeRegister(id: string, data: unknown): Promise<IpcResponse> {
  const validated = closeRegisterSchema.parse(data)
  const prisma = await getPrismaClient()

  const register = await prisma.cashRegister.findUnique({ where: { id } })
  if (!register) return fail('Caja no encontrada')
  if (register.status === 'CLOSED') return fail('La caja ya esta cerrada')

  const difference = validated.actualCash - register.expectedCash

  const updated = await prisma.cashRegister.update({
    where: { id },
    data: {
      closeDate: new Date(),
      actualCash: validated.actualCash,
      difference,
      status: 'CLOSED',
      notes: validated.notes ?? register.notes,
    },
    include: {
      openedBy: { select: { id: true, username: true } },
      sales: { select: { id: true, saleNumber: true, totalPoints: true } },
      expenses: { select: { id: true, description: true, amount: true } },
    },
  })

  log.info(`Cash register closed: expected=${register.expectedCash}, actual=${validated.actualCash}, diff=${difference}`)

  // Backup automático al cerrar caja (en segundo plano)
  const config = getCloudConfig()
  if (config.backupOnCashClose && isCloudLoggedIn() && hasMasterKey()) {
    import('../services/backup.service').then(({ createAndUpload }) => {
      createAndUpload(`Cierre de caja ${new Date().toLocaleString('es-ES')}`)
        .then(() => log.info('Auto-backup on cash close completed'))
        .catch((err) => log.error('Auto-backup on cash close failed:', err instanceof Error ? err.message : err))
    })
  }

  return ok(updated)
}

export async function getCurrentRegister(): Promise<IpcResponse> {
  const prisma = await getPrismaClient()
  const register = await prisma.cashRegister.findFirst({
    where: { status: 'OPEN' },
    include: {
      openedBy: { select: { id: true, username: true } },
      sales: {
        select: { id: true, saleNumber: true, totalPoints: true, saleDate: true },
        orderBy: { saleDate: 'desc' },
      },
      expenses: {
        select: { id: true, description: true, amount: true, expenseDate: true },
        orderBy: { expenseDate: 'desc' },
      },
    },
  })
  return ok(register)
}

export async function getRegisters(
  params?: ListParams
): Promise<IpcResponse<PaginatedData<any>>> {
  const prisma = await getPrismaClient()
  const page = params?.page ?? 1
  const pageSize = params?.pageSize ?? 20
  const skip = (page - 1) * pageSize

  const [registers, total] = await Promise.all([
    prisma.cashRegister.findMany({
      skip,
      take: pageSize,
      include: { openedBy: { select: { id: true, username: true } } },
      orderBy: { openDate: 'desc' },
    }),
    prisma.cashRegister.count(),
  ])

  return ok({
    items: registers,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  })
}

export async function getRegisterById(id: string): Promise<IpcResponse> {
  const prisma = await getPrismaClient()
  const register = await prisma.cashRegister.findUnique({
    where: { id },
    include: {
      openedBy: { select: { id: true, username: true } },
      sales: {
        select: {
          id: true, saleNumber: true, totalPoints: true,
          saleDate: true, status: true,
        },
        orderBy: { saleDate: 'desc' },
      },
      expenses: {
        select: {
          id: true, description: true, amount: true,
          category: true, expenseDate: true,
        },
        orderBy: { expenseDate: 'desc' },
      },
    },
  })
  if (!register) return fail('Caja no encontrada')
  return ok(register)
}
