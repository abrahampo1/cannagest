import { handleIpc } from '../utils/ipc.util'
import * as stockService from '../services/stock.service'

export function registerStockHandlers() {
  handleIpc('stock:addEntry', async (_e, data) => {
    return stockService.addStockEntry(data)
  })

  handleIpc('stock:addAdjustment', async (_e, data) => {
    return stockService.addStockAdjustment(data)
  })

  handleIpc('stock:getMovements', async (_e, params?) => {
    return stockService.getMovements(params)
  })

  handleIpc('stock:getByProduct', async (_e, productId: string, params?) => {
    return stockService.getMovements({ ...params, productId })
  })
}
