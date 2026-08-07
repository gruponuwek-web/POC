// Histograma simple: cuenta cuántos valores caen en cada uno de `nBins` intervalos iguales
// dentro de [min, max]. Los valores deben venir en el mismo espacio que se va a graficar
// (ya transformado a log si aplica), para alinear las barras con la curva KDE.
export function histogram(values, min, max, nBins) {
  const vals = (values || []).filter(v => Number.isFinite(v))
  const span = Math.max(max - min, 1e-9)
  const w = span / nBins
  const bins = Array.from({ length: nBins }, (_, i) => ({ x0: min + i * w, x1: min + (i + 1) * w, count: 0 }))
  vals.forEach(v => {
    if (v < min || v > max) return
    let idx = Math.floor((v - min) / w)
    if (idx >= nBins) idx = nBins - 1
    if (idx < 0) idx = 0
    bins[idx].count++
  })
  return bins
}

// Estimación de densidad por kernel (KDE) simple, con ancho de banda de Silverman.
export function kde(values, { nPoints = 60, bwMult = 1 } = {}) {
  const vals = (values || []).filter(v => Number.isFinite(v) && v >= 0)
  const n = vals.length
  if (n < 2) return { points: [], min: 0, max: 1 }

  const mean = vals.reduce((s, v) => s + v, 0) / n
  const variance = vals.reduce((s, v) => s + (v - mean) ** 2, 0) / Math.max(1, n - 1)
  const sd = Math.sqrt(variance) || 1
  const bw = (1.06 * sd * Math.pow(n, -1 / 5) * bwMult) || 1

  const sorted = [...vals].sort((a, b) => a - b)
  const pct = p => sorted[Math.min(n - 1, Math.floor(p * (n - 1)))]
  const min = Math.max(0, pct(0.01) - bw * 2)
  // El colchón de "bw*2" ayuda a suavizar los extremos en muestras grandes, pero en muestras
  // chicas (pocos clientes) el ancho de banda de Silverman crece mucho y, al pasar por una
  // escala logarítmica (monto), un exceso pequeño en log-espacio se vuelve una cifra absurda
  // en dinero real — nunca debe superar el valor máximo/mínimo realmente observado.
  const max = Math.min(pct(0.98) + bw * 2, sorted[n - 1])
  const span = Math.max(max - min, 1e-6)
  const step = span / (nPoints - 1)

  const points = []
  for (let i = 0; i < nPoints; i++) {
    const x = min + i * step
    let y = 0
    for (let j = 0; j < n; j++) {
      const u = (x - vals[j]) / bw
      y += Math.exp(-0.5 * u * u)
    }
    y = y / (n * bw * Math.sqrt(2 * Math.PI))
    points.push({ x, y })
  }
  return { points, min, max }
}
