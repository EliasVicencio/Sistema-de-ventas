import { useEffect, useState } from 'react'
import api from '../api/cliente'
import { useToast } from '../context/ToastContext'

export default function MisCargas() {
  const toast = useToast()
  const [boletas, setBoletas] = useState([])
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    api.get('/boletas/mias')
      .then(({ data }) => {
        if (Array.isArray(data)) {
          setBoletas(data)
        } else {
          toast.error('Respuesta inesperada del servidor')
          setBoletas([])
        }
      })
      .catch((err) => {
        toast.error(err.response?.data?.detail || 'No se pudieron cargar tus boletas')
        setBoletas([])
      })
      .finally(() => setCargando(false))
  }, [])

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Mis cargas</h1>
          <p className="page-subtitle">
            {boletas.length} boleta{boletas.length !== 1 ? 's' : ''} subida{boletas.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {cargando ? (
        <div className="loading"><span className="spinner" /> Cargando...</div>
      ) : boletas.length === 0 ? (
        <div className="tabla-wrap">
          <div className="tabla-empty">Todavía no has subido boletas</div>
        </div>
      ) : (
        <TablaBoletas boletas={boletas} />
      )}
    </>
  )
}

function TablaBoletas({ boletas }) {
  return (
    <div className="tabla-wrap">
      <table className="tabla">
        <thead>
          <tr>
            <th>N° boleta</th>
            <th>Fecha</th>
            <th>Cliente</th>
            <th>Producto</th>
            <th>Cant.</th>
            <th>Descuento</th>
            <th>Total</th>
            <th>Pago</th>
            <th>Canal</th>
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
              <td>${Number(b.descuento || 0).toFixed(2)}</td>
              <td>${Number(b.total).toFixed(2)}</td>
              <td>
                <span className={`badge ${b.metodo_pago === 'efectivo' ? 'badge-success' : 'badge-info'}`}>
                  {b.metodo_pago}
                </span>
              </td>
              <td>{b.canal_venta}</td>
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
  )
}