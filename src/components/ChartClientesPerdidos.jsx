import React from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend } from 'recharts'

const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
const AGENT_COLORS = ['#1a6cf0','#f59e0b','#22c55e','#8b5cf6','#ef4444','#14b8a6','#f97316']

export default function ChartClientesPerdidos({ kpiAgentes, año, mesesConDatos = [], filtros, mesSel, onMesClick }) {
  const usarCampo = año === '2025' ? 'perdidos_al_mes_2025' : 'perdidos_al_mes'
  const mesesValidos = new Set(mesesConDatos)
  const soloAgente = filtros?.agente && filtros.agente !== 'todos'

  // Recopilar meses con datos
  const mesesSet = new Set()
  kpiAgentes.forEach(a => {
    Object.keys(a[usarCampo] || {}).forEach(m => {
      const mn = parseInt(m)
      if (mesesValidos.size === 0 || mesesValidos.has(mn)) mesesSet.add(mn)
    })
  })
  const mesesDisponibles = [...mesesSet].sort((a, b) => a - b)

  const agentNames = kpiAgentes.map(a => a.agente)

  const data = mesesDisponibles.map(m => {
    const row = { mes: MESES[m - 1], mes_num: m, total: 0 }
    kpiAgentes.forEach(a => {
      const v = (a[usarCampo] || {})[m] || 0
      row[a.agente] = v
      row.total += v
    })
    return row
  })

  const maxVal = Math.max(...data.map(d => d.total), 1)

  // Tooltip para modo "Todos" (desglose por agente)
  const TooltipTodos = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null
    const total = payload.reduce((s, p) => s + (p.value || 0), 0)
    return (
      <div style={{ background:'#fff', border:'1.5px solid #e2e8f0', borderRadius:8, padding:'10px 14px', fontSize:11, boxShadow:'0 4px 12px rgba(0,0,0,.1)', minWidth:180 }}>
        <div style={{ fontWeight:700, marginBottom:6, color:'#0f1f3d', fontSize:12 }}>{label} — {total} perdidos</div>
        {payload.filter(p => p.value > 0).sort((a, b) => b.value - a.value).map((p, i) => (
          <div key={i} style={{ display:'flex', alignItems:'center', gap:6, marginBottom:2 }}>
            <span style={{ width:8, height:8, borderRadius:'50%', background:p.fill, flexShrink:0 }} />
            <span style={{ color:'#64748b', flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.name}</span>
            <span style={{ fontWeight:700, color:'#ef4444' }}>{p.value}</span>
          </div>
        ))}
      </div>
    )
  }

  // Tooltip para modo agente único
  const TooltipAgente = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null
    return (
      <div style={{ background:'#fff', border:'1.5px solid #e2e8f0', borderRadius:8, padding:'10px 14px', fontSize:12, boxShadow:'0 4px 12px rgba(0,0,0,.1)' }}>
        <div style={{ fontWeight:700, marginBottom:4, color:'#0f1f3d' }}>{label}</div>
        <div style={{ color:'#ef4444', fontWeight:700 }}>{payload[0].value} clientes perdidos</div>
      </div>
    )
  }

  const titulo = soloAgente
    ? `🔴 Perdidos — ${filtros.agente.split(' ')[0]}${año !== 'todos' ? ` (${año})` : ''}`
    : `🔴 Clientes Perdidos por Mes${año !== 'todos' ? ` (${año})` : ''}`

  return (
    <div style={cardStyle}>
      <div style={titleStyle}>{titulo}</div>
      {data.length === 0
        ? <div style={{ color:'#94a3b8', fontSize:12, textAlign:'center', paddingTop:60 }}>Sin datos para el periodo</div>
        : <ResponsiveContainer width="100%" height={soloAgente ? 200 : 185}>
            <BarChart data={data} margin={{ top:5, right:10, left:-10, bottom:0 }} barCategoryGap="25%"
              onClick={onMesClick ? (e) => { if (e?.activePayload?.[0]) onMesClick(e.activePayload[0].payload.mes_num) } : undefined}
              style={{ cursor: onMesClick ? 'pointer' : 'default' }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="mes" tick={({ x, y, payload }) => (
                <text x={x} y={y+10} textAnchor="middle" fontSize={11}
                  fill={mesSel === data.find(d => d.mes === payload.value)?.mes_num ? '#ef4444' : '#64748b'}
                  fontWeight={mesSel === data.find(d => d.mes === payload.value)?.mes_num ? 700 : 400}>
                  {payload.value}
                </text>
              )} />
              <YAxis tick={{ fontSize:10, fill:'#94a3b8' }} allowDecimals={false} />
              <Tooltip content={soloAgente ? <TooltipAgente /> : <TooltipTodos />} />
              {soloAgente
                ? (
                  <Bar dataKey={agentNames[0] || 'total'} radius={[4,4,0,0]} maxBarSize={28}>
                    {data.map((d, i) => {
                      const v = d[agentNames[0]] || d.total || 0
                      const sel = mesSel === d.mes_num
                      return <Cell key={i} fill={sel ? '#7f1d1d' : v >= maxVal * 0.75 ? '#ef4444' : v >= maxVal * 0.4 ? '#f97316' : '#fca5a5'} opacity={mesSel && !sel ? 0.4 : 1} />
                    })}
                  </Bar>
                )
                : (
                  <>
                    {agentNames.map((name, i) => (
                      <Bar key={name} dataKey={name} stackId="stack" fill={AGENT_COLORS[i % AGENT_COLORS.length]} radius={i === agentNames.length - 1 ? [4,4,0,0] : [0,0,0,0]} maxBarSize={36}>
                        {data.map((d, j) => (
                          <Cell key={j} fill={AGENT_COLORS[i % AGENT_COLORS.length]} opacity={mesSel && mesSel !== d.mes_num ? 0.3 : 1} />
                        ))}
                      </Bar>
                    ))}
                    <Legend
                      formatter={(v) => <span style={{ fontSize:9, color:'#64748b' }}>{v.split(' ')[0]}</span>}
                      wrapperStyle={{ paddingTop:4 }}
                    />
                  </>
                )
              }
            </BarChart>
          </ResponsiveContainer>
      }
    </div>
  )
}

const cardStyle = { background:'#fff', borderRadius:10, padding:'16px', border:'1.5px solid #e2e8f0', boxShadow:'0 1px 4px rgba(0,0,0,.05)' }
const titleStyle = { fontSize:12, fontWeight:700, color:'#0f1f3d', marginBottom:12, textTransform:'uppercase', letterSpacing:'.4px' }
