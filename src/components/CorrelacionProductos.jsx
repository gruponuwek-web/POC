import React, { useMemo } from 'react'
import InfoTip from './InfoTip.jsx'

function titulo(s, max = 26) {
  const t = String(s || '').toLowerCase().replace(/\b\w/g, c => c.toUpperCase())
  return t.length > max ? t.slice(0, max - 1) + '…' : t
}

const HUB_C = '#0f766e', HUB_C2 = '#14b8a6'
const SAT_C = '#f59e0b', SAT_C_LIGHT = '#fcd34d'
const LINK_C = '#cbd5e1'

export default function CorrelacionProductos({ ap, filtros }) {
  const scopeKey = filtros?.año === '2025' ? '2025' : filtros?.año === '2026' ? '2026' : 'todos'
  const chord = ap?.chord?.[scopeKey]

  const { nodePos, pares, top, maxV, grado, hubSet, clusterSize } = useMemo(() => {
    const empty = { nodePos: [], pares: [], top: [], maxV: 1, grado: [], hubSet: new Set(), clusterSize: [] }
    if (!chord || !chord.productos || chord.productos.length < 2) return empty
    const n = chord.productos.length
    const matrix = chord.matrix
    const grado = chord.grado || chord.productos.map((_, i) => matrix[i].reduce((s, v) => s + v, 0))

    const pares = []
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) { const v = matrix[i][j]; if (v > 0) pares.push({ i, j, v }) }
    pares.sort((a, b) => b.v - a.v)
    const top = pares.slice(0, 40)
    const maxV = top.length ? top[0].v : 1

    // Elegir "hubs" (centros de cluster) = los nodos con mayor grado
    const order = grado.map((g, i) => i).sort((a, b) => grado[b] - grado[a])
    const NHUBS = Math.min(5, Math.max(2, Math.round(n / 4)))
    const hubIdx = order.slice(0, NHUBS)
    const hubSet = new Set(hubIdx)

    // Cada producto restante se asigna al hub con el que más folios comparte
    const clusterOf = new Map()
    hubIdx.forEach(h => clusterOf.set(h, []))
    for (let i = 0; i < n; i++) {
      if (hubSet.has(i)) continue
      let bestHub = hubIdx[0], bestV = -1
      hubIdx.forEach(h => { if (matrix[i][h] > bestV) { bestV = matrix[i][h]; bestHub = h } })
      clusterOf.get(bestHub).push(i)
    }

    const cx = 160, cy = 160, Rmacro = 100
    const hubPos = {}
    hubIdx.forEach((h, k) => {
      const ang = (k / NHUBS) * 2 * Math.PI - Math.PI / 2
      hubPos[h] = { x: cx + Rmacro * Math.cos(ang), y: cy + Rmacro * Math.sin(ang), ang }
    })

    const nodePos = new Array(n)
    const clusterSize = new Array(n).fill(0)
    hubIdx.forEach(h => {
      nodePos[h] = { x: hubPos[h].x, y: hubPos[h].y, isHub: true, ang: hubPos[h].ang }
      clusterSize[h] = clusterOf.get(h).length
    })
    hubIdx.forEach(h => {
      const sats = clusterOf.get(h)
      const m = sats.length
      const Rsat = m > 5 ? 38 : 30
      sats.forEach((s, k) => {
        const ang = (k / Math.max(1, m)) * 2 * Math.PI
        nodePos[s] = { x: hubPos[h].x + Rsat * Math.cos(ang), y: hubPos[h].y + Rsat * Math.sin(ang), isHub: false, ang, hub: h }
      })
    })

    return { nodePos, pares, top, maxV, grado, hubSet, clusterSize }
  }, [chord])

  if (!chord || nodePos.length < 2) return null
  const productos = chord.productos

  return (
    <div style={{ background: '#fff', borderRadius: 10, border: '1.5px solid #e2e8f0', boxShadow: '0 1px 4px rgba(0,0,0,.05)', overflow: 'hidden', marginBottom: 16 }}>
      <div style={{ padding: '14px 18px 0', display: 'flex', alignItems: 'center' }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#0f1f3d', textTransform: 'uppercase', letterSpacing: '.4px' }}>🔗 Productos Comprados Juntos</span>
        <InfoTip text="Los 16 productos con mayor venta, agrupados en clústers alrededor de los productos 'hub' (verde) — el producto con el que más se compran juntos. Los satélites (ámbar) son los productos que suelen acompañarlos en el mismo folio de compra. Una línea más gruesa = más folios en común." />
      </div>
      <div style={{ padding: 18, display: 'grid', gridTemplateColumns: '360px 1fr', gap: 20, alignItems: 'center' }}>
        <svg viewBox="0 0 320 320" style={{ width: '100%', maxWidth: 360, display: 'block', margin: '0 auto' }}>
          {top.map((p, idx) => {
            const a = nodePos[p.i], b = nodePos[p.j]
            const strength = p.v / maxV
            return (
              <line key={idx} x1={a.x.toFixed(1)} y1={a.y.toFixed(1)} x2={b.x.toFixed(1)} y2={b.y.toFixed(1)}
                stroke={LINK_C} strokeWidth={(0.5 + strength * 2.4).toFixed(2)} opacity={(0.35 + strength * 0.55).toFixed(2)}>
                <title>{titulo(productos[p.i])} + {titulo(productos[p.j])}: {p.v} folios en común</title>
              </line>
            )
          })}
          {nodePos.map((pos, i) => {
            const isHub = pos.isHub
            const r = isHub ? Math.min(11, 6 + (clusterSize[i] || 0) * 0.7) : 3.4
            const color = isHub ? HUB_C : SAT_C
            const dirX = Math.cos(pos.ang)
            const dirY = Math.sin(pos.ang)
            const labelX = pos.x + dirX * (r + 6)
            const labelY = pos.y + dirY * (r + 6) + 3
            const anchor = dirX >= 0 ? 'start' : 'end'
            return (
              <g key={i}>
                <circle cx={pos.x} cy={pos.y} r={r} fill={color} stroke="#fff" strokeWidth={isHub ? 1.8 : 1.2}>
                  <title>{titulo(productos[i])} · {grado[i]} folios conectados{isHub ? ' · producto hub' : ''}</title>
                </circle>
                <text x={labelX} y={labelY} fontSize={isHub ? 8 : 6.8} fontWeight={isHub ? 700 : 400} fill={isHub ? '#0f1f3d' : '#64748b'} textAnchor={anchor}>{titulo(productos[i], isHub ? 24 : 18)}</text>
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
                <span style={{ color: HUB_C, fontWeight: 700, flexShrink: 0 }}>{p.v} folios</span>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 14, marginTop: 12, fontSize: 10.5, color: '#64748b' }}>
            <span><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: HUB_C, marginRight: 5 }} />Producto hub</span>
            <span><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: SAT_C, marginRight: 5 }} />Producto satélite</span>
          </div>
        </div>
      </div>
    </div>
  )
}
