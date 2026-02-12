import { z } from 'zod'
import { getPrismaClient } from '../database/client'
import { ok, fail, type IpcResponse, type PaginatedData, type ListParams } from '../types/ipc.types'
import { consumePoints } from './points.service'
import { deductStock, returnStock } from './stock.service'
import { createLogger } from '../utils/logger.util'

const log = createLogger('SaleService')

const saleItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().positive('Cantidad debe ser positiva'),
})

const createSaleSchema = z.object({
  memberId: z.string().min(1, 'Socio es requerido'),
  soldById: z.string().min(1, 'Vendedor es requerido'),
  cashRegisterId: z.string().optional(),
  items: z.array(saleItemSchema).min(1, 'Debe incluir al menos un producto'),
  notes: z.string().optional(),
})

async function generateSaleNumber(tx: any): Promise<string> {
  const today = new Date()
  const yyyy = today.getFullYear()
  const mm = String(today.getMonth() + 1).padStart(2, '0')
  const dd = String(today.getDate()).padStart(2, '0')
  const dateStr = `${yyyy}${mm}${dd}`

  const startOfDay = new Date(yyyy, today.getMonth(), today.getDate())
  const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000)

  const count = await tx.sale.count({
    where: {
      saleDate: { gte: startOfDay, lt: endOfDay },
    },
  })

  const number = String(count + 1).padStart(4, '0')
  return `V-${dateStr}-${number}`
}

export async function createSale(data: unknown): Promise<IpcResponse> {
  const validated = createSaleSchema.parse(data)
  const prisma = await getPrismaClient()

  const result = await prisma.$transaction(async (tx) => {
    // 1. Validate member
    const member = await tx.member.findUnique({ where: { id: validated.memberId } })
    if (!member || !member.isActive) {
      throw new Error('Socio no encontrado o inactivo')
    }

    // 2. Resolve products and calculate totals
    let totalPoints = 0
    const itemsData = []

    for (const item of validated.items) {
      const product = await tx.product.findUnique({ where: { id: item.productId } })
      if (!product || !product.isActive) {
        throw new Error(`Producto ${item.productId} no encontrado o inactivo`)
      }
      if (product.currentStock < item.quantity) {
        throw new Error(
          `Stock insuficiente para ${product.name}: ${product.currentStock} disponible, ${item.quantity} requerido`
        )
      }

      const itemTotal = product.pointsPrice * item.quantity
      totalPoints += itemTotal

      itemsData.push({
        productId: item.productId,
        quantity: item.quantity,
        pointsPrice: product.pointsPrice,
        totalPoints: itemTotal,
      })
    }

    // 3. Validate member balance
    if (member.pointsBalance < totalPoints) {
      throw new Error(
        `Balance insuficiente: ${member.pointsBalance} puntos disponibles, ${totalPoints} requeridos`
      )
    }

    // 4. Generate sale number
    const saleNumber = await generateSaleNumber(tx)

    // 5. Create sale with items
    const sale = await tx.sale.create({
      data: {
        saleNumber,
        memberId: validated.memberId,
        totalPoints,
        totalItems: validated.items.length,
        soldById: validated.soldById,
        cashRegisterId: validated.cashRegisterId,
        status: 'COMPLETED',
        notes: validated.notes,
        items: { create: itemsData },
      },
      include: {
        items: { include: { product: true } },
        member: { select: { id: true, firstName: true, lastName: true } },
        soldBy: { select: { id: true, username: true } },
      },
    })

    // 6. Deduct stock for each item
    for (const item of validated.items) {
      await deductStock(tx, item.productId, item.quantity, validated.soldById)
    }

    // 7. Consume points from member
    await consumePoints(tx, validated.memberId, totalPoints, sale.id)

    // 8. Update cash register if associated
    if (validated.cashRegisterId) {
      await tx.cashRegister.update({
        where: { id: validated.cashRegisterId },
        data: { totalSales: { increment: totalPoints } },
      })
    }

    return sale
  })

  log.info(`Sale created: ${result.saleNumber} - ${result.totalPoints} points`)
  return ok(result)
}

export async function getSales(
  params?: ListParams
): Promise<IpcResponse<PaginatedData<any>>> {
  const prisma = await getPrismaClient()
  const page = params?.page ?? 1
  const pageSize = params?.pageSize ?? 20
  const skip = (page - 1) * pageSize

  const where: any = {}
  if ((params as any)?.memberId) {
    where.memberId = (params as any).memberId
  }
  if (params?.search) {
    where.OR = [{ saleNumber: { contains: params.search } }]
  }

  const [sales, total] = await Promise.all([
    prisma.sale.findMany({
      where,
      skip,
      take: pageSize,
      include: {
        member: { select: { id: true, firstName: true, lastName: true } },
        soldBy: { select: { id: true, username: true } },
        _count: { select: { items: true } },
      },
      orderBy: { [params?.sortBy ?? 'saleDate']: params?.sortOrder ?? 'desc' },
    }),
    prisma.sale.count({ where }),
  ])

  return ok({
    items: sales,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  })
}

export async function getSaleById(id: string): Promise<IpcResponse> {
  const prisma = await getPrismaClient()
  const sale = await prisma.sale.findUnique({
    where: { id },
    include: {
      items: { include: { product: { include: { category: true } } } },
      member: { select: { id: true, firstName: true, lastName: true } },
      soldBy: { select: { id: true, username: true } },
      pointsTransaction: true,
    },
  })
  if (!sale) return fail('Venta no encontrada')
  return ok(sale)
}

export async function refundSale(id: string, userId: string): Promise<IpcResponse> {
  const prisma = await getPrismaClient()

  const result = await prisma.$transaction(async (tx) => {
    const sale = await tx.sale.findUnique({
      where: { id },
      include: { items: true },
    })
    if (!sale) throw new Error('Venta no encontrada')
    if (sale.status !== 'COMPLETED') {
      throw new Error('Solo se pueden reembolsar ventas completadas')
    }

    // 1. Return stock for each item
    for (const item of sale.items) {
      await returnStock(tx, item.productId, item.quantity, userId)
    }

    // 2. Refund points to member
    const member = await tx.member.findUnique({ where: { id: sale.memberId } })
    if (!member) throw new Error('Socio no encontrado')

    const balanceBefore = member.pointsBalance
    const balanceAfter = balanceBefore + sale.totalPoints

    await tx.pointsTransaction.create({
      data: {
        memberId: sale.memberId,
        type: 'REFUND',
        amount: sale.totalPoints,
        balanceBefore,
        balanceAfter,
        notes: `Reembolso de venta ${sale.saleNumber}`,
      },
    })

    await tx.member.update({
      where: { id: sale.memberId },
      data: { pointsBalance: balanceAfter },
    })

    // 3. Update sale status
    const updated = await tx.sale.update({
      where: { id },
      data: { status: 'REFUNDED' },
      include: {
        items: { include: { product: true } },
        member: { select: { id: true, firstName: true, lastName: true } },
      },
    })

    // 4. Update cash register if associated
    if (sale.cashRegisterId) {
      await tx.cashRegister.update({
        where: { id: sale.cashRegisterId },
        data: { totalSales: { decrement: sale.totalPoints } },
      })
    }

    return updated
  })

  log.info(`Sale refunded: ${result.saleNumber}`)
  return ok(result)
}
