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
    } catch {
      setUsuario(null)
      setPermisos([])
      setRol(null)
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) {
        await cargarPerfil()
      }
      setCargando(false)
    })

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session) {
        await cargarPerfil()
      } else {
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