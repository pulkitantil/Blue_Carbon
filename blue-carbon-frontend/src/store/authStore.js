import { create } from 'zustand'
import { authAPI } from '../services/api'

export const useAuthStore = create((set, get) => ({
  user:    null,
  token:   localStorage.getItem('bcr_token'),
  loading: false,

  login: async (email, password) => {
    set({ loading: true })
    const res = await authAPI.login({ email, password })
    localStorage.setItem('bcr_token', res.token)
    set({ user: res.user, token: res.token, loading: false })
    return res.user
  },

  register: async (data) => {
    set({ loading: true })
    const res = await authAPI.register(data)
    localStorage.setItem('bcr_token', res.token)
    set({ user: res.user, token: res.token, loading: false })
    return res.user
  },

  logout: () => {
    localStorage.removeItem('bcr_token')
    set({ user: null, token: null })
  },

  fetchMe: async () => {
    if (!get().token) return
    try {
      const res = await authAPI.me()
      set({ user: res.user })
    } catch {
      localStorage.removeItem('bcr_token')
      set({ user: null, token: null })
    }
  },

  isAuthenticated: () => !!get().token,
  isVerifier: ()      => ['verifier','auditor','admin'].includes(get().user?.role),
  isAdmin: ()         => get().user?.role === 'admin',
}))
