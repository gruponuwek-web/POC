import React, { useMemo, useRef, useState } from 'react'
import { kde, histogram } from '../utils/density.js'
import InfoTip from './InfoTip.jsx'

const C25 = '#22c55e', C26 = '#7c3aed'
const N_BINS = 16

function Curva({ pts, minX, maxX, maxY, W, H, padL, padR, padT, padB, color }) {
  if (!pts.length) return null
  const xFor = x => padL + (x - minX) / (maxX - minX || 1) * (W - padL - padR)
  const yFor = y => padT + (1 - y / maxY) * (H - padT - padB)
  const line = pts.map(p => `${xFor(p.x).toFixed(1)},${yFor(p.y).toFixed(1)}`).join(' L ')
  return <path d={`M ${line}`} fill="none" stroke={color} strokeWidth="2.2" strokeLinejoin="round" />
}

// Barras del histograma debajo de la curva (como un histograma clásico con curva normal
// superpuesta): la altura de cada barra es proporcional a su conteo, escalada para compartir
// el mismo alto visual que la curva de densidad (que no tiene unidades mostradas en el eje Y).
function Barras({ bins, maxCount, minX, maxX, W, H, padL, padR, padT, padB, color, side }) {
  if (!bins.length || maxCount <= 0) return null
  const plotW = W - padL - padR, plotH = H - padT - padB
  const yBase = padT + plotH
  const binW = plotW / bins.length
  const barW = side ? binW * 0.42 : binW * 0.82
  return (
    <g>
      {bins.map((b, i) => {
        if (b.count <= 0) return null
        const xCenter = padL + (i + 0.5) * binW
        const x = side === 'left' ? xCenter - barW - 1 : side === 'right' ? xCenter + 1 : xCenter - barW / 2
        const h = (b.count / maxCount) * plotH * 0.92
        return <rect key={i} x={x} y={yBase - h} width={barW} height={h} fill={color} opacity="0.32" rx="1.5" />
      })}
    </g>
  )
}

// Etiqueta en el pico de la curva (bin con más clientes): identifica el rango de valores
// donde se agrupa la mayoría, con el conteo de clientes en ese rango.
// `rowY`, si se da, fija la etiqueta en una fila horizontal constante cerca del techo del
// gráfico (en vez de pegada a la altura de su propia barra) — así, cuando hay 2 series, sus
// picos nunca se traslapan aunque caigan muy cerca en el eje X o tengan alturas parecidas.
function EtiquetaPico({ bins, maxCount, minX, maxX, W, H, padL, padR, padT, padB, color, fmtX, logScale, rowY }) {
  if (!bins.length || maxCount <= 0) return null
  const plotW = W - padL - padR, plotH = H - padT - padB
  const binW = plotW / bins.length
  let top = bins[0], topI = 0
  bins.forEach((b, i) => { if (b.count > top.count) { top = b; topI = i } })
  if (top.count <= 0) return null
  const xCenter = padL + (topI + 0.5) * binW
  const h = (top.count / maxCount) * plotH * 0.92
  const barTopY = padT + plotH - h
  const labelY = rowY != null ? rowY : barTopY - 5
  const mid = (top.x0 + top.x1) / 2
  const val = logScale ? Math.pow(10, mid) - 1 : mid
  return (
    <g>
      <line x1={xCenter} x2={xCenter} y1={barTopY - 2} y2={labelY + 3} stroke={color} strokeWidth="1" opacity="0.5" />
      <text x={xCenter} y={labelY} fontSize="8.5" fontWeight="700" fill={color} textAnchor="middle">
        {top.count} · {fmtX(val)}
      </text>
    </g>
  )
}

