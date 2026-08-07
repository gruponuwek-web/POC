import React from 'react'
import { fmt } from '../utils/format.js'
import { scopeLabel, GRUPOS } from '../utils/ventasGeneral.js'
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

function MiniKPI({ icon, label, valor, sub, info, color, scopeNote, comp }) {
  return (
    <div style={{ background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: 9, padding: '10px 12px' }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.4px', display: 'flex', alignItems: 'center' }}>
        {icon} {label}{info && <InfoTip text={info} />}
      </div>
      <div style={{ fontSize: 19, fontWeight: 800, color: color || '#0f1f3d', margin: '3px 0 2px' }}>{valor}</div>
      <div style={{ fontSize: 10.5, color: '#94a3b8' }}>{sub}</div>
      {comp}
      {scopeNote && <div style={{ fontSize: 9.5, color: '#b0b8c4', marginTop: 3 }}>Filtros: {scopeNote}</div>}
    </div>
  )
}

// fmtFn: formateador del valor (dinero por default). invertir: si un incremento es MALA
// noticia (p.ej. clientes perdidos), invierte los colores verde/rojo.
function Comparacion({ cur, prev, fmtFn = fmt.moneda, invertir = false }) {
  if (prev == null) return null
  const abs = cur - prev
  const pct = prev !== 0 ? abs / prev * 100 : 0
  const subio = abs >= 0
  const esBueno = invertir ? !subio : subio
  return (
    <div style={{ fontSize: 10.5, marginTop: 4, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
      <span style={{ color: '#94a3b8' }}>2025: {fmtFn(prev)}</span>
      <span style={{ background: esBueno ? '#dcfce7' : '#fee2e2', color: esBueno ? '#15803d' : '#b91c1c', padding: '1px 7px', borderRadius: 8, fontWeight: 700, fontSize: 10 }}>
        {subio ? '▲' : '▼'} {fmt.pct(Math.abs(pct))} · {subio ? '+' : '−'}{fmtFn(Math.abs(abs))}
      </span>
    </div>
  )
}

export default function SeccionVentasGeneral({ g, filtros }) {
  if (!g || g.total <= 0) return null

  const equipo = filtros.equipo || 'todos'
  const scoped = GRUPOS.some(x => x.id === equipo) ? equipo : 'todos'
  const grupoActual = GRUPOS.find(x => x.id === scoped)
  const alcance = scopeLabel(filtros)
  const filtrado = alcance !== 'Toda la empresa'

  const pctDe = (id) => g.total > 0 ? g.porGrupo[id].v / g.total * 100 : 0

  const subtitulo = scoped === 'todos' ? 'Incluye todos los equipos' : `Solo ${grupoActual.label}`

  let insight
  if (scoped === 'todos') {
    insight = <>La venta se reparte: {GRUPOS.map((gr, i) => <React.Fragment key={gr.id}>{i > 0 ? ', ' : ''}<strong>{gr.label}</strong> {fmt.pct(pctDe(gr.id))}</React.Fragment>)}.</>
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
            {GRUPOS.map(gr => (
              <Tarjeta key={gr.id} icon={gr.id === 'resto' ? '🏭' : '👥'} label={gr.label} valor={g.porGrupo[gr.id].v} borde={gr.color}
                sub={<>{fmt.num(g.porGrupo[gr.id].n)} operaciones · <span style={{ background: gr.bg, color: gr.fg, padding: '1px 7px', borderRadius: 9, fontWeight: 700 }}>{fmt.pct(pctDe(gr.id))}</span></>}
                comp={g.prev && <Comparacion cur={g.porGrupo[gr.id].v} prev={g.prev.porGrupo[gr.id]} />} />
            ))}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 12, marginBottom: 16 }}>
            <Tarjeta
              icon={grupoActual.id === 'resto' ? '🏭' : '👥'}
              label={`Venta ${grupoActual.label}`}
              valor={g.porGrupo[grupoActual.id].v} borde={grupoActual.color}
              sub={<>{fmt.num(g.porGrupo[grupoActual.id].n)} operaciones · <span style={{ background: grupoActual.bg, color: grupoActual.fg, padding: '1px 7px', borderRadius: 9, fontWeight: 700 }}>{fmt.pct(pctDe(grupoActual.id))} del total</span></>}
              comp={g.prev && <Comparacion cur={g.porGrupo[grupoActual.id].v} prev={g.prev.porGrupo[grupoActual.id]} />} />
          </div>
        )}

        {/* KPIs operativos */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', gap: 12, marginBottom: scoped === 'todos' ? 16 : 0 }}>
          <MiniKPI icon="🎫" label="Ticket promedio" valor={fmt.moneda(g.ticketProm)}
            sub={`${fmt.num(g.tickets)} tickets únicos`}
            scopeNote="Año, Mes, Sucursal, Equipo, Agente"
            info="Venta ÷ tickets únicos (folio). Responde a año, mes, sucursal, equipo y agente; no varía por proveedor o línea."
            comp={g.prev && g.prev.ticketProm != null && <Comparacion cur={g.ticketProm} prev={g.prev.ticketProm} />} />
          <MiniKPI icon="📉" label="Clientes perdidos" valor={fmt.num(g.perdidos)} color="#b91c1c"
            sub={`Regla +4 meses · ${fmt.pct(g.perdidosPct)} de ${fmt.num(g.perdidosTotal)} clientes`}
            scopeNote="Año, Mes, Sucursal, Equipo, Agente, Proveedor, Línea"
            info="Misma regla de +4 meses que el Dashboard Táctico, pero con una base distinta: aquí solo se cuentan clientes con historial REAL de compra en el alcance filtrado (no cartera asignada sin compra). El Dashboard Táctico usa cartera asignada al agente + clientes 2025, que puede incluir clientes que nunca compraron — por eso ese número puede ser mayor aunque cubra menos agentes. Si filtras Año/Mes aquí, la fecha de corte se mueve a ese punto ('¿quién estaba perdido a esa fecha?'); con 'Todos' usa el mes más reciente con datos."
            comp={g.prev && <Comparacion cur={g.perdidos} prev={g.prev.perdidos} fmtFn={fmt.num} invertir />} />
        </div>

        {scoped === 'todos' && (
          <div style={{ background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: 9, padding: '12px 14px' }}>
            <div style={{ fontSize: 10.5, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: 8 }}>Participación de la venta</div>
            <div style={{ display: 'flex', height: 26, borderRadius: 6, overflow: 'hidden', fontSize: 11, fontWeight: 700, color: '#fff' }}>
              {GRUPOS.map(gr => pctDe(gr.id) > 0 && (
                <div key={gr.id} style={{ width: `${pctDe(gr.id)}%`, background: gr.color, display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: 40 }}>{fmt.pct(pctDe(gr.id))}</div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 16, marginTop: 8, fontSize: 11, color: '#64748b' }}>
              {GRUPOS.map(gr => (
                <span key={gr.id}><span style={{ display: 'inline-block', width: 10, height: 10, background: gr.color, borderRadius: 2, marginRight: 5 }} />{gr.label}</span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
