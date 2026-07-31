import React from 'react'
import { fmt } from '../utils/format.js'
import InfoTip from './InfoTip.jsx'

const COMc = '#1a6cf0', RESTOc = '#f59e0b', TRACK = '#eef2f7'
// Colores de sucursal: distintos entre sí y distintos del azul (comercial) y ámbar (resto)
const SUC_COLORS = ['#7c3aed', '#14b8a6', '#f43f5e', '#0891b2', '#84cc16', '#d946ef']

function DonaGeneral({ sucursales, totalEmpresa }) {
  const R = 52, C = 2 * Math.PI * R
  let offset = 0
  return (
    <div style={{ background: '#fff', border: '2px solid #1a6cf0', borderRadius: 10, padding: 14, textAlign: 'center' }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: '#1a6cf0', textTransform: 'uppercase', letterSpacing: '.4px' }}>🏢 Empresa (total)</div>
      <div style={{ fontSize: 10.5, color: '#94a3b8', marginBottom: 6 }}>reparto por sucursal</div>
      <svg viewBox="0 0 140 140" style={{ width: 150, height: 150 }}>
        <circle cx="70" cy="70" r={R} fill="none" stroke={TRACK} strokeWidth="16" />
        {sucursales.map((s, i) => {
          const len = totalEmpresa > 0 ? C * (s.total / totalEmpresa) : 0
          const gap = sucursales.length > 1 ? 3 : 0 // separación entre segmentos
          const visible = Math.max(0, len - gap)
          const el = <circle key={s.nombre} cx="70" cy="70" r={R} fill="none" stroke={SUC_COLORS[i % SUC_COLORS.length]} strokeWidth="16"
            strokeDasharray={`${visible.toFixed(1)} ${(C - visible).toFixed(1)}`} strokeDashoffset={(-offset).toFixed(1)} transform="rotate(-90 70 70)" />
          offset += len
          return el
        })}
        <text x="70" y="66" textAnchor="middle" fontSize="16" fontWeight="800" fill="#0f1f3d">${(totalEmpresa / 1e6).toFixed(1)}M</text>
        <text x="70" y="84" textAnchor="middle" fontSize="10" fill="#94a3b8">total</text>
      </svg>
      <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 3 }}>
        {sucursales.map((s, i) => (
          <div key={s.nombre} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, justifyContent: 'center' }}>
            <span style={{ width: 9, height: 9, borderRadius: 2, background: SUC_COLORS[i % SUC_COLORS.length] }} />
            <span style={{ color: '#334155', fontWeight: 600 }}>{s.nombre}</span>
            <span style={{ color: '#94a3b8' }}>{totalEmpresa > 0 ? (s.total / totalEmpresa * 100).toFixed(1) : 0}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function Dona({ s, totalEmpresa }) {
  const R = 52, C = 2 * Math.PI * R
  const pCom = s.total > 0 ? s.com / s.total : 0
  const pResto = s.total > 0 ? s.resto / s.total : 0
  const share = totalEmpresa > 0 ? (s.total / totalEmpresa * 100) : 0
  const lenResto = C * pResto, lenCom = C * pCom
  const gap = (pCom > 0 && pResto > 0) ? 3 : 0

  return (
    <div style={{ background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: 10, padding: 14, textAlign: 'center' }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: '#0f1f3d', textTransform: 'uppercase', letterSpacing: '.4px' }}>{s.nombre}</div>
      <div style={{ fontSize: 10.5, color: '#94a3b8', marginBottom: 6 }}>{share.toFixed(0)}% de la empresa</div>
      <svg viewBox="0 0 140 140" style={{ width: 150, height: 150 }}>
        <circle cx="70" cy="70" r={R} fill="none" stroke={TRACK} strokeWidth="16" />
        {pResto > 0 && <circle cx="70" cy="70" r={R} fill="none" stroke={RESTOc} strokeWidth="16"
          strokeDasharray={`${Math.max(0, lenResto - gap).toFixed(1)} ${(C - Math.max(0, lenResto - gap)).toFixed(1)}`} strokeDashoffset="0" transform="rotate(-90 70 70)" />}
        {pCom > 0 && <circle cx="70" cy="70" r={R} fill="none" stroke={COMc} strokeWidth="16"
          strokeDasharray={`${Math.max(0, lenCom - gap).toFixed(1)} ${(C - Math.max(0, lenCom - gap)).toFixed(1)}`} strokeDashoffset={(-lenResto).toFixed(1)} transform="rotate(-90 70 70)" />}
        <text x="70" y="66" textAnchor="middle" fontSize="16" fontWeight="800" fill="#0f1f3d">${(s.total / 1e6).toFixed(1)}M</text>
        <text x="70" y="84" textAnchor="middle" fontSize="10" fill="#94a3b8">total</text>
      </svg>
      <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: 6, fontSize: 11.5 }}>
        <div><div style={{ color: COMc, fontWeight: 800 }}>{(pCom * 100).toFixed(1)}%</div><div style={{ color: '#94a3b8', fontSize: 10 }}>{fmt.moneda(s.com)}</div></div>
        <div><div style={{ color: '#b45309', fontWeight: 800 }}>{(pResto * 100).toFixed(1)}%</div><div style={{ color: '#94a3b8', fontSize: 10 }}>{fmt.moneda(s.resto)}</div></div>
      </div>
    </div>
  )
}

export default function DonasSucursal({ g }) {
  if (!g || !g.sucursalesVenta || g.sucursalesVenta.length === 0) return null
  const totalEmpresa = g.sucursalesVenta.reduce((s, x) => s + x.total, 0)

  return (
    <div style={{ background: '#fff', borderRadius: 10, border: '1.5px solid #e2e8f0', boxShadow: '0 1px 4px rgba(0,0,0,.05)', overflow: 'hidden', marginBottom: 16 }}>
      <div style={{ background: '#0f1f3d', padding: '12px 16px', display: 'flex', alignItems: 'center' }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#fff', textTransform: 'uppercase', letterSpacing: '.5px' }}>🍩 Venta por Sucursal — Comercial vs El resto</span>
        <InfoTip text="Una dona por sucursal con su split comercial/resto y su participación en la empresa. Compara todas las sucursales (no depende del filtro de Sucursal) pero sí de año, mes, equipo, línea y proveedor." light />
      </div>
      <div style={{ padding: 18, background: '#fbfcfe' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 16 }}>
          <DonaGeneral sucursales={g.sucursalesVenta} totalEmpresa={totalEmpresa} />
          {g.sucursalesVenta.map(s => <Dona key={s.nombre} s={s} totalEmpresa={totalEmpresa} />)}
        </div>
        <div style={{ display: 'flex', gap: 18, marginTop: 16, fontSize: 11.5, color: '#64748b', justifyContent: 'center' }}>
          <span><span style={{ display: 'inline-block', width: 11, height: 11, background: COMc, borderRadius: 2, marginRight: 6 }} />Equipo comercial</span>
          <span><span style={{ display: 'inline-block', width: 11, height: 11, background: RESTOc, borderRadius: 2, marginRight: 6 }} />El resto</span>
        </div>
      </div>
    </div>
  )
}
