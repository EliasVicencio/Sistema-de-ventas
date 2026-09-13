import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import api from '../api/cliente'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null)
  const [permisos, setPermisos] = useState([])
  const [rol, setRol] = useState(null)
  const [cargando, setCargando] = useState(true)

  async function cargarPerfil() {
    try {
      const { data } = await api.get('/auth/me')
      setUsuario({ id: data.user_id, email: data.email })
      setRol(data.role)
      setPermisos(data.permisos || [])
    } catch (err) {
      console.error('Error en /auth/me:', err.response?.status, err.response?.data)
      setUsuario(null)
      setPermisos([])
      setRol(null)
    }
  }

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        await cargarPerfil()
      }
      setCargando(false)
    }
    init()

    const { data: sub } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        await cargarPerfil()
      } else if (event === 'SIGNED_OUT') {
        setUsuario(null)
        setPermisos([])
        setRol(null)
      }
    })

    return () => sub.subscription.unsubscribe()
  }, [])

  async function login(email, password) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw new Error(error.message)
    await cargarPerfil()
  }

  async function logout() {
    await supabase.auth.signOut()
    setUsuario(null)
    setPermisos([])
    setRol(null)
  }

  return (
    <AuthContext.Provider value={{ usuario, permisos, rol, cargando, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}