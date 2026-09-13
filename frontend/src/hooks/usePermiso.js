import { useAuth } from '../context/AuthContext'

export function usePermiso(permiso) {
  const { permisos } = useAuth()
  return permisos.includes(permiso)
}