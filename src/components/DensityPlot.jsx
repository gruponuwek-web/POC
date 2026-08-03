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

function Panel({ titulo, sub, info, valores25, valores26, fmtX, logScale, nXTicks = 6, rotateLabels = false, show25 = true, show26 = true }) {
  const t25 = useMemo(() => logScale ? valores25.map(v => Math.log10(Math.max(1, v) + 1)) : valores25, [valores25, logScale])
  const t26 = useMemo(() => logScale ? valores26.map(v => Math.log10(Math.max(1, v) + 1)) : valores26, [valores26, logScale])
  const k25 = useMemo(() => show25 ? kde(t25) : { points: [], min: Infinity, max: -Infinity }, [t25, show25])
  const k26 = useMemo(() => show26 ? kde(t26) : { points: [], min: Infinity, max: -Infinity }, [t26, show26])
  const W = 360, H = rotateLabels ? 208 : 190, padL = 30, padR = 12, padT = 12, padB = rotateLabels ? 40 : 22
  const minX = Math.min(show25 ? k25.min : Infinity, show26 ? k26.min : Infinity, 0)
  const maxX = Math.max(show25 ? k25.max : -Infinity, show26 ? k26.max : -Infinity, 1)
  const maxY = Math.max(...k25.points.map(p => p.y), ...k26.points.map(p => p.y), 0.001) * 1.08
  const yTicks = [0.25, 0.5, 0.75, 1].map(f => f * maxY)
  const xTicks = Array.from({ length: nXTicks }, (_, i) => minX + (maxX - minX) * i / (nXTicks - 1))

  return (
    <div style={{ background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: 10, padding: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: sub ? 1 : 8 }}>
        <span style={{ fontSize: 11.5, fontWeight: 700, color: '#0f1f3d', textTransform: 'uppercase', letterSpacing: '.4px' }}>{titulo}</span>
        {info && <InfoTip text={info} />}
      </div>
      {sub && <div style={{ fontSize: 10.5, color: '#94a3b8', fontStyle: 'italic', marginBottom: 8 }}>{sub}</div>}
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', display: 'block' }}>
        {yTicks.map((y, i) => {
          const yy = padT + (1 - y / maxY) * (H - padT - padB)
          return <line key={i} x1={padL} x2={W - padR} y1={yy} y2={yy} stroke="#f1f5f9" strokeWidth="1" />
        })}
        {show25 && <Curva pts={k25.points} minX={minX} maxX={maxX} maxY={maxY} W={W} H={H} padL={padL} padR={padR} padT={padT} padB={padB} color={C25} />}
        {show26 && <Curva pts={k26.points} minX={minX} maxX={maxX} maxY={maxY} W={W} H={H} padL={padL} padR={padR} padT={padT} padB={padB} color={C26} />}
        <line x1={padL} x2={W - padR} y1={H - padB} y2={H - padB} stroke="#cbd5e1" strokeWidth="1" />
        {xTicks.map((x, i) => {
          const xx = padL + (x - minX) / (maxX - minX || 1) * (W - padL - padR)
          const label = fmtX(logScale ? Math.pow(10, x) - 1 : x)
          return rotateLabels
            ? <text key={i} x={xx} y={H - padB + 12} fontSize="8" fill="#94a3b8" textAnchor="end" transform={`rotate(-40 ${xx} ${H - padB + 12})`}>{label}</text>
            : <text key={i} x={xx} y={H - 6} fontSize="8.5" fill="#94a3b8" textAnchor="middle">{label}</text>
        })}
      </svg>
      <div style={{ display: 'flex', gap: 14, marginTop: 4, fontSize: 10.5, color: '#64748b' }}>
        {show25 && <span><span style={{ display: 'inline-block', width: 10, height: 10, background: C25, borderRadius: 2, marginRight: 5, opacity: .75 }} />2025</span>}
        {show26 && <span><span style={{ display: 'inline-block', width: 10, height: 10, background: C26, borderRadius: 2, marginRight: 5, opacity: .75 }} />2026</span>}
      </div>
    </div>
  )
}

export default function DensityPlot({ ap, filtros }) {
  if (!ap || !ap.densidad || !ap.densidad['2025'] || !ap.densidad['2026']) return null
  const d25 = ap.densidad['2025'], d26 = ap.densidad['2026']
  if (!d25.frecuencias.length && !d26.frecuencias.length) return null

  // El filtro de Mes/Sucursal/Equipo ya viene aplicado dentro de d25/d26. El de Año decide
  // si se muestra la comparación completa o solo la curva del año elegido (si no, el filtro
  // de Año parecería "no hacer nada" en esta gráfica aunque el resto de la página sí cambie).
  const año = filtros?.año || 'todos'
  const show25 = año !== '2026', show26 = año !== '2025'
  const titulo = año === '2025' ? '2025' : año === '2026' ? '2026' : '2025 vs 2026'
  const desc = año === '2025' ? 'Cómo compraron tus clientes en 2025. La parte más alta de la curva es donde se agrupa la mayoría.'
    : año === '2026' ? 'Cómo han comprado tus clientes en 2026. La parte más alta de la curva es donde se agrupa la mayoría.'
    : 'Compara a los clientes de 2025 contra los de 2026: ¿compraron más seguido? ¿gastaron más? La parte más alta de cada curva es donde se agrupa la mayoría de los clientes.'

  return (
    <div style={{ background: '#fff', borderRadius: 10, border: '1.5px solid #e2e8f0', boxShadow: '0 1px 4px rgba(0,0,0,.05)', overflow: 'hidden', marginBottom: 16 }}>
      <div style={{ padding: '14px 18px 0', display: 'flex', alignItems: 'center' }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#0f1f3d', textTransform: 'uppercase', letterSpacing: '.4px' }}>📉 Distribución de Compra por Cliente — {titulo}</span>
        <InfoTip text="Densidad estimada (KDE) sobre los clientes con compra en el alcance filtrado (Mes/Sucursal/Equipo aplican; Proveedor/Línea no, porque es a nivel de folio completo). Compara cómo cambió el patrón de compra de un año a otro." />
      </div>
      <div style={{ padding: '2px 18px 0', fontSize: 11, color: '#64748b' }}>
        {desc}
      </div>
      <div style={{ padding: 16, display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 16 }}>
        <Panel
          titulo="Frecuencia de compra (tickets por cliente)"
          sub="Entre más a la derecha esté la curva, más veces compró ese grupo de clientes en el año."
          info="Número de tickets/compras distintas por cliente en el año. Un pico más a la derecha indica clientes comprando más seguido."
          valores25={d25.frecuencias} valores26={d26.frecuencias}
          fmtX={x => Math.round(x)}
          show25={show25} show26={show26}
        />
        <Panel
          titulo="Monto de compra (venta total por cliente)"
          sub="Entre más a la derecha esté la curva, más dinero gastó ese grupo de clientes en el año."
          info="Venta total anual por cliente. Escala logarítmica porque el gasto está muy sesgado (unos pocos clientes mayoristas gastan mucho más que la mayoría). Un pico más a la derecha indica clientes con mayor gasto."
          valores25={d25.montos} valores26={d26.montos}
          fmtX={x => `$${Math.round(x).toLocaleString('es-MX')}`}
          nXTicks={5}
          rotateLabels
          logScale
          show25={show25} show26={show26}
        />
      </div>
    </div>
  )
}
