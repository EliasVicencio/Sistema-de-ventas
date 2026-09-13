import { Navigate } from 'react-router-dom'
import { usePermiso } from '../hooks/usePermiso'

export default function RutaPermiso({ permiso, children }) {
  const tiene = usePermiso(permiso)

  if (!tiene) return <Navigate to="/" replace />

  return children
}