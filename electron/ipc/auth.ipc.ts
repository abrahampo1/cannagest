import { handleIpc } from '../utils/ipc.util'
import * as authService from '../services/auth.service'

export function registerAuthHandlers() {
  handleIpc('auth:login', async (_e, username: string, password: string) => {
    return authService.login(username, password)
  })

  handleIpc('auth:loginByNfc', async (_e, nfcTagId: string) => {
    return authService.loginByNfc(nfcTagId)
  })

  handleIpc('auth:getUsers', async (_e, params?) => {
    return authService.getUsers(params)
  })

  handleIpc('auth:getUserById', async (_e, id: string) => {
    return authService.getUserById(id)
  })

  handleIpc('auth:createUser', async (_e, data) => {
    return authService.createUser(data)
  })

  handleIpc('auth:updateUser', async (_e, id: string, data) => {
    return authService.updateUser(id, data)
  })

  handleIpc('auth:deleteUser', async (_e, id: string) => {
    return authService.deleteUser(id)
  })

  handleIpc('auth:changePassword', async (_e, id: string, oldPassword: string, newPassword: string) => {
    return authService.changePassword(id, oldPassword, newPassword)
  })
}
