import { z } from 'zod'
import { addMonths, addYears, endOfDay, isBefore, startOfDay } from 'date-fns'
import { getPrismaClient } from '../database/client'
import { ok, fail, type IpcResponse } from '../types/ipc.types'
import { createLogger } from '../utils/logger.util'

const log = createLogger('MembershipPaymentService')

const createPaymentSchema = z.object({
  memberId: z.string().min(1, 'Socio es requerido'),
  amount: z.number().min(0, 'Monto debe ser >= 0'),
  periodStart: z.string().min(1, 'Inicio del periodo es requerido'),
  periodEnd: z.string().min(1, 'Fin del periodo es requerido'),
  paymentType: z.string().min(1, 'Tipo de pago es requerido'),
  notes: z.string().optional(),
})

const renewMembershipSchema = z.object({
  memberId: z.string().min(1, 'Socio es requerido'),
  period: z.enum(['MONTHLY', 'ANNUAL']),
})

function getMembershipStatus(member: { membershipType: string; membershipEnd: Date | null }, now: Date) {
  if (member.membershipType === 'NO_FEE') return 'NO_FEE'
  return member.membershipEnd && !isBefore(member.membershipEnd, startOfDay(now))
    ? 'CURRENT'
    : 'EXPIRED'
}

export async function getPaymentsByMember(memberId: string): Promise<IpcResponse> {
  const prisma = await getPrismaClient()

  const member = await prisma.member.findUnique({ where: { id: memberId } })
  if (!member) return fail('Socio no encontrado')

  const payments = await prisma.membershipPayment.findMany({
    where: { memberId },
    orderBy: { paymentDate: 'desc' },
  })
  return ok(payments)
}

export async function createPayment(data: unknown): Promise<IpcResponse> {
  const validated = createPaymentSchema.parse(data)
  const prisma = await getPrismaClient()
  const periodStart = new Date(validated.periodStart)
  const periodEnd = new Date(validated.periodEnd)
  if (Number.isNaN(periodStart.getTime()) || Number.isNaN(periodEnd.getTime()) || periodEnd < periodStart) {
    return fail('Periodo de pago no válido')
  }

  const payment = await prisma.$transaction(async tx => {
    const member = await tx.member.findUnique({ where: { id: validated.memberId } })
    if (!member) return null

    const createdPayment = await tx.membershipPayment.create({
      data: {
        memberId: validated.memberId,
        amount: validated.amount,
        periodStart,
        periodEnd,
        paymentType: validated.paymentType,
        notes: validated.notes,
      },
    })
    if (!member.membershipEnd || periodEnd > member.membershipEnd) {
      await tx.member.update({
        where: { id: member.id },
        data: {
          membershipStart: member.membershipStart ?? periodStart,
          membershipEnd: periodEnd,
          ...(validated.paymentType === 'MONTHLY' || validated.paymentType === 'ANNUAL'
            ? { membershipType: validated.paymentType }
            : {}),
        },
      })
    }
    return createdPayment
  })
  if (!payment) return fail('Socio no encontrado')

  log.info(`Payment created for member ${validated.memberId}: ${validated.amount}`)
  return ok(payment)
}

export async function renewMembership(data: unknown): Promise<IpcResponse> {
  const validated = renewMembershipSchema.parse(data)
  const prisma = await getPrismaClient()
  const now = new Date()
  const today = startOfDay(now)

  const result = await prisma.$transaction(async tx => {
    const member = await tx.member.findUnique({ where: { id: validated.memberId } })
    if (!member) return null

    const periodStart = member.membershipEnd && !isBefore(member.membershipEnd, today)
      ? member.membershipEnd
      : today
    const periodEnd = endOfDay(
      validated.period === 'MONTHLY'
        ? addMonths(startOfDay(periodStart), 1)
        : addYears(startOfDay(periodStart), 1),
    )

    const payment = await tx.membershipPayment.create({
      data: {
        memberId: member.id,
        amount: member.membershipFee,
        paymentDate: now,
        periodStart,
        periodEnd,
        paymentType: validated.period,
        notes: `Renovación ${validated.period === 'MONTHLY' ? 'mensual' : 'anual'}`,
      },
    })
    const updatedMember = await tx.member.update({
      where: { id: member.id },
      data: {
        membershipType: validated.period,
        membershipStart: member.membershipStart ?? periodStart,
        membershipEnd: periodEnd,
      },
    })

    return {
      payment,
      member: {
        ...updatedMember,
        membershipStatus: getMembershipStatus(updatedMember, now),
      },
    }
  })

  if (!result) return fail('Socio no encontrado')
  log.info(`Membership renewed for member ${validated.memberId} until ${result.payment.periodEnd.toISOString()}`)
  return ok(result)
}

export async function deletePayment(id: string): Promise<IpcResponse> {
  const prisma = await getPrismaClient()

  const payment = await prisma.membershipPayment.findUnique({ where: { id } })
  if (!payment) return fail('Pago no encontrado')

  await prisma.membershipPayment.delete({ where: { id } })
  log.info(`Payment deleted: ${id}`)
  return ok({ message: 'Pago eliminado' })
}
