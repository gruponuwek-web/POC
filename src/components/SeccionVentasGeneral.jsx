import React from 'react'
import { fmt } from '../utils/format.js'
import { scopeLabel } from '../utils/ventasGeneral.js'
import InfoTip from './InfoTip.jsx'

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

function MiniKPI({ icon, label, valor, sub, info, color, scopeNote }) {
  return (
    <div style={{ background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: 9, padding: '10px 12px' }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.4px', display: 'flex', alignItems: 'center' }}>
        {icon} {label}{info && <InfoTip text={info} />}
      </div>
      <div style={{ fontSize: 19, fontWeight: 800, color: color || '#0f1f3d', margin: '3px 0 2px' }}>{valor}</div>
      <div style={{ fontSize: 10.5, color: '#94a3b8' }}>{sub}</div>
      {scopeNote && <div style={{ fontSize: 9.5, color: '#b0b8c4', marginTop: 3 }}>Filtros: {scopeNote}</div>}
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
  const alcance = scopeLabel(filtros)
  const filtrado = alcance !== 'Toda la empresa'

  const pctCom = g.total > 0 ? g.comV / g.total * 100 : 0
  const pctResto = 100 - pctCom

  const subtitulo = esComercial ? 'Solo equipo comercial' : esResto ? 'Solo el resto (fuera del equipo comercial)' : 'Incluye equipo comercial + el resto'

  let insight
  if (scoped === 'todos') {
    insight = <>El <strong>equipo comercial</strong> genera el <strong>{fmt.pct(pctCom)}</strong> de la venta; el <strong>{fmt.pct(pctResto)}</strong> ({fmt.moneda(g.restoV)}) proviene del <strong>resto</strong> de la operación.</>
  } else {
    const topV = g.vendedores[0], topP = g.proveedores[0]
    insight = <>Alcance <strong>{alcance}</strong>: {fmt.moneda(g.total)} en {fmt.num(g.totalN)} operaciones{topV ? <> · Top vendedor: <strong>{titulo(topV.nombre)}</strong></> : null}{topP ? <> · Top proveedor: <strong>{titulo(topP.nombre)}</strong></> : null}.</>
  }

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: 10, boxShadow: '0 1px 4px rgba(0,0,0,.05)', padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#0f1f3d', textTransform: 'uppercase', letterSpacing: '.4px' }}>🏢 Empresa Completa · Resumen</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: filtrado ? '#1a6cf0' : '#94a3b8' }}>— {alcance}</span>
          <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 500 }}>{subtitulo}</span>
        </div>

        <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '9px 14px', marginBottom: 16, fontSize: 12.5, color: '#1e3a5f', lineHeight: 1.5 }}>
          💡 {insight}
        </div>

        {scoped === 'todos' ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 12, marginBottom: 16 }}>
            <Tarjeta icon="💰" label="Venta Total Empresa" valor={g.total} borde="#1a6cf0"
              sub={`${fmt.num(g.totalN)} operaciones`}
              comp={g.prev && <Comparacion cur={g.total} prev={g.prev.total} />} />
            <Tarjeta icon="👥" label="Equipo Comercial" valor={g.comV} borde="#0f1f3d"
              sub={<>{fmt.num(g.comN)} operaciones · <span style={{ background: '#dbeafe', color: '#1d4ed8', padding: '1px 7px', borderRadius: 9, fontWeight: 700 }}>{fmt.pct(pctCom)}</span></>}
              comp={g.prev && <Comparacion cur={g.comV} prev={g.prev.comV} />} />
            <Tarjeta icon="🏭" label="El Resto" valor={g.restoV} borde="#f59e0b"
              sub={<>{fmt.num(g.restoN)} operaciones · <span style={{ background: '#fef3c7', color: '#b45309', padding: '1px 7px', borderRadius: 9, fontWeight: 700 }}>{fmt.pct(pctResto)}</span></>}
              comp={g.prev && <Comparacion cur={g.restoV} prev={g.prev.restoV} />} />
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 12, marginBottom: 16 }}>
            <Tarjeta
              icon={esComercial ? '👥' : '🏭'}
              label={esComercial ? 'Venta Equipo Comercial' : 'Venta El Resto'}
              valor={esComercial ? g.comV : g.restoV} borde={esComercial ? '#0f1f3d' : '#f59e0b'}
              sub={<>{fmt.num(esComercial ? g.comN : g.restoN)} operaciones · <span style={{ background: esComercial ? '#dbeafe' : '#fef3c7', color: esComercial ? '#1d4ed8' : '#b45309', padding: '1px 7px', borderRadius: 9, fontWeight: 700 }}>{fmt.pct(esComercial ? pctCom : pctResto)} del total</span></>}
              comp={g.prev && <Comparacion cur={esComercial ? g.comV : g.restoV} prev={esComercial ? g.prev.comV : g.prev.restoV} />} />
          </div>
        )}

        {/* KPIs operativos */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', gap: 12, marginBottom: scoped === 'todos' ? 16 : 0 }}>
          <MiniKPI icon="🎫" label="Ticket promedio" valor={fmt.moneda(g.ticketProm)}
            sub={`${fmt.num(g.tickets)} tickets únicos`}
            scopeNote="Año, Mes, Sucursal, Equipo"
            info="Venta ÷ tickets únicos (folio). Responde a año, mes, sucursal y equipo; no varía por proveedor o línea." />
          <MiniKPI icon="📉" label="Clientes perdidos" valor={fmt.num(g.perdidos)} color="#b91c1c"
            sub={`Regla +4 meses · ${fmt.pct(g.perdidosPct)} de ${fmt.num(g.perdidosTotal)} clientes`}
            scopeNote="Año, Mes, Sucursal, Equipo, Proveedor, Línea"
            info="Mismo método que el Dashboard Táctico: clientes sin compra en los últimos 4 meses. Si filtras Año/Mes, la fecha de corte se mueve a ese punto ('¿quién estaba perdido a esa fecha?'); si dejas 'Todos', usa el mes más reciente con datos." />
        </div>

        {scoped === 'todos' && (
          <div style={{ background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: 9, padding: '12px 14px' }}>
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
      </div>
    </div>
  )
}
