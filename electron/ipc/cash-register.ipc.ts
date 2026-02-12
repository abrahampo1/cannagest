import { handleIpc } from '../utils/ipc.util'
import * as cashRegisterService from '../services/cash-register.service'

export function registerCashRegisterHandlers() {
  handleIpc('cashRegister:open', async (_e, data) => {
    return cashRegisterService.openRegister(data)
  })

  handleIpc('cashRegister:close', async (_e, id: string, data) => {
    return cashRegisterService.closeRegister(id, data)
  })

  handleIpc('cashRegister:getCurrent', async () => {
    return cashRegisterService.getCurrentRegister()
  })

  handleIpc('cashRegister:getAll', async (_e, params?) => {
    return cashRegisterService.getRegisters(params)
  })

  handleIpc('cashRegister:getById', async (_e, id: string) => {
    return cashRegisterService.getRegisterById(id)
  })
}
