import { create } from 'zustand'
import { authApi } from '../api/client'

const stored = () => {
  try {
    return JSON.parse(localStorage.getItem('ct_user'))
  } catch {
    return null
  }
}

export const useAuthStore = create((set, get) => ({
  user: stored(),
  token: localStorage.getItem('ct_token'),
  loading: false,

  setAuth: (token, user) => {
    localStorage.setItem('ct_token', token)
    localStorage.setItem('ct_user', JSON.stringify(user))
    set({ token, user })
  },

  logout: () => {
    localStorage.removeItem('ct_token')
    localStorage.removeItem('ct_user')
    set({ token: null, user: null })
  },

  register: async (data) => {
    set({ loading: true })
    try {
      const res = await authApi.register(data)
      get().setAuth(res.data.access_token, res.data.user)
      return { ok: true }
    } catch (err) {
      return { ok: false, error: err.response?.data?.detail || 'Registration failed' }
    } finally {
      set({ loading: false })
    }
  },

  login: async (data) => {
    set({ loading: true })
    try {
      const res = await authApi.login(data)
      get().setAuth(res.data.access_token, res.data.user)
      return { ok: true }
    } catch (err) {
      return { ok: false, error: err.response?.data?.detail || 'Login failed' }
    } finally {
      set({ loading: false })
    }
  },

  refreshMe: async () => {
    try {
      const res = await authApi.me()
      localStorage.setItem('ct_user', JSON.stringify(res.data))
      set({ user: res.data })
    } catch { /* token expired — interceptor handles redirect */ }
  },
}))