import React, { useState } from 'react'
import { fmt } from '../utils/format.js'

const STATUS_COLOR = {
  'Nuevo': { bg:'#dcfce7', color:'#15803d' },
  'Recuperado': { bg:'#dbeafe', color:'#1d4ed8' },
  'Activo': { bg:'#f0fdf4', color:'#166534' },
  'Perdido': { bg:'#fee2e2', color:'#b91c1c' },
}
const RIESGO_COLOR = {
  'Alto': { bg:'#fee2e2', color:'#b91c1c' },
  'Medio': { bg:'#fef9c3', color:'#a16207' },
  'Bajo': { bg:'#dcfce7', color:'#15803d' },
  'Sin datos': { bg:'#f1f5f9', color:'#64748b' }
}

export default function TablaClientes({ clientes }) {
  const [search, setSearch] = useState('')
  const [sortCol, setSortCol] = useState('ventas_2026')
  const [sortDir, setSortDir] = useState(-1)
  const [page, setPage] = useState(0)
  const PER_PAGE = 20

  const sort = (col) => {
    if (sortCol === col) setSortDir(d => -d)
    else { setSortCol(col); setSortDir(-1) }
    setPage(0)
  }

  const filtered = clientes
    .filter(c => `${c.cliente_nombre} ${c.agente}`.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      const va = a[sortCol] ?? -Infinity
      const vb = b[sortCol] ?? -Infinity
      return (va > vb ? 1 : -1) * sortDir
    })

  const total = filtered.length
  const paged = filtered.slice(page * PER_PAGE, (page + 1) * PER_PAGE)
  const totalPages = Math.ceil(total / PER_PAGE)

  const exportCSV = () => {
    const cols = ['cliente_nombre','agente','status','ventas_2026','ventas_2025','variacion','tickets','ticket_promedio','ultima_compra','dias_sin_compra','riesgo']
    const blob = new Blob([[cols.join(','), ...filtered.map(c => cols.map(k => c[k] ?? '').join(','))].join('\n')], { type:'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href=url; a.download='clientes.csv'; a.click(); URL.revokeObjectURL(url)
  }

  const thStyle = (col) => ({
    padding:'7px 10px', fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'.4px',
    color: sortCol === col ? '#4da3ff' : '#93c5fd', cursor:'pointer', whiteSpace:'nowrap',
    userSelect:'none', background:'transparent'
  })
  const td = { padding:'6px 10px', fontSize:11, color:'#334155', borderBottom:'1px solid #f1f5f9', whiteSpace:'nowrap' }

  return (
    <div style={{ background:'#fff',borderRadius:10,border:'1.5px solid #e2e8f0',boxShadow:'0 1px 4px rgba(0,0,0,.05)',overflow:'hidden' }}>
      <div style={{ background:'#0f1f3d',padding:'12px 16px',display:'flex',alignItems:'center',gap:12,flexWrap:'wrap' }}>
        <span style={{ fontSize:12,fontWeight:700,color:'#fff',textTransform:'uppercase',letterSpacing:'.5px' }}>👤 Detalle de Clientes</span>
        <span style={{ fontSize:11,color:'rgba(255,255,255,.5)' }}>{total} clientes</span>
        <input
          placeholder="Buscar cliente o agente..."
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(0) }}
          style={{ padding:'5px 10px',borderRadius:6,border:'1px solid rgba(255,255,255,.2)',background:'rgba(255,255,255,.1)',color:'#fff',fontSize:12,outline:'none',width:200 }}
        />
        <button onClick={exportCSV} style={{ marginLeft:'auto',padding:'5px 12px',borderRadius:6,border:'1px solid rgba(255,255,255,.2)',background:'rgba(255,255,255,.1)',color:'#fff',fontSize:11,fontWeight:600,cursor:'pointer' }}>
          ⬇️ Exportar CSV
        </button>
      </div>
      <div style={{ overflowX:'auto' }}>
        <table style={{ width:'100%',borderCollapse:'collapse' }}>
          <thead>
            <tr style={{ background:'#0f1f3d' }}>
              {[['cliente_nombre','Cliente'],['agente','Agente'],['status','Estatus'],['ventas_2026','Venta 2026'],['ventas_2025','Venta 2025'],['variacion','Var. %'],['tickets','Tickets'],['ticket_promedio','Tkt. Prom.'],['ultima_compra','Últ. Compra'],['dias_sin_compra','Días sin compra'],['riesgo','Riesgo']].map(([col, label]) => (
                <th key={col} style={thStyle(col)} onClick={() => sort(col)}>
                  {label}{sortCol === col ? (sortDir > 0 ? ' ↑' : ' ↓') : ''}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paged.map((c, i) => {
              const sc = STATUS_COLOR[c.status] || STATUS_COLOR['Activo']
              const rc = RIESGO_COLOR[c.riesgo] || RIESGO_COLOR['Sin datos']
              return (
                <tr key={c.cliente_nombre + i} style={{ background: i % 2 === 0 ? '#fff' : '#f8fafc' }}>
                  <td style={{ ...td, fontWeight:600, maxWidth:220, overflow:'hidden', textOverflow:'ellipsis' }}>{c.cliente_nombre}</td>
                  <td style={{ ...td, fontSize:10 }}>{c.agente}</td>
                  <td style={td}>
                    <span style={{ background:sc.bg,color:sc.color,padding:'2px 7px',borderRadius:10,fontSize:10,fontWeight:700 }}>{c.status}</span>
                  </td>
                  <td style={{ ...td, fontWeight:600 }}>{fmt.moneda(c.ventas_2026)}</td>
                  <td style={td}>{fmt.moneda(c.ventas_2025)}</td>
                  <td style={{ ...td, color: c.variacion > 0 ? '#15803d' : c.variacion < 0 ? '#b91c1c' : '#64748b', fontWeight:600 }}>
                    {c.variacion != null ? `${c.variacion >= 0 ? '+' : ''}${c.variacion.toFixed(1)}%` : '—'}
                  </td>
                  <td style={{ ...td, textAlign:'center' }}>{fmt.num(c.tickets)}</td>
                  <td style={td}>{fmt.moneda(c.ticket_promedio)}</td>
                  <td style={{ ...td, fontSize:10 }}>{fmt.fecha(c.ultima_compra)}</td>
                  <td style={{ ...td, textAlign:'center', fontWeight: c.dias_sin_compra > 90 ? 700 : 400, color: c.dias_sin_compra > 90 ? '#b91c1c' : '#334155' }}>
                    {c.dias_sin_compra != null ? `${c.dias_sin_compra}d` : '—'}
                  </td>
                  <td style={td}>
                    <span style={{ background:rc.bg,color:rc.color,padding:'2px 7px',borderRadius:10,fontSize:10,fontWeight:700 }}>{c.riesgo}</span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <div style={{ padding:'10px 16px',display:'flex',alignItems:'center',gap:12,background:'#f8fafc',borderTop:'1px solid #f1f5f9' }}>
        <span style={{ fontSize:11,color:'#64748b' }}>Página {page + 1} de {totalPages} ({total} clientes)</span>
        <div style={{ marginLeft:'auto',display:'flex',gap:6 }}>
          <button onClick={() => setPage(p => Math.max(0, p-1))} disabled={page === 0} style={pgBtn}>← Anterior</button>
          <button onClick={() => setPage(p => Math.min(totalPages-1, p+1))} disabled={page >= totalPages-1} style={pgBtn}>Siguiente →</button>
        </div>
      </div>
    </div>
  )
}

const pgBtn = { padding:'4px 10px',borderRadius:6,border:'1.5px solid #e2e8f0',background:'#fff',fontSize:11,fontWeight:600,cursor:'pointer',color:'#475569' }
