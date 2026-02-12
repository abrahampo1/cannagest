import { handleIpc } from '../utils/ipc.util'
import * as productService from '../services/product.service'

export function registerProductHandlers() {
  handleIpc('product:getAll', async (_e, params?) => {
    return productService.getProducts(params)
  })

  handleIpc('product:getById', async (_e, id: string) => {
    return productService.getProductById(id)
  })

  handleIpc('product:create', async (_e, data) => {
    return productService.createProduct(data)
  })

  handleIpc('product:update', async (_e, id: string, data) => {
    return productService.updateProduct(id, data)
  })

  handleIpc('product:delete', async (_e, id: string) => {
    return productService.deleteProduct(id)
  })

  handleIpc('product:getLowStock', async () => {
    return productService.getLowStockProducts()
  })

  handleIpc('product:getStats', async (_e, id: string) => {
    return productService.getProductStats(id)
  })

  handleIpc('product:getSales', async (_e, id: string, params?) => {
    return productService.getProductSales(id, params)
  })
}
