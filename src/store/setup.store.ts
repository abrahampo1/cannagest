import { create } from 'zustand'

interface SetupState {
  isSetupComplete: boolean | null
  isUnlocked: boolean | null
  hasMasterPassword: boolean | null
  checkSetupStatus: () => Promise<void>
  checkUnlockStatus: () => Promise<void>
  checkMasterPassword: () => Promise<void>
  setUnlocked: (value: boolean) => void
}

export const useSetupStore = create<SetupState>((set) => ({
  isSetupComplete: null,
  isUnlocked: null,
  hasMasterPassword: null,

  checkSetupStatus: async () => {
    try {
      const response = await window.api.setup.isComplete()
      if (response.success) {
        set({ isSetupComplete: response.data as boolean })
      } else {
        set({ isSetupComplete: false })
      }
    } catch {
      set({ isSetupComplete: false })
    }
  },

  checkUnlockStatus: async () => {
    try {
      const response = await window.api.setup.isUnlocked()
      if (response.success) {
        set({ isUnlocked: response.data as boolean })
      } else {
        set({ isUnlocked: false })
      }
    } catch {
      set({ isUnlocked: false })
    }
  },

  checkMasterPassword: async () => {
    try {
      const response = await window.api.setup.hasMasterPassword()
      if (response.success) {
        set({ hasMasterPassword: response.data as boolean })
      } else {
        set({ hasMasterPassword: false })
      }
    } catch {
      set({ hasMasterPassword: false })
    }
  },

  setUnlocked: (value: boolean) => {
    set({ isUnlocked: value })
  },
}))
