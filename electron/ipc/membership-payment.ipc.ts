import { handleIpc } from '../utils/ipc.util'
import * as paymentService from '../services/membership-payment.service'

export function registerMembershipPaymentHandlers() {
  handleIpc('membershipPayment:getByMember', async (_e, memberId: string) => {
    return paymentService.getPaymentsByMember(memberId)
  })

  handleIpc('membershipPayment:create', async (_e, data) => {
    return paymentService.createPayment(data)
  })

  handleIpc('membershipPayment:delete', async (_e, id: string) => {
    return paymentService.deletePayment(id)
  })
}
