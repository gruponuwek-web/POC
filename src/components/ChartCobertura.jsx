import React from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { fmt, semaforo, SEM_COBERTURA } from '../utils/format.js'

export default function ChartCobertura({ agentes }) {
  const data = agentes
    .filter(a => a.cartera_total > 0)
    .sort((a, b) => (b.cobertura_pct || 0) - (a.cobertura_pct || 0))
    .map(a => ({
      agente: a.agente.split(' ')[0],
      nombre: a.agente,
      Atendidos: a.clientes_atendidos,
      Pendientes: a.clientes_pendientes,
      total: a.cartera_total,
      pct: a.cobertura_pct?.toFixed(1),
      sem: semaforo(a.cobertura_pct, SEM_COBERTURA)
    }))

  const semC = s => s === 'green' ? '#22c55e' : s === 'yellow' ? '#f59e0b' : '#ef4444'

  const tip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null
    const d = payload[0]?.payload
    return (
      <div style={{ background:'#fff',border:'1.5px solid #e2e8f0',borderRadius:8,padding:'10px 14px',fontSize:12,boxShadow:'0 4px 12px rgba(0,0,0,.1)' }}>
        <div style={{ fontWeight:700,marginBottom:6 }}>{d.nombre}</div>
        <div>Cartera: <strong>{d.total}</strong></div>
        <div style={{ color:'#22c55e' }}>Atendidos: <strong>{d.Atendidos}</strong></div>
        <div style={{ color:'#ef4444' }}>Pendientes: <strong>{d.Pendientes}</strong></div>
        <div style={{ color:semC(d.sem),fontWeight:700 }}>Cobertura: {d.pct}%</div>
      </div>
    )
  }

  return (
    <div style={cardStyle}>
      <div style={titleStyle}>👥 Cobertura de Cartera por Agente</div>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={data} layout="vertical" margin={{ top:0,right:45,left:70,bottom:0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
          <XAxis type="number" tick={{ fontSize:10,fill:'#94a3b8' }} />
          <YAxis type="category" dataKey="agente" tick={{ fontSize:10,fill:'#475569' }} width={66} />
          <Tooltip content={tip} />
          <Bar dataKey="Atendidos" stackId="a" radius={[0,0,0,0]}>
            {data.map((d, i) => <Cell key={i} fill={semC(d.sem)} />)}
          </Bar>
          <Bar dataKey="Pendientes" stackId="a" fill="#f1f5f9" radius={[0,3,3,0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

const cardStyle = { background:'#fff',borderRadius:10,padding:'16px',border:'1.5px solid #e2e8f0',boxShadow:'0 1px 4px rgba(0,0,0,.05)' }
const titleStyle = { fontSize:12,fontWeight:700,color:'#0f1f3d',marginBottom:12,textTransform:'uppercase',letterSpacing:'.4px' }
