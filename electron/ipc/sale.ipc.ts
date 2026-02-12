import { handleIpc } from '../utils/ipc.util'
import * as saleService from '../services/sale.service'

export function registerSaleHandlers() {
  handleIpc('sale:create', async (_e, data) => {
    return saleService.createSale(data)
  })

  handleIpc('sale:getAll', async (_e, params?) => {
    return saleService.getSales(params)
  })

  handleIpc('sale:getById', async (_e, id: string) => {
    return saleService.getSaleById(id)
  })

  handleIpc('sale:refund', async (_e, id: string, userId: string) => {
    return saleService.refundSale(id, userId)
  })
}
