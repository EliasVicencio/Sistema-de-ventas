import axios from 'axios'
import { supabase } from '../lib/supabase'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
})

api.interceptors.request.use(async (config) => {
  const { data: { session } } = await supabase.auth.getSession()
  if (session?.access_token) {
    config.headers.Authorization = `Bearer ${session.access_token}`
  }
  return config
})

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    // No redirigir en /auth/me (puede ocurrir antes de tener sesión)
    const esAuthMe = error.config?.url?.includes('/auth/me')
    if (error.response?.status === 401 && !esAuthMe) {
      await supabase.auth.signOut()
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api