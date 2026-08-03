import React from 'react'
import { fmt } from '../utils/format.js'
import { scopeLabel } from '../utils/ventasGeneral.js'

const MESES3 = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

function titulo(s) {
  return String(s || '').toLowerCase().replace(/\b\w/g, c => c.toUpperCase())
}

// Regresión lineal simple sobre puntos {i, v} (i = índice secuencial 0..n-1)
function regresion(points) {
  const n = points.length
  if (n < 2) return null
  let sx = 0, sy = 0, sxy = 0, sxx = 0
  points.forEach((p, idx) => { sx += idx; sy += p.v; sxy += idx * p.v; sxx += idx * idx })
  const slope = (n * sxy - sx * sy) / (n * sxx - sx * sx || 1)
  const intercept = (sy - slope * sx) / n
  return { at: idx => Math.max(0, intercept + slope * idx), up: slope >= 0 }
}

// Path suavizado (curva) a través de una lista de puntos {x,y}
function smoothPath(pts) {
  if (pts.length === 0) return ''
  if (pts.length === 1) return `M ${pts[0].x},${pts[0].y}`
  let d = `M ${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`
  for (let i = 1; i < pts.length; i++) {
    const xc = (pts[i - 1].x + pts[i].x) / 2
    const yc = (pts[i - 1].y + pts[i].y) / 2
    d += ` Q ${pts[i - 1].x.toFixed(1)},${pts[i - 1].y.toFixed(1)} ${xc.toFixed(1)},${yc.toFixed(1)}`
  }
  const last = pts[pts.length - 1]
  d += ` L ${last.x.toFixed(1)},${last.y.toFixed(1)}`
  return d
}

// Línea de tendencia con brillo (glow) + puntos con anillo blanco
function TrendLine({ pts, color, id, thin }) {
  if (!pts || pts.length < 2) return null
  const d = smoothPath(pts)
  const w = thin ? 1.8 : 3
  return (
    <g>
      <path d={d} fill="none" stroke={color} strokeWidth={w + 3} strokeLinecap="round" strokeLinejoin="round" opacity="0.16" />
      <path d={d} fill="none" stroke={color} strokeWidth={w} strokeDasharray={thin ? '3 4' : '6 4'} strokeLinecap="round" strokeLinejoin="round" />
      {pts.map((p, i) => (
        <circle key={id + i} cx={p.x} cy={p.y} r={thin ? 2.6 : 3.6} fill={color} stroke="#fff" strokeWidth={thin ? 1.2 : 1.6} />
      ))}
    </g>
  )
}

