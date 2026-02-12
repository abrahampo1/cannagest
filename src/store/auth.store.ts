import { create } from 'zustand'

interface User {
  id: string
  username: string
  email?: string | null
  role: string
  isActive: boolean
  nfcTagId?: string | null
}

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  login: (username: string, password: string) => Promise<void>
  loginByNfc: (nfcTagId: string) => Promise<void>
  logout: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,

  login: async (username, password) => {
    const response = await window.api.auth.login(username, password)
    if (!response.success) {
      throw new Error(response.error || 'Error al iniciar sesion')
    }
    set({ user: response.data as User, isAuthenticated: true })
  },

  loginByNfc: async (nfcTagId) => {
    const response = await window.api.auth.loginByNfc(nfcTagId)
    if (!response.success) {
      throw new Error(response.error || 'Llavero no registrado')
    }
    set({ user: response.data as User, isAuthenticated: true })
  },

  logout: () => {
    set({ user: null, isAuthenticated: false })
  },
}))
