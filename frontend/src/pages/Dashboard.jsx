import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import api from '../api/cliente'

export default function Dashboard() {
  const { usuario, rol, permisos } = useAuth()
  const [resumen, setResumen] = useState(null)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    api.get('/reportes/resumen')
      .then(({ data }) => setResumen(data))
      .catch((err) => console.error('Error cargando resumen:', err))
      .finally(() => setCargando(false))
  }, [])

  const hoy = new Date().toLocaleDateString('es-CL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  const inicial = usuario?.email?.[0]?.toUpperCase() || '?'

  return (
    <>
      <div className="dashboard-hero">
        <div className="dashboard-hero-avatar">{inicial}</div>
        <div>
          <h1 className="dashboard-hero-title">Hola, {usuario?.email?.split('@')[0]}</h1>
          <p className="dashboard-hero-subtitle">
            <span className="dashboard-hero-rol">{rol}</span>
            <span className="dashboard-hero-sep">·</span>
            <span>{hoy}</span>
          </p>
        </div>
      </div>

      {cargando ? (
        <div className="loading"><span className="spinner" /> Cargando resumen...</div>
      ) : (
        <>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-label">Boletas este mes</div>
              <div className="stat-value">{resumen?.total_boletas ?? 0}</div>
              <div className="stat-hint">{resumen?.confirmadas ?? 0} confirmadas</div>
            </div>

            <div className="stat-card">
              <div className="stat-label">Total vendido</div>
              <div className="stat-value">
                ${Number(resumen?.total_vendido ?? 0).toFixed(2)}
              </div>
              <div className="stat-hint">Este mes</div>
            </div>

            <div className="stat-card">
              <div className="stat-label">Pendientes</div>
              <div className="stat-value" style={{ color: 'var(--warning)' }}>
                {resumen?.pendientes ?? 0}
              </div>
              <div className="stat-hint">Por confirmar</div>
            </div>

            <div className="stat-card">
              <div className="stat-label">Producto top</div>
              <div className="stat-value" style={{ fontSize: 18 }}>
                {resumen?.producto_mas_vendido?.producto || '—'}
              </div>
              <div className="stat-hint">
                {resumen?.producto_mas_vendido
                  ? `${resumen.producto_mas_vendido.unidades} unidades`
                  : 'Sin datos este mes'}
              </div>
            </div>
          </div>

          <div className="dashboard-grid">
            <div className="card">
              <div className="card-title">Últimas boletas</div>
              {resumen?.ultimas_boletas?.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
                  Aún no hay boletas cargadas
                </p>
              ) : (
                <div className="tabla-wrap" style={{ boxShadow: 'none', border: 'none' }}>
                  <table className="tabla">
                    <thead>
                      <tr>
                        <th>N°</th>
                        <th>Cliente</th>
                        <th>Total</th>
                        <th>Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {resumen?.ultimas_boletas?.map((b) => (
                        <tr key={b.id}>
                          <td><strong>{b.numero_boleta}</strong></td>
                          <td>{b.cliente}</td>
                          <td>${Number(b.total).toFixed(2)}</td>
                          <td>
                            <span className={`badge ${
                              b.estado === 'confirmada' ? 'badge-success' :
                              b.estado === 'pendiente' ? 'badge-warning' : 'badge-danger'
                            }`}>
                              {b.estado}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="card">
              <div className="card-title">Tus permisos</div>
              <div className="permisos-mini">
                {permisos.length === 0 && (
                  <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
                    Sin permisos asignados
                  </p>
                )}
                {permisos.map((p) => (
                  <span key={p} className="badge badge-info">{p}</span>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </>
  )
}