export default function VentaMensualComparativa({ g, filtros }) {
  if (!g || !g.mesesY.length) return null

  const equipo = filtros.equipo || 'todos'
  const scoped = equipo === 'comercial' ? 'comercial' : equipo === 'resto' ? 'resto' : 'todos'
  const alcance = scopeLabel(filtros)
  const añoFiltro = filtros.vgAño || 'todos'

  const vYear = (d, year) => {
    const s = d && d[year]; if (!s) return { com: 0, resto: 0, total: 0 }
    const com = scoped === 'resto' ? 0 : s.vc
    const resto = scoped === 'comercial' ? 0 : s.vr
    return { com, resto, total: com + resto }
  }

  const agrupado = añoFiltro === 'todos'
  let chart
  if (agrupado) {
    chart = g.mesesY.map(m => { const d = g.porMesY[m]; return { mes: m, a: vYear(d, 2025).total, b: vYear(d, 2026).total } })
  } else {
    const yr = añoFiltro === '2025' ? 2025 : 2026
    chart = g.mesesY.map(m => { const v = vYear(g.porMesY[m], yr); return { mes: m, com: v.com, resto: v.resto, total: v.total } }).filter(c => c.total > 0)
  }
  const maxTop = g.topResto.length ? g.topResto[0].venta : 1
  const mostrarTopResto = scoped !== 'comercial' && g.topResto.length > 0

  // Tendencia principal: 2026 en modo agrupado (o el total en modo año único)
  const trendPoints = agrupado ? chart.filter(c => c.b > 0).map(c => ({ mes: c.mes, v: c.b })) : chart.map(c => ({ mes: c.mes, v: c.total }))
  const trend = regresion(trendPoints)
  // Tendencia de referencia 2025 (solo en modo agrupado)
  const trend25Points = agrupado ? chart.filter(c => c.a > 0).map(c => ({ mes: c.mes, v: c.a })) : []
  const trend25 = regresion(trend25Points)

  // Geometría SVG
  const N = chart.length
  const W = 760, H = 210, padL = 12, padR = 12, padT = 20, padB = 26
  const slot = (W - padL - padR) / Math.max(1, N)
  const xC = i => padL + (i + 0.5) * slot
  const yBase = H - padB
  const maxV = Math.max(
    ...chart.map(c => agrupado ? Math.max(c.a, c.b) : c.total),
    trend ? trend.at(trendPoints.length - 1) : 0,
    trend25 ? trend25.at(trend25Points.length - 1) : 0,
    1
  )
  const yTop = v => yBase - (v / maxV) * (H - padT - padB)

  const barWPair = Math.min(22, slot * 0.36)
  const barWSingle = Math.min(46, slot * 0.6)

  const aX = i => xC(i) - barWPair / 2 - 1.5
  const bX = i => xC(i) + barWPair / 2 + 1.5

  const trendPts = trend ? trendPoints.map((p, idx) => {
    const i = chart.findIndex(c => c.mes === p.mes)
    return { x: agrupado ? bX(i) : xC(i), y: yTop(trend.at(idx)) }
  }) : []
  const trend25Pts = trend25 ? trend25Points.map((p, idx) => {
    const i = chart.findIndex(c => c.mes === p.mes)
    return { x: aX(i), y: yTop(trend25.at(idx)) }
  }) : []

  return (
    <div style={{ background: '#fff', borderRadius: 10, border: '1.5px solid #e2e8f0', boxShadow: '0 1px 4px rgba(0,0,0,.05)', overflow: 'hidden', marginBottom: 16 }}>
      <div style={{ padding: '14px 16px 0', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#0f1f3d', textTransform: 'uppercase', letterSpacing: '.4px' }}>📊 Venta mensual {agrupado ? '— 2025 vs 2026' : añoFiltro} — {alcance}</span>
        {trend && (
          <span style={{ background: trend.up ? '#dcfce7' : '#fee2e2', color: trend.up ? '#15803d' : '#b91c1c', padding: '1px 8px', borderRadius: 8, fontSize: 10.5, fontWeight: 700 }}>
            {trend.up ? '▲ Tendencia al alza' : '▼ Tendencia a la baja'} {agrupado ? '2026' : ''}
          </span>
        )}
      </div>

      <div style={{ padding: 16, display: 'grid', gridTemplateColumns: mostrarTopResto ? '1.3fr 1fr' : '1fr', gap: 16, alignItems: 'start' }}>

        <div>
          <div style={{ width: '100%', overflowX: 'auto' }}>
            <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', minWidth: 520, display: 'block' }}>
              {[0.25, 0.5, 0.75].map(f => <line key={f} x1={padL} x2={W - padR} y1={padT + f * (H - padT - padB)} y2={padT + f * (H - padT - padB)} stroke="#f1f5f9" strokeWidth="1" />)}

              {agrupado ? chart.map((c, i) => (
                <g key={c.mes}>
                  {c.a > 0 && <>
                    <rect x={xC(i) - barWPair - 1.5} y={yTop(c.a)} width={barWPair} height={Math.max(0, yBase - yTop(c.a))} rx="2.5" fill="#93c5fd" />
                    <text x={xC(i) - barWPair / 2 - 1.5} y={yTop(c.a) - 4} fontSize="8" fill="#64748b" textAnchor="middle" fontWeight="700">${(c.a / 1e6).toFixed(1)}M</text>
                  </>}
                  {c.b > 0 && <>
                    <rect x={xC(i) + 1.5} y={yTop(c.b)} width={barWPair} height={Math.max(0, yBase - yTop(c.b))} rx="2.5" fill="#1a6cf0" />
                    <text x={xC(i) + barWPair / 2 + 1.5} y={yTop(c.b) - 4} fontSize="8" fill="#1a6cf0" textAnchor="middle" fontWeight="700">${(c.b / 1e6).toFixed(1)}M</text>
                  </>}
                </g>
              )) : chart.map((c, i) => (
                <g key={c.mes}>
                  {c.resto > 0 && <rect x={xC(i) - barWSingle / 2} y={yTop(c.resto)} width={barWSingle} height={Math.max(0, yBase - yTop(c.resto))} rx="3" fill="#f59e0b" />}
                  {c.com > 0 && <rect x={xC(i) - barWSingle / 2} y={yTop(c.total)} width={barWSingle} height={Math.max(0, yTop(c.resto) - yTop(c.total))} rx={c.resto > 0 ? 0 : 3} fill="#1a6cf0" />}
                  <text x={xC(i)} y={yTop(c.total) - 4} fontSize="9" fill="#64748b" textAnchor="middle" fontWeight="600">${(c.total / 1e6).toFixed(1)}M</text>
                </g>
              ))}

              {trend25 && <TrendLine pts={trend25Pts} color="#94a3b8" id="t25" thin />}
              {trend && <TrendLine pts={trendPts} color="#0f1f3d" id="t26" />}

              {chart.map((c, i) => <text key={c.mes} x={xC(i)} y={H - 8} fontSize="10" fill="#94a3b8" textAnchor="middle">{MESES3[c.mes - 1]}</text>)}
            </svg>
          </div>
          <div style={{ display: 'flex', gap: 16, marginTop: 4, fontSize: 10.5, color: '#64748b', flexWrap: 'wrap' }}>
            {agrupado ? <>
              <span><span style={{ display: 'inline-block', width: 10, height: 10, background: '#93c5fd', borderRadius: 2, marginRight: 5 }} />2025</span>
              <span><span style={{ display: 'inline-block', width: 10, height: 10, background: '#1a6cf0', borderRadius: 2, marginRight: 5 }} />2026 (a jul)</span>
            </> : <>
              <span><span style={{ display: 'inline-block', width: 10, height: 10, background: '#1a6cf0', borderRadius: 2, marginRight: 5 }} />Comercial</span>
              <span><span style={{ display: 'inline-block', width: 10, height: 10, background: '#f59e0b', borderRadius: 2, marginRight: 5 }} />El resto</span>
            </>}
            {trend && <span><span style={{ display: 'inline-block', width: 14, height: 0, borderTop: '3px dashed #0f1f3d', marginRight: 5, verticalAlign: 'middle' }} />Tendencia {agrupado ? '2026' : ''}</span>}
            {trend25 && <span><span style={{ display: 'inline-block', width: 14, height: 0, borderTop: '2px dashed #94a3b8', marginRight: 5, verticalAlign: 'middle' }} />Tendencia 2025</span>}
          </div>
        </div>

        {mostrarTopResto && (
          <div style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: 9, padding: '12px 14px' }}>
            <div style={{ fontSize: 10.5, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: 10 }}>Top vendedores fuera del equipo comercial</div>
            {g.topResto.map((r, i) => (
              <div key={r.nombre} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', borderBottom: '1px solid #eef2f7' }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', width: 14 }}>{i + 1}</span>
                <span style={{ fontSize: 11.5, fontWeight: 600, flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{titulo(r.nombre)}</span>
                <div style={{ width: 60, background: '#e2e8f0', borderRadius: 3, height: 6, overflow: 'hidden', flexShrink: 0 }}>
                  <div style={{ width: `${r.venta / maxTop * 100}%`, height: '100%', background: '#f59e0b' }} />
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, width: 66, textAlign: 'right', flexShrink: 0 }}>${(r.venta / 1e6).toFixed(1)}M</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
