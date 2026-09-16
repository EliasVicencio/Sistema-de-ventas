import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import RutaProtegida from './rutas/RutaProtegida'
import RutaPermiso from './rutas/RutaPermiso'
import Layout from './components/Layout'

import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import SubirBoletas from './pages/SubirBoletas'
import MisCargas from './pages/MisCargas'
import TodasBoletas from './pages/TodasBoletas'
import Reportes from './pages/Reportes'
import Auditoria from './pages/Auditoria'
import AdminUsuarios from './pages/AdminUsuarios'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route path="/" element={
            <RutaProtegida><Layout /></RutaProtegida>
          }>
            <Route index element={<Dashboard />} />
            <Route path="subir" element={<SubirBoletas />} />
            <Route path="mias" element={<MisCargas />} />
            <Route path="boletas" element={
              <RutaPermiso permiso="boletas:ver_todas"><TodasBoletas /></RutaPermiso>
            } />
            <Route path="reportes" element={
              <RutaPermiso permiso="reportes:generar"><Reportes /></RutaPermiso>
            } />
            <Route path="auditoria" element={
              <RutaPermiso permiso="auditoria:ver"><Auditoria /></RutaPermiso>
            } />
            <Route path="admin/usuarios" element={
              <RutaPermiso permiso="usuarios:gestionar"><AdminUsuarios /></RutaPermiso>
            } />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}