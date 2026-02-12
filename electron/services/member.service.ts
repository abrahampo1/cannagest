import { z } from 'zod'
import { getPrismaClient } from '../database/client'
import { encryptFields, decryptFields, decryptField } from '../utils/crypto.util'
import { ok, fail, type IpcResponse, type PaginatedData, type ListParams } from '../types/ipc.types'
import { createLogger } from '../utils/logger.util'

const log = createLogger('MemberService')

const ENCRYPTED_FIELDS = ['dni', 'email', 'phone', 'address', 'dateOfBirth'] as const

const createMemberSchema = z.object({
  firstName: z.string().min(1, 'Nombre es requerido'),
  lastName: z.string().min(1, 'Apellido es requerido'),
  dni: z.string().min(1, 'DNI es requerido'),
  email: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  dateOfBirth: z.string().optional(),
  photo: z.string().optional(),
  nfcTagId: z.string().optional().nullable(),
  membershipType: z.enum(['ANNUAL', 'MONTHLY', 'NO_FEE']).optional(),
  membershipFee: z.number().min(0).optional(),
  membershipStart: z.string().optional(),
  membershipEnd: z.string().optional(),
  referredById: z.string().optional().nullable(),
})

const updateMemberSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  dni: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  dateOfBirth: z.string().optional().nullable(),
  photo: z.string().optional().nullable(),
  nfcTagId: z.string().optional().nullable(),
  membershipType: z.enum(['ANNUAL', 'MONTHLY', 'NO_FEE']).optional(),
  membershipFee: z.number().min(0).optional(),
  membershipStart: z.string().optional().nullable(),
  membershipEnd: z.string().optional().nullable(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']).optional(),
  referredById: z.string().optional().nullable(),
})

function decryptMember(member: any) {
  return decryptFields(member, [...ENCRYPTED_FIELDS])
}

async function checkUniqueDni(dni: string, excludeId?: string): Promise<boolean> {
  const prisma = await getPrismaClient()
  const members = await prisma.member.findMany({ select: { id: true, dni: true } })
  return members.some(m => m.id !== excludeId && decryptField(m.dni) === dni)
}

async function checkUniqueEmail(email: string, excludeId?: string): Promise<boolean> {
  const prisma = await getPrismaClient()
  const members = await prisma.member.findMany({ select: { id: true, email: true } })
  return members.some(m => m.id !== excludeId && decryptField(m.email) === email)
}

async function checkUniqueNfcTag(nfcTagId: string, excludeId?: string): Promise<boolean> {
  const prisma = await getPrismaClient()
  const existing = await prisma.member.findUnique({ where: { nfcTagId } })
  return !!existing && existing.id !== excludeId
}

export async function getMemberByNfc(nfcTagId: string): Promise<IpcResponse> {
  const prisma = await getPrismaClient()
  const member = await prisma.member.findUnique({ where: { nfcTagId } })
  if (!member) return fail('Llavero no registrado')
  if (!member.isActive) return fail('Socio inactivo')
  return ok(decryptMember(member))
}

export async function getMembers(params?: ListParams & { inactiveMonths?: number }): Promise<IpcResponse<PaginatedData<any>>> {
  const prisma = await getPrismaClient()
  const page = params?.page ?? 1
  const pageSize = params?.pageSize ?? 20
  const where: any = { isActive: true }

  const allMembers = await prisma.member.findMany({
    where,
    orderBy: { [params?.sortBy ?? 'createdAt']: params?.sortOrder ?? 'desc' },
    include: {
      pointsTransactions: {
        where: { type: 'CONSUME' },
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { createdAt: true },
      },
    },
  })

  let decrypted = allMembers.map(m => {
    const lastConsumeDate = m.pointsTransactions[0]?.createdAt?.toISOString() || null
    const base = decryptMember({ ...m, pointsTransactions: undefined })
    return { ...base, lastConsumeDate }
  })

  if (params?.search) {
    const search = params.search.toLowerCase()
    decrypted = decrypted.filter(m =>
      m.firstName?.toLowerCase().includes(search) ||
      m.lastName?.toLowerCase().includes(search) ||
      m.dni?.toLowerCase().includes(search) ||
      m.email?.toLowerCase().includes(search)
    )
  }

  // Filter by inactive months
  if (params?.inactiveMonths && params.inactiveMonths > 0) {
    const cutoff = new Date()
    cutoff.setMonth(cutoff.getMonth() - params.inactiveMonths)
    decrypted = decrypted.filter(m =>
      !m.lastConsumeDate || new Date(m.lastConsumeDate) < cutoff
    )
  }

  const total = decrypted.length
  const skip = (page - 1) * pageSize
  const items = decrypted.slice(skip, skip + pageSize)

  return ok({
    items,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  })
}

