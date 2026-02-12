import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { getPrismaClient } from '../database/client'
import { ok, fail, type IpcResponse, type PaginatedData, type ListParams } from '../types/ipc.types'
import { createLogger } from '../utils/logger.util'

const log = createLogger('AuthService')

const loginSchema = z.object({
  username: z.string().min(1, 'Username es requerido'),
  password: z.string().min(1, 'Password es requerido'),
})

const createUserSchema = z.object({
  username: z.string().min(3, 'Username debe tener al menos 3 caracteres'),
  password: z.string().min(6, 'Password debe tener al menos 6 caracteres'),
  email: z.string().email('Email invalido').optional().nullable(),
  role: z.enum(['ADMIN', 'MANAGER', 'EMPLOYEE']),
  nfcTagId: z.string().optional().nullable(),
})

const updateUserSchema = z.object({
  username: z.string().min(3).optional(),
  email: z.string().email().optional(),
  role: z.enum(['ADMIN', 'MANAGER', 'EMPLOYEE']).optional(),
  isActive: z.boolean().optional(),
  nfcTagId: z.string().optional().nullable(),
})

const changePasswordSchema = z.object({
  oldPassword: z.string().min(1, 'Password actual es requerido'),
  newPassword: z.string().min(6, 'Nueva password debe tener al menos 6 caracteres'),
})

export async function login(username: string, password: string): Promise<IpcResponse> {
  const data = loginSchema.parse({ username, password })
  const prisma = await getPrismaClient()

  const user = await prisma.user.findUnique({ where: { username: data.username } })
  if (!user || !user.isActive) {
    return fail('Usuario o contraseña incorrectos')
  }

  const valid = await bcrypt.compare(data.password, user.password)
  if (!valid) {
    return fail('Usuario o contraseña incorrectos')
  }

  const { password: _, ...userWithoutPassword } = user
  log.info(`User ${user.username} logged in (credentials)`)
  return ok(userWithoutPassword)
}

export async function loginByNfc(nfcTagId: string): Promise<IpcResponse> {
  if (!nfcTagId || nfcTagId.trim().length === 0) {
    return fail('Tag NFC invalido')
  }
  const prisma = await getPrismaClient()

  const user = await prisma.user.findUnique({ where: { nfcTagId: nfcTagId.trim() } })
  if (!user) {
    return fail('Llavero no registrado para ningun usuario')
  }
  if (!user.isActive) {
    return fail('Usuario inactivo')
  }

  const { password: _, ...userWithoutPassword } = user
  log.info(`User ${user.username} logged in (NFC)`)
  return ok(userWithoutPassword)
}

export async function getUsers(params?: ListParams): Promise<IpcResponse<PaginatedData<any>>> {
  const prisma = await getPrismaClient()
  const page = params?.page ?? 1
  const pageSize = params?.pageSize ?? 20
  const skip = (page - 1) * pageSize

  const where: any = {}
  if (params?.search) {
    where.OR = [
      { username: { contains: params.search } },
      { email: { contains: params.search } },
    ]
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take: pageSize,
      select: {
        id: true, username: true, email: true, role: true,
        isActive: true, nfcTagId: true, createdAt: true, updatedAt: true,
      },
      orderBy: { [params?.sortBy ?? 'createdAt']: params?.sortOrder ?? 'desc' },
    }),
    prisma.user.count({ where }),
  ])

  return ok({
    items: users,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  })
}

export async function getUserById(id: string): Promise<IpcResponse> {
  const prisma = await getPrismaClient()
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true, username: true, email: true, role: true,
      isActive: true, nfcTagId: true, createdAt: true, updatedAt: true,
    },
  })
  if (!user) return fail('Usuario no encontrado')
  return ok(user)
}

export async function createUser(data: unknown): Promise<IpcResponse> {
  const validated = createUserSchema.parse(data)
  const prisma = await getPrismaClient()

  const orConditions: any[] = [{ username: validated.username }]
  if (validated.email) orConditions.push({ email: validated.email })
  const existing = await prisma.user.findFirst({
    where: { OR: orConditions },
  })
  if (existing) {
    return fail(existing.username === validated.username ? 'Username ya existe' : 'Email ya existe')
  }

  if (validated.nfcTagId) {
    const nfcDup = await prisma.user.findUnique({ where: { nfcTagId: validated.nfcTagId } })
    if (nfcDup) return fail('Este llavero NFC ya esta asignado a otro usuario')
  }

  const hashedPassword = await bcrypt.hash(validated.password, 12)
  const { nfcTagId, email, ...rest } = validated
  const user = await prisma.user.create({
    data: { ...rest, password: hashedPassword, email: email || null, nfcTagId: nfcTagId || null },
    select: {
      id: true, username: true, email: true, role: true,
      isActive: true, nfcTagId: true, createdAt: true,
    },
  })

  log.info(`User created: ${user.username}`)
  return ok(user)
}

export async function updateUser(id: string, data: unknown): Promise<IpcResponse> {
  const validated = updateUserSchema.parse(data)
  const prisma = await getPrismaClient()

  const existing = await prisma.user.findUnique({ where: { id } })
  if (!existing) return fail('Usuario no encontrado')

  if (validated.username && validated.username !== existing.username) {
    const dup = await prisma.user.findUnique({ where: { username: validated.username } })
    if (dup) return fail('Username ya existe')
  }

  if (validated.email && validated.email !== existing.email) {
    const dup = await prisma.user.findUnique({ where: { email: validated.email } })
    if (dup) return fail('Email ya existe')
  }

  if (validated.nfcTagId) {
    const nfcDup = await prisma.user.findUnique({ where: { nfcTagId: validated.nfcTagId } })
    if (nfcDup && nfcDup.id !== id) return fail('Este llavero NFC ya esta asignado a otro usuario')
  }

  const updateData: any = { ...validated }
  if (validated.nfcTagId === null) {
    updateData.nfcTagId = null
  }

  const user = await prisma.user.update({
    where: { id },
    data: updateData,
    select: {
      id: true, username: true, email: true, role: true,
      isActive: true, nfcTagId: true, createdAt: true, updatedAt: true,
    },
  })

  log.info(`User updated: ${user.username}`)
  return ok(user)
}

export async function deleteUser(id: string): Promise<IpcResponse> {
  const prisma = await getPrismaClient()
  const user = await prisma.user.findUnique({ where: { id } })
  if (!user) return fail('Usuario no encontrado')

  await prisma.user.update({ where: { id }, data: { isActive: false } })
  log.info(`User soft-deleted: ${user.username}`)
  return ok({ message: 'Usuario eliminado' })
}

export async function changePassword(id: string, oldPassword: string, newPassword: string): Promise<IpcResponse> {
  const validated = changePasswordSchema.parse({ oldPassword, newPassword })
  const prisma = await getPrismaClient()

  const user = await prisma.user.findUnique({ where: { id } })
  if (!user) return fail('Usuario no encontrado')

  const valid = await bcrypt.compare(validated.oldPassword, user.password)
  if (!valid) return fail('contraseña actual incorrecta')

  const hashedPassword = await bcrypt.hash(validated.newPassword, 12)
  await prisma.user.update({ where: { id }, data: { password: hashedPassword } })

  log.info(`Password changed for user: ${user.username}`)
  return ok({ message: 'contraseña actualizada' })
}
