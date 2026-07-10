import React, { useState } from 'react'
import { fmt } from '../utils/format.js'

const ORIGEN_COLOR = {
  'Cartera':    { bg:'#eff6ff', color:'#1d4ed8', icon:'📋' },
  'Nuevo':      { bg:'#dcfce7', color:'#15803d', icon:'🟢' },
  'Recuperado': { bg:'#fef9c3', color:'#a16207', icon:'🔄' },
  'Sin historial': { bg:'#f1f5f9', color:'#64748b', icon:'❓' },
}

// Qué era el cliente antes de perderse
function origenAnterior(c) {
  if (c.status === 'Nuevo') return 'Nuevo'
  if (c.status === 'Recuperado') return 'Recuperado'
  if ((c.ventas_2025 || 0) > 0) return 'Cartera'
  return 'Sin historial'
}

function effectiveStatus(c) {
  if (c.status === 'Perdido') return 'Perdido'
  if (!c.ultima_compra || c.dias_sin_compra >= 120) return 'Perdido'
  return c.status
}

const MESES_ES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

export default function TablaClientesPerdidos({ clientes, filtros, compact = false, mesFiltro, onClearMes }) {
  const [search, setSearch] = useState('')
  const [origenFilter, setOrigenFilter] = useState('todos')
  const [sortCol, setSortCol] = useState('dias_sin_compra')
  const [sortDir, setSortDir] = useState(-1)
  const [page, setPage] = useState(0)
  const PER_PAGE = compact ? 8 : 20

  const sort = (col) => {
    if (sortCol === col) setSortDir(d => -d)
    else { setSortCol(col); setSortDir(-1) }
    setPage(0)
  }

  const perdidosTodos = clientes.filter(c => effectiveStatus(c) === 'Perdido')
  // Si hay mes seleccionado: mostrar clientes que cruzaron el umbral ese mes
  // = clients whose ultima_compra month === mesFiltro - 4 (o sin compra si mes es el primero)
  const perdidos = mesFiltro
    ? perdidosTodos.filter(c => {
        if (!c.ultima_compra) return false
        const mesUltima = new Date(c.ultima_compra).getMonth() + 1
        return mesUltima === mesFiltro - 4
      })
    : perdidosTodos

  const counts = perdidos.reduce((acc, c) => {
    const o = origenAnterior(c)
    acc[o] = (acc[o] || 0) + 1
    return acc
  }, {})

  const filtered = perdidos
    .filter(c => `${c.cliente_nombre} ${c.agente}`.toLowerCase().includes(search.toLowerCase()))
    .filter(c => origenFilter === 'todos' || origenAnterior(c) === origenFilter)
    .sort((a, b) => {
      const va = a[sortCol] ?? -Infinity
      const vb = b[sortCol] ?? -Infinity
      return (va > vb ? 1 : -1) * sortDir
    })

  const total = filtered.length
  const paged = filtered.slice(page * PER_PAGE, (page + 1) * PER_PAGE)
  const totalPages = Math.ceil(total / PER_PAGE)

  const ORIGENES = ['Cartera', 'Nuevo', 'Recuperado', 'Sin historial']

  const exportCSV = () => {
    const cols = ['cliente_nombre','agente','origen','ventas_2026','ventas_2025','ultima_compra','dias_sin_compra']
    const rows = filtered.map(c => [...cols.slice(0,2), origenAnterior(c), ...cols.slice(3).map(k => c[k] ?? '')].join(','))
    const blob = new Blob([[cols.join(','), ...rows].join('\n')], { type:'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href=url; a.download='clientes_perdidos.csv'; a.click(); URL.revokeObjectURL(url)
  }

  const thStyle = (col) => ({
    padding: compact ? '5px 8px' : '7px 10px', fontSize:9, fontWeight:700, textTransform:'uppercase', letterSpacing:'.4px',
    color: sortCol === col ? '#4da3ff' : '#93c5fd', cursor:'pointer', whiteSpace:'nowrap',
    userSelect:'none', background:'transparent'
  })
  const td = { padding: compact ? '4px 8px' : '6px 10px', fontSize: compact ? 10 : 11, color:'#334155', borderBottom:'1px solid #f1f5f9', whiteSpace:'nowrap' }

  const totalVenta2025 = filtered.reduce((s, c) => s + (c.ventas_2025 || 0), 0)

  if (perdidosTodos.length === 0) return null

  return (
    <div style={{ background:'#fff', borderRadius:10, border:'1.5px solid #fca5a5', boxShadow:'0 1px 4px rgba(0,0,0,.05)', overflow:'hidden', display:'flex', flexDirection:'column', height: compact ? '100%' : 'auto' }}>
      {/* Header */}
      <div style={{ background:'#7f1d1d', padding: compact ? '8px 12px' : '12px 16px', display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
        <span style={{ fontSize: compact ? 11 : 12, fontWeight:700, color:'#fff', textTransform:'uppercase', letterSpacing:'.5px' }}>
          🔴 Clientes Perdidos
        </span>
        <span style={{ fontSize:10, color:'rgba(255,255,255,.5)' }}>{total} · +4 meses</span>
        {totalVenta2025 > 0 && (
          <span style={{ fontSize:10, color:'#fca5a5', fontWeight:600 }}>
            💸 {totalVenta2025.toLocaleString('es-MX', { style:'currency', currency:'MXN', minimumFractionDigits:0, maximumFractionDigits:0 })} en riesgo (2025)
          </span>
        )}
        {mesFiltro && (
          <span style={{ fontSize:10, background:'#ef4444', color:'#fff', padding:'2px 8px', borderRadius:10, fontWeight:700, display:'flex', alignItems:'center', gap:4 }}>
            {MESES_ES[mesFiltro - 1]}
            <span onClick={onClearMes} style={{ cursor:'pointer', opacity:.8, marginLeft:2 }}>✕</span>
          </span>
        )}

        {/* Filtro por origen */}
        <div style={{ display:'flex', gap:3, flexWrap:'wrap' }}>
          {['todos', ...ORIGENES].map(o => {
            const cnt = o === 'todos' ? perdidos.length : (counts[o] || 0)
            if (cnt === 0) return null
            const active = origenFilter === o
            const oc = ORIGEN_COLOR[o]
            return (
              <button key={o} onClick={() => { setOrigenFilter(o); setPage(0) }} style={{
                padding:'2px 7px', borderRadius:10, fontSize:9, fontWeight:700, cursor:'pointer', border:'none',
                background: active ? (o === 'todos' ? '#ef4444' : oc.color) : 'rgba(255,255,255,.12)',
                color: active ? '#fff' : 'rgba(255,255,255,.65)',
                transition:'all .15s'
              }}>
                {o === 'todos' ? 'Todos' : `${oc?.icon} ${o}`} ({cnt})
              </button>
            )
          })}
        </div>

        {!compact && (
          <input
            placeholder="Buscar..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(0) }}
            style={{ padding:'4px 8px', borderRadius:6, border:'1px solid rgba(255,255,255,.2)', background:'rgba(255,255,255,.1)', color:'#fff', fontSize:11, outline:'none', width:140 }}
          />
        )}
        <button onClick={exportCSV} style={{ marginLeft:'auto', padding:'3px 8px', borderRadius:6, border:'1px solid rgba(255,255,255,.2)', background:'rgba(255,255,255,.1)', color:'#fff', fontSize:10, fontWeight:600, cursor:'pointer' }}>
          ⬇️ CSV
        </button>
      </div>

      {/* Resumen de origen — solo en modo completo */}
      {!compact && (
        <div style={{ display:'flex', gap:0, borderBottom:'1px solid #f1f5f9' }}>
          {ORIGENES.map(o => {
            const cnt = counts[o] || 0
            if (cnt === 0) return null
            const oc = ORIGEN_COLOR[o]
            return (
              <div key={o} onClick={() => { setOrigenFilter(origenFilter === o ? 'todos' : o); setPage(0) }}
                style={{ flex:1, padding:'10px 14px', textAlign:'center', cursor:'pointer',
                  background: origenFilter === o ? oc.bg : '#fff',
                  borderBottom: origenFilter === o ? `2px solid ${oc.color}` : '2px solid transparent',
                  transition:'all .15s' }}>
                <div style={{ fontSize:18, fontWeight:800, color: oc.color }}>{cnt}</div>
                <div style={{ fontSize:10, color:'#64748b', fontWeight:600, textTransform:'uppercase', letterSpacing:'.3px' }}>{oc.icon} {o}</div>
                <div style={{ fontSize:9, color:'#94a3b8', marginTop:2 }}>{Math.round(cnt / perdidos.length * 100)}%</div>
              </div>
            )
          })}
        </div>
      )}

      {/* Tabla */}
      <div style={{ overflowX:'auto', flex:1 }}>
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <thead>
            <tr style={{ background:'#0f1f3d' }}>
              {[
                ['cliente_nombre','Cliente'],
                ['agente','Agente'],
                ['_origen','Era antes'],
                ['ventas_2025','Venta 2025'],
                ...(!compact ? [['ventas_2026','Venta 2026'], ['tickets','Tickets']] : []),
                ['ultima_compra','Últ. Compra'],
                ['dias_sin_compra','Sin compra'],
              ].map(([col, label]) => (
                <th key={col+label} style={thStyle(col === '_origen' ? 'status' : col)}
                  onClick={() => col !== '_origen' && sort(col)}>
                  {label}{sortCol === col ? (sortDir > 0 ? ' ↑' : ' ↓') : ''}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paged.map((c, i) => {
              const origen = origenAnterior(c)
              const oc = ORIGEN_COLOR[origen]
              const diasStr = c.dias_sin_compra != null ? `${c.dias_sin_compra}d` : '—'
              const mesesStr = c.dias_sin_compra != null ? ` (${(c.dias_sin_compra / 30.5).toFixed(1)}m)` : ''
              return (
                <tr key={c.cliente_nombre + i} style={{ background: i % 2 === 0 ? '#fff' : '#fef2f2' }}>
                  <td style={{ ...td, fontWeight:600, maxWidth: compact ? 130 : 220, overflow:'hidden', textOverflow:'ellipsis' }}>
                    {c.cliente_nombre}
                  </td>
                  <td style={{ ...td, fontSize:9, maxWidth:90, overflow:'hidden', textOverflow:'ellipsis' }}>
                    {compact ? c.agente.split(' ')[0] : c.agente}
                  </td>
                  <td style={td}>
                    <span style={{ background:oc.bg, color:oc.color, padding:'1px 6px', borderRadius:10, fontSize:9, fontWeight:700 }}>
                      {oc.icon} {origen}
                    </span>
                  </td>
                  <td style={{ ...td, fontWeight:600, color: c.ventas_2025 > 0 ? '#b91c1c' : '#94a3b8' }}>
                    {c.ventas_2025 > 0 ? fmt.moneda(c.ventas_2025) : '—'}
                  </td>
                  {!compact && <>
                    <td style={{ ...td, color: c.ventas_2026 > 0 ? '#334155' : '#94a3b8' }}>
                      {c.ventas_2026 > 0 ? fmt.moneda(c.ventas_2026) : '—'}
                    </td>
                    <td style={{ ...td, textAlign:'center' }}>{c.tickets > 0 ? fmt.num(c.tickets) : '—'}</td>
                  </>}
                  <td style={{ ...td, fontSize:9 }}>{c.ultima_compra ? fmt.fecha(c.ultima_compra) : '—'}</td>
                  <td style={{ ...td, textAlign:'center', fontWeight:700, color: c.dias_sin_compra > 180 ? '#7f1d1d' : '#b91c1c' }}>
                    {diasStr}
                    {!compact && <span style={{ fontSize:9, color:'#94a3b8', fontWeight:400 }}>{mesesStr}</span>}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      <div style={{ padding:'10px 16px', display:'flex', alignItems:'center', gap:12, background:'#fff7f7', borderTop:'1px solid #fca5a5' }}>
        <span style={{ fontSize:11, color:'#64748b' }}>Página {page + 1} de {totalPages} ({total} clientes perdidos)</span>
        <div style={{ marginLeft:'auto', display:'flex', gap:6 }}>
          <button onClick={() => setPage(p => Math.max(0, p-1))} disabled={page === 0} style={pgBtn}>← Anterior</button>
          <button onClick={() => setPage(p => Math.min(totalPages-1, p+1))} disabled={page >= totalPages-1} style={pgBtn}>Siguiente →</button>
        </div>
      </div>
    </div>
  )
}

const pgBtn = { padding:'4px 10px', borderRadius:6, border:'1.5px solid #fca5a5', background:'#fff', fontSize:11, fontWeight:600, cursor:'pointer', color:'#b91c1c' }
