import React from 'react'
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { fmt } from '../utils/format.js'

const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

export default function ChartTickets({ kpi2026 }) {
  const data = kpi2026.map(m => ({
    mes: MESES[m.mes_num - 1],
    Tickets: m.tickets,
    'Ticket Prom.': Math.round(m.ticket_promedio)
  }))

  return (
    <div style={cardStyle}>
      <div style={titleStyle}>🧾 Tickets y Ticket Promedio</div>
      <ResponsiveContainer width="100%" height={180}>
        <ComposedChart data={data} margin={{ top:5,right:10,left:-10,bottom:0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="mes" tick={{ fontSize:11,fill:'#64748b' }} />
          <YAxis yAxisId="left" tick={{ fontSize:10,fill:'#94a3b8' }} />
          <YAxis yAxisId="right" orientation="right" tickFormatter={v => `$${(v/1000).toFixed(0)}K`} tick={{ fontSize:10,fill:'#94a3b8' }} />
          <Tooltip
            formatter={(v, name) => name === 'Ticket Prom.' ? [fmt.moneda(v), name] : [v, name]}
            contentStyle={{ borderRadius:8,border:'1.5px solid #e2e8f0',fontSize:12 }}
          />
          <Legend wrapperStyle={{ fontSize:11 }} />
          <Bar yAxisId="left" dataKey="Tickets" fill="#8b5cf6" radius={[3,3,0,0]} maxBarSize={28} />
          <Line yAxisId="right" type="monotone" dataKey="Ticket Prom." stroke="#f59e0b" strokeWidth={2} dot={{ r:4,fill:'#f59e0b' }} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}

const cardStyle = { background:'#fff',borderRadius:10,padding:'16px',border:'1.5px solid #e2e8f0',boxShadow:'0 1px 4px rgba(0,0,0,.05)' }
const titleStyle = { fontSize:12,fontWeight:700,color:'#0f1f3d',marginBottom:12,textTransform:'uppercase',letterSpacing:'.4px' }
