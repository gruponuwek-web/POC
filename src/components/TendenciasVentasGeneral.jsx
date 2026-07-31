import React from 'react'
import { fmt } from '../utils/format.js'
import { scopeLabel } from '../utils/ventasGeneral.js'
import InfoTip from './InfoTip.jsx'

const MESES3 = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

// Serie mensual {venta,costo,ops,mg} de un año, respetando el equipo
function serieAño(g, year, scoped) {
  const out = {}
  g.mesesY.forEach(m => {
    const s = g.porMesY[m] && g.porMesY[m][year]
    if (!s) return
    const venta = (scoped === 'resto' ? 0 : s.vc) + (scoped === 'comercial' ? 0 : s.vr)
    const costo = (scoped === 'resto' ? 0 : s.cc) + (scoped === 'comercial' ? 0 : s.cr)
    const ops = (scoped === 'resto' ? 0 : s.nc) + (scoped === 'comercial' ? 0 : s.nr)
    if (venta > 0 || ops > 0) out[m] = { venta, costo, ops, mg: venta > 0 ? (venta - costo) / venta * 100 : 0 }
  })
  return out
}

function Indicador({ label, valorTxt, delta, deltaTxt, esPuntos, info }) {
  const up = delta >= 0
  const color = up ? '#15803d' : '#b91c1c'
  const bg = up ? '#dcfce7' : '#fee2e2'
  return (
    <div style={{ flex: 1, minWidth: 150, background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: 9, padding: '10px 12px' }}>
      <div style={{ fontSize: 10.5, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.4px', display: 'flex', alignItems: 'center' }}>
        {label}{info && <InfoTip text={info} />}
      </div>
      <div style={{ fontSize: 18, fontWeight: 800, color: '#0f1f3d', margin: '3px 0 2px' }}>{valorTxt}</div>
      {delta != null && (
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: bg, color, padding: '2px 8px', borderRadius: 8, fontSize: 10.5, fontWeight: 700 }}>
          {up ? '▲' : '▼'} {deltaTxt}
          <span style={{ fontWeight: 500, color: '#64748b' }}>vs mes previo</span>
        </div>
      )}
    </div>
  )
}

