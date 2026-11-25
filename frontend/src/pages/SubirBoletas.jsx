
import { useState } from 'react'
import api from '../api/cliente'
import { useToast } from '../context/ToastContext'

export default function SubirBoletas() {
  const toast = useToast()
  const [archivo, setArchivo] = useState(null)
  const [resultado, setResultado] = useState(null)
  const [cargando, setCargando] = useState(false)
  const [generandoDTE, setGenerandoDTE] = useState(false)
  const [arrastrando, setArrastrando] = useState(false)

  const aceptadas = resultado?.aceptadas ?? []
  const rechazadas = resultado?.rechazadas ?? []
  const hayResultado = resultado && !resultado.error

  function seleccionarArchivo(file) {
    if (!file || cargando) return

    if (!file.name.toLowerCase().endsWith('.csv')) {
      toast.warning('Selecciona un archivo con formato CSV')
      return
    }

    setArchivo(file)
    setResultado(null)
  }

  function handleArchivo(e) {
    seleccionarArchivo(e.target.files[0])
    e.target.value = ''
  }

  function handleDrop(e) {
    e.preventDefault()
    setArrastrando(false)

    if (cargando) return
    seleccionarArchivo(e.dataTransfer.files[0])
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!archivo || cargando) return

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

  async function generarDTEPrueba() {
    if (generandoDTE) return

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

  function formatearTamano(bytes) {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div className="upload-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Subir boletas</h1>
          <p className="page-subtitle">
            Importa y procesa las boletas del período mediante un archivo CSV.
          </p>
        </div>
      </div>

      <div className="upload-layout">
        {/* IMPORTACIÓN CSV */}
        <section className="upload-panel">
          <div className="upload-panel-heading">
            <div className="upload-panel-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <path d="M8 13h8M8 17h8" />
              </svg>
            </div>

            <div>
              <h2>Importación de boletas</h2>
              <p>Selecciona el archivo que deseas procesar.</p>
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            <label
              htmlFor="file-input"
              className={`upload-zone ${archivo ? 'has-file' : ''} ${arrastrando ? 'drag-active' : ''} ${cargando ? 'is-disabled' : ''}`}
              onDragOver={(e) => {
                e.preventDefault()
                if (!cargando) setArrastrando(true)
              }}
              onDragLeave={(e) => {
                e.preventDefault()
                setArrastrando(false)
              }}
              onDrop={handleDrop}
            >
              <input
                id="file-input"
                type="file"
                accept=".csv,text/csv"
                onChange={handleArchivo}
                disabled={cargando}
                hidden
              />

              {archivo ? (
                <>
                  <div className="upload-zone-icon file-selected">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <path d="m9 15 2 2 4-4" />
                    </svg>
                  </div>

                  <strong className="upload-zone-title">{archivo.name}</strong>

                  <span className="upload-zone-hint">
                    {formatearTamano(archivo.size)} · Archivo seleccionado
                  </span>

                  <span className="upload-change-file">
                    {cargando ? 'Procesando archivo...' : 'Cambiar archivo'}
                  </span>
                </>
              ) : (
                <>
                  <div className="upload-zone-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                      strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                  </div>

                  <strong className="upload-zone-title">
                    Arrastra tu archivo CSV aquí
                  </strong>

                  <span className="upload-zone-hint">
                    o haz clic para buscarlo en tu equipo
                  </span>

                  <span className="upload-file-format">FORMATO .CSV</span>
                </>
              )}
            </label>

            <div className="upload-form-footer">
              <div className="upload-file-note">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 16v-4M12 8h.01" />
                </svg>

                <span>
                  Verifica que el archivo corresponda al período que deseas cargar.
                </span>
              </div>

              <button
                type="submit"
                className="btn btn-primary upload-submit"
                disabled={!archivo || cargando}
              >
                {cargando ? (
                  <>
                    <span className="upload-spinner" aria-hidden="true" />
                    Procesando...
                  </>
                ) : (
                  <>
                    Subir y procesar
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </>
                )}
              </button>
            </div>

            {cargando && (
              <div className="upload-processing" role="status" aria-live="polite">
                <span className="upload-processing-dot" />
                <div>
                  <strong>Procesando archivo CSV</strong>
                  <span>
                    Estamos validando y registrando las boletas. No cierres esta pantalla.
                  </span>
                </div>
              </div>
            )}
          </form>
        </section>

        {/* HERRAMIENTA DTE */}
        <section className="upload-test-panel">
          <div className="upload-test-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <path d="M12 18v-6M9 15l3 3 3-3" />
            </svg>
          </div>

          <div className="upload-test-content">
            <span className="upload-test-label">HERRAMIENTA DE PRUEBA</span>

            <h2>Generar DTE de prueba</h2>

            <p>
              Genera una factura electrónica con datos ficticios y descarga
              el documento PDF para comprobar el flujo.
            </p>

            <button
              type="button"
              className="btn btn-secondary upload-test-button"
              onClick={generarDTEPrueba}
              disabled={generandoDTE}
            >
              {generandoDTE ? (
                <>
                  <span className="upload-spinner" aria-hidden="true" />
                  Generando...
                </>
              ) : 'Generar factura PDF'}
            </button>
          </div>
        </section>
      </div>

      {/* RESULTADOS */}
      {resultado && (
        <section className="upload-results" aria-live="polite">
          {resultado.error ? (
            <div className="upload-error upload-status-card">
              <div className="upload-status-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <path d="m15 9-6 6m0-6 6 6" />
                </svg>
              </div>
              <div>
                <strong>No se pudo procesar el archivo</strong>
                <p>{resultado.error}</p>
              </div>
            </div>
          ) : (
            <>
              <div className="upload-results-heading">
                <div>
                  <h2>Resultado del procesamiento</h2>
                  <p>Resumen de las filas recibidas del archivo.</p>
                </div>
              </div>

              {aceptadas.length > 0 && rechazadas.length === 0 && (
                <div className="upload-status-card upload-status-success" role="status">
                  <div className="upload-status-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <path d="m8 12 3 3 5-6" />
                    </svg>
                  </div>
                  <div>
                    <strong>¡Carga completada correctamente!</strong>
                    <p>Todas las boletas del archivo fueron aceptadas.</p>
                  </div>
                </div>
              )}

              {aceptadas.length > 0 && rechazadas.length > 0 && (
                <div className="upload-status-card upload-status-warning" role="status">
                  <div className="upload-status-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <path d="M12 8v4m0 4h.01" />
                    </svg>
                  </div>
                  <div>
                    <strong>Procesamiento completado con observaciones</strong>
                    <p>Algunas filas fueron rechazadas. Revisa los motivos antes de volver a cargar el archivo.</p>
                  </div>
                </div>
              )}

              {aceptadas.length === 0 && rechazadas.length > 0 && (
                <div className="upload-status-card upload-status-danger" role="status">
                  <div className="upload-status-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <path d="m15 9-6 6m0-6 6 6" />
                    </svg>
                  </div>
                  <div>
                    <strong>No se aceptaron boletas</strong>
                    <p>Revisa los motivos de rechazo que aparecen a continuación.</p>
                  </div>
                </div>
              )}

              {aceptadas.length === 0 && rechazadas.length === 0 && (
                <div className="upload-status-card upload-status-empty" role="status">
                  <div className="upload-status-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <path d="M12 8v4m0 4h.01" />
                    </svg>
                  </div>
                  <div>
                    <strong>El archivo no contiene registros</strong>
                    <p>El CSV se procesó, pero no se encontraron filas para importar.</p>
                  </div>
                </div>
              )}

              <div className="upload-result-stats">
                <div className="upload-result-stat accepted">
                  <span>Boletas aceptadas</span>
                  <strong>{aceptadas.length}</strong>
                </div>

                <div className="upload-result-stat rejected">
                  <span>Filas rechazadas</span>
                  <strong>{rechazadas.length}</strong>
                </div>
              </div>

              {rechazadas.length > 0 && (
                <div className="upload-rejected">
                  <h3>Detalle de filas rechazadas</h3>

                  <div className="tabla-wrap">
                    <table className="tabla">
                      <thead>
                        <tr>
                          <th>Fila</th>
                          <th>Motivo</th>
                        </tr>
                      </thead>

                      <tbody>
                        {rechazadas.map((r, i) => (
                          <tr key={i}>
                            <td>#{r.fila}</td>
                            <td>{r.motivo}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </section>
      )}
    </div>
  )
}
