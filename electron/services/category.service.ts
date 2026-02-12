import { z } from 'zod'
import { getPrismaClient } from '../database/client'
import { ok, fail, type IpcResponse } from '../types/ipc.types'
import { createLogger } from '../utils/logger.util'

const log = createLogger('CategoryService')

const createCategorySchema = z.object({
  name: z.string().min(1, 'Nombre es requerido'),
  description: z.string().optional(),
})

const updateCategorySchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
})

export async function getCategories(): Promise<IpcResponse> {
  const prisma = await getPrismaClient()
  const categories = await prisma.category.findMany({
    include: { _count: { select: { products: true } } },
    orderBy: { name: 'asc' },
  })
  return ok(categories)
}

export async function getCategoryById(id: string): Promise<IpcResponse> {
  const prisma = await getPrismaClient()
  const category = await prisma.category.findUnique({
    where: { id },
    include: { _count: { select: { products: true } } },
  })
  if (!category) return fail('Categoria no encontrada')
  return ok(category)
}

export async function createCategory(data: unknown): Promise<IpcResponse> {
  const validated = createCategorySchema.parse(data)
  const prisma = await getPrismaClient()

  const existing = await prisma.category.findUnique({ where: { name: validated.name } })
  if (existing) return fail('Ya existe una categoria con ese nombre')

  const category = await prisma.category.create({ data: validated })
  log.info(`Category created: ${category.name}`)
  return ok(category)
}

export async function updateCategory(id: string, data: unknown): Promise<IpcResponse> {
  const validated = updateCategorySchema.parse(data)
  const prisma = await getPrismaClient()

  const existing = await prisma.category.findUnique({ where: { id } })
  if (!existing) return fail('Categoria no encontrada')

  if (validated.name && validated.name !== existing.name) {
    const dup = await prisma.category.findUnique({ where: { name: validated.name } })
    if (dup) return fail('Ya existe una categoria con ese nombre')
  }

  const category = await prisma.category.update({ where: { id }, data: validated })
  log.info(`Category updated: ${category.name}`)
  return ok(category)
}

export async function deleteCategory(id: string): Promise<IpcResponse> {
  const prisma = await getPrismaClient()
  const category = await prisma.category.findUnique({
    where: { id },
    include: { _count: { select: { products: true } } },
  })
  if (!category) return fail('Categoria no encontrada')

  if (category._count.products > 0) {
    return fail(`No se puede eliminar: tiene ${category._count.products} producto(s) asociado(s)`)
  }

  await prisma.category.delete({ where: { id } })
  log.info(`Category deleted: ${category.name}`)
  return ok({ message: 'Categoria eliminada' })
}
