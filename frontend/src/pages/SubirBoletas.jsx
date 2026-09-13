import { useState } from 'react'
import api from '../api/cliente'
import { useToast } from '../context/ToastContext'

export default function SubirBoletas() {
  const toast = useToast()
  const [archivo, setArchivo] = useState(null)
  const [resultado, setResultado] = useState(null)
  const [cargando, setCargando] = useState(false)

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

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Subir boletas</h1>
          <p className="page-subtitle">Carga el CSV del mes para procesarlo</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <label
          htmlFor="file"
          className={`upload-zone ${archivo ? 'has-file' : ''}`}
        >
          <svg className="upload-zone-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
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
          <input
            id="file"
            type="file"
            accept=".csv"
            hidden
            onChange={(e) => setArchivo(e.target.files[0])}
          />
        </label>

        <button
          type="submit"
          className="btn btn-primary"
          disabled={!archivo || cargando}
        >
          {cargando ? 'Procesando...' : 'Subir y procesar'}
        </button>
      </form>

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