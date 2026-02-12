import { handleIpc } from '../utils/ipc.util'
import * as memberService from '../services/member.service'

export function registerMemberHandlers() {
  handleIpc('member:getAll', async (_e, params?) => {
    return memberService.getMembers(params)
  })

  handleIpc('member:getById', async (_e, id: string) => {
    return memberService.getMemberById(id)
  })

  handleIpc('member:getByNfc', async (_e, nfcTagId: string) => {
    return memberService.getMemberByNfc(nfcTagId)
  })

  handleIpc('member:create', async (_e, data) => {
    return memberService.createMember(data)
  })

  handleIpc('member:update', async (_e, id: string, data) => {
    return memberService.updateMember(id, data)
  })

  handleIpc('member:delete', async (_e, id: string) => {
    return memberService.deleteMember(id)
  })

  handleIpc('member:getBalance', async (_e, id: string) => {
    return memberService.getMemberBalance(id)
  })

  handleIpc('member:searchForReferral', async (_e, search: string) => {
    return memberService.searchMembersForReferral(search)
  })

  handleIpc('member:getInactive', async (_e, months?: number) => {
    return memberService.getInactiveMembers(months)
  })
}
