import { useEffect, useState } from 'react'
import api from '../api/cliente'
import { useToast } from '../context/ToastContext'

export default function TodasBoletas() {
  const toast = useToast()

  // Datos
  const [boletas, setBoletas] = useState([])
  const [meta, setMeta] = useState({
    total: 0,
    pagina: 1,
    por_pagina: 20,
    total_paginas: 1,
  })

  // UI
  const [cargando, setCargando] = useState(true)

  // Filtros del formulario
  const [formCliente, setFormCliente] = useState('')
  const [formDesde, setFormDesde] = useState('')
  const [formHasta, setFormHasta] = useState('')

  // Filtros aplicados (los que se envían al backend)
  const [filtros, setFiltros] = useState({ cliente: '', desde: '', hasta: '' })

  // Página actual
  const [pagina, setPagina] = useState(1)

  async function cargar(paginaActual = pagina, filtrosActivos = filtros) {
    setCargando(true)
    try {
      const params = {
        pagina: paginaActual,
        por_pagina: 20,
      }
      if (filtrosActivos.cliente) params.cliente = filtrosActivos.cliente
      if (filtrosActivos.desde) params.desde = filtrosActivos.desde
      if (filtrosActivos.hasta) params.hasta = filtrosActivos.hasta

      const { data } = await api.get('/boletas', { params })

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
      toast.error(err.response?.data?.detail || 'No se pudieron cargar las boletas')
      setBoletas([])
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    cargar(1, { cliente: '', desde: '', hasta: '' })
  }, [])

  function aplicarFiltros(e) {
    e.preventDefault()
    if (formDesde && formHasta && formDesde > formHasta) {
      toast.error('La fecha "desde" no puede ser mayor que "hasta"')
      return
    }
    const nuevos = { cliente: formCliente, desde: formDesde, hasta: formHasta }
    setFiltros(nuevos)
    setPagina(1)
    cargar(1, nuevos)
  }

  function limpiarFiltros() {
    setFormCliente('')
    setFormDesde('')
    setFormHasta('')
    const vacios = { cliente: '', desde: '', hasta: '' }
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

  async function eliminar(id) {
    if (!confirm('¿Eliminar esta boleta?')) return
    try {
      await api.delete(`/boletas/${id}`)
      toast.success('Boleta eliminada')
      // Recargar la página actual (por si quedó vacía, retroceder)
      const nuevaPagina = boletas.length === 1 && pagina > 1 ? pagina - 1 : pagina
      setPagina(nuevaPagina)
      cargar(nuevaPagina)
    } catch (err) {
      toast.error(err.response?.data?.detail || 'No se pudo eliminar la boleta')
    }
  }

  const hayFiltros = filtros.cliente || filtros.desde || filtros.hasta
  const rangoDesde = meta.total === 0 ? 0 : (meta.pagina - 1) * meta.por_pagina + 1
  const rangoHasta = Math.min(meta.pagina * meta.por_pagina, meta.total)

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Todas las boletas</h1>
          <p className="page-subtitle">
            {meta.total} registro{meta.total !== 1 ? 's' : ''}
            {hayFiltros && ' (filtrado)'}
          </p>
        </div>
      </div>

      <form onSubmit={aplicarFiltros} className="filtros-bar">
        <div className="filtros-campo">
          <label htmlFor="cliente">Cliente</label>
          <input
            id="cliente"
            type="text"
            className="input"
            placeholder="Buscar por nombre..."
            value={formCliente}
            onChange={(e) => setFormCliente(e.target.value)}
          />
        </div>

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
      ) : boletas.length === 0 ? (
        <div className="tabla-wrap">
          <div className="tabla-empty">
            {hayFiltros ? 'No hay boletas que coincidan con los filtros' : 'No hay boletas registradas'}
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
                  <th>Total</th>
                  <th>Estado</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {boletas.map((b) => (
                  <tr key={b.id}>
                    <td><strong>{b.numero_boleta}</strong></td>
                    <td>{b.fecha}</td>
                    <td>{b.cliente}</td>
                    <td>{b.producto}</td>
                    <td>${Number(b.total).toFixed(2)}</td>
                    <td>
                      <span className={`badge ${
                        b.estado === 'confirmada' ? 'badge-success' :
                        b.estado === 'pendiente' ? 'badge-warning' : 'badge-danger'
                      }`}>
                        {b.estado}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => eliminar(b.id)}>
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Paginación */}
          <div className="paginacion">
            <div className="paginacion-info">
              Mostrando <strong>{rangoDesde}–{rangoHasta}</strong> de <strong>{meta.total}</strong>
            </div>

            <div className="paginacion-controles">
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => irPagina(1)}
                disabled={meta.pagina === 1 || cargando}
                title="Primera página"
              >
                «
              </button>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => irPagina(meta.pagina - 1)}
                disabled={meta.pagina === 1 || cargando}
              >
                Anterior
              </button>

              <span className="paginacion-pagina">
                Página <strong>{meta.pagina}</strong> de <strong>{meta.total_paginas}</strong>
              </span>

              <button
                className="btn btn-secondary btn-sm"
                onClick={() => irPagina(meta.pagina + 1)}
                disabled={meta.pagina >= meta.total_paginas || cargando}
              >
                Siguiente
              </button>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => irPagina(meta.total_paginas)}
                disabled={meta.pagina >= meta.total_paginas || cargando}
                title="Última página"
              >
                »
              </button>
            </div>
          </div>
        </>
      )}
    </>
  )
}