import { useState } from 'react'
import api from '../api/cliente'
import { useToast } from '../context/ToastContext'

export default function SubirBoletas() {
  const toast = useToast()
  const [archivo, setArchivo] = useState(null)
  const [resultado, setResultado] = useState(null)
  const [cargando, setCargando] = useState(false)
  const [generandoDTE, setGenerandoDTE] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!archivo) return
    setCargando(true)
    setResultado(null)

    const formData = new FormData()
    formData.append('archivo', archivo)

    try {
      const { data } = await api.post('/boletas/subir', formData)
      setResultado(data)

      if (data.aceptadas.length > 0) {
        toast.success(`${data.aceptadas.length} boletas cargadas`)
      }
      if (data.rechazadas.length > 0) {
        toast.warning(`${data.rechazadas.length} filas rechazadas`)
      }
      if (data.aceptadas.length === 0 && data.rechazadas.length === 0) {
        toast.info('El CSV estaba vacío')
      }
    } catch (err) {
      const mensaje = err.response?.data?.detail || err.message
      toast.error(mensaje)
      setResultado({ error: mensaje })
    } finally {
      setCargando(false)
    }
  }

  function handleArchivo(e) {
    const file = e.target.files[0]
    if (file) setArchivo(file)
  }

  async function generarDTEPrueba() {
    setGenerandoDTE(true)
    try {
      const payload = {
        cliente_nombre: 'Cliente de Prueba SpA',
        cliente_rut: '12.345.678-9',
        items: [
          { nombre: 'Producto de prueba', cantidad: 2, precio_unitario: 5000 },
          { nombre: 'Otro producto', cantidad: 1, precio_unitario: 12000 },
        ],
      }

      const response = await api.post('/dte/emitir-prueba', payload, {
        responseType: 'blob',
      })

      const blob = new Blob([response.data], { type: 'application/pdf' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'factura_prueba.pdf'
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)

      toast.success('DTE de prueba generado')
    } catch (err) {
      toast.error('No se pudo generar el DTE de prueba')
    } finally {
      setGenerandoDTE(false)
    }
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Subir boletas</h1>
          <p className="page-subtitle">Carga el CSV del mes para procesarlo</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="upload-form">
        <label
          htmlFor="file-input"
          className={`upload-zone ${archivo ? 'has-file' : ''}`}
        >
          <input
            id="file-input"
            type="file"
            accept=".csv"
            onChange={handleArchivo}
            hidden
          />

          <svg
            className="upload-zone-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>

          <div className="upload-zone-title">
            {archivo ? archivo.name : 'Selecciona un archivo CSV'}
          </div>
          <div className="upload-zone-hint">
            {archivo ? 'Listo para subir' : 'Haz clic aquí o arrastra el archivo'}
          </div>
        </label>

        <button
          type="submit"
          className="btn btn-primary"
          disabled={!archivo || cargando}
        >
          {cargando ? 'Procesando...' : 'Subir y procesar'}
        </button>
      </form>

      {/* Sección de DTE de prueba */}
      <div className="card" style={{ marginTop: 24, maxWidth: 640 }}>
        <div className="card-title">Generar DTE de prueba</div>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 12 }}>
          Genera un PDF de factura electrónica con datos ficticios para probar el flujo.
        </p>
        <button
          className="btn btn-secondary"
          onClick={generarDTEPrueba}
          disabled={generandoDTE}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          {generandoDTE ? 'Generando...' : 'Generar DTE (PDF)'}
        </button>
      </div>

      {resultado && !resultado.error && (
        <div style={{ marginTop: 24 }}>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-label">Aceptadas</div>
              <div className="stat-value" style={{ color: 'var(--success)' }}>
                {resultado.aceptadas.length}
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Rechazadas</div>
              <div className="stat-value" style={{ color: 'var(--danger)' }}>
                {resultado.rechazadas.length}
              </div>
            </div>
          </div>

          {resultado.rechazadas.length > 0 && (
            <div className="tabla-wrap">
              <table className="tabla">
                <thead>
                  <tr><th>Fila</th><th>Motivo</th></tr>
                </thead>
                <tbody>
                  {resultado.rechazadas.map((r, i) => (
                    <tr key={i}>
                      <td>#{r.fila}</td>
                      <td>{r.motivo}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </>
  )
}