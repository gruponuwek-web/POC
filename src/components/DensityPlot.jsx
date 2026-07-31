import React, { useMemo } from 'react'
import { kde } from '../utils/density.js'
import InfoTip from './InfoTip.jsx'

const C25 = '#22c55e', C26 = '#7c3aed'

function Curva({ pts, minX, maxX, maxY, W, H, padL, padR, padT, padB, color }) {
  if (!pts.length) return null
  const xFor = x => padL + (x - minX) / (maxX - minX || 1) * (W - padL - padR)
  const yFor = y => padT + (1 - y / maxY) * (H - padT - padB)
  const yBase = yFor(0)
  const line = pts.map(p => `${xFor(p.x).toFixed(1)},${yFor(p.y).toFixed(1)}`).join(' L ')
  const area = `M ${xFor(pts[0].x).toFixed(1)},${yBase.toFixed(1)} L ${line} L ${xFor(pts[pts.length - 1].x).toFixed(1)},${yBase.toFixed(1)} Z`
  return (
    <g>
      <path d={area} fill={color} opacity="0.35" />
      <path d={`M ${line}`} fill="none" stroke={color} strokeWidth="2.2" strokeLinejoin="round" />
    </g>
  )
}

function Panel({ titulo, info, valores25, valores26, fmtX, logScale }) {
  const t25 = useMemo(() => logScale ? valores25.map(v => Math.log10(Math.max(1, v) + 1)) : valores25, [valores25, logScale])
  const t26 = useMemo(() => logScale ? valores26.map(v => Math.log10(Math.max(1, v) + 1)) : valores26, [valores26, logScale])
  const k25 = useMemo(() => kde(t25), [t25])
  const k26 = useMemo(() => kde(t26), [t26])
  const W = 360, H = 190, padL = 30, padR = 12, padT = 12, padB = 22
  const minX = Math.min(k25.min, k26.min, 0)
  const maxX = Math.max(k25.max, k26.max, 1)
  const maxY = Math.max(...k25.points.map(p => p.y), ...k26.points.map(p => p.y), 0.001) * 1.08
  const yTicks = [0.25, 0.5, 0.75, 1].map(f => f * maxY)
  const xTicks = Array.from({ length: 6 }, (_, i) => minX + (maxX - minX) * i / 5)

  return (
    <div style={{ background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: 10, padding: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontSize: 11.5, fontWeight: 700, color: '#0f1f3d', textTransform: 'uppercase', letterSpacing: '.4px' }}>{titulo}</span>
        {info && <InfoTip text={info} />}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', display: 'block' }}>
        {yTicks.map((y, i) => {
          const yy = padT + (1 - y / maxY) * (H - padT - padB)
          return <line key={i} x1={padL} x2={W - padR} y1={yy} y2={yy} stroke="#f1f5f9" strokeWidth="1" />
        })}
        <Curva pts={k25.points} minX={minX} maxX={maxX} maxY={maxY} W={W} H={H} padL={padL} padR={padR} padT={padT} padB={padB} color={C25} />
        <Curva pts={k26.points} minX={minX} maxX={maxX} maxY={maxY} W={W} H={H} padL={padL} padR={padR} padT={padT} padB={padB} color={C26} />
        <line x1={padL} x2={W - padR} y1={H - padB} y2={H - padB} stroke="#cbd5e1" strokeWidth="1" />
        {xTicks.map((x, i) => (
          <text key={i} x={padL + (x - minX) / (maxX - minX || 1) * (W - padL - padR)} y={H - 6} fontSize="8.5" fill="#94a3b8" textAnchor="middle">{fmtX(logScale ? Math.pow(10, x) - 1 : x)}</text>
        ))}
      </svg>
      <div style={{ display: 'flex', gap: 14, marginTop: 4, fontSize: 10.5, color: '#64748b' }}>
        <span><span style={{ display: 'inline-block', width: 10, height: 10, background: C25, borderRadius: 2, marginRight: 5, opacity: .75 }} />2025</span>
        <span><span style={{ display: 'inline-block', width: 10, height: 10, background: C26, borderRadius: 2, marginRight: 5, opacity: .75 }} />2026</span>
      </div>
    </div>
  )
}

export default function DensityPlot({ ap }) {
  if (!ap || !ap.densidad || !ap.densidad['2025'] || !ap.densidad['2026']) return null
  const d25 = ap.densidad['2025'], d26 = ap.densidad['2026']
  if (!d25.frecuencias.length && !d26.frecuencias.length) return null

  return (
    <div style={{ background: '#fff', borderRadius: 10, border: '1.5px solid #e2e8f0', boxShadow: '0 1px 4px rgba(0,0,0,.05)', overflow: 'hidden', marginBottom: 16 }}>
      <div style={{ padding: '14px 18px 0', display: 'flex', alignItems: 'center' }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#0f1f3d', textTransform: 'uppercase', letterSpacing: '.4px' }}>📉 Distribución de Compra por Cliente — 2025 vs 2026</span>
        <InfoTip text="Densidad estimada (KDE) sobre todos los clientes con compra en el año. Compara cómo cambió el patrón de compra de un año a otro." />
      </div>
      <div style={{ padding: 16, display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 16 }}>
        <Panel
          titulo="Frecuencia de compra (tickets por cliente)"
          info="Número de tickets/compras distintas por cliente en el año. Un pico más a la derecha indica clientes comprando más seguido."
          valores25={d25.frecuencias} valores26={d26.frecuencias}
          fmtX={x => Math.round(x)}
        />
        <Panel
          titulo="Monto de compra (venta total por cliente, escala log)"
          info="Venta total anual por cliente. Escala logarítmica porque el gasto está muy sesgado (unos pocos clientes mayoristas gastan mucho más que la mayoría). Un pico más a la derecha indica clientes con mayor gasto."
          valores25={d25.montos} valores26={d26.montos}
          fmtX={x => x >= 1000 ? `$${Math.round(x / 1000)}k` : `$${Math.round(x)}`}
          logScale
        />
      </div>
    </div>
  )
}
