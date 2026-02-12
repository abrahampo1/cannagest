import { z } from 'zod'
import { getPrismaClient } from '../database/client'
import { ok, fail, type IpcResponse, type PaginatedData, type ListParams } from '../types/ipc.types'
import { createLogger } from '../utils/logger.util'

const log = createLogger('ExpenseService')

const createExpenseSchema = z.object({
  description: z.string().min(1, 'Descripcion es requerida'),
  amount: z.number().min(0, 'Monto debe ser >= 0'),
  category: z.enum(['SUPPLIES', 'UTILITIES', 'RENT', 'SALARY', 'MAINTENANCE', 'OTHER']),
  recordedById: z.string().min(1, 'Usuario es requerido'),
  cashRegisterId: z.string().optional(),
  expenseDate: z.string().optional(),
  notes: z.string().optional(),
})

const updateExpenseSchema = z.object({
  description: z.string().min(1).optional(),
  amount: z.number().min(0).optional(),
  category: z.enum(['SUPPLIES', 'UTILITIES', 'RENT', 'SALARY', 'MAINTENANCE', 'OTHER']).optional(),
  notes: z.string().optional().nullable(),
})

export async function getExpenses(params?: ListParams): Promise<IpcResponse<PaginatedData<any>>> {
  const prisma = await getPrismaClient()
  const page = params?.page ?? 1
  const pageSize = params?.pageSize ?? 20
  const skip = (page - 1) * pageSize

  const where: any = {}
  if (params?.search) {
    where.OR = [
      { description: { contains: params.search } },
      { category: { contains: params.search } },
    ]
  }

  const [expenses, total] = await Promise.all([
    prisma.expense.findMany({
      where,
      skip,
      take: pageSize,
      include: { recordedBy: { select: { id: true, username: true } } },
      orderBy: { [params?.sortBy ?? 'expenseDate']: params?.sortOrder ?? 'desc' },
    }),
    prisma.expense.count({ where }),
  ])

  return ok({
    items: expenses,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  })
}

export async function createExpense(data: unknown): Promise<IpcResponse> {
  const validated = createExpenseSchema.parse(data)
  const prisma = await getPrismaClient()

  const expense = await prisma.expense.create({
    data: {
      description: validated.description,
      amount: validated.amount,
      category: validated.category,
      recordedById: validated.recordedById,
      cashRegisterId: validated.cashRegisterId,
      expenseDate: validated.expenseDate ? new Date(validated.expenseDate) : new Date(),
      notes: validated.notes,
    },
    include: { recordedBy: { select: { id: true, username: true } } },
  })

  if (validated.cashRegisterId) {
    const register = await prisma.cashRegister.findUnique({
      where: { id: validated.cashRegisterId },
    })
    if (register && register.status === 'OPEN') {
      await prisma.cashRegister.update({
        where: { id: validated.cashRegisterId },
        data: {
          totalExpenses: { increment: validated.amount },
          expectedCash: { decrement: validated.amount },
        },
      })
    }
  }

  log.info(`Expense created: ${validated.description} - ${validated.amount}`)
  return ok(expense)
}

export async function updateExpense(id: string, data: unknown): Promise<IpcResponse> {
  const validated = updateExpenseSchema.parse(data)
  const prisma = await getPrismaClient()

  const existing = await prisma.expense.findUnique({ where: { id } })
  if (!existing) return fail('Gasto no encontrado')

  const expense = await prisma.expense.update({
    where: { id },
    data: validated,
    include: { recordedBy: { select: { id: true, username: true } } },
  })

  log.info(`Expense updated: ${id}`)
  return ok(expense)
}

export async function deleteExpense(id: string): Promise<IpcResponse> {
  const prisma = await getPrismaClient()

  const expense = await prisma.expense.findUnique({ where: { id } })
  if (!expense) return fail('Gasto no encontrado')

  await prisma.expense.delete({ where: { id } })
  log.info(`Expense deleted: ${id}`)
  return ok({ message: 'Gasto eliminado' })
}
