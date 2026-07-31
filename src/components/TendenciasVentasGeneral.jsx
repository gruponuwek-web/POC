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

function Indicador({ label, valorTxt, delta, deltaTxt, info }) {
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

  if (mesesAct.length < 2) return null

  const ult = serieAct[mesesAct[mesesAct.length - 1]]
  const prev = serieAct[mesesAct[mesesAct.length - 2]]
  const pv = prev.venta > 0 ? (ult.venta - prev.venta) / prev.venta * 100 : 0
  const po = prev.ops > 0 ? (ult.ops - prev.ops) / prev.ops * 100 : 0
  const dm = ult.mg - prev.mg
  const nombreMesUlt = MESES3[mesesAct[mesesAct.length - 1] - 1]

  return (
    <div style={{ background: '#fff', borderRadius: 10, border: '1.5px solid #e2e8f0', boxShadow: '0 1px 4px rgba(0,0,0,.05)', overflow: 'hidden', marginBottom: 16 }}>
      <div style={{ padding: '14px 16px 0', display: 'flex', alignItems: 'center' }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#0f1f3d', textTransform: 'uppercase', letterSpacing: '.4px' }}>📈 Último mes — {alcance}</span>
        <InfoTip text="Venta, margen y operaciones del último mes con datos, comparados contra el mes anterior." />
      </div>

      <div style={{ padding: 16, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <Indicador label={`Venta ${nombreMesUlt} ${añoAct}`} valorTxt={fmt.moneda(ult.venta)} delta={pv} deltaTxt={fmt.pct(Math.abs(pv))} info="Venta del último mes con datos y su variación % contra el mes anterior." />
        <Indicador label={`Margen ${nombreMesUlt} ${añoAct}`} valorTxt={ult.mg.toFixed(1) + '%'} delta={dm} deltaTxt={`${Math.abs(dm).toFixed(1)} pts`} info="Margen % del último mes; la variación es en puntos porcentuales vs el mes anterior." />
        <Indicador label={`Operaciones ${nombreMesUlt} ${añoAct}`} valorTxt={fmt.num(ult.ops)} delta={po} deltaTxt={fmt.pct(Math.abs(po))} info="Líneas de venta del último mes y su variación % vs el mes anterior." />
      </div>
    </div>
  )
}
