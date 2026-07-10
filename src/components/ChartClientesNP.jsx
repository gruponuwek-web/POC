import React from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'

const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

export default function ChartClientesNP({ kpi2026, clientesNR, nrPorMes, filtros, año }) {
  // Usar datos pre-calculados por mes y año si están disponibles
  const meses = kpi2026.map(m => m.mes_num)

  const data = meses.map(mes => {
    const nr = (nrPorMes || []).find(r => r.mes_num === mes) || {}
    return {
      mes: MESES[mes - 1],
      'Nuevos 2025':     nr.nuevos_2025 || 0,
      'Recuperados 2025': nr.recup_2025  || 0,
      'Nuevos 2026':     nr.nuevos_2026 || 0,
      'Recuperados 2026': nr.recup_2026  || 0,
    }
  })

  const customTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null
    return (
      <div style={{ background:'#fff', border:'1.5px solid #e2e8f0', borderRadius:8, padding:'10px 14px', fontSize:12, boxShadow:'0 4px 12px rgba(0,0,0,.1)' }}>
        <div style={{ fontWeight:700, marginBottom:6, color:'#0f1f3d' }}>{label}</div>
        {payload.filter(p => p.value > 0).map(p => (
          <div key={p.name} style={{ display:'flex', justifyContent:'space-between', gap:16, color:p.color }}>
            <span>{p.name}:</span><span style={{ fontWeight:700 }}>{p.value}</span>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div style={cardStyle}>
      <div style={titleStyle}>🟢 Clientes Nuevos y Recuperados</div>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} margin={{ top:5, right:10, left:-10, bottom:0 }} barCategoryGap="20%">
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="mes" tick={{ fontSize:11, fill:'#64748b' }} />
          <YAxis tick={{ fontSize:10, fill:'#94a3b8' }} allowDecimals={false} />
          <Tooltip content={customTooltip} />
          <Legend wrapperStyle={{ fontSize:10 }} />
          {año !== '2026' && <Bar dataKey="Nuevos 2025"      fill="#bbf7d0" radius={[3,3,0,0]} maxBarSize={18} />}
          {año !== '2026' && <Bar dataKey="Recuperados 2025" fill="#bfdbfe" radius={[3,3,0,0]} maxBarSize={18} />}
          {año !== '2025' && <Bar dataKey="Nuevos 2026"      fill="#22c55e" radius={[3,3,0,0]} maxBarSize={18} />}
          {año !== '2025' && <Bar dataKey="Recuperados 2026" fill="#3b82f6" radius={[3,3,0,0]} maxBarSize={18} />}
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

const cardStyle = { background:'#fff', borderRadius:10, padding:'16px', border:'1.5px solid #e2e8f0', boxShadow:'0 1px 4px rgba(0,0,0,.05)' }
const titleStyle = { fontSize:12, fontWeight:700, color:'#0f1f3d', marginBottom:12, textTransform:'uppercase', letterSpacing:'.4px' }
