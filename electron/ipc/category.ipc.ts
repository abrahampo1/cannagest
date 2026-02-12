import { handleIpc } from '../utils/ipc.util'
import * as categoryService from '../services/category.service'

export function registerCategoryHandlers() {
  handleIpc('category:getAll', async () => {
    return categoryService.getCategories()
  })

  handleIpc('category:getById', async (_e, id: string) => {
    return categoryService.getCategoryById(id)
  })

  handleIpc('category:create', async (_e, data) => {
    return categoryService.createCategory(data)
  })

  handleIpc('category:update', async (_e, id: string, data) => {
    return categoryService.updateCategory(id, data)
  })

  handleIpc('category:delete', async (_e, id: string) => {
    return categoryService.deleteCategory(id)
  })
}
