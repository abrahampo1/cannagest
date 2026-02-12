import { z } from 'zod'
import { getPrismaClient } from '../database/client'
import { ok, fail, type IpcResponse, type PaginatedData, type ListParams } from '../types/ipc.types'
import { createLogger } from '../utils/logger.util'

const log = createLogger('StockService')

const addStockEntrySchema = z.object({
  productId: z.string().min(1, 'Producto es requerido'),
  quantity: z.number().positive('Cantidad debe ser positiva'),
  userId: z.string().min(1, 'Usuario es requerido'),
  notes: z.string().optional(),
})

const addStockAdjustmentSchema = z.object({
  productId: z.string().min(1, 'Producto es requerido'),
  quantity: z.number(),
  userId: z.string().min(1, 'Usuario es requerido'),
  reason: z.string().min(1, 'Motivo es requerido'),
  notes: z.string().optional(),
})

export async function addStockEntry(data: unknown): Promise<IpcResponse> {
  const validated = addStockEntrySchema.parse(data)
  const prisma = await getPrismaClient()

  const result = await prisma.$transaction(async (tx) => {
    const product = await tx.product.findUnique({ where: { id: validated.productId } })
    if (!product) throw new Error('Producto no encontrado')

    const stockBefore = product.currentStock
    const stockAfter = stockBefore + validated.quantity

    const movement = await tx.stockMovement.create({
      data: {
        productId: validated.productId,
        type: 'ENTRY',
        quantity: validated.quantity,
        stockBefore,
        stockAfter,
        userId: validated.userId,
        notes: validated.notes,
      },
    })

    await tx.product.update({
      where: { id: validated.productId },
      data: { currentStock: stockAfter },
    })

    return movement
  })

  log.info(`Stock entry: +${validated.quantity} for product ${validated.productId}`)
  return ok(result)
}

export async function addStockAdjustment(data: unknown): Promise<IpcResponse> {
  const validated = addStockAdjustmentSchema.parse(data)
  const prisma = await getPrismaClient()

  const result = await prisma.$transaction(async (tx) => {
    const product = await tx.product.findUnique({ where: { id: validated.productId } })
    if (!product) throw new Error('Producto no encontrado')

    const stockBefore = product.currentStock
    const stockAfter = stockBefore + validated.quantity

    if (stockAfter < 0) {
      throw new Error('El stock no puede quedar negativo')
    }

    const movement = await tx.stockMovement.create({
      data: {
        productId: validated.productId,
        type: 'ADJUSTMENT',
        quantity: validated.quantity,
        stockBefore,
        stockAfter,
        reason: validated.reason,
        userId: validated.userId,
        notes: validated.notes,
      },
    })

    await tx.product.update({
      where: { id: validated.productId },
      data: { currentStock: stockAfter },
    })

    return movement
  })

  log.info(`Stock adjustment: ${validated.quantity} for product ${validated.productId}`)
  return ok(result)
}

export async function getMovements(
  params?: ListParams & { productId?: string }
): Promise<IpcResponse<PaginatedData<any>>> {
  const prisma = await getPrismaClient()
  const page = params?.page ?? 1
  const pageSize = params?.pageSize ?? 20
  const skip = (page - 1) * pageSize

  const where: any = {}
  if (params?.productId) {
    where.productId = params.productId
  }

  const [movements, total] = await Promise.all([
    prisma.stockMovement.findMany({
      where,
      skip,
      take: pageSize,
      include: {
        product: { select: { id: true, name: true, sku: true } },
        user: { select: { id: true, username: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.stockMovement.count({ where }),
  ])

  return ok({
    items: movements,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  })
}

/**
 * Internal: deduct stock during a sale (called within a $transaction)
 */
export async function deductStock(
  tx: any,
  productId: string,
  quantity: number,
  userId: string
): Promise<void> {
  const product = await tx.product.findUnique({ where: { id: productId } })
  if (!product) throw new Error(`Producto ${productId} no encontrado`)

  const stockBefore = product.currentStock
  if (stockBefore < quantity) {
    throw new Error(
      `Stock insuficiente para ${product.name}: ${stockBefore} disponible, ${quantity} requerido`
    )
  }

  const stockAfter = stockBefore - quantity

  await tx.stockMovement.create({
    data: {
      productId,
      type: 'EXIT',
      quantity: -quantity,
      stockBefore,
      stockAfter,
      userId,
      reason: 'Venta',
    },
  })

  await tx.product.update({
    where: { id: productId },
    data: { currentStock: stockAfter },
  })
}

/**
 * Internal: return stock during a refund (called within a $transaction)
 */
export async function returnStock(
  tx: any,
  productId: string,
  quantity: number,
  userId: string
): Promise<void> {
  const product = await tx.product.findUnique({ where: { id: productId } })
  if (!product) throw new Error(`Producto ${productId} no encontrado`)

  const stockBefore = product.currentStock
  const stockAfter = stockBefore + quantity

  await tx.stockMovement.create({
    data: {
      productId,
      type: 'RETURN',
      quantity,
      stockBefore,
      stockAfter,
      userId,
      reason: 'Devolucion por reembolso',
    },
  })

  await tx.product.update({
    where: { id: productId },
    data: { currentStock: stockAfter },
  })
}
