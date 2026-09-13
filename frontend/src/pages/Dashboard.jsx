import { useAuth } from '../context/AuthContext'

export default function Dashboard() {
  const { usuario, rol, permisos } = useAuth()

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Resumen de tu cuenta y permisos</p>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Usuario</div>
          <div className="stat-value" style={{ fontSize: 18, wordBreak: 'break-all' }}>
            {usuario?.email}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Rol</div>
          <div className="stat-value" style={{ textTransform: 'capitalize' }}>{rol}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Permisos</div>
          <div className="stat-value">{permisos.length}</div>
          <div className="stat-hint">Asignados a tu rol</div>
        </div>
      </div>

      <div className="card">
        <div className="card-title">Tus permisos</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {permisos.length === 0 && (
            <p style={{ color: 'var(--text-muted)' }}>Sin permisos asignados</p>
          )}
          {permisos.map((p) => (
            <span key={p} className="badge badge-info">{p}</span>
          ))}
        </div>
      </div>
    </>
  )
}