import { registerAuthHandlers } from './auth.ipc'
import { registerMemberHandlers } from './member.ipc'
import { registerCategoryHandlers } from './category.ipc'
import { registerProductHandlers } from './product.ipc'
import { registerMembershipPaymentHandlers } from './membership-payment.ipc'
import { registerPointsHandlers } from './points.ipc'
import { registerStockHandlers } from './stock.ipc'
import { registerSaleHandlers } from './sale.ipc'
import { registerExpenseHandlers } from './expense.ipc'
import { registerCashRegisterHandlers } from './cash-register.ipc'
import { registerBackupHandlers } from './backup.ipc'
import { createLogger } from '../utils/logger.util'

const log = createLogger('IPC')

export function registerAllHandlers() {
  registerAuthHandlers()
  registerMemberHandlers()
  registerCategoryHandlers()
  registerProductHandlers()
  registerMembershipPaymentHandlers()
  registerPointsHandlers()
  registerStockHandlers()
  registerSaleHandlers()
  registerExpenseHandlers()
  registerCashRegisterHandlers()
  registerBackupHandlers()

  log.info('All IPC handlers registered')
}
