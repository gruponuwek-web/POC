import React from 'react'
import { fmt } from '../utils/format.js'
import { scopeLabel } from '../utils/ventasGeneral.js'
import InfoTip from './InfoTip.jsx'

const MESES3 = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

function Card({ titulo, sub, info, children }) {
  return (
    <div style={{ background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: 10, boxShadow: '0 1px 4px rgba(0,0,0,.05)', padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: sub ? 1 : 12 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#0f1f3d', textTransform: 'uppercase', letterSpacing: '.4px' }}>{titulo}</span>
        {info && <InfoTip text={info} />}
      </div>
      {sub && <div style={{ fontSize: 10.5, color: '#94a3b8', fontStyle: 'italic', marginBottom: 12 }}>{sub}</div>}
      {children}
    </div>
  )
}

function LeyendaAños() {
  return (
    <div style={{ display: 'flex', gap: 16, marginTop: 8, fontSize: 10.5, color: '#64748b' }}>
      <span><span style={{ display: 'inline-block', width: 10, height: 10, background: '#bfdbfe', borderRadius: 2, marginRight: 5 }} />2025</span>
      <span><span style={{ display: 'inline-block', width: 10, height: 10, background: '#1a6cf0', borderRadius: 2, marginRight: 5 }} />2026 (a jul)</span>
    </div>
  )
}

export default function VentasGeneralCharts({ g, filtros }) {
  if (!g || !g.mesesY.length) return null

  const equipo = filtros.equipo || 'todos'
  const scoped = equipo === 'comercial' ? 'comercial' : equipo === 'resto' ? 'resto' : 'todos'
  const alcance = scopeLabel(filtros)
  const sufijo = alcance === 'Toda la empresa' ? 'Toda la empresa' : alcance
  const añoFiltro = filtros.año || 'todos'
  const agrupado = añoFiltro === 'todos'

  const yData = (d, year) => {
    const s = d && d[year]; if (!s) return { venta: 0, costo: 0, n: 0, mgPct: 0 }
    const venta = (scoped === 'resto' ? 0 : s.vc) + (scoped === 'comercial' ? 0 : s.vr)
    const costo = (scoped === 'resto' ? 0 : s.cc) + (scoped === 'comercial' ? 0 : s.cr)
    const n = (scoped === 'resto' ? 0 : s.nc) + (scoped === 'comercial' ? 0 : s.nr)
    return { venta, costo, n, mgPct: venta > 0 ? (venta - costo) / venta * 100 : 0 }
  }

  const yr = añoFiltro === '2025' ? 2025 : 2026
  const rows = g.mesesY.map(m => {
    const d = g.porMesY[m]
    const a = yData(d, 2025), b = yData(d, 2026)
    const single = yData(d, yr)
    return { mes: m, a, b, single }
  })
  const visibles = agrupado ? rows : rows.filter(r => r.single.n > 0 || r.single.venta > 0)

  const maxOps = Math.max(...visibles.flatMap(r => agrupado ? [r.a.n, r.b.n] : [r.single.n]), 1)
  const maxMg = Math.max(...visibles.flatMap(r => agrupado ? [r.a.mgPct, r.b.mgPct] : [r.single.mgPct]), 1)
  const H = 150
  const ab = n => n >= 1000 ? Math.round(n / 1000) + 'k' : String(Math.round(n))

  // Barra agrupada con etiqueta de valor arriba (sin etiqueta ni barra si el valor es 0)
  const BarLab = ({ val, height, color, txt }) => (
    <div style={{ width: '42%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end' }}>
      {val > 0 && <span style={{ fontSize: 7.5, fontWeight: 700, color, marginBottom: 1, whiteSpace: 'nowrap' }}>{txt}</span>}
      <div style={{ width: '100%', height: Math.max(0, height) || 0, background: val > 0 ? color : 'transparent', borderRadius: '3px 3px 0 0' }} title={val > 0 ? txt : ''} />
    </div>
  )

  const Ejes = ({ items }) => (
    <div style={{ display: 'flex', gap: agrupado ? 8 : 10, marginTop: 4 }}>
      {items.map(r => <div key={r.mes} style={{ flex: 1, textAlign: 'center', fontSize: 10, color: '#94a3b8' }}>{MESES3[r.mes - 1]}</div>)}
    </div>
  )

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>

      <Card titulo={`🎟️ Operaciones por mes — ${sufijo}`} sub="Operaciones = líneas de venta (partidas)" info="Una 'operación' es una línea de venta (partida). Al filtrar por proveedor o línea se cuentan líneas, no tickets únicos.">
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: agrupado ? 8 : 10, height: H + 20, paddingTop: 6 }}>
          {visibles.map(r => agrupado ? (
            <div key={r.mes} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end' }}>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: H, width: '100%', justifyContent: 'center' }}>
                <BarLab val={r.a.n} height={r.a.n / maxOps * H} color="#a78bdb" txt={fmt.num(r.a.n)} />
                <BarLab val={r.b.n} height={r.b.n / maxOps * H} color="#7c3aed" txt={fmt.num(r.b.n)} />
              </div>
            </div>
          ) : (
            <div key={r.mes} style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center' }}>
              <div style={{ fontSize: 9.5, color: '#64748b', marginBottom: 3, fontWeight: 600 }}>{fmt.num(r.single.n)}</div>
              <div style={{ width: '62%', height: Math.max(0, r.single.n / maxOps * H) || 0, background: '#7c3aed', borderRadius: '4px 4px 0 0' }} />
            </div>
          ))}
        </div>
        <Ejes items={visibles} />
        {agrupado && <div style={{ display: 'flex', gap: 16, marginTop: 8, fontSize: 10.5, color: '#64748b' }}>
          <span><span style={{ display: 'inline-block', width: 10, height: 10, background: '#c4b5fd', borderRadius: 2, marginRight: 5 }} />2025</span>
          <span><span style={{ display: 'inline-block', width: 10, height: 10, background: '#7c3aed', borderRadius: 2, marginRight: 5 }} />2026 (a jul)</span>
        </div>}
      </Card>

      <Card titulo={`📈 Margen por mes — ${sufijo}`} sub="Margen % = (venta − costo) ÷ venta" info="Margen % = (venta − costo) ÷ venta. Incluye toda la operación del alcance seleccionado.">
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: agrupado ? 8 : 10, height: H + 20, paddingTop: 6 }}>
          {visibles.map(r => agrupado ? (
            <div key={r.mes} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end' }}>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: H, width: '100%', justifyContent: 'center' }}>
                <BarLab val={r.a.mgPct} height={r.a.mgPct / maxMg * H} color="#4ade80" txt={`${r.a.mgPct.toFixed(0)}%`} />
                <BarLab val={r.b.mgPct} height={r.b.mgPct / maxMg * H} color="#16a34a" txt={`${r.b.mgPct.toFixed(0)}%`} />
              </div>
            </div>
          ) : (
            <div key={r.mes} style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center' }}>
              <div style={{ fontSize: 9.5, color: '#15803d', marginBottom: 2, fontWeight: 700 }}>{r.single.mgPct.toFixed(1)}%</div>
              <div style={{ fontSize: 8.5, color: '#94a3b8', marginBottom: 3 }}>${((r.single.venta - r.single.costo) / 1e6).toFixed(1)}M</div>
              <div style={{ width: '62%', height: Math.max(0, r.single.mgPct / maxMg * H) || 0, background: '#22c55e', borderRadius: '4px 4px 0 0' }} />
            </div>
          ))}
        </div>
        <Ejes items={visibles} />
        {agrupado && <div style={{ display: 'flex', gap: 16, marginTop: 8, fontSize: 10.5, color: '#64748b' }}>
          <span><span style={{ display: 'inline-block', width: 10, height: 10, background: '#86efac', borderRadius: 2, marginRight: 5 }} />Margen % 2025</span>
          <span><span style={{ display: 'inline-block', width: 10, height: 10, background: '#16a34a', borderRadius: 2, marginRight: 5 }} />Margen % 2026</span>
        </div>}
      </Card>

    </div>
  )
}
