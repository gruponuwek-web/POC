import React from 'react'
import { fmt } from '../utils/format.js'

const MESES3 = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

function titulo(s) {
  return String(s || '').toLowerCase().replace(/\b\w/g, c => c.toUpperCase())
}

function Tarjeta({ icon, label, valor, sub, borde, comp }) {
  return (
    <div style={{ background: '#fff', border: '1.5px solid #e2e8f0', borderTop: `3px solid ${borde}`, borderRadius: 9, padding: '12px 14px' }}>
      <div style={{ fontSize: 10.5, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.4px' }}>{icon} {label}</div>
      <div style={{ fontSize: 24, fontWeight: 800, color: '#0f1f3d', margin: '4px 0 2px' }}>{fmt.moneda(valor)}</div>
      <div style={{ fontSize: 11, color: '#94a3b8' }}>{sub}</div>
      {comp}
    </div>
  )
}

function Comparacion({ cur, prev }) {
  if (prev == null) return null
  const abs = cur - prev
  const pct = prev !== 0 ? abs / prev * 100 : 0
  const up = abs >= 0
  return (
    <div style={{ fontSize: 10.5, marginTop: 4, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
      <span style={{ color: '#94a3b8' }}>2025: {fmt.moneda(prev)}</span>
      <span style={{ background: up ? '#dcfce7' : '#fee2e2', color: up ? '#15803d' : '#b91c1c', padding: '1px 7px', borderRadius: 8, fontWeight: 700, fontSize: 10 }}>
        {up ? '▲' : '▼'} {fmt.pct(Math.abs(pct))} · {up ? '+' : '−'}{fmt.moneda(Math.abs(abs))}
      </span>
    </div>
  )
}

export default function SeccionVentasGeneral({ g, filtros }) {
  if (!g || g.total <= 0) return null

  const equipo = filtros.equipo || 'todos'
  const esComercial = equipo === 'comercial'
  const esResto = equipo === 'resto'
  const scoped = esComercial ? 'comercial' : esResto ? 'resto' : 'todos'

  const pctCom = g.total > 0 ? g.comV / g.total * 100 : 0
  const pctResto = 100 - pctCom
  const H = 170

  const chart = g.meses.map(m => {
    const d = g.porMes[m] || { comV: 0, restoV: 0 }
    const com = scoped === 'resto' ? 0 : d.comV
    const resto = scoped === 'comercial' ? 0 : d.restoV
    return { mes: m, com, resto, total: com + resto }
  })
  const maxT = Math.max(...chart.map(c => c.total), 1)
  const maxTop = g.topResto.length ? g.topResto[0].venta : 1

  const subtitulo = esComercial ? 'Solo equipo comercial' : esResto ? 'Solo el resto (fuera del equipo comercial)' : 'Incluye equipo comercial + el resto'
  const mostrarTopResto = scoped !== 'comercial' && g.topResto.length > 0

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ background: '#0f1f3d', padding: '12px 16px', borderRadius: '10px 10px 0 0', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#fff', textTransform: 'uppercase', letterSpacing: '.5px' }}>🏢 Ventas General — Toda la empresa</span>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,.5)', fontWeight: 500 }}>{subtitulo}</span>
      </div>

      <div style={{ border: '1.5px solid #e2e8f0', borderTop: 'none', borderRadius: '0 0 10px 10px', padding: 16, background: '#fbfcfe' }}>

        {scoped === 'todos' ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 12, marginBottom: 16 }}>
            <Tarjeta icon="💰" label="Venta Total Empresa" valor={g.total} borde="#1a6cf0"
              sub={`${fmt.num(g.totalN)} operaciones`}
              comp={g.prev && <Comparacion cur={g.total} prev={g.prev.total} />} />
            <Tarjeta icon="👥" label="Equipo Comercial" valor={g.comV} borde="#0f1f3d"
              sub={<>{fmt.num(g.comN)} ops · <span style={{ background: '#dbeafe', color: '#1d4ed8', padding: '1px 7px', borderRadius: 9, fontWeight: 700 }}>{fmt.pct(pctCom)}</span></>}
              comp={g.prev && <Comparacion cur={g.comV} prev={g.prev.comV} />} />
            <Tarjeta icon="🏭" label="El Resto" valor={g.restoV} borde="#f59e0b"
              sub={<>{fmt.num(g.restoN)} ops · <span style={{ background: '#fef3c7', color: '#b45309', padding: '1px 7px', borderRadius: 9, fontWeight: 700 }}>{fmt.pct(pctResto)}</span></>}
              comp={g.prev && <Comparacion cur={g.restoV} prev={g.prev.restoV} />} />
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 12, marginBottom: 16 }}>
            <Tarjeta
              icon={esComercial ? '👥' : '🏭'}
              label={esComercial ? 'Venta Equipo Comercial' : 'Venta El Resto'}
              valor={esComercial ? g.comV : g.restoV} borde={esComercial ? '#0f1f3d' : '#f59e0b'}
              sub={<>{fmt.num(esComercial ? g.comN : g.restoN)} ops · <span style={{ background: esComercial ? '#dbeafe' : '#fef3c7', color: esComercial ? '#1d4ed8' : '#b45309', padding: '1px 7px', borderRadius: 9, fontWeight: 700 }}>{fmt.pct(esComercial ? pctCom : pctResto)} del total empresa</span></>}
              comp={g.prev && <Comparacion cur={esComercial ? g.comV : g.restoV} prev={esComercial ? g.prev.comV : g.prev.restoV} />} />
          </div>
        )}

        {scoped === 'todos' && (
          <div style={{ background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: 9, padding: '12px 14px', marginBottom: 16 }}>
            <div style={{ fontSize: 10.5, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: 8 }}>Participación de la venta</div>
            <div style={{ display: 'flex', height: 26, borderRadius: 6, overflow: 'hidden', fontSize: 11, fontWeight: 700, color: '#fff' }}>
              {pctCom > 0 && <div style={{ width: `${pctCom}%`, background: '#1a6cf0', display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: 40 }}>{fmt.pct(pctCom)}</div>}
              {pctResto > 0 && <div style={{ width: `${pctResto}%`, background: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: 40 }}>{fmt.pct(pctResto)}</div>}
            </div>
            <div style={{ display: 'flex', gap: 16, marginTop: 8, fontSize: 11, color: '#64748b' }}>
              <span><span style={{ display: 'inline-block', width: 10, height: 10, background: '#1a6cf0', borderRadius: 2, marginRight: 5 }} />Equipo comercial</span>
              <span><span style={{ display: 'inline-block', width: 10, height: 10, background: '#f59e0b', borderRadius: 2, marginRight: 5 }} />El resto</span>
            </div>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: mostrarTopResto ? '1.3fr 1fr' : '1fr', gap: 16, alignItems: 'start' }}>

          <div style={{ background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: 9, padding: '12px 14px' }}>
            <div style={{ fontSize: 10.5, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: 10 }}>
              {scoped === 'todos' ? 'Venta mensual — Comercial vs El resto' : esComercial ? 'Venta mensual — Equipo comercial' : 'Venta mensual — El resto'}
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height: H + 20, paddingTop: 6 }}>
              {chart.map(c => {
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
            <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
              {chart.map(c => <div key={c.mes} style={{ flex: 1, textAlign: 'center', fontSize: 10, color: '#94a3b8' }}>{MESES3[c.mes - 1]}</div>)}
            </div>
          </div>

          {mostrarTopResto && (
            <div style={{ background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: 9, padding: '12px 14px' }}>
              <div style={{ fontSize: 10.5, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: 10 }}>Top vendedores fuera del equipo comercial</div>
              {g.topResto.map((r, i) => (
                <div key={r.nombre} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', borderBottom: '1px solid #f1f5f9' }}>
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
    </div>
  )
}
