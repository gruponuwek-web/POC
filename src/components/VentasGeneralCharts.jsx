import React from 'react'
import { fmt } from '../utils/format.js'

const MESES3 = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

function Card({ titulo, children }) {
  return (
    <div style={{ background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: 10, boxShadow: '0 1px 4px rgba(0,0,0,.05)', overflow: 'hidden' }}>
      <div style={{ background: '#0f1f3d', padding: '12px 16px' }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#fff', textTransform: 'uppercase', letterSpacing: '.5px' }}>{titulo}</span>
      </div>
      <div style={{ padding: '14px 16px' }}>{children}</div>
    </div>
  )
}

export default function VentasGeneralCharts({ g }) {
  if (!g || !g.meses.length) return null

  const rows = g.meses.map(m => {
    const d = g.porMes[m]
    const venta = d.comV + d.restoV
    const costo = d.comC + d.restoC
    const ops = d.comN + d.restoN
    return { mes: m, venta, costo, margen: venta - costo, margenPct: venta > 0 ? (venta - costo) / venta * 100 : 0, ops }
  })

  const maxOps = Math.max(...rows.map(r => r.ops).filter(Number.isFinite), 1)
  const maxMg = Math.max(...rows.map(r => r.margen).filter(Number.isFinite), 1)
  const H = 150

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>

      <Card titulo="🎟️ Operaciones por mes — Toda la empresa">
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height: H + 20, paddingTop: 6 }}>
          {rows.map(r => (
            <div key={r.mes} style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center' }}>
              <div style={{ fontSize: 9.5, color: '#64748b', marginBottom: 3, fontWeight: 600 }}>{fmt.num(r.ops)}</div>
              <div style={{ width: '62%', height: Math.max(0, r.ops / maxOps * H) || 0, background: '#7c3aed', borderRadius: '4px 4px 0 0' }} />
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
          {rows.map(r => <div key={r.mes} style={{ flex: 1, textAlign: 'center', fontSize: 10, color: '#94a3b8' }}>{MESES3[r.mes - 1]}</div>)}
        </div>
      </Card>

      <Card titulo="📈 Margen por mes — Toda la empresa">
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height: H + 20, paddingTop: 6 }}>
          {rows.map(r => (
            <div key={r.mes} style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center' }}>
              <div style={{ fontSize: 9.5, color: '#15803d', marginBottom: 2, fontWeight: 700 }}>{r.margenPct.toFixed(1)}%</div>
              <div style={{ fontSize: 8.5, color: '#94a3b8', marginBottom: 3 }}>${(r.margen / 1e6).toFixed(1)}M</div>
              <div style={{ width: '62%', height: Math.max(0, r.margen / maxMg * H) || 0, background: '#22c55e', borderRadius: '4px 4px 0 0' }} />
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
          {rows.map(r => <div key={r.mes} style={{ flex: 1, textAlign: 'center', fontSize: 10, color: '#94a3b8' }}>{MESES3[r.mes - 1]}</div>)}
        </div>
      </Card>

    </div>
  )
}
