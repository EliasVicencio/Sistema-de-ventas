import { Link, Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { usePermiso } from '../hooks/usePermiso'
import { useState } from 'react'

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

const IconLogout = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
)

export default function Layout() {
  const { usuario, rol, logout } = useAuth()
  const navigate = useNavigate()

  const puedeVerTodas = usePermiso('boletas:ver_todas')
  const puedeReportes = usePermiso('reportes:generar')
  const puedeAuditoria = usePermiso('auditoria:ver')

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  const linkClass = ({ isActive }) =>
    `sidebar-link ${isActive ? 'active' : ''}`

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="sidebar-brand-icon">V</div>
          <div className="sidebar-brand-name">Sistema Ventas</div>
        </div>

        <nav className="sidebar-nav">
          <NavLink to="/" end className={linkClass}>
            <IconDashboard /> Dashboard
          </NavLink>
          <NavLink to="/subir" className={linkClass}>
            <IconUpload /> Subir boletas
          </NavLink>
          <NavLink to="/mias" className={linkClass}>
            <IconList /> Mis cargas
          </NavLink>

          {(puedeVerTodas || puedeReportes) && (
            <div className="sidebar-section-label">Administración</div>
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
          {puedeAuditoria && (
            <NavLink to="/auditoria" className={linkClass}>
              <IconShield /> Auditoría
            </NavLink>
          )}
        </nav>

        <div className="sidebar-user">
          <div className="sidebar-user-info">
            <div className="sidebar-user-avatar">
              {usuario?.email?.[0]?.toUpperCase() || '?'}
            </div>
            <div className="sidebar-user-text">
              <div className="sidebar-user-email">{usuario?.email}</div>
              <div className="sidebar-user-rol">{rol}</div>
            </div>
            <button
              onClick={handleLogout}
              className="sidebar-logout-btn"
              title="Cerrar sesión"
              aria-label="Cerrar sesión"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </button>
          </div>
        </div>
      </aside>

      <main className="main">
        <Outlet />
      </main>
    </div>
  )
}