import React, { useMemo } from 'react'
import { ComposedChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { fmt } from '../utils/format.js'

const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

export default function ChartVentasClientesNuevos({
  ventasNR, ventasNRAg,
  ventasNR2025, ventasNRAg2025,
  kpi2026, kpi2025,
  filtros, año,
  ventaTotalAnual2026 = 0, ventaTotalAnual2025 = 0
}) {
  const { total26, total25 } = useMemo(() => {
    const total26 = Object.values(ventasNR || {}).reduce((s, m) => s + (m.monto || 0), 0)
    const total25 = Object.values(ventasNR2025 || {}).reduce((s, m) => s + (m.monto || 0), 0)
    return { total26, total25 }
  }, [ventasNR, ventasNR2025])

  const { chartData, tileTotal, tileClientes, tileTicket, tileAño, pctDeVenta } = useMemo(() => {
    const es2025 = año === '2025'
    const tileAño = es2025 ? '2025' : '2026'

    // Fuente de datos según año y agente
    const fuente2026 = filtros.agente !== 'todos'
      ? (ventasNRAg?.[filtros.agente]     || {})
      : (ventasNR   || {})
    const fuente2025 = filtros.agente !== 'todos'
      ? (ventasNRAg2025?.[filtros.agente] || {})
      : (ventasNR2025 || {})

    // Eje X: meses del año activo (kpi ya viene filtrado por mes desde dataFiltrada)
    const mesesBase = es2025
      ? (kpi2025 || []).map(m => m.mes_num).sort((a, b) => a - b)
      : (kpi2026 || []).map(m => m.mes_num).sort((a, b) => a - b)

    const mesesActivos = filtros.meses.length > 0
      ? mesesBase.filter(m => filtros.meses.includes(m))
      : mesesBase

    const chartData = mesesActivos.map(mes => {
      const d26 = fuente2026[mes] || { monto: 0, clientes: 0 }
      const d25 = fuente2025[mes] || { monto: 0, clientes: 0 }
      return {
        mes: MESES[mes - 1],
        mes_num: mes,
        'Ventas 2026': Math.round(d26.monto || 0),
        'Ventas 2025': Math.round(d25.monto || 0),
        cli26: d26.clientes || 0,
        cli25: d25.clientes || 0,
      }
    })

    // Tiles: usar el año activo del filtro
    const fuenteTile = es2025 ? fuente2025 : fuente2026
    const tileTotal    = mesesActivos.reduce((s, m) => s + (fuenteTile[m]?.monto   || 0), 0)
    const tileClientes = mesesActivos.reduce((s, m) => s + (fuenteTile[m]?.clientes || 0), 0)
    const tileTicket   = tileClientes > 0 ? tileTotal / tileClientes : 0

    // % sobre venta acumulada filtrada (kpi ya viene filtrado por agente y mes)
    const kpiActivo = es2025 ? kpi2025 : kpi2026
    const ventaFiltrada = mesesActivos.reduce((s, m) => {
      const k = kpiActivo.find(x => x.mes_num === m)
      return s + (k?.ventas || 0)
    }, 0)
    const pctDeVenta = ventaFiltrada > 0 ? (tileTotal / ventaFiltrada * 100).toFixed(1) : null

    return { chartData, tileTotal, tileClientes, tileTicket, tileAño, pctDeVenta }
  }, [ventasNR, ventasNRAg, ventasNR2025, ventasNRAg2025, kpi2026, kpi2025, filtros, año])

  const customTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null
    const d = payload[0]?.payload
    return (
      <div style={{ background:'#fff', border:'1.5px solid #e2e8f0', borderRadius:8, padding:'10px 14px', fontSize:12, boxShadow:'0 4px 12px rgba(0,0,0,.1)' }}>
        <div style={{ fontWeight:700, marginBottom:6, color:'#0f1f3d' }}>{label}</div>
        {payload.filter(p => p.value > 0).map(p => (
          <div key={p.name} style={{ display:'flex', justifyContent:'space-between', gap:16, color:p.color }}>
            <span>{p.name}:</span>
            <span style={{ fontWeight:700 }}>{fmt.moneda(p.value)}</span>
          </div>
        ))}
        {(d.cli26 > 0 || d.cli25 > 0) && (
          <div style={{ marginTop:6, paddingTop:6, borderTop:'1px solid #f1f5f9', color:'#64748b', fontSize:11 }}>
            {d.cli26 > 0 && <span>{d.cli26} clientes compraron (2026)</span>}
            {d.cli26 > 0 && d.cli25 > 0 && <span> · </span>}
            {d.cli25 > 0 && <span>{d.cli25} (2025)</span>}
          </div>
        )}
      </div>
    )
  }

  return (
    <div style={cardStyle}>
      <div style={titleStyle}>🌱 Ventas de Clientes Nuevos</div>

      <div style={{ display:'flex', gap:0, alignItems:'stretch' }}>
        {/* Sección 1 — Totales anuales estáticos */}
        <div style={{ width:168, flexShrink:0, display:'flex', flexDirection:'column', justifyContent:'center', gap:8, paddingRight:20 }}>
          <div style={{ fontSize:9, fontWeight:700, color:'#cbd5e1', textTransform:'uppercase', letterSpacing:'.08em', marginBottom:2 }}>Ventas anuales NR</div>
          {[
            { año:'2026', total:total26, ventaTotal:ventaTotalAnual2026, color:'#1a6cf0', trackBg:'#dbeafe' },
            { año:'2025', total:total25, ventaTotal:ventaTotalAnual2025, color:'#94a3b8', trackBg:'#f1f5f9' }
          ].map(({ año, total, ventaTotal, color, trackBg }) => {
            const max = Math.max(total26, total25, 1)
            const barPct = Math.round(total / max * 100)
            const repPct = ventaTotal > 0 ? (total / ventaTotal * 100).toFixed(1) : '—'
            return (
              <div key={año} style={{ background:'#f8fafc', border:'1px solid #e2e8f0', borderRadius:8, padding:'9px 11px' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4 }}>
                  <span style={{ fontSize:12, fontWeight:800, color, letterSpacing:'.01em' }}>{año}</span>
                  <span style={{ fontSize:12, fontWeight:800, color:'#0f1f3d', fontVariantNumeric:'tabular-nums' }}>{fmt.moneda(total)}</span>
                </div>
                <div style={{ fontSize:10, color:'#94a3b8', marginBottom:6 }}>
                  {repPct !== '—' ? `${repPct}% de la venta total` : '—'}
                </div>
                <div style={{ background:trackBg, borderRadius:4, height:6 }}>
                  <div style={{ background:color, borderRadius:4, height:6, width:`${barPct}%` }} />
                </div>
              </div>
            )
          })}
        </div>

        <div style={{ width:1, background:'#e2e8f0', alignSelf:'stretch', flexShrink:0 }} />

        {/* Sección 2 — Gráfica */}
        <div style={{ flex:1, minWidth:0, paddingLeft:20, paddingRight:20 }}>
          <ResponsiveContainer width="100%" height={200}>
            <ComposedChart data={chartData} margin={{ top:5, right:10, left:10, bottom:0 }} barCategoryGap="25%">
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="mes" tick={{ fontSize:11, fill:'#64748b' }} />
              <YAxis
                tickFormatter={v => v >= 1000000 ? `$${(v/1000000).toFixed(1)}M` : `$${(v/1000).toFixed(0)}k`}
                tick={{ fontSize:10, fill:'#94a3b8' }}
                width={55}
              />
              <Tooltip content={customTooltip} />
              <Legend wrapperStyle={{ fontSize:11 }} />
              {año !== '2026' && <Bar dataKey="Ventas 2025" fill="#bfdbfe" radius={[3,3,0,0]} maxBarSize={32} />}
              {año !== '2025' && <Bar dataKey="Ventas 2026" fill="#1a6cf0" radius={[3,3,0,0]} maxBarSize={32} />}
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        <div style={{ width:1, background:'#e2e8f0', alignSelf:'stretch', flexShrink:0 }} />

        {/* Sección 3 — Tiles */}
        <div style={{ display:'flex', flexDirection:'column', gap:10, width:170, flexShrink:0, justifyContent:'center', paddingLeft:20 }}>
          <Tile label={`Ventas clientes NR ${tileAño}`} value={fmt.moneda(tileTotal)} sub={pctDeVenta ? `${pctDeVenta}% de la venta` : null} color="#15803d" />
          <Tile label={`Compras del periodo`}           value={tileClientes}              color="#1a6cf0" />
          <Tile label="Promedio por compra"             value={fmt.moneda(tileTicket)}    color="#7c3aed" />
        </div>
      </div>
    </div>
  )
}

function Tile({ label, value, color, sub }) {
  return (
    <div style={{ background:'#f8fafc', border:'1px solid #e2e8f0', borderRadius:8, padding:'10px 12px' }}>
      <div style={{ fontSize:9.5, fontWeight:600, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'.04em', marginBottom:4 }}>{label}</div>
      <div style={{ fontSize:18, fontWeight:800, color, fontVariantNumeric:'tabular-nums' }}>{value}</div>
      {sub && <div style={{ fontSize:10, color:'#94a3b8', marginTop:3 }}>{sub}</div>}
    </div>
  )
}

const cardStyle = { background:'#fff', borderRadius:10, padding:'16px', border:'1.5px solid #e2e8f0', boxShadow:'0 1px 4px rgba(0,0,0,.05)' }
const titleStyle = { fontSize:12, fontWeight:700, color:'#0f1f3d', marginBottom:12, textTransform:'uppercase', letterSpacing:'.4px' }
