import { useEffect, useState } from 'react'
import api from '../api/cliente'
import { useToast } from '../context/ToastContext'

export default function TodasBoletas() {
  const toast = useToast()
  const [boletas, setBoletas] = useState([])
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    api.get('/boletas')
      .then(({ data }) => {
        if (Array.isArray(data)) setBoletas(data)
        else {
          toast.error('Respuesta inesperada del servidor')
          setBoletas([])
        }
      })
      .catch((err) => {
        toast.error(err.response?.data?.detail || 'No se pudieron cargar las boletas')
        setBoletas([])
      })
      .finally(() => setCargando(false))
  }, [])

  async function eliminar(id) {
    if (!confirm('¿Eliminar esta boleta?')) return
    try {
      await api.delete(`/boletas/${id}`)
      setBoletas(boletas.filter((b) => b.id !== id))
      toast.success('Boleta eliminada')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'No se pudo eliminar la boleta')
    }
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
                <th>Descuento</th>
                <th>Total</th>
                <th>Canal</th>
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
                  <td>${Number(b.descuento || 0).toFixed(2)}</td>
                  <td>${Number(b.total).toFixed(2)}</td>
                  <td>{b.canal_venta}</td>
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
      )}
    </>
  )
}