function Panel({ titulo, sub, info, valores25, valores26, fmtX, logScale, nXTicks = 9, rotateLabels = false, show25 = true, show26 = true }) {
  const t25 = useMemo(() => logScale ? valores25.map(v => Math.log10(Math.max(1, v) + 1)) : valores25, [valores25, logScale])
  const t26 = useMemo(() => logScale ? valores26.map(v => Math.log10(Math.max(1, v) + 1)) : valores26, [valores26, logScale])
  const k25 = useMemo(() => show25 ? kde(t25) : { points: [], min: Infinity, max: -Infinity }, [t25, show25])
  const k26 = useMemo(() => show26 ? kde(t26) : { points: [], min: Infinity, max: -Infinity }, [t26, show26])
  const W = 360, H = rotateLabels ? 220 : 200, padL = 30, padR = 12, padT = 22, padB = rotateLabels ? 40 : 22
  const minX = Math.min(show25 ? k25.min : Infinity, show26 ? k26.min : Infinity, 0)
  const maxX = Math.max(show25 ? k25.max : -Infinity, show26 ? k26.max : -Infinity, 1)
  const maxY = Math.max(...k25.points.map(p => p.y), ...k26.points.map(p => p.y), 0.001) * 1.08
  const yTicks = [0.25, 0.5, 0.75, 1].map(f => f * maxY)
  const xTicks = Array.from({ length: nXTicks }, (_, i) => minX + (maxX - minX) * i / (nXTicks - 1))

  const h25 = useMemo(() => show25 ? histogram(t25, minX, maxX, N_BINS) : [], [t25, show25, minX, maxX])
  const h26 = useMemo(() => show26 ? histogram(t26, minX, maxX, N_BINS) : [], [t26, show26, minX, maxX])
  const maxCount = Math.max(...h25.map(b => b.count), ...h26.map(b => b.count), 1)
  const ambas = show25 && show26

  // Hover: crosshair + tooltip con el rango del bin y cuántos clientes caen ahí, por serie.
  const svgRef = useRef(null)
  const [hover, setHover] = useState(null) // { i, xCenter }
  const binW = (W - padL - padR) / N_BINS
  const handleMove = (e) => {
    const svg = svgRef.current
    if (!svg) return
    const rect = svg.getBoundingClientRect()
    if (!rect.width) return
    const svgX = (e.clientX - rect.left) * (W / rect.width)
    if (svgX < padL || svgX > W - padR) { setHover(null); return }
    let i = Math.floor((svgX - padL) / binW)
    if (i < 0) i = 0; if (i >= N_BINS) i = N_BINS - 1
    setHover({ i, xCenter: padL + (i + 0.5) * binW })
  }
  const bin25 = hover ? h25[hover.i] : null
  const bin26 = hover ? h26[hover.i] : null
  const hoverBin = bin25 || bin26
  const hoverActivo = hover && hoverBin && ((bin25 && bin25.count > 0) || (bin26 && bin26.count > 0))

  return (
    <div style={{ background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: 10, padding: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: sub ? 1 : 8 }}>
        <span style={{ fontSize: 11.5, fontWeight: 700, color: '#0f1f3d', textTransform: 'uppercase', letterSpacing: '.4px' }}>{titulo}</span>
        {info && <InfoTip text={info} />}
      </div>
      {sub && <div style={{ fontSize: 10.5, color: '#94a3b8', fontStyle: 'italic', marginBottom: 8 }}>{sub}</div>}
      <div style={{ position: 'relative' }}>
        <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', display: 'block', cursor: 'crosshair' }}
          onMouseMove={handleMove} onMouseLeave={() => setHover(null)}>
          {yTicks.map((y, i) => {
            const yy = padT + (1 - y / maxY) * (H - padT - padB)
            return <line key={i} x1={padL} x2={W - padR} y1={yy} y2={yy} stroke="#f1f5f9" strokeWidth="1" />
          })}
          {show25 && <Barras bins={h25} maxCount={maxCount} minX={minX} maxX={maxX} W={W} H={H} padL={padL} padR={padR} padT={padT} padB={padB} color={C25} side={ambas ? 'left' : null} />}
          {show26 && <Barras bins={h26} maxCount={maxCount} minX={minX} maxX={maxX} W={W} H={H} padL={padL} padR={padR} padT={padT} padB={padB} color={C26} side={ambas ? 'right' : null} />}
          {show25 && <Curva pts={k25.points} minX={minX} maxX={maxX} maxY={maxY} W={W} H={H} padL={padL} padR={padR} padT={padT} padB={padB} color={C25} />}
          {show26 && <Curva pts={k26.points} minX={minX} maxX={maxX} maxY={maxY} W={W} H={H} padL={padL} padR={padR} padT={padT} padB={padB} color={C26} />}
          {show25 && <EtiquetaPico bins={h25} maxCount={maxCount} minX={minX} maxX={maxX} W={W} H={H} padL={padL} padR={padR} padT={padT} padB={padB} color={C25} fmtX={fmtX} logScale={logScale} rowY={ambas ? 10 : null} />}
          {show26 && <EtiquetaPico bins={h26} maxCount={maxCount} minX={minX} maxX={maxX} W={W} H={H} padL={padL} padR={padR} padT={padT} padB={padB} color={C26} fmtX={fmtX} logScale={logScale} rowY={ambas ? 20 : null} />}
          <line x1={padL} x2={W - padR} y1={H - padB} y2={H - padB} stroke="#cbd5e1" strokeWidth="1" />
          {xTicks.map((x, i) => {
            const xx = padL + (x - minX) / (maxX - minX || 1) * (W - padL - padR)
            const label = fmtX(logScale ? Math.pow(10, x) - 1 : x)
            return (
              <g key={i}>
                <line x1={xx} x2={xx} y1={H - padB} y2={H - padB + 3} stroke="#cbd5e1" strokeWidth="1" />
                {rotateLabels
                  ? <text x={xx} y={H - padB + 12} fontSize="8" fill="#94a3b8" textAnchor="end" transform={`rotate(-40 ${xx} ${H - padB + 12})`}>{label}</text>
                  : <text x={xx} y={H - 6} fontSize="8" fill="#94a3b8" textAnchor="middle">{label}</text>}
              </g>
            )
          })}
          {hoverActivo && <line x1={hover.xCenter} x2={hover.xCenter} y1={padT} y2={H - padB} stroke="#94a3b8" strokeWidth="1" strokeDasharray="3 3" />}
        </svg>
        {hoverActivo && (() => {
          const val0 = fmtX(logScale ? Math.pow(10, hoverBin.x0) - 1 : hoverBin.x0)
          const val1 = fmtX(logScale ? Math.pow(10, hoverBin.x1) - 1 : hoverBin.x1)
          const leftPct = (hover.xCenter / W) * 100
          const align = leftPct > 68 ? 'translateX(-100%)' : leftPct < 12 ? 'translateX(0)' : 'translateX(-50%)'
          return (
            <div style={{
              position: 'absolute', left: `${leftPct}%`, top: 2, transform: align,
              background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: 8, padding: '7px 11px',
              boxShadow: '0 4px 12px rgba(0,0,0,.12)', fontSize: 11, pointerEvents: 'none', zIndex: 5, whiteSpace: 'nowrap',
            }}>
              <div style={{ fontWeight: 700, color: '#0f1f3d', marginBottom: 3 }}>{val0} – {val1}</div>
              {show25 && bin25 && bin25.count > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, color: C25 }}>
                  <span>2025:</span><span style={{ fontWeight: 700 }}>{bin25.count} cliente{bin25.count === 1 ? '' : 's'}</span>
                </div>
              )}
              {show26 && bin26 && bin26.count > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, color: C26 }}>
                  <span>2026:</span><span style={{ fontWeight: 700 }}>{bin26.count} cliente{bin26.count === 1 ? '' : 's'}</span>
                </div>
              )}
            </div>
          )
        })()}
      </div>
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
  const año = filtros?.vgAño || 'todos'
  const show25 = año !== '2026', show26 = año !== '2025'
  const titulo = año === '2025' ? '2025' : año === '2026' ? '2026' : '2025 vs 2026'
  const desc = año === '2025' ? 'Cómo compraron tus clientes en 2025. La parte más alta de la curva es donde se agrupa la mayoría.'
    : año === '2026' ? 'Cómo han comprado tus clientes en 2026. La parte más alta de la curva es donde se agrupa la mayoría.'
    : 'Compara a los clientes de 2025 contra los de 2026: ¿compraron más seguido? ¿gastaron más? La parte más alta de cada curva es donde se agrupa la mayoría de los clientes.'

  return (
    <div style={{ background: '#fff', borderRadius: 10, border: '1.5px solid #e2e8f0', boxShadow: '0 1px 4px rgba(0,0,0,.05)', overflow: 'hidden', marginBottom: 16 }}>
      <div style={{ padding: '14px 18px 0', display: 'flex', alignItems: 'center' }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#0f1f3d', textTransform: 'uppercase', letterSpacing: '.4px' }}>📉 Distribución de Compra por Cliente — {titulo}</span>
        <InfoTip text="Densidad estimada (KDE) sobre los clientes con compra en el alcance filtrado. Si filtras Proveedor o Línea, la frecuencia cuenta solo los tickets donde compraron algo de ese proveedor/línea, y el monto es solo lo gastado en ese proveedor/línea. Compara cómo cambió el patrón de compra de un año a otro." />
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
          nXTicks={7}
          rotateLabels
          logScale
          show25={show25} show26={show26}
        />
      </div>
    </div>
  )
}
