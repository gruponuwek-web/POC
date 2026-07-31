import React, { useMemo } from 'react'
import InfoTip from './InfoTip.jsx'

function titulo(s, max = 30) {
  const t = String(s || '').toLowerCase().replace(/\b\w/g, c => c.toUpperCase())
  return t.length > max ? t.slice(0, max - 1) + '…' : t
}

const HUB = '#0f1f3d', LEAF = '#93c5fd'

export default function CorrelacionProductos({ ap, filtros }) {
  const scopeKey = filtros?.año === '2025' ? '2025' : filtros?.año === '2026' ? '2026' : 'todos'
  const chord = ap?.chord?.[scopeKey]

  const { nodePos, pares, top, maxV, maxGrado, grado } = useMemo(() => {
    if (!chord || !chord.productos || chord.productos.length < 2) return { nodePos: [], pares: [], top: [], maxV: 1, maxGrado: 1, grado: [] }
    const n = chord.productos.length
    const cx = 160, cy = 160, R = 118
    const grado = chord.grado || chord.productos.map((_, i) => chord.matrix[i].reduce((s, v) => s + v, 0))
    const maxGrado = Math.max(...grado, 1)
    const nodePos = chord.productos.map((_, i) => {
      const ang = (i / n) * 2 * Math.PI - Math.PI / 2
      return { x: cx + R * Math.cos(ang), y: cy + R * Math.sin(ang), ang }
    })
    const pares = []
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
      const v = chord.matrix[i][j]
      if (v > 0) pares.push({ i, j, v })
    }
    pares.sort((a, b) => b.v - a.v)
    const top = pares.slice(0, 40)
    const maxV = top.length ? top[0].v : 1
    return { nodePos, pares, top, maxV, maxGrado, grado }
  }, [chord])

  if (!chord || nodePos.length < 2) return null
  const productos = chord.productos
  const cx = 160, cy = 160

  return (
    <div style={{ background: '#fff', borderRadius: 10, border: '1.5px solid #e2e8f0', boxShadow: '0 1px 4px rgba(0,0,0,.05)', overflow: 'hidden', marginBottom: 16 }}>
      <div style={{ padding: '14px 18px 0', display: 'flex', alignItems: 'center' }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#0f1f3d', textTransform: 'uppercase', letterSpacing: '.4px' }}>🔗 Productos Comprados Juntos</span>
        <InfoTip text="Los 16 productos con mayor venta. Una línea conecta dos productos si aparecieron en el mismo folio de compra (mismo ticket); entre más gruesa y oscura, más folios en común. Los nodos más grandes/oscuros son los más conectados (hubs). Solo se muestran las 40 conexiones más fuertes." />
      </div>
      <div style={{ padding: 18, display: 'grid', gridTemplateColumns: '360px 1fr', gap: 20, alignItems: 'center' }}>
        <svg viewBox="0 0 320 320" style={{ width: '100%', maxWidth: 360, display: 'block', margin: '0 auto' }}>
          {top.map((p, idx) => {
            const a = nodePos[p.i], b = nodePos[p.j]
            const strength = p.v / maxV
            return (
              <path key={idx} d={`M ${a.x.toFixed(1)} ${a.y.toFixed(1)} Q ${cx} ${cy} ${b.x.toFixed(1)} ${b.y.toFixed(1)}`}
                stroke="#7c3aed" strokeWidth={(0.5 + strength * 2.6).toFixed(2)} opacity={(0.14 + strength * 0.6).toFixed(2)} fill="none">
                <title>{titulo(productos[p.i])} + {titulo(productos[p.j])}: {p.v} folios en común</title>
              </path>
            )
          })}
          {nodePos.map((pos, i) => {
            const gFrac = grado[i] / maxGrado
            const r = 3 + gFrac * 4.5
            const color = gFrac > 0.55 ? HUB : gFrac > 0.25 ? '#3b6bb0' : LEAF
            const isRight = Math.cos(pos.ang) >= 0
            const labelX = pos.x + Math.cos(pos.ang) * (r + 5)
            const labelY = pos.y + Math.sin(pos.ang) * (r + 5) + 3
            return (
              <g key={i}>
                <circle cx={pos.x} cy={pos.y} r={r} fill={color} stroke="#fff" strokeWidth="1.3">
                  <title>{titulo(productos[i])} · {grado[i]} folios conectados</title>
                </circle>
                <text x={labelX} y={labelY} fontSize="7.2" fill="#475569" textAnchor={isRight ? 'start' : 'end'}>{titulo(productos[i], 20)}</text>
              </g>
            )
          })}
        </svg>
        <div>
          <div style={{ fontSize: 10.5, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: 8 }}>Top conexiones (folios en común)</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {pares.slice(0, 10).map((p, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, padding: '3px 0', borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ color: '#94a3b8', fontWeight: 700, width: 14, flexShrink: 0 }}>{i + 1}</span>
                <span style={{ flex: 1, color: '#334155', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{titulo(productos[p.i])} + {titulo(productos[p.j])}</span>
                <span style={{ color: '#7c3aed', fontWeight: 700, flexShrink: 0 }}>{p.v} folios</span>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 14, marginTop: 12, fontSize: 10.5, color: '#64748b' }}>
            <span><span style={{ display: 'inline-block', width: 9, height: 9, borderRadius: '50%', background: HUB, marginRight: 5 }} />Muy conectado</span>
            <span><span style={{ display: 'inline-block', width: 9, height: 9, borderRadius: '50%', background: '#3b6bb0', marginRight: 5 }} />Medio</span>
            <span><span style={{ display: 'inline-block', width: 9, height: 9, borderRadius: '50%', background: LEAF, marginRight: 5 }} />Poco conectado</span>
          </div>
        </div>
      </div>
    </div>
  )
}