export default function TendenciasVentasGeneral({ g, filtros }) {
  if (!g || !g.mesesY.length) return null

  const scoped = filtros.equipo === 'comercial' ? 'comercial' : filtros.equipo === 'resto' ? 'resto' : 'todos'
  const alcance = scopeLabel(filtros)
  const s2025 = serieAño(g, 2025, scoped)
  const s2026 = serieAño(g, 2026, scoped)

  // Serie "activa" para los indicadores: el año que se está viendo (2026 por defecto)
  const añoFiltro = filtros.año || 'todos'
  const serieAct = añoFiltro === '2025' ? s2025 : s2026
  const mesesAct = Object.keys(serieAct).map(Number).sort((a, b) => a - b)
  const añoAct = añoFiltro === '2025' ? 2025 : 2026

  let indVenta = null, indMargen = null, indOps = null
  if (mesesAct.length >= 2) {
    const ult = serieAct[mesesAct[mesesAct.length - 1]]
    const prev = serieAct[mesesAct[mesesAct.length - 2]]
    const pv = prev.venta > 0 ? (ult.venta - prev.venta) / prev.venta * 100 : 0
    const po = prev.ops > 0 ? (ult.ops - prev.ops) / prev.ops * 100 : 0
    const dm = ult.mg - prev.mg
    indVenta = { valor: fmt.moneda(ult.venta), delta: pv }
    indMargen = { valor: ult.mg.toFixed(1) + '%', delta: dm }
    indOps = { valor: fmt.num(ult.ops), delta: po }
  }
  const nombreMesUlt = mesesAct.length ? MESES3[mesesAct[mesesAct.length - 1] - 1] : ''

  // Gráfica de líneas (SVG) — venta mensual 2025 vs 2026
  const W = 720, H = 210, padL = 8, padR = 12, padT = 14, padB = 22
  const meses = g.mesesY
  const minM = meses[0], maxM = meses[meses.length - 1]
  const spanM = Math.max(1, maxM - minM)
  const maxV = Math.max(
    ...meses.map(m => (s2025[m]?.venta || 0)),
    ...meses.map(m => (s2026[m]?.venta || 0)),
    1
  )
  const xFor = m => padL + (m - minM) / spanM * (W - padL - padR)
  const yFor = v => padT + (1 - v / maxV) * (H - padT - padB)
  const linea = (serie, color, dash) => {
    const pts = meses.filter(m => serie[m]).map(m => `${xFor(m).toFixed(1)},${yFor(serie[m].venta).toFixed(1)}`)
    if (pts.length < 1) return null
    return (
      <g>
        <polyline points={pts.join(' ')} fill="none" stroke={color} strokeWidth="2.5" strokeDasharray={dash || 'none'} strokeLinecap="round" strokeLinejoin="round" />
        {meses.filter(m => serie[m]).map(m => <circle key={m} cx={xFor(m)} cy={yFor(serie[m].venta)} r="3" fill={color} />)}
      </g>
    )
  }

  return (
    <div style={{ background: '#fff', borderRadius: 10, border: '1.5px solid #e2e8f0', boxShadow: '0 1px 4px rgba(0,0,0,.05)', overflow: 'hidden', marginBottom: 16 }}>
      <div style={{ background: '#0f1f3d', padding: '12px 16px', display: 'flex', alignItems: 'center' }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#fff', textTransform: 'uppercase', letterSpacing: '.5px' }}>📈 Tendencias — {alcance}</span>
        <InfoTip text="Trayectoria mensual de la venta (línea) y variación del último mes con datos frente al mes anterior." light />
      </div>

      <div style={{ padding: 16 }}>
        {/* Indicadores mes a mes */}
        {indVenta && (
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
            <Indicador label={`Venta ${nombreMesUlt} ${añoAct}`} valorTxt={indVenta.valor} delta={indVenta.delta} deltaTxt={fmt.pct(Math.abs(indVenta.delta))} info="Venta del último mes con datos y su variación % contra el mes anterior." />
            <Indicador label={`Margen ${nombreMesUlt} ${añoAct}`} valorTxt={indMargen.valor} delta={indMargen.delta} deltaTxt={`${Math.abs(indMargen.delta).toFixed(1)} pts`} esPuntos info="Margen % del último mes; la variación es en puntos porcentuales vs el mes anterior." />
            <Indicador label={`Operaciones ${nombreMesUlt} ${añoAct}`} valorTxt={indOps.valor} delta={indOps.delta} deltaTxt={fmt.pct(Math.abs(indOps.delta))} info="Líneas de venta del último mes y su variación % vs el mes anterior." />
          </div>
        )}

        {/* Gráfica de líneas */}
        <div style={{ fontSize: 10.5, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: 6 }}>Trayectoria de venta mensual</div>
        <div style={{ width: '100%', overflowX: 'auto' }}>
          <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', minWidth: 480, display: 'block' }}>
            {[0.25, 0.5, 0.75].map(f => <line key={f} x1={padL} x2={W - padR} y1={padT + f * (H - padT - padB)} y2={padT + f * (H - padT - padB)} stroke="#f1f5f9" strokeWidth="1" />)}
            {linea(s2025, '#93c5fd')}
            {linea(s2026, '#1a6cf0')}
            {meses.map(m => <text key={m} x={xFor(m)} y={H - 6} fontSize="10" fill="#94a3b8" textAnchor="middle">{MESES3[m - 1]}</text>)}
          </svg>
        </div>
        <div style={{ display: 'flex', gap: 16, marginTop: 6, fontSize: 10.5, color: '#64748b' }}>
          <span><span style={{ display: 'inline-block', width: 14, height: 3, background: '#93c5fd', borderRadius: 2, marginRight: 5, verticalAlign: 'middle' }} />2025</span>
          <span><span style={{ display: 'inline-block', width: 14, height: 3, background: '#1a6cf0', borderRadius: 2, marginRight: 5, verticalAlign: 'middle' }} />2026 (a jul)</span>
        </div>
      </div>
    </div>
  )
}
