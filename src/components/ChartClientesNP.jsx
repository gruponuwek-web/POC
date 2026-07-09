import React from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from 'recharts'

const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

export default function ChartClientesNP({ kpi2026, clientesNR, filtros }) {
  // agrupar clientes nuevos y recuperados por mes
  const porMes = {}
  ;(clientesNR || []).forEach(c => {
    if (!c.mes_num) return
    if (!porMes[c.mes_num]) porMes[c.mes_num] = { nuevos: 0, recuperados: 0 }
    if (c.status === 'Nuevo') porMes[c.mes_num].nuevos++
    if (c.status === 'Recuperado') porMes[c.mes_num].recuperados++
  })

  const meses = kpi2026.map(m => m.mes_num)
  const data = meses.map(mes => ({
    mes: MESES[mes - 1],
    Nuevos: porMes[mes]?.nuevos || 0,
    Recuperados: porMes[mes]?.recuperados || 0,
    neto: (porMes[mes]?.nuevos || 0) + (porMes[mes]?.recuperados || 0)
  }))

  return (
    <div style={cardStyle}>
      <div style={titleStyle}>🟢 Clientes Nuevos y Recuperados</div>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={data} margin={{ top:5,right:10,left:-10,bottom:0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="mes" tick={{ fontSize:11,fill:'#64748b' }} />
          <YAxis tick={{ fontSize:10,fill:'#94a3b8' }} />
          <Tooltip
            formatter={(v, name) => [v, name]}
            contentStyle={{ borderRadius:8,border:'1.5px solid #e2e8f0',fontSize:12 }}
          />
          <Legend wrapperStyle={{ fontSize:11 }} />
          <Bar dataKey="Nuevos" fill="#22c55e" radius={[3,3,0,0]} maxBarSize={28} />
          <Bar dataKey="Recuperados" fill="#3b82f6" radius={[3,3,0,0]} maxBarSize={28} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

const cardStyle = { background:'#fff',borderRadius:10,padding:'16px',border:'1.5px solid #e2e8f0',boxShadow:'0 1px 4px rgba(0,0,0,.05)' }
const titleStyle = { fontSize:12,fontWeight:700,color:'#0f1f3d',marginBottom:12,textTransform:'uppercase',letterSpacing:'.4px' }
