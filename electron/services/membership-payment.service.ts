import { z } from 'zod'
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

  const member = await prisma.member.findUnique({ where: { id: validated.memberId } })
  if (!member) return fail('Socio no encontrado')

  const payment = await prisma.membershipPayment.create({
    data: {
      memberId: validated.memberId,
      amount: validated.amount,
      periodStart: new Date(validated.periodStart),
      periodEnd: new Date(validated.periodEnd),
      paymentType: validated.paymentType,
      notes: validated.notes,
    },
  })

  log.info(`Payment created for member ${validated.memberId}: ${validated.amount}`)
  return ok(payment)
}

export async function deletePayment(id: string): Promise<IpcResponse> {
  const prisma = await getPrismaClient()

  const payment = await prisma.membershipPayment.findUnique({ where: { id } })
  if (!payment) return fail('Pago no encontrado')

  await prisma.membershipPayment.delete({ where: { id } })
  log.info(`Payment deleted: ${id}`)
  return ok({ message: 'Pago eliminado' })
}
