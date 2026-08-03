import React, { useMemo, useState } from 'react'
import { fmt } from '../utils/format.js'
import InfoTip from './InfoTip.jsx'
import { scopeLabel } from '../utils/ventasGeneral.js'

function lineaColor(i, n) { return `hsl(${Math.round(i * 360 / n)}, 62%, 48%)` }
function prodColor(i, n, pi) { return `hsl(${Math.round(i * 360 / n)}, 55%, ${Math.min(80, 60 + pi * 3)}%)` }

function titulo(s) { return String(s || '').toLowerCase().replace(/\b\w/g, c => c.toUpperCase()) }

export default function SunburstProductos({ ap, filtros }) {
  const lineas = ap?.sunburst || []
  const [sel, setSel] = useState(null) // nombre de línea seleccionada (drill-down), null = ver todas

  // Si la línea seleccionada ya no existe en este alcance (p.ej. cambió el filtro), reseteamos
  const lineaSel = sel ? lineas.find(l => l.nombre === sel) : null
  const R1 = 44, R2 = 76, SW = 28

  const { arcs1, arcs2, total } = useMemo(() => {
    const GAP = 1.4
    const C1 = 2 * Math.PI * R1, C2 = 2 * Math.PI * R2

    if (lineaSel) {
      // Drill-down: anillo interior = toda la línea (100%); anillo exterior = sus productos
      const prods = lineaSel.productos
      const total = lineaSel.venta
      const idxLinea = lineas.indexOf(lineaSel)
      const arcs1 = [{ color: lineaColor(idxLinea, lineas.length), offset: 0, len: Math.max(0, C1 - GAP), nombre: lineaSel.nombre, venta: lineaSel.venta, cantidad: lineaSel.cantidad }]
      const arcs2 = []
      let sub = 0
      prods.forEach((p, pi) => {
        const pfrac = total > 0 ? p.venta / total : 0
        const plen = C2 * pfrac
        arcs2.push({ color: prodColor(idxLinea, lineas.length, pi), offset: sub, len: Math.max(0, plen - GAP * 0.5), nombre: p.nombre, venta: p.venta, cantidad: p.cantidad, linea: lineaSel.nombre })
        sub += plen
      })
      return { arcs1, arcs2, total }
    }

    // Vista completa: todas las líneas
    const total = lineas.reduce((s, l) => s + l.venta, 0)
    const n = lineas.length
    const arcs1 = [], arcs2 = []
    let off1 = 0
    lineas.forEach((linea, li) => {
      const frac = total > 0 ? linea.venta / total : 0
      const len1 = C1 * frac
      arcs1.push({ color: lineaColor(li, n), offset: off1, len: Math.max(0, len1 - GAP), nombre: linea.nombre, venta: linea.venta, cantidad: linea.cantidad })
      const len2Total = C2 * frac
      let sub = off1 / C1 * C2
      linea.productos.forEach((p, pi) => {
        const pfrac = linea.venta > 0 ? p.venta / linea.venta : 0
        const plen = len2Total * pfrac
        arcs2.push({ color: prodColor(li, n, pi), offset: sub, len: Math.max(0, plen - GAP * 0.5), nombre: p.nombre, venta: p.venta, cantidad: p.cantidad, linea: linea.nombre })
        sub += plen
      })
      off1 += len1
    })
    return { arcs1, arcs2, total }
  }, [lineas, lineaSel])

  if (!lineas.length) return null
  const total0 = lineas.reduce((s, l) => s + l.venta, 0)
  const topLineas = [...lineas].sort((a, b) => b.venta - a.venta).slice(0, 8)
  const topProductos = lineaSel
    ? lineaSel.productos.filter(p => !/^Otros \(/.test(p.nombre)).slice(0, 10).map(p => ({ ...p, linea: lineaSel.nombre }))
    : lineas.flatMap(l => l.productos.filter(p => !/^Otros \(/.test(p.nombre)).map(p => ({ ...p, linea: l.nombre }))).sort((a, b) => b.venta - a.venta).slice(0, 10)

  return (
    <div style={{ background: '#fff', borderRadius: 10, border: '1.5px solid #e2e8f0', boxShadow: '0 1px 4px rgba(0,0,0,.05)', overflow: 'hidden', marginBottom: 16 }}>
      <div style={{ padding: '14px 18px 0', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#0f1f3d', textTransform: 'uppercase', letterSpacing: '.4px' }}>☀️ Productos por Línea (Sunburst)</span>
        <InfoTip text="Anillo interior = línea de producto. Anillo exterior = productos dentro de esa línea. El tamaño de cada segmento es la venta $. Haz clic en una línea (en el anillo o en la lista) para entrar solo a esa línea." />
        {filtros && <span style={{ fontSize: 10.5, color: '#94a3b8', fontWeight: 600 }}>· {scopeLabel(filtros)}{filtros.año && filtros.año !== 'todos' ? ` · ${filtros.año}` : ''}{(filtros.meses && filtros.meses.length) ? ` · ${filtros.meses.length} mes(es)` : ''}</span>}
        {lineaSel && (
          <button onClick={() => setSel(null)} style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 700, color: '#1a6cf0', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 6, padding: '4px 10px', cursor: 'pointer' }}>
            ← Ver todas las líneas
          </button>
        )}
      </div>
      <div style={{ padding: 18, display: 'grid', gridTemplateColumns: '260px 1fr', gap: 20, alignItems: 'center' }}>
        <svg viewBox="0 0 200 200" style={{ width: '100%', maxWidth: 260, display: 'block', margin: '0 auto' }}>
          <circle cx="100" cy="100" r={R1} fill="none" stroke="#f1f5f9" strokeWidth={SW} />
          <circle cx="100" cy="100" r={R2} fill="none" stroke="#f8fafc" strokeWidth={SW} />
          {arcs1.map((a, i) => (
            <circle key={i} cx="100" cy="100" r={R1} fill="none" stroke={a.color} strokeWidth={SW}
              strokeDasharray={`${a.len.toFixed(1)} ${(2 * Math.PI * R1 - a.len).toFixed(1)}`}
              strokeDashoffset={(-a.offset).toFixed(1)} transform="rotate(-90 100 100)"
              style={{ cursor: lineaSel ? 'default' : 'pointer' }}
              onClick={() => !lineaSel && setSel(a.nombre)}>
              <title>{titulo(a.nombre)}: {fmt.moneda(a.venta)} ({total0 > 0 ? (a.venta / total0 * 100).toFixed(1) : 0}%){!lineaSel ? ' — clic para ver sus productos' : ''}</title>
            </circle>
          ))}
          {arcs2.map((a, i) => (
            <circle key={i} cx="100" cy="100" r={R2} fill="none" stroke={a.color} strokeWidth={SW}
              strokeDasharray={`${a.len.toFixed(1)} ${(2 * Math.PI * R2 - a.len).toFixed(1)}`}
              strokeDashoffset={(-a.offset).toFixed(1)} transform="rotate(-90 100 100)">
              <title>{titulo(a.nombre)} ({titulo(a.linea)}): {fmt.moneda(a.venta)} · {fmt.num(a.cantidad)} unid.</title>
            </circle>
          ))}
          <text x="100" y="95" textAnchor="middle" fontSize={lineaSel ? 10 : 12} fontWeight="800" fill="#0f1f3d">{fmt.moneda(total).replace('MX$', '$')}</text>
          <text x="100" y="109" textAnchor="middle" fontSize="7.5" fill="#94a3b8">{lineaSel ? titulo(lineaSel.nombre) : 'venta total'}</text>
        </svg>
        <div>
          <div style={{ fontSize: 10.5, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: 8 }}>Top líneas por venta <span style={{ fontWeight: 500, textTransform: 'none', letterSpacing: 0 }}>(clic para entrar)</span></div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: '4px 16px' }}>
            {topLineas.map((l, i) => {
              const idx = lineas.indexOf(l)
              const pct = total0 > 0 ? l.venta / total0 * 100 : 0
              const activa = sel === l.nombre
              return (
                <div key={l.nombre} onClick={() => setSel(activa ? null : l.nombre)}
                  style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 11.5, padding: '3px 4px', borderRadius: 5, cursor: 'pointer', background: activa ? '#eff6ff' : 'transparent' }}>
                  <span style={{ width: 10, height: 10, borderRadius: 2, background: lineaColor(idx, lineas.length), flexShrink: 0 }} />
                  <span style={{ flex: 1, color: activa ? '#1a6cf0' : '#334155', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{titulo(l.nombre)}</span>
                  <span style={{ color: '#94a3b8', flexShrink: 0 }}>{pct.toFixed(1)}%</span>
                </div>
              )
            })}
          </div>

          <div style={{ fontSize: 10.5, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.4px', margin: '16px 0 8px' }}>
            {lineaSel ? `Top productos de ${titulo(lineaSel.nombre)}` : 'Top 10 productos individuales'}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {topProductos.map((p, i) => (
              <div key={p.nombre + p.linea} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, padding: '3px 0', borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ color: '#94a3b8', fontWeight: 700, width: 14, flexShrink: 0 }}>{i + 1}</span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: '#334155', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{titulo(p.nombre)}</div>
                  {!lineaSel && <div style={{ color: '#94a3b8', fontSize: 9.5 }}>{titulo(p.linea)}</div>}
                </span>
                <span style={{ color: '#0f1f3d', fontWeight: 700, flexShrink: 0, textAlign: 'right' }}>{fmt.moneda(p.venta)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
