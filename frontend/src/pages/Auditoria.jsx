import { useEffect, useState } from 'react'
import api from '../api/cliente'

export default function Auditoria() {
  const [registros, setRegistros] = useState([])
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    api.get('/admin/auditoria')
      .then(({ data }) => setRegistros(data))
      .finally(() => setCargando(false))
  }, [])

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Auditoría</h1>
          <p className="page-subtitle">{registros.length} eventos registrados</p>
        </div>
      </div>

      {cargando ? (
        <div className="loading"><span className="spinner" /> Cargando...</div>
      ) : (
        <div className="tabla-wrap">
          <table className="tabla">
            <thead>
              <tr><th>Fecha</th><th>Usuario</th><th>Acción</th><th>Detalle</th></tr>
            </thead>
            <tbody>
              {registros.map((r) => (
                <tr key={r.id}>
                  <td>{new Date(r.fecha).toLocaleString()}</td>
                  <td>{r.usuario_id?.slice(0, 8)}…</td>
                  <td><span className="badge badge-warning">{r.accion}</span></td>
                  <td>
                    <span className="code-cell">{JSON.stringify(r.detalle)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}