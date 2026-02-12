import { z } from 'zod'
import { getPrismaClient } from '../database/client'
import { ok, fail, type IpcResponse, type PaginatedData, type ListParams } from '../types/ipc.types'
import { getPointsRatio } from '../utils/settings.util'
import { createLogger } from '../utils/logger.util'

const log = createLogger('PointsService')

const loadPointsSchema = z.object({
  memberId: z.string().min(1, 'Socio es requerido'),
  amount: z.number().positive('Monto debe ser positivo'),
  userId: z.string().min(1, 'Usuario es requerido'),
  notes: z.string().optional(),
})

const adjustPointsSchema = z.object({
  memberId: z.string().min(1, 'Socio es requerido'),
  amount: z.number(),
  userId: z.string().min(1, 'Usuario es requerido'),
  notes: z.string().min(1, 'Motivo del ajuste es requerido'),
})

export async function loadPoints(data: unknown): Promise<IpcResponse> {
  const validated = loadPointsSchema.parse(data)
  const prisma = await getPrismaClient()

  const result = await prisma.$transaction(async (tx) => {
    const member = await tx.member.findUnique({ where: { id: validated.memberId } })
    if (!member) throw new Error('Socio no encontrado')

    const balanceBefore = member.pointsBalance
    const balanceAfter = balanceBefore + validated.amount

    const transaction = await tx.pointsTransaction.create({
      data: {
        memberId: validated.memberId,
        type: 'LOAD',
        amount: validated.amount,
        balanceBefore,
        balanceAfter,
        loadedById: validated.userId,
        notes: validated.notes,
      },
    })

    await tx.member.update({
      where: { id: validated.memberId },
      data: { pointsBalance: balanceAfter },
    })

    // Sumar el efectivo a la caja abierta (puntos / ratio = euros)
    const openRegister = await tx.cashRegister.findFirst({ where: { status: 'OPEN' } })
    if (openRegister) {
      const ratio = getPointsRatio()
      const cashAmount = validated.amount / ratio
      await tx.cashRegister.update({
        where: { id: openRegister.id },
        data: { expectedCash: { increment: cashAmount } },
      })
    }

    return { transaction, newBalance: balanceAfter }
  })

  log.info(`Points loaded: ${validated.amount} for member ${validated.memberId}`)
  return ok(result)
}

export async function getTransactions(
  memberId: string,
  params?: ListParams
): Promise<IpcResponse<PaginatedData<any>>> {
  const prisma = await getPrismaClient()
  const page = params?.page ?? 1
  const pageSize = params?.pageSize ?? 20
  const skip = (page - 1) * pageSize

  const where = { memberId }

  const [transactions, total] = await Promise.all([
    prisma.pointsTransaction.findMany({
      where,
      skip,
      take: pageSize,
      include: { loadedBy: { select: { id: true, username: true } } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.pointsTransaction.count({ where }),
  ])

  return ok({
    items: transactions,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  })
}

export async function adjustPoints(data: unknown): Promise<IpcResponse> {
  const validated = adjustPointsSchema.parse(data)
  const prisma = await getPrismaClient()

  const result = await prisma.$transaction(async (tx) => {
    const member = await tx.member.findUnique({ where: { id: validated.memberId } })
    if (!member) throw new Error('Socio no encontrado')

    const balanceBefore = member.pointsBalance
    const balanceAfter = balanceBefore + validated.amount

    if (balanceAfter < 0) {
      throw new Error('El balance no puede quedar negativo')
    }

    const transaction = await tx.pointsTransaction.create({
      data: {
        memberId: validated.memberId,
        type: 'ADJUSTMENT',
        amount: validated.amount,
        balanceBefore,
        balanceAfter,
        loadedById: validated.userId,
        notes: validated.notes,
      },
    })

    await tx.member.update({
      where: { id: validated.memberId },
      data: { pointsBalance: balanceAfter },
    })

    return { transaction, newBalance: balanceAfter }
  })

  log.info(`Points adjusted: ${validated.amount} for member ${validated.memberId}`)
  return ok(result)
}

/**
 * Internal: consume points during a sale (called within a $transaction)
 */
export async function consumePoints(
  tx: any,
  memberId: string,
  amount: number,
  saleId: string
): Promise<void> {
  const member = await tx.member.findUnique({ where: { id: memberId } })
  if (!member) throw new Error('Socio no encontrado')

  const balanceBefore = member.pointsBalance
  if (balanceBefore < amount) {
    throw new Error(
      `Balance insuficiente: ${balanceBefore} puntos disponibles, ${amount} requeridos`
    )
  }

  const balanceAfter = balanceBefore - amount

  await tx.pointsTransaction.create({
    data: {
      memberId,
      type: 'CONSUME',
      amount: -amount,
      balanceBefore,
      balanceAfter,
      saleId,
    },
  })

  await tx.member.update({
    where: { id: memberId },
    data: { pointsBalance: balanceAfter },
  })
}
