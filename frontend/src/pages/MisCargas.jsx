import { useEffect, useState } from 'react'
import api from '../api/cliente'
import { useToast } from '../context/ToastContext'

export default function MisCargas() {
  const toast = useToast()
  const [boletas, setBoletas] = useState([])
  const [meta, setMeta] = useState({ total: 0, pagina: 1, por_pagina: 20, total_paginas: 1 })
  const [cargando, setCargando] = useState(true)

  const [formCliente, setFormCliente] = useState('')
  const [filtroCliente, setFiltroCliente] = useState('')
  const [pagina, setPagina] = useState(1)

  async function cargar(paginaActual = 1, clienteActivo = '') {
    setCargando(true)
    try {
      const params = { pagina: paginaActual, por_pagina: 20 }
      if (clienteActivo) params.cliente = clienteActivo

      const { data } = await api.get('/boletas/mias', { params })

      if (data && Array.isArray(data.items)) {
        setBoletas(data.items)
        setMeta({
          total: data.total,
          pagina: data.pagina,
          por_pagina: data.por_pagina,
          total_paginas: data.total_paginas,
        })
      } else {
        toast.error('Respuesta inesperada del servidor')
        setBoletas([])
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || 'No se pudieron cargar tus boletas')
      setBoletas([])
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    cargar(1, '')
  }, [])

  function aplicarFiltro(e) {
    e.preventDefault()
    setFiltroCliente(formCliente)
    setPagina(1)
    cargar(1, formCliente)
  }

  function limpiarFiltro() {
    setFormCliente('')
    setFiltroCliente('')
    setPagina(1)
    cargar(1, '')
  }

  function irPagina(nueva) {
    if (nueva < 1 || nueva > meta.total_paginas) return
    setPagina(nueva)
    cargar(nueva, filtroCliente)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const rangoDesde = meta.total === 0 ? 0 : (meta.pagina - 1) * meta.por_pagina + 1
  const rangoHasta = Math.min(meta.pagina * meta.por_pagina, meta.total)

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Mis cargas</h1>
          <p className="page-subtitle">
            {meta.total} boleta{meta.total !== 1 ? 's' : ''}
            {filtroCliente && ' (filtrado)'}
          </p>
        </div>
      </div>

      <form onSubmit={aplicarFiltro} className="filtros-bar">
        <div className="filtros-campo" style={{ flex: 1, minWidth: 240 }}>
          <label htmlFor="cliente">Buscar cliente</label>
          <input
            id="cliente"
            type="text"
            className="input"
            placeholder="Nombre del cliente..."
            value={formCliente}
            onChange={(e) => setFormCliente(e.target.value)}
          />
        </div>
        <div className="filtros-acciones">
          <button type="submit" className="btn btn-primary" disabled={cargando}>
            {cargando ? 'Buscando...' : 'Buscar'}
          </button>
          {filtroCliente && (
            <button type="button" className="btn btn-ghost" onClick={limpiarFiltro}>
              Limpiar
            </button>
          )}
        </div>
      </form>

      {cargando ? (
        <div className="loading"><span className="spinner" /> Cargando...</div>
      ) : boletas.length === 0 ? (
        <div className="tabla-wrap">
          <div className="tabla-empty">
            {filtroCliente
              ? 'No hay boletas que coincidan con la búsqueda'
              : 'Todavía no has subido boletas'}
          </div>
        </div>
      ) : (
        <>
          <div className="tabla-wrap">
            <table className="tabla">
              <thead>
                <tr>
                  <th>N° boleta</th>
                  <th>Fecha</th>
                  <th>Cliente</th>
                  <th>Producto</th>
                  <th>Cant.</th>
                  <th>Total</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {boletas.map((b) => (
                  <tr key={b.id}>
                    <td><strong>{b.numero_boleta}</strong></td>
                    <td>{b.fecha}</td>
                    <td>{b.cliente}</td>
                    <td>{b.producto}</td>
                    <td>{b.cantidad}</td>
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