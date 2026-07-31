import React from 'react'
import { fmt } from '../utils/format.js'
import { scopeLabel } from '../utils/ventasGeneral.js'

const MESES3 = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

function titulo(s) {
  return String(s || '').toLowerCase().replace(/\b\w/g, c => c.toUpperCase())
}

export default function VentaMensualComparativa({ g, filtros }) {
  if (!g || !g.mesesY.length) return null

  const equipo = filtros.equipo || 'todos'
  const scoped = equipo === 'comercial' ? 'comercial' : equipo === 'resto' ? 'resto' : 'todos'
  const alcance = scopeLabel(filtros)
  const añoFiltro = filtros.año || 'todos'
  const H = 170

  const vYear = (d, year) => {
    const s = d && d[year]; if (!s) return { com: 0, resto: 0, total: 0 }
    const com = scoped === 'resto' ? 0 : s.vc
    const resto = scoped === 'comercial' ? 0 : s.vr
    return { com, resto, total: com + resto }
  }

  const agrupado = añoFiltro === 'todos'
  let chart, maxT
  if (agrupado) {
    chart = g.mesesY.map(m => { const d = g.porMesY[m]; return { mes: m, a: vYear(d, 2025).total, b: vYear(d, 2026).total } })
    maxT = Math.max(...chart.map(c => Math.max(c.a, c.b)), 1)
  } else {
    const yr = añoFiltro === '2025' ? 2025 : 2026
    chart = g.mesesY.map(m => { const v = vYear(g.porMesY[m], yr); return { mes: m, com: v.com, resto: v.resto, total: v.total } }).filter(c => c.total > 0)
    maxT = Math.max(...chart.map(c => c.total), 1)
  }
  const maxTop = g.topResto.length ? g.topResto[0].venta : 1
  const mostrarTopResto = scoped !== 'comercial' && g.topResto.length > 0

  return (
    <div style={{ background: '#fff', borderRadius: 10, border: '1.5px solid #e2e8f0', boxShadow: '0 1px 4px rgba(0,0,0,.05)', overflow: 'hidden', marginBottom: 16 }}>
      <div style={{ padding: '14px 16px 0', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#0f1f3d', textTransform: 'uppercase', letterSpacing: '.4px' }}>📊 Venta mensual {agrupado ? '— 2025 vs 2026' : añoFiltro} — {alcance}</span>
      </div>

      <div style={{ padding: 16, display: 'grid', gridTemplateColumns: mostrarTopResto ? '1.3fr 1fr' : '1fr', gap: 16, alignItems: 'start' }}>

        <div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: agrupado ? 8 : 10, height: H + 20, paddingTop: 6 }}>
            {agrupado ? chart.map(c => {
              const ha = Math.max(0, c.a / maxT * H) || 0, hb = Math.max(0, c.b / maxT * H) || 0
              const lab = (v, col) => (
                <div style={{ width: '42%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end' }}>
                  {v > 0 && <span style={{ fontSize: 8, fontWeight: 700, color: col, marginBottom: 1, whiteSpace: 'nowrap' }}>${(v / 1e6).toFixed(1)}M</span>}
                  <div style={{ width: '100%', height: Math.max(0, v / maxT * H) || 0, background: v > 0 ? col : 'transparent', borderRadius: '3px 3px 0 0' }} title={v > 0 ? fmt.moneda(v) : ''} />
                </div>
              )
              return (
                <div key={c.mes} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: H, width: '100%', justifyContent: 'center' }}>
                    {lab(c.a, '#93c5fd')}
                    {lab(c.b, '#1a6cf0')}
                  </div>
                </div>
              )
            }) : chart.map(c => {
              const hc = Math.max(0, c.com / maxT * H) || 0, hr = Math.max(0, c.resto / maxT * H) || 0
              return (
                <div key={c.mes} style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center' }}>
                  <div style={{ fontSize: 9, color: '#64748b', marginBottom: 3, fontWeight: 600 }}>${(c.total / 1e6).toFixed(1)}M</div>
                  {c.resto > 0 && <div style={{ width: '70%', height: hr, background: '#f59e0b', borderRadius: '4px 4px 0 0' }} />}
                  {c.com > 0 && <div style={{ width: '70%', height: hc, background: '#1a6cf0', borderRadius: c.resto > 0 ? 0 : '4px 4px 0 0' }} />}
                </div>
              )
            })}
          </div>
          <div style={{ display: 'flex', gap: agrupado ? 8 : 10, marginTop: 4 }}>
            {chart.map(c => <div key={c.mes} style={{ flex: 1, textAlign: 'center', fontSize: 10, color: '#94a3b8' }}>{MESES3[c.mes - 1]}</div>)}
          </div>
          <div style={{ display: 'flex', gap: 16, marginTop: 8, fontSize: 10.5, color: '#64748b' }}>
            {agrupado ? <>
              <span><span style={{ display: 'inline-block', width: 10, height: 10, background: '#bfdbfe', borderRadius: 2, marginRight: 5 }} />2025</span>
              <span><span style={{ display: 'inline-block', width: 10, height: 10, background: '#1a6cf0', borderRadius: 2, marginRight: 5 }} />2026 (a jul)</span>
            </> : <>
              <span><span style={{ display: 'inline-block', width: 10, height: 10, background: '#1a6cf0', borderRadius: 2, marginRight: 5 }} />Comercial</span>
              <span><span style={{ display: 'inline-block', width: 10, height: 10, background: '#f59e0b', borderRadius: 2, marginRight: 5 }} />El resto</span>
            </>}
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
