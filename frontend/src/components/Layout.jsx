import { Link, Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { usePermiso } from '../hooks/usePermiso'
import { useTheme } from '../context/ThemeContext'
import Logo from './Logo'

const IconDashboard = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="9" rx="1" />
    <rect x="14" y="3" width="7" height="5" rx="1" />
    <rect x="14" y="12" width="7" height="9" rx="1" />
    <rect x="3" y="16" width="7" height="5" rx="1" />
  </svg>
)

const IconUpload = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" y1="3" x2="12" y2="15" />
  </svg>
)

const IconList = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="8" y1="6" x2="21" y2="6" />
    <line x1="8" y1="12" x2="21" y2="12" />
    <line x1="8" y1="18" x2="21" y2="18" />
    <line x1="3" y1="6" x2="3.01" y2="6" />
    <line x1="3" y1="12" x2="3.01" y2="12" />
    <line x1="3" y1="18" x2="3.01" y2="18" />
  </svg>
)

const IconArchive = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="21 8 21 21 3 21 3 8" />
    <rect x="1" y="3" width="22" height="5" />
    <line x1="10" y1="12" x2="14" y2="12" />
  </svg>
)

const IconChart = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="20" x2="18" y2="10" />
    <line x1="12" y1="20" x2="12" y2="4" />
    <line x1="6" y1="20" x2="6" y2="14" />
  </svg>
)

const IconShield = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
)

const IconUsers = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
)

const IconSun = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
    <circle cx="12" cy="12" r="5" />
    <line x1="12" y1="1" x2="12" y2="3" />
    <line x1="12" y1="21" x2="12" y2="23" />
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
    <line x1="1" y1="12" x2="3" y2="12" />
    <line x1="21" y1="12" x2="23" y2="12" />
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
  </svg>
)

const IconMoon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
)

export default function Layout() {
  const { usuario, rol, logout } = useAuth()
  const { tema, toggleTema } = useTheme()
  const navigate = useNavigate()

  const [menuAbierto, setMenuAbierto] = useState(false)
  const menuRef = useRef(null)

  // Permisos del usuario
  const puedeSubir = usePermiso('boletas:subir')
  const puedeVerPropias = usePermiso('boletas:ver_propias')
  const puedeVerTodas = usePermiso('boletas:ver_todas')
  const puedeReportes = usePermiso('reportes:generar')
  const puedeAuditoria = usePermiso('auditoria:ver')
  const puedeGestionarUsuarios = usePermiso('usuarios:gestionar')

  useEffect(() => {
    if (!menuAbierto) return

    function handleClickFuera(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuAbierto(false)
      }
    }

    function handleEscape(e) {
      if (e.key === 'Escape') setMenuAbierto(false)
    }

    document.addEventListener('mousedown', handleClickFuera)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('mousedown', handleClickFuera)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [menuAbierto])

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  const linkClass = ({ isActive }) =>
    `sidebar-link ${isActive ? 'active' : ''}`

  const mostrarAnalisis = puedeVerTodas || puedeReportes
  const mostrarAdmin = puedeAuditoria || puedeGestionarUsuarios

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <Logo size={32} />
          <div className="sidebar-brand-name">Sistema de Ventas</div>
        </div>

        <nav className="sidebar-nav">
          <NavLink to="/" end className={linkClass}>
            <IconDashboard /> Dashboard
          </NavLink>

          {puedeSubir && (
            <NavLink to="/subir" className={linkClass}>
              <IconUpload /> Subir boletas
            </NavLink>
          )}

          {puedeVerPropias && (
            <NavLink to="/mias" className={linkClass}>
              <IconList /> Mis cargas
            </NavLink>
          )}

          {mostrarAnalisis && (
            <div className="sidebar-section-label">Análisis</div>
          )}

          {puedeVerTodas && (
            <NavLink to="/boletas" className={linkClass}>
              <IconArchive /> Todas las boletas
            </NavLink>
          )}

          {puedeReportes && (
            <NavLink to="/reportes" className={linkClass}>
              <IconChart /> Reportes
            </NavLink>
          )}

          {mostrarAdmin && (
            <div className="sidebar-section-label">Administración</div>
          )}

          {puedeGestionarUsuarios && (
            <NavLink to="/admin/usuarios" className={linkClass}>
              <IconUsers /> Usuarios
            </NavLink>
          )}

          {puedeAuditoria && (
            <NavLink to="/auditoria" className={linkClass}>
              <IconShield /> Auditoría
            </NavLink>
          )}
        </nav>

        <div className="sidebar-user" ref={menuRef}>
          <button
            onClick={toggleTema}
            className="sidebar-theme-toggle"
            title={tema === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            aria-label="Cambiar tema"
          >
            {tema === 'dark' ? (
              <>
                <IconSun />
                <span>Modo claro</span>
              </>
            ) : (
              <>
                <IconMoon />
                <span>Modo oscuro</span>
              </>
            )}
          </button>

          <div className="sidebar-user-wrapper">
            <button
              className="sidebar-user-info"
              onClick={() => setMenuAbierto((v) => !v)}
              aria-expanded={menuAbierto}
              aria-haspopup="menu"
            >
              <div className="sidebar-user-avatar">
                {usuario?.email?.[0]?.toUpperCase() || '?'}
              </div>
              <div className="sidebar-user-text">
                <div className="sidebar-user-email">{usuario?.email}</div>
                <div className="sidebar-user-rol">{rol}</div>
              </div>
              <svg
                className={`sidebar-user-chevron ${menuAbierto ? 'open' : ''}`}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                width="16"
                height="16"
              >
                <polyline points="6 15 12 9 18 15" />
              </svg>
            </button>

            {menuAbierto && (
              <div className="sidebar-user-menu" role="menu">
                <div className="sidebar-user-menu-header">
                  <div className="sidebar-user-menu-email">{usuario?.email}</div>
                  <div className="sidebar-user-menu-rol">{rol}</div>
                </div>
                <div className="sidebar-user-menu-divider" />
                <button
                  className="sidebar-user-menu-item danger"
                  onClick={handleLogout}
                  role="menuitem"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                  </svg>
                  Cerrar sesión
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      <main className="main">
        <Outlet />
      </main>
    </div>
  )
}