export async function getMemberById(id: string): Promise<IpcResponse> {
  const prisma = await getPrismaClient()
  const member = await prisma.member.findUnique({
    where: { id },
    include: {
      referredBy: { select: { id: true, firstName: true, lastName: true } },
      referrals: {
        select: { id: true, firstName: true, lastName: true, status: true },
        where: { isActive: true },
      },
    },
  })
  if (!member) return fail('Socio no encontrado')
  return ok(decryptMember(member))
}

export async function createMember(data: unknown): Promise<IpcResponse> {
  const validated = createMemberSchema.parse(data)
  const prisma = await getPrismaClient()

  // Normalizar campos opcionales: cadenas vacías → null
  const email = validated.email?.trim() || null
  const phone = validated.phone?.trim() || null
  const address = validated.address?.trim() || null
  const dateOfBirth = validated.dateOfBirth?.trim() || null

  if (await checkUniqueDni(validated.dni)) {
    return fail('Ya existe un socio con ese DNI')
  }
  if (email && await checkUniqueEmail(email)) {
    return fail('Ya existe un socio con ese email')
  }
  if (validated.nfcTagId && await checkUniqueNfcTag(validated.nfcTagId)) {
    return fail('Ese llavero NFC ya esta asignado a otro socio')
  }

  const normalizedData = { ...validated, email, phone, address, dateOfBirth }

  const fieldsToEncrypt = [...ENCRYPTED_FIELDS].filter(
    f => (normalizedData as any)[f] !== undefined && (normalizedData as any)[f] !== null
  )
  const encrypted = encryptFields({ ...normalizedData }, fieldsToEncrypt as any)

  const memberData: any = { ...encrypted }
  delete memberData.membershipStart
  delete memberData.membershipEnd
  delete memberData.referredById

  if (validated.membershipStart) {
    memberData.membershipStart = new Date(validated.membershipStart)
  }
  if (validated.membershipEnd) {
    memberData.membershipEnd = new Date(validated.membershipEnd)
  }
  if (validated.referredById) {
    memberData.referredById = validated.referredById
  }

  const member = await prisma.member.create({ data: memberData })
  log.info(`Member created: ${validated.firstName} ${validated.lastName}`)
  return ok(decryptMember(member))
}

