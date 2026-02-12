import { app } from 'electron'
import { handleIpc } from '../utils/ipc.util'
import { isSetupComplete, hasMasterPassword, getPointsRatio, setPointsRatio } from '../utils/settings.util'
import { ok } from '../types/ipc.types'
import * as setupService from '../services/setup.service'

export function registerSetupHandlers() {
  handleIpc('setup:isComplete', async () => {
    return ok(isSetupComplete())
  })

  handleIpc('setup:getStatus', async () => {
    return setupService.getSetupStatus()
  })

  handleIpc('setup:initializeDatabase', async () => {
    return setupService.initializeDatabase()
  })

  handleIpc('setup:initializeEncryption', async () => {
    return setupService.initializeEncryption()
  })

  handleIpc('setup:setMasterPassword', async (_e, password: string, confirmPassword: string) => {
    return setupService.setMasterPasswordService(password, confirmPassword)
  })

  handleIpc('setup:unlock', async (_e, password: string) => {
    return setupService.unlockDatabase(password)
  })

  handleIpc('setup:isUnlocked', async () => {
    return ok(setupService.isUnlocked())
  })

  handleIpc('setup:hasMasterPassword', async () => {
    return ok(hasMasterPassword())
  })

  handleIpc('setup:createAdmin', async (_e, username: string, password: string, email?: string) => {
    return setupService.createAdminAccount(username, password, email)
  })

  handleIpc('setup:getCategories', async () => {
    return setupService.getDefaultCategories()
  })

  handleIpc('setup:complete', async (_e, clubName?: string) => {
    return setupService.completeSetup(clubName)
  })

  handleIpc('setup:reset', async () => {
    return setupService.resetEverything()
  })

  handleIpc('setup:relaunch', async () => {
    app.relaunch()
    app.exit(0)
    return ok(undefined)
  })

  handleIpc('settings:getPointsRatio', async () => {
    return ok(getPointsRatio())
  })

  handleIpc('settings:setPointsRatio', async (_e, ratio: number) => {
    if (ratio <= 0) throw new Error('El ratio debe ser mayor que 0')
    setPointsRatio(ratio)
    return ok(ratio)
  })
}
