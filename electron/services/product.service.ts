import { z } from 'zod'
import { getPrismaClient } from '../database/client'
import { ok, fail, type IpcResponse, type PaginatedData, type ListParams } from '../types/ipc.types'
import { createLogger } from '../utils/logger.util'

const log = createLogger('ProductService')

const createProductSchema = z.object({
  name: z.string().min(1, 'Nombre es requerido'),
  description: z.string().optional(),
  sku: z.string().optional(),
  pointsPrice: z.number().min(0, 'Precio debe ser >= 0'),
  categoryId: z.string().min(1, 'Categoria es requerida'),
  currentStock: z.number().min(0).optional(),
  minStock: z.number().min(0).optional(),
  unit: z.string().optional(),
})

const updateProductSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  sku: z.string().optional().nullable(),
  pointsPrice: z.number().min(0).optional(),
  categoryId: z.string().optional(),
  minStock: z.number().min(0).optional(),
  unit: z.string().optional(),
  isActive: z.boolean().optional(),
})

export async function getProducts(params?: ListParams): Promise<IpcResponse<PaginatedData<any>>> {
  const prisma = await getPrismaClient()
  const page = params?.page ?? 1
  const pageSize = params?.pageSize ?? 20
  const skip = (page - 1) * pageSize

  const where: any = { isActive: true }
  if (params?.search) {
    where.OR = [
      { name: { contains: params.search } },
      { sku: { contains: params.search } },
      { description: { contains: params.search } },
    ]
  }

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      skip,
      take: pageSize,
      include: { category: true },
      orderBy: { [params?.sortBy ?? 'name']: params?.sortOrder ?? 'asc' },
    }),
    prisma.product.count({ where }),
  ])

  return ok({
    items: products,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  })
}

export async function getProductById(id: string): Promise<IpcResponse> {
  const prisma = await getPrismaClient()
  const product = await prisma.product.findUnique({
    where: { id },
    include: { category: true },
  })
  if (!product) return fail('Producto no encontrado')
  return ok(product)
}

export async function createProduct(data: unknown): Promise<IpcResponse> {
  const validated = createProductSchema.parse(data)
  const prisma = await getPrismaClient()

  const category = await prisma.category.findUnique({ where: { id: validated.categoryId } })
  if (!category) return fail('Categoria no encontrada')

  if (validated.sku) {
    const existing = await prisma.product.findUnique({ where: { sku: validated.sku } })
    if (existing) return fail('Ya existe un producto con ese SKU')
  }

  const product = await prisma.product.create({
    data: validated,
    include: { category: true },
  })
  log.info(`Product created: ${product.name}`)
  return ok(product)
}

export async function updateProduct(id: string, data: unknown): Promise<IpcResponse> {
  const validated = updateProductSchema.parse(data)
  const prisma = await getPrismaClient()

  const existing = await prisma.product.findUnique({ where: { id } })
  if (!existing) return fail('Producto no encontrado')

  if (validated.sku && validated.sku !== existing.sku) {
    const dup = await prisma.product.findUnique({ where: { sku: validated.sku } })
    if (dup) return fail('Ya existe un producto con ese SKU')
  }

  if (validated.categoryId) {
    const category = await prisma.category.findUnique({ where: { id: validated.categoryId } })
    if (!category) return fail('Categoria no encontrada')
  }

  const product = await prisma.product.update({
    where: { id },
    data: validated,
    include: { category: true },
  })
  log.info(`Product updated: ${product.name}`)
  return ok(product)
}

export async function deleteProduct(id: string): Promise<IpcResponse> {
  const prisma = await getPrismaClient()
  const product = await prisma.product.findUnique({ where: { id } })
  if (!product) return fail('Producto no encontrado')

  await prisma.product.update({ where: { id }, data: { isActive: false } })
  log.info(`Product soft-deleted: ${product.name}`)
  return ok({ message: 'Producto eliminado' })
}

export async function getProductStats(productId: string): Promise<IpcResponse> {
  const prisma = await getPrismaClient()

  const product = await prisma.product.findUnique({ where: { id: productId } })
  if (!product) return fail('Producto no encontrado')

  // Total units sold and points generated from completed sales
  const saleAgg = await prisma.saleItem.aggregate({
    where: {
      productId,
      sale: { status: 'COMPLETED' },
    },
    _sum: { quantity: true, totalPoints: true },
    _count: true,
  })

  // Distinct sale count
  const distinctSales = await prisma.saleItem.findMany({
    where: { productId, sale: { status: 'COMPLETED' } },
    select: { saleId: true },
    distinct: ['saleId'],
  })

  const totalUnitsSold = saleAgg._sum.quantity ?? 0
  const totalPointsGenerated = saleAgg._sum.totalPoints ?? 0
  const salesCount = distinctSales.length
  const avgPerSale = salesCount > 0 ? totalUnitsSold / salesCount : 0

  // Stock movement counts by type
  const movements = await prisma.stockMovement.groupBy({
    by: ['type'],
    where: { productId },
    _count: true,
    _sum: { quantity: true },
  })

  const movementsByType: Record<string, { count: number; totalQty: number }> = {}
  for (const m of movements) {
    movementsByType[m.type] = { count: m._count, totalQty: m._sum.quantity ?? 0 }
  }

  return ok({
    totalUnitsSold,
    totalPointsGenerated,
    salesCount,
    avgPerSale,
    movementsByType,
  })
}

export async function getProductSales(
  productId: string,
  params?: ListParams
): Promise<IpcResponse<PaginatedData<any>>> {
  const prisma = await getPrismaClient()
  const page = params?.page ?? 1
  const pageSize = params?.pageSize ?? 10
  const skip = (page - 1) * pageSize

  const where = {
    items: { some: { productId } },
  }

  const [sales, total] = await Promise.all([
    prisma.sale.findMany({
      where,
      skip,
      take: pageSize,
      include: {
        member: { select: { id: true, firstName: true, lastName: true } },
        soldBy: { select: { id: true, username: true } },
        items: {
          where: { productId },
          select: { quantity: true, pointsPrice: true, totalPoints: true },
        },
      },
      orderBy: { saleDate: 'desc' },
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

export async function getLowStockProducts(): Promise<IpcResponse> {
  const prisma = await getPrismaClient()
  const products = await prisma.product.findMany({
    where: { isActive: true },
    include: { category: true },
  })
  const lowStock = products.filter(p => p.currentStock <= p.minStock)
  return ok(lowStock)
}
