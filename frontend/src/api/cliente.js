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
    const status = error.response?.status
    const esAuthMe = error.config?.url?.includes('/auth/me')

    // 401: cerrar sesión (excepto /auth/me que puede pasar al arrancar sin sesión)
    if (status === 401 && !esAuthMe) {
      await supabase.auth.signOut()
      window.location.href = '/login'
    }

    // 429: personalizar mensaje para el toast
    if (status === 429) {
      error.message =
        error.response?.data?.detail ||
        'Demasiadas peticiones. Espera unos segundos e inténtalo de nuevo.'
    }

    return Promise.reject(error)
  }
)

export default api