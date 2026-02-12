import { handleIpc } from '../utils/ipc.util'
import * as expenseService from '../services/expense.service'

export function registerExpenseHandlers() {
  handleIpc('expense:getAll', async (_e, params?) => {
    return expenseService.getExpenses(params)
  })

  handleIpc('expense:create', async (_e, data) => {
    return expenseService.createExpense(data)
  })

  handleIpc('expense:update', async (_e, id: string, data) => {
    return expenseService.updateExpense(id, data)
  })

  handleIpc('expense:delete', async (_e, id: string) => {
    return expenseService.deleteExpense(id)
  })
}
