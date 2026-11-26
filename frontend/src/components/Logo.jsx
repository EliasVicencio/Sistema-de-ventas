
export default function Logo({ size = 48, showName = false, className = '' }) {
  return (
    <div
      className={`app-logo ${className}`}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label="Ventas en Subida"
      >
        {/* Barras de crecimiento */}
        <rect x="8" y="39" width="11" height="17" rx="3" fill="#2563EB" />
        <rect x="25" y="28" width="11" height="28" rx="3" fill="#2563EB" />
        <rect x="42" y="17" width="11" height="39" rx="3" fill="#2563EB" />

        {/* Flecha ascendente */}
        <path
          d="M10 29L27 20L39 24L55 8"
          stroke="#1D4ED8"
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M43 8H55V20"
          stroke="#1D4ED8"
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

      {showName && (
        <span className="app-logo-name">
          Ventas en Subida
        </span>
      )}
    </div>
  )
}
