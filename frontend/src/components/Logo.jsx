export default function Logo({ size = 32, variant = 'default' }) {
  const colors = {
    default: { bg: '#2563eb', fg: '#ffffff' },
    dark: { bg: '#0f172a', fg: '#ffffff' },
    primary: { bg: '#2563eb', fg: '#ffffff' },
  }

  const { bg, fg } = colors[variant] || colors.default

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Sistema de Ventas"
    >
      {/* Fondo redondeado */}
      <rect width="48" height="48" rx="10" fill={bg} />

      {/* Boleta */}
      <path
        d="M14 13 L34 13 L34 35 L30 33 L26 35 L22 33 L18 35 L14 33 Z"
        fill="none"
        stroke={fg}
        strokeWidth="2"
        strokeLinejoin="round"
      />

      {/* Líneas */}
      <line x1="18" y1="20" x2="30" y2="20" stroke={fg} strokeWidth="1.8" strokeLinecap="round" />
      <line x1="18" y1="25" x2="28" y2="25" stroke={fg} strokeWidth="1.8" strokeLinecap="round" />

      {/* Barras crecientes */}
      <line x1="18" y1="30" x2="18" y2="28" stroke={fg} strokeWidth="1.8" strokeLinecap="round" />
      <line x1="22" y1="30" x2="22" y2="26" stroke={fg} strokeWidth="1.8" strokeLinecap="round" />
      <line x1="26" y1="30" x2="26" y2="24" stroke={fg} strokeWidth="1.8" strokeLinecap="round" />
      <line x1="30" y1="30" x2="30" y2="22" stroke={fg} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}