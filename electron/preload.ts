import { contextBridge, ipcRenderer } from 'electron'

const api = {
  auth: {
    login: (username: string, password: string) =>
      ipcRenderer.invoke('auth:login', username, password),
    loginByNfc: (nfcTagId: string) =>
      ipcRenderer.invoke('auth:loginByNfc', nfcTagId),
    getUsers: (params?: any) =>
      ipcRenderer.invoke('auth:getUsers', params),
    getUserById: (id: string) =>
      ipcRenderer.invoke('auth:getUserById', id),
    createUser: (data: any) =>
      ipcRenderer.invoke('auth:createUser', data),
    updateUser: (id: string, data: any) =>
      ipcRenderer.invoke('auth:updateUser', id, data),
    deleteUser: (id: string) =>
      ipcRenderer.invoke('auth:deleteUser', id),
    changePassword: (id: string, oldPassword: string, newPassword: string) =>
      ipcRenderer.invoke('auth:changePassword', id, oldPassword, newPassword),
  },

  member: {
    getAll: (params?: any) =>
      ipcRenderer.invoke('member:getAll', params),
    getById: (id: string) =>
      ipcRenderer.invoke('member:getById', id),
    create: (data: any) =>
      ipcRenderer.invoke('member:create', data),
    update: (id: string, data: any) =>
      ipcRenderer.invoke('member:update', id, data),
    delete: (id: string) =>
      ipcRenderer.invoke('member:delete', id),
    getBalance: (id: string) =>
      ipcRenderer.invoke('member:getBalance', id),
    getByNfc: (nfcTagId: string) =>
      ipcRenderer.invoke('member:getByNfc', nfcTagId),
    searchForReferral: (search: string) =>
      ipcRenderer.invoke('member:searchForReferral', search),
    getInactive: (months?: number) =>
      ipcRenderer.invoke('member:getInactive', months),
  },

  category: {
    getAll: () =>
      ipcRenderer.invoke('category:getAll'),
    getById: (id: string) =>
      ipcRenderer.invoke('category:getById', id),
    create: (data: any) =>
      ipcRenderer.invoke('category:create', data),
    update: (id: string, data: any) =>
      ipcRenderer.invoke('category:update', id, data),
    delete: (id: string) =>
      ipcRenderer.invoke('category:delete', id),
  },

  product: {
    getAll: (params?: any) =>
      ipcRenderer.invoke('product:getAll', params),
    getById: (id: string) =>
      ipcRenderer.invoke('product:getById', id),
    create: (data: any) =>
      ipcRenderer.invoke('product:create', data),
    update: (id: string, data: any) =>
      ipcRenderer.invoke('product:update', id, data),
    delete: (id: string) =>
      ipcRenderer.invoke('product:delete', id),
    getLowStock: () =>
      ipcRenderer.invoke('product:getLowStock'),
    getStats: (id: string) =>
      ipcRenderer.invoke('product:getStats', id),
    getSales: (id: string, params?: any) =>
      ipcRenderer.invoke('product:getSales', id, params),
  },

  membershipPayment: {
    getByMember: (memberId: string) =>
      ipcRenderer.invoke('membershipPayment:getByMember', memberId),
    create: (data: any) =>
      ipcRenderer.invoke('membershipPayment:create', data),
    delete: (id: string) =>
      ipcRenderer.invoke('membershipPayment:delete', id),
  },

  points: {
    load: (data: any) =>
      ipcRenderer.invoke('points:load', data),
    getTransactions: (memberId: string, params?: any) =>
      ipcRenderer.invoke('points:getTransactions', memberId, params),
    adjust: (data: any) =>
      ipcRenderer.invoke('points:adjust', data),
  },

  stock: {
    addEntry: (data: any) =>
      ipcRenderer.invoke('stock:addEntry', data),
    addAdjustment: (data: any) =>
      ipcRenderer.invoke('stock:addAdjustment', data),
    getMovements: (params?: any) =>
      ipcRenderer.invoke('stock:getMovements', params),
    getByProduct: (productId: string, params?: any) =>
      ipcRenderer.invoke('stock:getByProduct', productId, params),
  },

  sale: {
    create: (data: any) =>
      ipcRenderer.invoke('sale:create', data),
    getAll: (params?: any) =>
      ipcRenderer.invoke('sale:getAll', params),
    getById: (id: string) =>
      ipcRenderer.invoke('sale:getById', id),
    refund: (id: string, userId: string) =>
      ipcRenderer.invoke('sale:refund', id, userId),
  },

  expense: {
    getAll: (params?: any) =>
      ipcRenderer.invoke('expense:getAll', params),
    create: (data: any) =>
      ipcRenderer.invoke('expense:create', data),
    update: (id: string, data: any) =>
      ipcRenderer.invoke('expense:update', id, data),
    delete: (id: string) =>
      ipcRenderer.invoke('expense:delete', id),
  },

  cashRegister: {
    open: (data: any) =>
      ipcRenderer.invoke('cashRegister:open', data),
    close: (id: string, data: any) =>
      ipcRenderer.invoke('cashRegister:close', id, data),
    getCurrent: () =>
      ipcRenderer.invoke('cashRegister:getCurrent'),
    getAll: (params?: any) =>
      ipcRenderer.invoke('cashRegister:getAll', params),
    getById: (id: string) =>
      ipcRenderer.invoke('cashRegister:getById', id),
  },

  setup: {
    isComplete: () =>
      ipcRenderer.invoke('setup:isComplete'),
    getStatus: () =>
      ipcRenderer.invoke('setup:getStatus'),
    initializeDatabase: () =>
      ipcRenderer.invoke('setup:initializeDatabase'),
    initializeEncryption: () =>
      ipcRenderer.invoke('setup:initializeEncryption'),
    setMasterPassword: (password: string, confirmPassword: string) =>
      ipcRenderer.invoke('setup:setMasterPassword', password, confirmPassword),
    unlock: (password: string) =>
      ipcRenderer.invoke('setup:unlock', password),
    isUnlocked: () =>
      ipcRenderer.invoke('setup:isUnlocked'),
    hasMasterPassword: () =>
      ipcRenderer.invoke('setup:hasMasterPassword'),
    createAdmin: (username: string, password: string, email?: string) =>
      ipcRenderer.invoke('setup:createAdmin', username, password, email),
    getCategories: () =>
      ipcRenderer.invoke('setup:getCategories'),
    complete: (clubName?: string) =>
      ipcRenderer.invoke('setup:complete', clubName),
    reset: () =>
      ipcRenderer.invoke('setup:reset'),
    relaunch: () =>
      ipcRenderer.invoke('setup:relaunch'),
  },

  settings: {
    getPointsRatio: () =>
      ipcRenderer.invoke('settings:getPointsRatio'),
    setPointsRatio: (ratio: number) =>
      ipcRenderer.invoke('settings:setPointsRatio', ratio),
  },

  backup: {
    createLocal: () =>
      ipcRenderer.invoke('backup:createLocal'),
    upload: (filePath: string, checksum: string, notes?: string) =>
      ipcRenderer.invoke('backup:upload', filePath, checksum, notes),
    createAndUpload: (notes?: string) =>
      ipcRenderer.invoke('backup:createAndUpload', notes),
    download: (backupId: number) =>
      ipcRenderer.invoke('backup:download', backupId),
    restore: (filePath: string) =>
      ipcRenderer.invoke('backup:restore', filePath),
    downloadAndRestore: (backupId: number) =>
      ipcRenderer.invoke('backup:downloadAndRestore', backupId),
    cloudLogin: (email: string, password: string) =>
      ipcRenderer.invoke('backup:cloudLogin', email, password),
    cloudRegister: (name: string, email: string, password: string, passwordConfirmation: string) =>
      ipcRenderer.invoke('backup:cloudRegister', name, email, password, passwordConfirmation),
    cloudLogout: () =>
      ipcRenderer.invoke('backup:cloudLogout'),
    cloudStatus: () =>
      ipcRenderer.invoke('backup:cloudStatus'),
    listCloud: () =>
      ipcRenderer.invoke('backup:listCloud'),
    deleteCloud: (backupId: number) =>
      ipcRenderer.invoke('backup:deleteCloud', backupId),
    setAutoBackup: (mode: 'off' | 'daily' | 'weekly') =>
      ipcRenderer.invoke('backup:setAutoBackup', mode),
    setBackupOnCashClose: (enabled: boolean) =>
      ipcRenderer.invoke('backup:setBackupOnCashClose', enabled),
  },
}

contextBridge.exposeInMainWorld('api', api)

export type ElectronAPI = typeof api
