import React, { useMemo } from 'react'
import { fmt } from '../utils/format.js'
import InfoTip from './InfoTip.jsx'

function lineaColor(i, n) { return `hsl(${Math.round(i * 360 / n)}, 62%, 48%)` }
function prodColor(i, n, pi) { return `hsl(${Math.round(i * 360 / n)}, 55%, ${Math.min(80, 60 + pi * 3)}%)` }

function titulo(s) { return String(s || '').toLowerCase().replace(/\b\w/g, c => c.toUpperCase()) }

export default function SunburstProductos({ ap, filtros }) {
  const scopeKey = filtros?.año === '2025' ? '2025' : filtros?.año === '2026' ? '2026' : 'todos'
  const lineas = ap?.sunburst?.[scopeKey] || []

  const { arcs1, arcs2, total, R1, R2, SW } = useMemo(() => {
    const R1 = 44, R2 = 76, SW = 28, GAP = 1.4
    const C1 = 2 * Math.PI * R1, C2 = 2 * Math.PI * R2
    const total = lineas.reduce((s, l) => s + l.venta, 0)
    const n = lineas.length
    const arcs1 = [], arcs2 = []
    let off1 = 0
    lineas.forEach((linea, li) => {
      const frac = total > 0 ? linea.venta / total : 0
      const len1 = C1 * frac
      arcs1.push({ color: lineaColor(li, n), offset: off1, len: Math.max(0, len1 - GAP), nombre: linea.nombre, venta: linea.venta, cantidad: linea.cantidad })
      const len2Total = C2 * frac
      let sub = off1 / C1 * C2 // alinear el inicio angular del anillo externo con el interno
      linea.productos.forEach((p, pi) => {
        const pfrac = linea.venta > 0 ? p.venta / linea.venta : 0
        const plen = len2Total * pfrac
        arcs2.push({ color: prodColor(li, n, pi), offset: sub, len: Math.max(0, plen - GAP * 0.5), nombre: p.nombre, venta: p.venta, cantidad: p.cantidad, linea: linea.nombre })
        sub += plen
      })
      off1 += len1
    })
    return { arcs1, arcs2, total, R1, R2, SW }
  }, [lineas])

  if (!lineas.length) return null
  const topLineas = [...lineas].sort((a, b) => b.venta - a.venta).slice(0, 8)

  return (
    <div style={{ background: '#fff', borderRadius: 10, border: '1.5px solid #e2e8f0', boxShadow: '0 1px 4px rgba(0,0,0,.05)', overflow: 'hidden', marginBottom: 16 }}>
      <div style={{ padding: '14px 18px 0', display: 'flex', alignItems: 'center' }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#0f1f3d', textTransform: 'uppercase', letterSpacing: '.4px' }}>☀️ Productos por Línea (Sunburst)</span>
        <InfoTip text="Anillo interior = línea de producto. Anillo exterior = productos dentro de esa línea (top 12 + 'Otros'). El tamaño de cada segmento es la venta $. Pasa el cursor sobre un segmento para ver el detalle." />
      </div>
      <div style={{ padding: 18, display: 'grid', gridTemplateColumns: '260px 1fr', gap: 20, alignItems: 'center' }}>
        <svg viewBox="0 0 200 200" style={{ width: '100%', maxWidth: 260, display: 'block', margin: '0 auto' }}>
          <circle cx="100" cy="100" r={R1} fill="none" stroke="#f1f5f9" strokeWidth={SW} />
          <circle cx="100" cy="100" r={R2} fill="none" stroke="#f8fafc" strokeWidth={SW} />
          {arcs1.map((a, i) => (
            <circle key={i} cx="100" cy="100" r={R1} fill="none" stroke={a.color} strokeWidth={SW}
              strokeDasharray={`${a.len.toFixed(1)} ${(2 * Math.PI * R1 - a.len).toFixed(1)}`}
              strokeDashoffset={(-a.offset).toFixed(1)} transform="rotate(-90 100 100)">
              <title>{titulo(a.nombre)}: {fmt.moneda(a.venta)} ({total > 0 ? (a.venta / total * 100).toFixed(1) : 0}%)</title>
            </circle>
          ))}
          {arcs2.map((a, i) => (
            <circle key={i} cx="100" cy="100" r={R2} fill="none" stroke={a.color} strokeWidth={SW}
              strokeDasharray={`${a.len.toFixed(1)} ${(2 * Math.PI * R2 - a.len).toFixed(1)}`}
              strokeDashoffset={(-a.offset).toFixed(1)} transform="rotate(-90 100 100)">
              <title>{titulo(a.nombre)} ({titulo(a.linea)}): {fmt.moneda(a.venta)} · {fmt.num(a.cantidad)} unid.</title>
            </circle>
          ))}
          <text x="100" y="97" textAnchor="middle" fontSize="12" fontWeight="800" fill="#0f1f3d">{fmt.moneda(total).replace('MX$', '$')}</text>
          <text x="100" y="111" textAnchor="middle" fontSize="7.5" fill="#94a3b8">venta total</text>
        </svg>
        <div>
          <div style={{ fontSize: 10.5, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: 8 }}>Top líneas por venta</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: '4px 16px' }}>
            {topLineas.map((l, i) => {
              const idx = lineas.indexOf(l)
              const pct = total > 0 ? l.venta / total * 100 : 0
              return (
                <div key={l.nombre} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 11.5, padding: '3px 0' }}>
                  <span style={{ width: 10, height: 10, borderRadius: 2, background: lineaColor(idx, lineas.length), flexShrink: 0 }} />
                  <span style={{ flex: 1, color: '#334155', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{titulo(l.nombre)}</span>
                  <span style={{ color: '#94a3b8', flexShrink: 0 }}>{pct.toFixed(1)}%</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
