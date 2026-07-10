import React from 'react'
import { BarChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ComposedChart, ResponsiveContainer, ReferenceLine } from 'recharts'
import { fmt } from '../utils/format.js'

const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

export default function ChartVentasMensuales({ kpi2025, kpi2026, metas, filtros, año }) {
  const data = []
  // Solo mostrar meses donde hay datos 2026 (filtra automáticamente con filtros de mes)
  // Incluir 2025 donde exista para el mismo periodo
  const meses2026 = new Set(kpi2026.map(m => m.mes_num))
  const meses = [...new Set([...kpi2025.map(m => m.mes_num), ...kpi2026.map(m => m.mes_num)])]
    .filter(m => meses2026.has(m))  // solo meses con datos 2026
    .sort((a,b) => a-b)

  // Filtrar metas por agente activo
  const metasFiltradas = (metas || []).filter(m =>
    m.año === 2026 &&
    (filtros.agente === 'todos' || m.agente_nombre === filtros.agente)
  )

  meses.forEach(mes => {
    const m25 = kpi2025.find(m => m.mes_num === mes)
    const m26 = kpi2026.find(m => m.mes_num === mes)
    const metaMes = metasFiltradas.filter(m => m.mes_num === mes).reduce((s, m) => s + m.meta, 0)
    const v26 = m26?.ventas || 0
    const v25 = m25?.ventas || 0
    data.push({
      mes: MESES[mes - 1],
      mes_num: mes,
      '2025': Math.round(v25),
      '2026': Math.round(v26),
      Meta: metaMes > 0 ? Math.round(metaMes) : null,
      var_pct: v25 > 0 ? ((v26 - v25) / v25 * 100).toFixed(1) : null,
      cumpl: metaMes > 0 ? ((v26 / metaMes) * 100).toFixed(1) : null
    })
  })

  const customTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null
    const d = payload[0]?.payload
    return (
      <div style={{ background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: 8, padding: '10px 14px', boxShadow: '0 4px 12px rgba(0,0,0,.1)', fontSize: 12 }}>
        <div style={{ fontWeight: 700, marginBottom: 6, color: '#0f1f3d' }}>{label}</div>
        {payload.map(p => (
          <div key={p.name} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, color: p.color }}>
            <span>{p.name}:</span><span style={{ fontWeight: 700 }}>{fmt.moneda(p.value)}</span>
          </div>
        ))}
        {d.var_pct != null && <div style={{ marginTop: 6, paddingTop: 6, borderTop: '1px solid #f1f5f9', color: d.var_pct >= 0 ? '#15803d' : '#b91c1c', fontWeight: 700 }}>
          Var. vs 2025: {d.var_pct >= 0 ? '+' : ''}{d.var_pct}%
        </div>}
        {d.cumpl != null && <div style={{ color: '#1a6cf0', fontWeight: 600 }}>Cumpl. meta: {d.cumpl}%</div>}
      </div>
    )
  }

  return (
    <div style={cardStyle}>
      <div style={titleStyle}>📊 Ventas Mensuales 2025 vs 2026 vs Meta</div>
      <ResponsiveContainer width="100%" height={220}>
        <ComposedChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#64748b' }} />
          <YAxis tickFormatter={v => `$${(v/1000000).toFixed(1)}M`} tick={{ fontSize: 10, fill: '#94a3b8' }} width={55} />
          <Tooltip content={customTooltip} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          {año !== '2026' && <Bar dataKey="2025" fill="#bfdbfe" name="2025" radius={[3,3,0,0]} maxBarSize={32} />}
          {año !== '2025' && <Bar dataKey="2026" fill="#1a6cf0" name="2026" radius={[3,3,0,0]} maxBarSize={32} />}
          {año !== '2025' && <Line type="monotone" dataKey="Meta" stroke="#f59e0b" strokeWidth={2} dot={{ r: 4, fill: '#f59e0b' }} name="Meta 2026" />}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}

const cardStyle = { background: '#fff', borderRadius: 10, padding: '16px', border: '1.5px solid #e2e8f0', boxShadow: '0 1px 4px rgba(0,0,0,.05)' }
const titleStyle = { fontSize: 12, fontWeight: 700, color: '#0f1f3d', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '.4px' }
