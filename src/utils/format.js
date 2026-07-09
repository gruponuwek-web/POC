export const fmt = {
  moneda: (v) => {
    if (v == null || isNaN(v)) return '—'
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v)
  },
  pct: (v) => {
    if (v == null || isNaN(v)) return '—'
    return `${Number(v).toFixed(1)}%`
  },
  num: (v) => {
    if (v == null || isNaN(v)) return '—'
    return new Intl.NumberFormat('es-MX').format(Math.round(v))
  },
  fecha: (v) => {
    if (!v) return '—'
    try {
      const d = new Date(v + 'T00:00:00')
      return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
    } catch { return v }
  }
}

export function semaforo(value, thresholds) {
  if (value == null) return 'gray'
  if (value >= thresholds.green) return 'green'
  if (value >= thresholds.yellow) return 'yellow'
  return 'red'
}

export const SEM_VENTA = { green: 100, yellow: 85 }
export const SEM_COBERTURA = { green: 90, yellow: 70 }
