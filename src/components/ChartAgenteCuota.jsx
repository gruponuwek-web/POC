import React from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts'
import { fmt, semaforo, SEM_VENTA } from '../utils/format.js'

export default function ChartAgenteCuota({ agentes }) {
  const data = agentes
    .filter(a => a.meta > 0)
    .sort((a, b) => (b.cumplimiento_pct || 0) - (a.cumplimiento_pct || 0))
    .slice(0, 12)
    .map(a => ({
      agente: a.agente.split(' ')[0],
      nombre: a.agente,
      Venta: Math.round(a.ventas),
      Meta: Math.round(a.meta),
      pct: a.cumplimiento_pct?.toFixed(1),
      sem: semaforo(a.cumplimiento_pct, SEM_VENTA)
    }))

  const semC = s => s === 'green' ? '#22c55e' : s === 'yellow' ? '#f59e0b' : '#ef4444'

  const tip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null
    const d = payload[0]?.payload
    return (
      <div style={{ background:'#fff',border:'1.5px solid #e2e8f0',borderRadius:8,padding:'10px 14px',fontSize:12,boxShadow:'0 4px 12px rgba(0,0,0,.1)' }}>
        <div style={{ fontWeight:700,marginBottom:6,color:'#0f1f3d' }}>{d.nombre}</div>
        <div>Venta: <strong>{fmt.moneda(d.Venta)}</strong></div>
        <div>Meta: <strong>{fmt.moneda(d.Meta)}</strong></div>
        <div style={{ color: semC(d.sem), fontWeight:700 }}>Cumplimiento: {d.pct}%</div>
      </div>
    )
  }

  return (
    <div style={cardStyle}>
      <div style={titleStyle}>🎯 Venta vs Cuota por Agente</div>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 50, left: 80, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
          <XAxis type="number" tickFormatter={v => `$${(v/1000000).toFixed(1)}M`} tick={{ fontSize: 10, fill: '#94a3b8' }} />
          <YAxis type="category" dataKey="agente" tick={{ fontSize: 11, fill: '#475569' }} width={76} />
          <Tooltip content={tip} />
          <Bar dataKey="Meta" fill="#e2e8f0" radius={[0,3,3,0]} maxBarSize={14} />
          <Bar dataKey="Venta" radius={[0,3,3,0]} maxBarSize={14}>
            {data.map((d, i) => <Cell key={i} fill={semC(d.sem)} />)}
            <LabelList dataKey="pct" position="right" formatter={v => `${v}%`} style={{ fontSize: 10, fontWeight: 700, fill: '#334155' }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div style={{ display:'flex',gap:12,marginTop:8,fontSize:10,color:'#64748b' }}>
        <span style={{ display:'flex',alignItems:'center',gap:4 }}><span style={{ width:10,height:10,background:'#22c55e',display:'inline-block',borderRadius:2 }}/>≥100%</span>
        <span style={{ display:'flex',alignItems:'center',gap:4 }}><span style={{ width:10,height:10,background:'#f59e0b',display:'inline-block',borderRadius:2 }}/>85–99%</span>
        <span style={{ display:'flex',alignItems:'center',gap:4 }}><span style={{ width:10,height:10,background:'#ef4444',display:'inline-block',borderRadius:2 }}/>{'<'}85%</span>
      </div>
    </div>
  )
}

const cardStyle = { background:'#fff',borderRadius:10,padding:'16px',border:'1.5px solid #e2e8f0',boxShadow:'0 1px 4px rgba(0,0,0,.05)' }
const titleStyle = { fontSize:12,fontWeight:700,color:'#0f1f3d',marginBottom:12,textTransform:'uppercase',letterSpacing:'.4px' }
