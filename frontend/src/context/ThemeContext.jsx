import { createContext, useContext, useEffect, useState } from 'react'

const ThemeContext = createContext(null)

const STORAGE_KEY = 'sistema-ventas-theme'

function getInitialTheme() {
  // 1. Preferencia guardada
  const guardado = localStorage.getItem(STORAGE_KEY)
  if (guardado === 'light' || guardado === 'dark') return guardado

  // 2. Preferencia del sistema
  if (window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark'

  // 3. Default
  return 'light'
}

export function ThemeProvider({ children }) {
  const [tema, setTema] = useState(getInitialTheme)

  useEffect(() => {
    const root = document.documentElement
    if (tema === 'dark') {
      root.setAttribute('data-theme', 'dark')
    } else {
      root.removeAttribute('data-theme')
    }
    localStorage.setItem(STORAGE_KEY, tema)
  }, [tema])

  function toggleTema() {
    setTema((prev) => (prev === 'dark' ? 'light' : 'dark'))
  }

  return (
    <ThemeContext.Provider value={{ tema, toggleTema, setTema }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme debe usarse dentro de ThemeProvider')
  return ctx
}