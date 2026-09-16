export function claseMetodoPago(metodo) {
  const mapa = {
    efectivo: 'badge-success',
    debito: 'badge-info',
    credito: 'badge-warning',
    transferencia: 'badge-info',
    vale_vista: 'badge-warning',
  }
  return mapa[metodo] || 'badge-info'
}

export function claseEstado(estado) {
  const mapa = {
    confirmada: 'badge-success',
    pendiente: 'badge-warning',
    devuelta: 'badge-danger',
  }
  return mapa[estado] || 'badge-info'
}

export function claseTipoDocumento(tipo) {
  return tipo === 'factura' ? 'badge-info' : 'badge-success'
}

export function formatearMetodo(metodo) {
  const mapa = {
    efectivo: 'Efectivo',
    debito: 'Débito',
    credito: 'Crédito',
    transferencia: 'Transferencia',
    vale_vista: 'Vale vista',
  }
  return mapa[metodo] || metodo
}

export function formatearTipo(tipo) {
  return tipo === 'factura' ? 'Factura' : 'Boleta'
}