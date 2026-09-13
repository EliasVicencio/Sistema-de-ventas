import { useEffect, useState } from 'react'
import api from '../api/cliente'

export default function TodasBoletas() {
  const [boletas, setBoletas] = useState([])
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    api.get('/boletas')
      .then(({ data }) => setBoletas(data))
      .finally(() => setCargando(false))
  }, [])

  async function eliminar(id) {
    if (!confirm('¿Eliminar esta boleta?')) return
    await api.delete(`/boletas/${id}`)
    setBoletas(boletas.filter((b) => b.id !== id))
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Todas las boletas</h1>
          <p className="page-subtitle">{boletas.length} registros en el sistema</p>
        </div>
      </div>

      {cargando ? (
        <div className="loading"><span className="spinner" /> Cargando...</div>
      ) : (
        <div className="tabla-wrap">
          <table className="tabla">
            <thead>
              <tr>
                <th>N° boleta</th>
                <th>Fecha</th>
                <th>Cliente</th>
                <th>Producto</th>
                <th>Total</th>
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
      )}
    </>
  )
}