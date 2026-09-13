import { useState } from 'react'
import api from '../api/cliente'

export default function Reportes() {
  const [mes, setMes] = useState(new Date().toISOString().slice(0, 7))
  const [reporte, setReporte] = useState(null)
  const [cargando, setCargando] = useState(false)

  async function generar() {
    setCargando(true)
    try {
      const { data } = await api.get('/reportes/mensual', { params: { mes } })
      setReporte(data)
    } finally {
      setCargando(false)
    }
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Reporte mensual</h1>
          <p className="page-subtitle">Consulta las ventas de un mes</p>
        </div>
      </div>

      <div className="reporte-mes-picker">
        <input
          type="month"
          className="input"
          style={{ maxWidth: 200 }}
          value={mes}
          onChange={(e) => setMes(e.target.value)}
        />
        <button className="btn btn-primary" onClick={generar} disabled={cargando}>
          {cargando ? 'Generando...' : 'Generar reporte'}
        </button>
      </div>

      {reporte && (
        <>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-label">Total vendido</div>
              <div className="stat-value">${Number(reporte.total_vendido).toFixed(2)}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Boletas</div>
              <div className="stat-value">{reporte.cantidad_boletas}</div>
            </div>
            {reporte.producto_mas_vendido && (
              <div className="stat-card">
                <div className="stat-label">Producto top</div>
                <div className="stat-value" style={{ fontSize: 18 }}>
                  {reporte.producto_mas_vendido.producto}
                </div>
                <div className="stat-hint">
                  {reporte.producto_mas_vendido.total_vendido} unidades
                </div>
              </div>
            )}
          </div>

          <div className="card">
            <div className="card-title">Ventas por día</div>
            <table className="tabla">
              <thead>
                <tr><th>Fecha</th><th>Total</th></tr>
              </thead>
              <tbody>
                {reporte.ventas_por_dia.map((d) => (
                  <tr key={d.fecha}>
                    <td>{d.fecha}</td>
                    <td>${Number(d.total).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  )
}