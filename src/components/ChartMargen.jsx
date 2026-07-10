import React from 'react'
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { fmt } from '../utils/format.js'

const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

export default function ChartMargen({ kpi2026, kpiAgentes, año }) {
  let data
  if (año === '2025') {
    const totMes = {}
    ;(kpiAgentes || []).forEach(a => {
      const v25 = a.ventas_2025_por_mes || {}
      const c25 = a.costo_2025_por_mes  || {}
      Object.keys(v25).forEach(m => {
        const mn = parseInt(m)
        if (!totMes[mn]) totMes[mn] = { venta: 0, costo: 0 }
        totMes[mn].venta += v25[m] || 0
        totMes[mn].costo += c25[m] || 0
      })
    })
    const meses2025 = (kpi2026.length > 0 ? kpi2026.map(m => m.mes_num) : Object.keys(totMes).map(Number)).sort((a,b)=>a-b)
    data = meses2025.map(mn => {
      const t = totMes[mn] || { venta: 0, costo: 0 }
      const margen = t.venta - t.costo
      return { mes: MESES[mn-1], Venta: Math.round(t.venta), Costo: Math.round(t.costo), Margen: Math.round(margen), 'Margen %': t.venta > 0 ? Number((margen/t.venta*100).toFixed(1)) : 0 }
    })
  } else {
    data = kpi2026.map(m => ({
      mes: MESES[m.mes_num - 1],
      Venta: Math.round(m.ventas),
      Costo: Math.round(m.costo),
      Margen: Math.round(m.margen),
      'Margen %': Number(m.margen_pct.toFixed(1))
    }))
  }

  return (
    <div style={cardStyle}>
      <div style={titleStyle}>📈 Margen y Rentabilidad por Mes</div>
      <ResponsiveContainer width="100%" height={200}>
        <ComposedChart data={data} margin={{ top:5,right:50,left:10,bottom:0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="mes" tick={{ fontSize:11,fill:'#64748b' }} />
          <YAxis yAxisId="left" tickFormatter={v => `$${(v/1000000).toFixed(1)}M`} tick={{ fontSize:10,fill:'#94a3b8' }} width={60} />
          <YAxis yAxisId="right" orientation="right" tickFormatter={v => `${v}%`} tick={{ fontSize:10,fill:'#94a3b8' }} width={40} />
          <Tooltip
            formatter={(v, name) => name === 'Margen %' ? [`${v}%`, name] : [fmt.moneda(v), name]}
            contentStyle={{ borderRadius:8,border:'1.5px solid #e2e8f0',fontSize:12 }}
          />
          <Legend wrapperStyle={{ fontSize:11 }} />
          <Bar yAxisId="left" dataKey="Venta" fill="#bfdbfe" radius={[3,3,0,0]} maxBarSize={36} />
          <Bar yAxisId="left" dataKey="Costo" fill="#fca5a5" radius={[3,3,0,0]} maxBarSize={36} />
          <Bar yAxisId="left" dataKey="Margen" fill="#22c55e" radius={[3,3,0,0]} maxBarSize={36} />
          <Line yAxisId="right" type="monotone" dataKey="Margen %" stroke="#0f1f3d" strokeWidth={2} dot={{ r:4,fill:'#0f1f3d' }} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}

const cardStyle = { background:'#fff',borderRadius:10,padding:'16px',border:'1.5px solid #e2e8f0',boxShadow:'0 1px 4px rgba(0,0,0,.05)' }
const titleStyle = { fontSize:12,fontWeight:700,color:'#0f1f3d',marginBottom:12,textTransform:'uppercase',letterSpacing:'.4px' }
