import { useEffect, useState } from 'react'
import api from '../api/cliente'
import { useToast } from '../context/ToastContext'

export default function Auditoria() {
  const toast = useToast()
  const [registros, setRegistros] = useState([])
  const [meta, setMeta] = useState({ total: 0, pagina: 1, por_pagina: 20, total_paginas: 1 })
  const [cargando, setCargando] = useState(true)
  const [exportando, setExportando] = useState(false)

  const [formDesde, setFormDesde] = useState('')
  const [formHasta, setFormHasta] = useState('')
  const [filtros, setFiltros] = useState({ desde: '', hasta: '' })
  const [pagina, setPagina] = useState(1)

  async function cargar(paginaActual = 1, filtrosActivos = filtros) {
    setCargando(true)
    try {
      const params = { pagina: paginaActual, por_pagina: 20 }
      if (filtrosActivos.desde) params.desde = filtrosActivos.desde
      if (filtrosActivos.hasta) params.hasta = filtrosActivos.hasta

      const { data } = await api.get('/admin/auditoria', { params })

      if (data && Array.isArray(data.items)) {
        setRegistros(data.items)
        setMeta({
          total: data.total,
          pagina: data.pagina,
          por_pagina: data.por_pagina,
          total_paginas: data.total_paginas,
        })
      } else {
        toast.error('Respuesta inesperada del servidor')
        setRegistros([])
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || 'No se pudo cargar la auditoría')
      setRegistros([])
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    cargar(1, { desde: '', hasta: '' })
  }, [])

  function aplicarFiltros(e) {
    e.preventDefault()
    if (formDesde && formHasta && formDesde > formHasta) {
      toast.error('La fecha "desde" no puede ser mayor que "hasta"')
      return
    }
    const nuevos = { desde: formDesde, hasta: formHasta }
    setFiltros(nuevos)
    setPagina(1)
    cargar(1, nuevos)
  }

  function limpiarFiltros() {
    setFormDesde('')
    setFormHasta('')
    const vacios = { desde: '', hasta: '' }
    setFiltros(vacios)
    setPagina(1)
    cargar(1, vacios)
  }

  function irPagina(nueva) {
    if (nueva < 1 || nueva > meta.total_paginas) return
    setPagina(nueva)
    cargar(nueva)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function exportarCSV() {
    setExportando(true)
    try {
      const params = {}
      if (filtros.desde) params.desde = filtros.desde
      if (filtros.hasta) params.hasta = filtros.hasta

      const response = await api.get('/admin/auditoria/export', {
        params,
        responseType: 'blob',
      })

      const cd = response.headers['content-disposition']
      let nombre = 'auditoria.csv'
      if (cd) {
        const match = cd.match(/filename="?([^"]+)"?/)
        if (match) nombre = match[1]
      }

      const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = nombre
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
      toast.success(`Exportación lista: ${nombre}`)
    } catch (err) {
      toast.error('No se pudo exportar la auditoría')
    } finally {
      setExportando(false)
    }
  }

  const hayFiltros = filtros.desde || filtros.hasta
  const rangoDesde = meta.total === 0 ? 0 : (meta.pagina - 1) * meta.por_pagina + 1
  const rangoHasta = Math.min(meta.pagina * meta.por_pagina, meta.total)

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Auditoría</h1>
          <p className="page-subtitle">
            {meta.total} evento{meta.total !== 1 ? 's' : ''}
            {hayFiltros && ' (filtrado)'}
          </p>
        </div>

        <button
          onClick={exportarCSV}
          className="btn btn-secondary"
          disabled={exportando || meta.total === 0}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          {exportando ? 'Exportando...' : 'Exportar CSV'}
        </button>
      </div>

      <form onSubmit={aplicarFiltros} className="filtros-bar">
        <div className="filtros-campo">
          <label htmlFor="desde">Desde</label>
          <input
            id="desde"
            type="date"
            className="input"
            value={formDesde}
            onChange={(e) => setFormDesde(e.target.value)}
            max={formHasta || undefined}
          />
        </div>
        <div className="filtros-campo">
          <label htmlFor="hasta">Hasta</label>
          <input
            id="hasta"
            type="date"
            className="input"
            value={formHasta}
            onChange={(e) => setFormHasta(e.target.value)}
            min={formDesde || undefined}
          />
        </div>
        <div className="filtros-acciones">
          <button type="submit" className="btn btn-primary" disabled={cargando}>
            {cargando ? 'Filtrando...' : 'Aplicar'}
          </button>
          {hayFiltros && (
            <button type="button" className="btn btn-ghost" onClick={limpiarFiltros}>
              Limpiar
            </button>
          )}
        </div>
      </form>

      {cargando ? (
        <div className="loading"><span className="spinner" /> Cargando...</div>
      ) : registros.length === 0 ? (
        <div className="tabla-wrap">
          <div className="tabla-empty">
            {hayFiltros ? 'No hay eventos en ese rango' : 'No hay eventos registrados'}
          </div>
        </div>
      ) : (
        <>
          <div className="tabla-wrap">
            <table className="tabla">
              <thead>
                <tr><th>Fecha</th><th>Usuario</th><th>Acción</th><th>Detalle</th></tr>
              </thead>
              <tbody>
                {registros.map((r) => (
                  <tr key={r.id}>
                    <td>{new Date(r.fecha).toLocaleString()}</td>
                    <td>{r.usuario_email || r.usuario_id?.slice(0, 8) + '…'}</td>
                    <td><span className="badge badge-warning">{r.accion}</span></td>
                    <td>
                      <span className="code-cell">{JSON.stringify(r.detalle)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="paginacion">
            <div className="paginacion-info">
              Mostrando <strong>{rangoDesde}–{rangoHasta}</strong> de <strong>{meta.total}</strong>
            </div>
            <div className="paginacion-controles">
              <button className="btn btn-secondary btn-sm" onClick={() => irPagina(1)}
                disabled={meta.pagina === 1 || cargando}>«</button>
              <button className="btn btn-secondary btn-sm" onClick={() => irPagina(meta.pagina - 1)}
                disabled={meta.pagina === 1 || cargando}>Anterior</button>
              <span className="paginacion-pagina">
                Página <strong>{meta.pagina}</strong> de <strong>{meta.total_paginas}</strong>
              </span>
              <button className="btn btn-secondary btn-sm" onClick={() => irPagina(meta.pagina + 1)}
                disabled={meta.pagina >= meta.total_paginas || cargando}>Siguiente</button>
              <button className="btn btn-secondary btn-sm" onClick={() => irPagina(meta.total_paginas)}
                disabled={meta.pagina >= meta.total_paginas || cargando}>»</button>
            </div>
          </div>
        </>
      )}
    </>
  )
}