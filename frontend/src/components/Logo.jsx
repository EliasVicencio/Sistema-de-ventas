
export default function Logo({
  size = 48,
  showName = false,
  className = ''
}) {
  return (
    <div
      className={`app-logo ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 12
      }}
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
        <rect x="8" y="42" width="10" height="14" rx="2.5" fill="#2563EB" />
        <rect x="25" y="34" width="10" height="22" rx="2.5" fill="#2563EB" />
        <rect x="42" y="26" width="10" height="30" rx="2.5" fill="#2563EB" />

        {/* Flecha ascendente, separada de las barras */}
        <path
          d="M10 31L25 23L36 26L52 11"
          stroke="#1D4ED8"
          strokeWidth="4.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Punta de la flecha */}
        <path
          d="M42 11H52V21"
          stroke="#1D4ED8"
          strokeWidth="4.5"
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