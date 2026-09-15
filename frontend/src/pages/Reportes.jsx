import { useState, useEffect } from 'react'
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts'
import api from '../api/cliente'
import { useToast } from '../context/ToastContext'
import { useTheme } from '../context/ThemeContext'

const COLORES = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#64748b']

export default function Reportes() {
  const toast = useToast()
  const { tema } = useTheme()
  const [mes, setMes] = useState(new Date().toISOString().slice(0, 7))
  const [reporte, setReporte] = useState(null)
  const [graficos, setGraficos] = useState(null)
  const [cargando, setCargando] = useState(false)

  // Colores que dependen del tema
  const colorTexto = tema === 'dark' ? '#e2e8f0' : '#0f172a'
  const colorGrilla = tema === 'dark' ? '#1e293b' : '#e2e8f0'
  const colorTooltipBg = tema === 'dark' ? '#111a2e' : '#ffffff'
  const colorTooltipBorder = tema === 'dark' ? '#334155' : '#e2e8f0'

  useEffect(() => {
    api.get('/reportes/graficos')
      .then(({ data }) => setGraficos(data))
      .catch((err) => {
        console.error(err)
        toast.error('No se pudieron cargar los gráficos')
      })
  }, [])

  async function generar() {
    setCargando(true)
    try {
      const { data } = await api.get('/reportes/mensual', { params: { mes } })
      setReporte(data)
      toast.success('Reporte generado')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'No se pudo generar el reporte')
    } finally {
      setCargando(false)
    }
  }

  const tooltipStyle = {
    backgroundColor: colorTooltipBg,
    border: `1px solid ${colorTooltipBorder}`,
    borderRadius: 8,
    color: colorTexto,
  }

  // Formatear mes "2026-09" → "Sep 26"
  function formatearMes(m) {
    if (!m) return ''
    const [año, mes] = m.split('-')
    const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
      'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
    return `${meses[parseInt(mes, 10) - 1]} ${año.slice(2)}`
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Reportes</h1>
          <p className="page-subtitle">Analítica de ventas y comparativas</p>
        </div>
      </div>

      {/* ============ GRÁFICOS ============ */}
      {graficos && (
        <div className="graficos-grid">
          {/* TORTA: distribución por producto del mes actual */}
          <div className="card">
            <div className="card-title">
              Distribución por producto
              <span className="card-title-hint">{formatearMes(graficos.mes_actual)}</span>
            </div>
            {graficos.distribucion_productos.length === 0 ? (
              <div className="grafico-empty">Sin datos este mes</div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={graficos.distribucion_productos}
                    dataKey="total"
                    nameKey="producto"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    innerRadius={50}
                    paddingAngle={2}
                  >
                    {graficos.distribucion_productos.map((_, i) => (
                      <Cell key={i} fill={COLORES[i % COLORES.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={tooltipStyle}
                    cursor={{ fill: 'rgba(37, 99, 235, 0.1)' }}
                    formatter={(value) => [`$${Number(value).toFixed(2)}`, 'Vendido']}
                    labelFormatter={(label) => label}
                  />
                  <Legend
                    wrapperStyle={{ color: colorTexto, fontSize: 13 }}
                    iconType="circle"
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* BARRAS: ventas por mes (últimos 6 meses) */}
          <div className="card">
            <div className="card-title">
              Ventas por mes
              <span className="card-title-hint">Últimos 6 meses</span>
            </div>
            {graficos.ventas_por_mes.length === 0 ? (
              <div className="grafico-empty">Sin datos históricos</div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart
                  data={graficos.ventas_por_mes.map((v) => ({
                    ...v,
                    mesLabel: formatearMes(v.mes),
                  }))}
                  margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={colorGrilla} vertical={false} />
                  <XAxis
                    dataKey="mesLabel"
                    stroke={colorTexto}
                    tick={{ fill: colorTexto, fontSize: 12 }}
                    axisLine={{ stroke: colorGrilla }}
                  />
                  <YAxis
                    stroke={colorTexto}
                    tick={{ fill: colorTexto, fontSize: 12 }}
                    axisLine={{ stroke: colorGrilla }}
                    tickFormatter={(v) => `$${v}`}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    cursor={{ fill: 'rgba(37, 99, 235, 0.1)' }}
                    formatter={(value) => [`$${Number(value).toFixed(2)}`, 'Vendido']}
                  />
                  <Bar dataKey="total" fill="#2563eb" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      )}

      {/* ============ REPORTE MENSUAL DETALLADO ============ */}
      <div className="card" style={{ marginTop: 20 }}>
        <div className="card-title">Detalle mensual</div>

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

            <div className="tabla-wrap" style={{ marginTop: 16 }}>
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
      </div>
    </>
  )
}