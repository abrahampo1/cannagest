import { create } from 'zustand'
import { call } from '@/services/api'

interface CloudBackup {
  id: number
  original_name: string
  size: number
  checksum: string
  notes: string | null
  backup_date: string | null
  created_at: string
}

interface CloudStatus {
  loggedIn: boolean
  email: string | null
  userName: string | null
  subscriptionActive: boolean
  subscriptionDetails?: any
  autoBackup: 'off' | 'daily' | 'weekly'
  lastAutoBackup: string | null
  backupOnCashClose: boolean
}

interface CloudState {
  status: CloudStatus | null
  backups: CloudBackup[]
  maxBackups: number
  loading: boolean
  actionLoading: boolean
  error: string | null

  fetchStatus: () => Promise<void>
  fetchBackups: () => Promise<void>
  cloudLogin: (email: string, password: string) => Promise<void>
  cloudRegister: (name: string, email: string, password: string, passwordConfirmation: string) => Promise<void>
  cloudLogout: () => Promise<void>
  createAndUpload: (notes?: string) => Promise<void>
  downloadAndRestore: (backupId: number) => Promise<void>
  deleteBackup: (backupId: number) => Promise<void>
  setAutoBackup: (mode: 'off' | 'daily' | 'weekly') => Promise<void>
  setBackupOnCashClose: (enabled: boolean) => Promise<void>
}

export const useCloudStore = create<CloudState>((set, get) => ({
  status: null,
  backups: [],
  maxBackups: 10,
  loading: false,
  actionLoading: false,
  error: null,

  fetchStatus: async () => {
    try {
      set({ loading: true, error: null })
      const status = await call<CloudStatus>(window.api.backup.cloudStatus())
      set({ status, loading: false })
    } catch (error) {
      set({ loading: false, error: error instanceof Error ? error.message : 'Error' })
    }
  },

  fetchBackups: async () => {
    try {
      set({ loading: true, error: null })
      const result = await call<{ backups: CloudBackup[]; count: number; max_backups: number }>(
        window.api.backup.listCloud()
      )
      set({ backups: result.backups, maxBackups: result.max_backups, loading: false })
    } catch (error) {
      set({ loading: false, error: error instanceof Error ? error.message : 'Error' })
    }
  },

  cloudLogin: async (email, password) => {
    try {
      set({ actionLoading: true, error: null })
      await call(window.api.backup.cloudLogin(email, password))
      await get().fetchStatus()
      set({ actionLoading: false })
    } catch (error) {
      set({ actionLoading: false, error: error instanceof Error ? error.message : 'Error' })
      throw error
    }
  },

  cloudRegister: async (name, email, password, passwordConfirmation) => {
    try {
      set({ actionLoading: true, error: null })
      await call(window.api.backup.cloudRegister(name, email, password, passwordConfirmation))
      await get().fetchStatus()
      set({ actionLoading: false })
    } catch (error) {
      set({ actionLoading: false, error: error instanceof Error ? error.message : 'Error' })
      throw error
    }
  },

  cloudLogout: async () => {
    try {
      set({ actionLoading: true, error: null })
      await call(window.api.backup.cloudLogout())
      set({ status: null, backups: [], actionLoading: false })
      await get().fetchStatus()
    } catch (error) {
      set({ actionLoading: false, error: error instanceof Error ? error.message : 'Error' })
    }
  },

  createAndUpload: async (notes) => {
    try {
      set({ actionLoading: true, error: null })
      await call(window.api.backup.createAndUpload(notes))
      await get().fetchBackups()
      set({ actionLoading: false })
    } catch (error) {
      set({ actionLoading: false, error: error instanceof Error ? error.message : 'Error' })
      throw error
    }
  },

  downloadAndRestore: async (backupId) => {
    try {
      set({ actionLoading: true, error: null })
      await call(window.api.backup.downloadAndRestore(backupId))
      set({ actionLoading: false })
    } catch (error) {
      set({ actionLoading: false, error: error instanceof Error ? error.message : 'Error' })
      throw error
    }
  },

  deleteBackup: async (backupId) => {
    try {
      set({ actionLoading: true, error: null })
      await call(window.api.backup.deleteCloud(backupId))
      await get().fetchBackups()
      set({ actionLoading: false })
    } catch (error) {
      set({ actionLoading: false, error: error instanceof Error ? error.message : 'Error' })
      throw error
    }
  },

  setAutoBackup: async (mode) => {
    try {
      await call(window.api.backup.setAutoBackup(mode))
      await get().fetchStatus()
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Error' })
    }
  },

  setBackupOnCashClose: async (enabled) => {
    try {
      await call(window.api.backup.setBackupOnCashClose(enabled))
      await get().fetchStatus()
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Error' })
    }
  },
}))
