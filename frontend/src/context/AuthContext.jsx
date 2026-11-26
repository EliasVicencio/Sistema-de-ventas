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
    let activo = true

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        // Ejecutar fuera del callback de Supabase
        Promise.resolve().then(() => cargarPerfil())
      } else if (event === 'SIGNED_OUT') {
        setUsuario(null)
        setPermisos([])
        setRol(null)
      }
    })

    async function init() {
      try {
        const { data: { session } } = await supabase.auth.getSession()

        // Si existe una sesión anterior, cerrarla solo en este dispositivo
        if (session) {
          await supabase.auth.signOut({ scope: 'local' })
        }
      } catch (err) {
        console.error('Error al inicializar autenticación:', err)
      } finally {
        if (activo) {
          setCargando(false)
        }
      }
    }

    init()

    return () => {
      activo = false
      sub.subscription.unsubscribe()
    }
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