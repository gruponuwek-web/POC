import React, { useMemo } from 'react'
import InfoTip from './InfoTip.jsx'

function titulo(s) {
  const t = String(s || '').toLowerCase().replace(/\b\w/g, c => c.toUpperCase())
  return t.length > 34 ? t.slice(0, 32) + '…' : t
}

export default function CorrelacionProductos({ ap, filtros }) {
  const scopeKey = filtros?.año === '2025' ? '2025' : filtros?.año === '2026' ? '2026' : 'todos'
  const chord = ap?.chord?.[scopeKey]

  const { nodePos, pares, top, maxV } = useMemo(() => {
    if (!chord || !chord.productos || chord.productos.length < 2) return { nodePos: [], pares: [], top: [], maxV: 1 }
    const n = chord.productos.length
    const cx = 100, cy = 100, R = 82
    const nodePos = chord.productos.map((_, i) => {
      const ang = (i / n) * 2 * Math.PI - Math.PI / 2
      return { x: cx + R * Math.cos(ang), y: cy + R * Math.sin(ang) }
    })
    const pares = []
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
      const v = chord.matrix[i][j]
      if (v > 0) pares.push({ i, j, v })
    }
    pares.sort((a, b) => b.v - a.v)
    const top = pares.slice(0, 40)
    const maxV = top.length ? top[0].v : 1
    return { nodePos, pares, top, maxV }
  }, [chord])

  if (!chord || nodePos.length < 2) return null
  const productos = chord.productos
  const cx = 100, cy = 100

  return (
    <div style={{ background: '#fff', borderRadius: 10, border: '1.5px solid #e2e8f0', boxShadow: '0 1px 4px rgba(0,0,0,.05)', overflow: 'hidden', marginBottom: 16 }}>
      <div style={{ padding: '14px 18px 0', display: 'flex', alignItems: 'center' }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#0f1f3d', textTransform: 'uppercase', letterSpacing: '.4px' }}>🔗 Productos Comprados Juntos</span>
        <InfoTip text="Cada nodo es uno de los 24 productos con mayor venta. Una línea conecta dos productos si el mismo cliente compró ambos; entre más gruesa y opaca, más clientes en común. Solo se muestran las 40 conexiones más fuertes." />
      </div>
      <div style={{ padding: 18, display: 'grid', gridTemplateColumns: '260px 1fr', gap: 20, alignItems: 'center' }}>
        <svg viewBox="0 0 200 200" style={{ width: '100%', maxWidth: 260, display: 'block', margin: '0 auto' }}>
          {top.map((p, idx) => {
            const a = nodePos[p.i], b = nodePos[p.j]
            const strength = p.v / maxV
            return (
              <path key={idx} d={`M ${a.x.toFixed(1)} ${a.y.toFixed(1)} Q ${cx} ${cy} ${b.x.toFixed(1)} ${b.y.toFixed(1)}`}
                stroke="#7c3aed" strokeWidth={(0.4 + strength * 2.2).toFixed(2)} opacity={(0.12 + strength * 0.55).toFixed(2)} fill="none">
                <title>{titulo(productos[p.i])} + {titulo(productos[p.j])}: {p.v} clientes en común</title>
              </path>
            )
          })}
          {nodePos.map((pos, i) => (
            <circle key={i} cx={pos.x} cy={pos.y} r="3" fill="#0f1f3d" stroke="#fff" strokeWidth="1">
              <title>{titulo(productos[i])}</title>
            </circle>
          ))}
        </svg>
        <div>
          <div style={{ fontSize: 10.5, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: 8 }}>Top conexiones (comprados juntos)</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {pares.slice(0, 8).map((p, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, padding: '3px 0', borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ color: '#94a3b8', fontWeight: 700, width: 14, flexShrink: 0 }}>{i + 1}</span>
                <span style={{ flex: 1, color: '#334155', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{titulo(productos[p.i])} + {titulo(productos[p.j])}</span>
                <span style={{ color: '#7c3aed', fontWeight: 700, flexShrink: 0 }}>{p.v} cli.</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