export async function updateMember(id: string, data: unknown): Promise<IpcResponse> {
  const validated = updateMemberSchema.parse(data)
  const prisma = await getPrismaClient()

  const existing = await prisma.member.findUnique({ where: { id } })
  if (!existing) return fail('Socio no encontrado')

  // Normalizar campos opcionales: cadenas vacías → null
  const normalizedData = { ...validated }
  if ('email' in normalizedData) {
    (normalizedData as any).email = normalizedData.email?.trim() || null
  }
  if ('phone' in normalizedData) {
    (normalizedData as any).phone = normalizedData.phone?.trim() || null
  }
  if ('address' in normalizedData) {
    (normalizedData as any).address = normalizedData.address?.trim() || null
  }
  if ('dateOfBirth' in normalizedData) {
    (normalizedData as any).dateOfBirth = normalizedData.dateOfBirth?.trim() || null
  }

  if (normalizedData.dni && await checkUniqueDni(normalizedData.dni, id)) {
    return fail('Ya existe un socio con ese DNI')
  }
  if (normalizedData.email && await checkUniqueEmail(normalizedData.email, id)) {
    return fail('Ya existe un socio con ese email')
  }
  if (validated.nfcTagId && await checkUniqueNfcTag(validated.nfcTagId, id)) {
    return fail('Ese llavero NFC ya esta asignado a otro socio')
  }

  const fieldsToEncrypt = [...ENCRYPTED_FIELDS].filter(
    f => (normalizedData as any)[f] !== undefined && (normalizedData as any)[f] !== null
  )
  const encrypted = encryptFields({ ...normalizedData }, fieldsToEncrypt as any)

  const updateData: any = { ...encrypted }
  // Handle nfcTagId null explicitly (clearing the tag)
  if ('nfcTagId' in validated && validated.nfcTagId === null) {
    updateData.nfcTagId = null
  }
  if ('membershipStart' in validated) {
    updateData.membershipStart = validated.membershipStart ? new Date(validated.membershipStart) : null
  }
  if ('membershipEnd' in validated) {
    updateData.membershipEnd = validated.membershipEnd ? new Date(validated.membershipEnd) : null
  }

  const member = await prisma.member.update({ where: { id }, data: updateData })
  log.info(`Member updated: ${id}`)
  return ok(decryptMember(member))
}

export async function deleteMember(id: string): Promise<IpcResponse> {
  const prisma = await getPrismaClient()
  const member = await prisma.member.findUnique({ where: { id } })
  if (!member) return fail('Socio no encontrado')

  await prisma.member.update({ where: { id }, data: { isActive: false, status: 'INACTIVE' } })
  log.info(`Member soft-deleted: ${id}`)
  return ok({ message: 'Socio eliminado' })
}

export async function searchMembersForReferral(search: string): Promise<IpcResponse> {
  const prisma = await getPrismaClient()
  const allMembers = await prisma.member.findMany({
    where: { isActive: true },
    select: { id: true, firstName: true, lastName: true, dni: true, email: true },
  })

  const decrypted = allMembers.map(m => ({
    ...m,
    dni: decryptField(m.dni),
    email: decryptField(m.email),
  }))

  const term = search.toLowerCase()
  const filtered = decrypted.filter(m =>
    m.firstName.toLowerCase().includes(term) ||
    m.lastName.toLowerCase().includes(term) ||
    m.dni?.toLowerCase().includes(term)
  ).slice(0, 10)

  return ok(filtered)
}

export async function getInactiveMembers(monthsThreshold: number = 3): Promise<IpcResponse> {
  const prisma = await getPrismaClient()
  const cutoffDate = new Date()
  cutoffDate.setMonth(cutoffDate.getMonth() - monthsThreshold)

  // Get all active members with their last CONSUME transaction
  const members = await prisma.member.findMany({
    where: { isActive: true },
    include: {
      pointsTransactions: {
        where: { type: 'CONSUME' },
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { createdAt: true },
      },
    },
  })

  const inactive = members
    .filter(m => {
      const lastConsume = m.pointsTransactions[0]?.createdAt
      // Never consumed, or consumed before cutoff date
      return !lastConsume || lastConsume < cutoffDate
    })
    .map(m => {
      const decrypted = decryptMember({ ...m, pointsTransactions: undefined })
      return {
        ...decrypted,
        lastConsumeDate: m.pointsTransactions[0]?.createdAt?.toISOString() || null,
      }
    })

  return ok(inactive)
}

export async function getMemberBalance(id: string): Promise<IpcResponse> {
  const prisma = await getPrismaClient()
  const member = await prisma.member.findUnique({
    where: { id },
    select: { id: true, pointsBalance: true, firstName: true, lastName: true },
  })
  if (!member) return fail('Socio no encontrado')
  return ok({
    id: member.id,
    balance: member.pointsBalance,
    name: `${member.firstName} ${member.lastName}`,
  })
}
