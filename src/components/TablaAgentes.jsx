import React, { useState } from 'react'
import { fmt, semaforo, SEM_VENTA, SEM_COBERTURA } from '../utils/format.js'

export default function TablaAgentes({ agentes, onSelectAgente, agenteSeleccionado, filtros }) {
  const [sortCol, setSortCol] = useState('cumplimiento_pct')
  const [sortDir, setSortDir] = useState(-1)
  const [search, setSearch] = useState('')
  const es2025 = filtros?.año === '2025'

  // Extrae métricas del año activo para cada agente
  const av = (a) => {
    if (!es2025) return a
    const costo2025 = Object.values(a.costo_2025_por_mes || {}).reduce((s, v) => s + v, 0)
    const v25 = a.ventas_2025 || 0
    const t25 = a.tickets_2025 || 0
    const at25 = a.clientes_atendidos_2025 || 0
    return {
      ...a,
      ventas: v25,
      meta: null,
      diferencia_meta: null,
      cumplimiento_pct: null,
      clientes_atendidos: at25,
      cobertura_pct: a.cartera_total > 0 ? at25 / a.cartera_total * 100 : null,
      clientes_nuevos: a.clientes_nuevos_2025 || 0,
      clientes_recuperados: a.clientes_recuperados_2025 || 0,
      tickets: t25,
      ticket_promedio: t25 > 0 ? v25 / t25 : 0,
      costo: costo2025,
      margen: v25 - costo2025,
      margen_pct: v25 > 0 ? (v25 - costo2025) / v25 * 100 : 0,
    }
  }

  const sort = (col) => {
    if (sortCol === col) setSortDir(d => -d)
    else { setSortCol(col); setSortDir(-1) }
  }

  const filtered = agentes
    .map(av)
    .filter(a => a.agente.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      const va = a[sortCol] ?? -Infinity
      const vb = b[sortCol] ?? -Infinity
      return (va > vb ? 1 : -1) * sortDir
    })

  const exportCSV = () => {
    const cols = ['agente','ventas','meta','diferencia_meta','cumplimiento_pct','cartera_total','clientes_atendidos','cobertura_pct','clientes_nuevos','clientes_recuperados','tickets','ticket_promedio','costo','margen','margen_pct','meta_margen_pct']
    const header = cols.join(',')
    const rows = filtered.map(a => cols.map(c => a[c] ?? '').join(',')).join('\n')
    const blob = new Blob([header + '\n' + rows], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'agentes.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  const semC = (s) => s === 'green' ? '#15803d' : s === 'yellow' ? '#a16207' : s === 'red' ? '#b91c1c' : '#64748b'
  const semBg = (s) => s === 'green' ? '#dcfce7' : s === 'yellow' ? '#fef9c3' : s === 'red' ? '#fee2e2' : '#f1f5f9'

  const thStyle = (col) => ({
    padding: '8px 10px', fontSize: 10, fontWeight: 700,
    textTransform: 'uppercase', letterSpacing: '.4px',
    color: sortCol === col ? '#4da3ff' : '#93c5fd',
    cursor: 'pointer', whiteSpace: 'nowrap', userSelect: 'none',
    background: 'transparent'
  })
  const tdStyle = { padding: '7px 10px', fontSize: 11.5, color: '#334155', whiteSpace: 'nowrap', borderBottom: '1px solid #f1f5f9' }

  return (
    <div style={{ background:'#fff',borderRadius:10,border:'1.5px solid #e2e8f0',boxShadow:'0 1px 4px rgba(0,0,0,.05)',overflow:'hidden' }}>
      <div style={{ background:'#0f1f3d',padding:'12px 16px',display:'flex',alignItems:'center',gap:12,flexWrap:'wrap' }}>
        <span style={{ fontSize:12,fontWeight:700,color:'#fff',textTransform:'uppercase',letterSpacing:'.5px' }}>📋 Desempeño por Agente</span>
        <input
          placeholder="Buscar agente..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ padding:'5px 10px',borderRadius:6,border:'1px solid rgba(255,255,255,.2)',background:'rgba(255,255,255,.1)',color:'#fff',fontSize:12,outline:'none',width:160 }}
        />
        <button onClick={exportCSV} style={{ marginLeft:'auto',padding:'5px 12px',borderRadius:6,border:'1px solid rgba(255,255,255,.2)',background:'rgba(255,255,255,.1)',color:'#fff',fontSize:11,fontWeight:600,cursor:'pointer' }}>
          ⬇️ Exportar CSV
        </button>
      </div>
      <div style={{ overflowX:'auto' }}>
        <table style={{ width:'100%',borderCollapse:'collapse' }}>
          <thead>
            <tr style={{ background:'#0f1f3d' }}>
              {[['agente','Agente'],['ventas','Venta'],['meta','Meta'],['diferencia_meta','Dif. Meta'],['cumplimiento_pct','% Cumpl.'],['cartera_total','Cartera'],['clientes_atendidos','Atendidos'],['cobertura_pct','% Cob.'],['clientes_nuevos','Nuevos'],['clientes_recuperados','Recup.'],['tickets','Tickets'],['ticket_promedio','Tkt. Prom.'],['costo','Costo'],['margen','Margen $'],['margen_pct','Margen %'],['meta_margen_pct','Meta Mg.']].map(([col, label]) => (
                <th key={col} style={thStyle(col)} onClick={() => sort(col)}>
                  {label}{sortCol === col ? (sortDir > 0 ? ' ↑' : ' ↓') : ''}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((a, i) => {
              const semV = semaforo(a.cumplimiento_pct, SEM_VENTA)
              const semCob = semaforo(a.cobertura_pct, SEM_COBERTURA)
              const isSelected = agenteSeleccionado === a.agente
              return (
                <tr
                  key={a.agente}
                  onClick={() => onSelectAgente(a.agente)}
                  style={{
                    background: isSelected ? '#eff6ff' : i % 2 === 0 ? '#fff' : '#f8fafc',
                    cursor:'pointer', transition:'background .15s',
                    outline: isSelected ? '2px solid #1a6cf0' : 'none'
                  }}
                >
                  <td style={{ ...tdStyle, fontWeight: 700, color: '#0f1f3d' }}>{a.agente}</td>
                  <td style={tdStyle}>{fmt.moneda(a.ventas)}</td>
                  <td style={tdStyle}>{fmt.moneda(a.meta)}</td>
                  <td style={{ ...tdStyle, color: a.diferencia_meta >= 0 ? '#15803d' : '#b91c1c', fontWeight:700 }}>
                    {a.diferencia_meta >= 0 ? '+' : ''}{fmt.moneda(a.diferencia_meta)}
                  </td>
                  <td style={tdStyle}>
                    <span style={{ background:semBg(semV),color:semC(semV),padding:'2px 8px',borderRadius:10,fontSize:11,fontWeight:700 }}>
                      {fmt.pct(a.cumplimiento_pct)}
                    </span>
                  </td>
                  <td style={{ ...tdStyle, textAlign:'center' }}>{fmt.num(a.cartera_total)}</td>
                  <td style={{ ...tdStyle, textAlign:'center' }}>{fmt.num(a.clientes_atendidos)}</td>
                  <td style={tdStyle}>
                    <span style={{ background:semBg(semCob),color:semC(semCob),padding:'2px 8px',borderRadius:10,fontSize:11,fontWeight:700 }}>
                      {fmt.pct(a.cobertura_pct)}
                    </span>
                  </td>
                  <td style={{ ...tdStyle, textAlign:'center', color:'#15803d', fontWeight:600 }}>{a.clientes_nuevos}</td>
                  <td style={{ ...tdStyle, textAlign:'center', color:'#1d4ed8', fontWeight:600 }}>{a.clientes_recuperados}</td>
                  <td style={{ ...tdStyle, textAlign:'center' }}>{fmt.num(a.tickets)}</td>
                  <td style={tdStyle}>{fmt.moneda(a.ticket_promedio)}</td>
                  <td style={tdStyle}>{fmt.moneda(a.costo)}</td>
                  <td style={{ ...tdStyle, color:'#15803d' }}>{fmt.moneda(a.margen)}</td>
                  <td style={{ ...tdStyle, fontWeight:700 }}>
                    {(() => {
                      const metaMg = a.meta_margen_pct != null ? a.meta_margen_pct * 100 : null
                      const semMg = metaMg != null ? semaforo(a.margen_pct / metaMg * 100, SEM_VENTA) : null
                      return semMg
                        ? <span style={{ background:semBg(semMg), color:semC(semMg), padding:'2px 8px', borderRadius:10, fontSize:11, fontWeight:700 }}>{fmt.pct(a.margen_pct)}</span>
                        : fmt.pct(a.margen_pct)
                    })()}
                  </td>
                  <td style={{ ...tdStyle, color:'#64748b' }}>
                    {a.meta_margen_pct != null ? fmt.pct(a.meta_margen_pct * 100) : '—'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {agenteSeleccionado !== 'todos' && (
        <div style={{ padding:'8px 16px',background:'#eff6ff',fontSize:11,color:'#1d4ed8',borderTop:'1px solid #bfdbfe' }}>
          Filtrando por agente: <strong>{agenteSeleccionado}</strong> — Haz clic de nuevo para deseleccionar
        </div>
      )}
    </div>
  )
}
