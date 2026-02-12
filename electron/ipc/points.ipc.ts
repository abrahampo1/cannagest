import { handleIpc } from '../utils/ipc.util'
import * as pointsService from '../services/points.service'

export function registerPointsHandlers() {
  handleIpc('points:load', async (_e, data) => {
    return pointsService.loadPoints(data)
  })

  handleIpc('points:getTransactions', async (_e, memberId: string, params?) => {
    return pointsService.getTransactions(memberId, params)
  })

  handleIpc('points:adjust', async (_e, data) => {
    return pointsService.adjustPoints(data)
  })
}
