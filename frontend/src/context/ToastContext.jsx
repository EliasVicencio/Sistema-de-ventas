import { createContext, useContext, useState, useCallback } from 'react'

const ToastContext = createContext(null)

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const agregar = useCallback((mensaje, tipo = 'info', duracion = 4000) => {
    const id = Date.now() + Math.random()
    setToasts((prev) => [...prev, { id, mensaje, tipo }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, duracion)
  }, [])

  const quitar = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const api = {
    error: (msg, dur) => agregar(msg, 'error', dur),
    success: (msg, dur) => agregar(msg, 'success', dur),
    info: (msg, dur) => agregar(msg, 'info', dur),
    warning: (msg, dur) => agregar(msg, 'warning', dur),
  }

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="toast-container">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`toast toast-${t.tipo}`}
            onClick={() => quitar(t.id)}
          >
            <span>{t.mensaje}</span>
            <button
              className="toast-close"
              onClick={(e) => { e.stopPropagation(); quitar(t.id) }}
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast debe usarse dentro de ToastProvider')
  return ctx
}