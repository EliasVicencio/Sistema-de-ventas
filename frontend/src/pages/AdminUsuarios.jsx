import { useEffect, useState } from 'react'
import api from '../api/cliente'
import { useToast } from '../context/ToastContext'
import { useAuth } from '../context/AuthContext'

const ROLES = [
  { value: 'cargador', label: 'Cargador' },
  { value: 'ventas', label: 'Ventas' },
  { value: 'finanzas', label: 'Finanzas' },
  { value: 'admin', label: 'Admin' },
]

function Modal({ titulo, children, onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{titulo}</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  )
}

export default function AdminUsuarios() {
  const toast = useToast()
  const { usuario: usuarioActual } = useAuth()
  const [usuarios, setUsuarios] = useState([])
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(null)

  // Modal crear
  const [modalCrear, setModalCrear] = useState(false)
  const [formCrear, setFormCrear] = useState({ email: '', password: '', rol: 'cargador' })
  const [creando, setCreando] = useState(false)

  // Modal reset password
  const [modalReset, setModalReset] = useState(null) // user_id
  const [nuevaPassword, setNuevaPassword] = useState('')
  const [reseteando, setReseteando] = useState(false)

  async function cargar() {
    setCargando(true)
    try {
      const { data } = await api.get('/admin/usuarios')
      setUsuarios(data)
    } catch (err) {
      toast.error(err.response?.data?.detail || 'No se pudieron cargar los usuarios')
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    cargar()
  }, [])

  async function cambiarRol(userId, nuevoRol) {
    setGuardando(userId)
    try {
      await api.put(`/admin/usuarios/${userId}/rol`, { rol: nuevoRol })
      toast.success(`Rol actualizado a "${nuevoRol}"`)
      setUsuarios((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, rol: nuevoRol } : u))
      )
    } catch (err) {
      toast.error(err.response?.data?.detail || 'No se pudo cambiar el rol')
    } finally {
      setGuardando(null)
    }
  }

  async function crearUsuario(e) {
    e.preventDefault()
    setCreando(true)
    try {
      await api.post('/admin/usuarios', formCrear)
      toast.success(`Usuario ${formCrear.email} creado`)
      setModalCrear(false)
      setFormCrear({ email: '', password: '', rol: 'cargador' })
      cargar()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'No se pudo crear el usuario')
    } finally {
      setCreando(false)
    }
  }

  async function resetPassword(e) {
    e.preventDefault()
    setReseteando(true)
    try {
      await api.post(`/admin/usuarios/${modalReset}/reset-password`, {
        password: nuevaPassword,
      })
      toast.success('Contraseña actualizada')
      setModalReset(null)
      setNuevaPassword('')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'No se pudo resetear la contraseña')
    } finally {
      setReseteando(false)
    }
  }

  async function eliminarUsuario(u) {
    if (!confirm(`¿Eliminar definitivamente a ${u.email}? Esta acción no se puede deshacer.`)) return
    try {
      await api.delete(`/admin/usuarios/${u.id}`)
      toast.success('Usuario eliminado')
      setUsuarios((prev) => prev.filter((x) => x.id !== u.id))
    } catch (err) {
      toast.error(err.response?.data?.detail || 'No se pudo eliminar el usuario')
    }
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Gestión de usuarios</h1>
          <p className="page-subtitle">{usuarios.length} usuarios registrados</p>
        </div>
        <button className="btn btn-primary" onClick={() => setModalCrear(true)}>
          + Nuevo usuario
        </button>
      </div>

      {cargando ? (
        <div className="loading"><span className="spinner" /> Cargando...</div>
      ) : usuarios.length === 0 ? (
        <div className="tabla-wrap">
          <div className="tabla-empty">No hay usuarios registrados</div>
        </div>
      ) : (
        <div className="tabla-wrap">
          <table className="tabla">
            <thead>
              <tr>
                <th>Email</th>
                <th>Rol actual</th>
                <th>Cambiar rol</th>
                <th>Último ingreso</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map((u) => {
                const esYoMismo = u.id === usuarioActual?.id
                return (
                  <tr key={u.id}>
                    <td>
                      <strong>{u.email}</strong>
                      {esYoMismo && (
                        <span className="badge badge-info" style={{ marginLeft: 8 }}>
                          Tú
                        </span>
                      )}
                    </td>
                    <td>
                      <span className={`badge ${
                        u.rol === 'admin' ? 'badge-danger' :
                        u.rol === 'ventas' ? 'badge-info' :
                        u.rol === 'finanzas' ? 'badge-warning' :
                        'badge-success'
                      }`}>
                        {u.rol || 'Sin rol'}
                      </span>
                    </td>
                    <td>
                      <select
                        className="input"
                        style={{ maxWidth: 200 }}
                        value={u.rol || ''}
                        onChange={(e) => cambiarRol(u.id, e.target.value)}
                        disabled={guardando === u.id || esYoMismo}
                      >
                        <option value="" disabled>Sin rol</option>
                        {ROLES.map((r) => (
                          <option key={r.value} value={r.value}>{r.label}</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      {u.last_sign_in_at
                        ? new Date(u.last_sign_in_at).toLocaleString()
                        : 'Nunca'}
                    </td>
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => setModalReset(u.id)}
                        title="Resetear contraseña"
                      >
                        Resetear
                      </button>
                      {!esYoMismo && (
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => eliminarUsuario(u)}
                          title="Eliminar usuario"
                          style={{ color: 'var(--danger)' }}
                        >
                          Eliminar
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal: crear usuario */}
      {modalCrear && (
        <Modal titulo="Nuevo usuario" onClose={() => setModalCrear(false)}>
          <form onSubmit={crearUsuario} className="login-form">
            <div className="login-field">
              <label>Email</label>
              <input
                type="email"
                className="input"
                value={formCrear.email}
                onChange={(e) => setFormCrear({ ...formCrear, email: e.target.value })}
                required
              />
            </div>
            <div className="login-field">
              <label>Contraseña</label>
              <input
                type="text"
                className="input"
                value={formCrear.password}
                onChange={(e) => setFormCrear({ ...formCrear, password: e.target.value })}
                placeholder="Mínimo 6 caracteres"
                minLength={6}
                required
              />
              <small style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                Se muestra en texto plano para que puedas copiarla y enviársela al usuario.
              </small>
            </div>
            <div className="login-field">
              <label>Rol</label>
              <select
                className="input"
                value={formCrear.rol}
                onChange={(e) => setFormCrear({ ...formCrear, rol: e.target.value })}
              >
                {ROLES.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button type="submit" className="btn btn-primary" disabled={creando}>
                {creando ? 'Creando...' : 'Crear usuario'}
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => setModalCrear(false)}>
                Cancelar
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal: reset password */}
      {modalReset && (
        <Modal titulo="Resetear contraseña" onClose={() => setModalReset(null)}>
          <form onSubmit={resetPassword} className="login-form">
            <div className="login-field">
              <label>Nueva contraseña</label>
              <input
                type="text"
                className="input"
                value={nuevaPassword}
                onChange={(e) => setNuevaPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                minLength={6}
                required
              />
              <small style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                Compartila con el usuario por un canal seguro.
              </small>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button type="submit" className="btn btn-primary" disabled={reseteando}>
                {reseteando ? 'Guardando...' : 'Cambiar contraseña'}
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => setModalReset(null)}>
                Cancelar
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  )
}