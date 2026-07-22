import React, { useMemo, useState } from 'react'
import { fmt } from '../utils/format.js'

function computeRows(data, filtros) {
  const es2025 = filtros.año === '2025'
  const mesProv  = es2025 ? (data.kpi_mensual_por_proveedor_2025 || {}) : (data.kpi_mensual_por_proveedor || {})
  const agProv   = es2025 ? (data.kpi_agentes_por_proveedor_2025 || {}) : (data.kpi_agentes_por_proveedor || {})
  const allProvs = Object.keys(mesProv)

  return allProvs.map(prov => {
    let ventas = 0, costo = 0, tickets = 0

    if (filtros.agente !== 'todos') {
      const agData = agProv?.[prov]?.[filtros.agente] || {}
      const meses  = filtros.meses.length > 0
        ? filtros.meses
        : Object.keys(agData.ventas_por_mes || {}).map(Number)
      ventas  = meses.reduce((s, m) => s + (agData.ventas_por_mes?.[m]  || 0), 0)
      costo   = meses.reduce((s, m) => s + (agData.costo_por_mes?.[m]   || 0), 0)
      tickets = meses.reduce((s, m) => s + (agData.tickets_por_mes?.[m] || 0), 0)
    } else {
      const arr      = mesProv[prov] || []
      const filtered = filtros.meses.length > 0 ? arr.filter(m => filtros.meses.includes(m.mes_num)) : arr
      ventas  = filtered.reduce((s, m) => s + m.ventas,  0)
      costo   = filtered.reduce((s, m) => s + m.costo,   0)
      tickets = filtered.reduce((s, m) => s + m.tickets, 0)
    }

    return {
      prov, ventas, costo, tickets,
      margen: ventas - costo,
      margen_pct: ventas > 0 ? (ventas - costo) / ventas * 100 : 0,
      ticket_prom: tickets > 0 ? ventas / tickets : 0,
    }
  })
  .filter(r => r.ventas > 0)
  .sort((a, b) => b.ventas - a.ventas)
}

function doExportCSV(rows, totalVenta, año) {
  const headers = ['#', 'Proveedor', 'Ventas', '% del Total', 'Tickets', 'Ticket Promedio', 'Margen $', 'Margen %']
  const lines = rows.map((r, i) => [
    i + 1,
    `"${r.prov}"`,
    r.ventas,
    (totalVenta > 0 ? (r.ventas / totalVenta * 100) : 0).toFixed(1) + '%',
    r.tickets,
    Math.round(r.ticket_prom),
    r.margen,
    r.margen_pct.toFixed(1) + '%',
  ].join(','))
  const csv = [headers.join(','), ...lines].join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = `top_proveedores_${año}.csv`; a.click()
  URL.revokeObjectURL(url)
}

const tdStyle = { padding: '7px 10px', fontSize: 11.5, color: '#334155', whiteSpace: 'nowrap', borderBottom: '1px solid #f1f5f9' }

const thStyle = {
  padding: '8px 10px', fontSize: 10, fontWeight: 700,
  textTransform: 'uppercase', letterSpacing: '.4px',
  color: '#93c5fd', whiteSpace: 'nowrap', userSelect: 'none',
  background: 'transparent'
}

const semC  = (pct) => pct >= 22 ? '#15803d' : pct >= 18 ? '#a16207' : '#b91c1c'
const semBg = (pct) => pct >= 22 ? '#dcfce7' : pct >= 18 ? '#fef9c3' : '#fee2e2'

const MEDALLAS = ['🥇', '🥈', '🥉']

export default function TablaTopProveedores({ data, filtros }) {
  const [limite, setLimite] = useState(10)
  const [sortCol, setSortCol] = useState('ventas')
  const [sortDir, setSortDir] = useState(-1)

  const { rows, totalVenta } = useMemo(() => {
    const rows = computeRows(data, filtros)
    const totalVenta = rows.reduce((s, r) => s + r.ventas, 0)
    return { rows, totalVenta }
  }, [data, filtros])

  const sorted = [...rows].sort((a, b) => {
    const va = a[sortCol] ?? -Infinity
    const vb = b[sortCol] ?? -Infinity
    return (va > vb ? 1 : -1) * sortDir
  })

  const visibles = sorted.slice(0, limite)
  const provSeleccionado = filtros.proveedor !== 'todos' ? filtros.proveedor : null
  const año = filtros.año === '2025' ? '2025' : '2026'

  const sort = (col) => {
    if (sortCol === col) setSortDir(d => -d)
    else { setSortCol(col); setSortDir(-1) }
  }

  const thS = (col) => ({ ...thStyle, color: sortCol === col ? '#4da3ff' : '#93c5fd', cursor: 'pointer' })

  if (!data.proveedores_disponibles?.length) return null

  return (
    <div style={{ background: '#fff', borderRadius: 10, border: '1.5px solid #e2e8f0', boxShadow: '0 1px 4px rgba(0,0,0,.05)', overflow: 'hidden' }}>

      {/* Header — mismo estilo que TablaAgentes */}
      <div style={{ background: '#0f1f3d', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#fff', textTransform: 'uppercase', letterSpacing: '.5px' }}>
          🏭 Top Proveedores por Venta — {año}
        </span>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,.45)', fontWeight: 500 }}>
          {rows.length} proveedores activos
        </span>
        {rows.length > 0 && (
          <button
            onClick={() => doExportCSV(sorted, totalVenta, año)}
            style={{ marginLeft: 'auto', padding: '5px 12px', borderRadius: 6, border: '1px solid rgba(255,255,255,.2)', background: 'rgba(255,255,255,.1)', color: '#fff', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
          >
            ⬇️ Exportar CSV
          </button>
        )}
      </div>

      {rows.length === 0 ? (
        <div style={{ padding: '32px 18px', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
          Sin datos para los filtros seleccionados
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#0f1f3d' }}>
                <th style={{ ...thStyle, textAlign: 'center' }}>#</th>
                {[['prov','Proveedor'],['ventas','Ventas'],['margen_pct','% del total'],['tickets','Tickets'],['ticket_prom','Ticket Prom.'],['margen','Margen $'],['margen_pct2','Margen %']].map(([col, label]) => (
                  <th key={col} style={thS(col === 'margen_pct2' ? 'margen_pct' : col)} onClick={() => sort(col === 'margen_pct2' ? 'margen_pct' : col)}>
                    {label}{sortCol === (col === 'margen_pct2' ? 'margen_pct' : col) ? (sortDir > 0 ? ' ↑' : ' ↓') : ''}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibles.map((r, i) => {
                const pct = totalVenta > 0 ? r.ventas / totalVenta * 100 : 0
                const isSelected = provSeleccionado === r.prov
                const rankOriginal = sorted.indexOf(r)
                return (
                  <tr
                    key={r.prov}
                    style={{
                      background: isSelected ? '#eff6ff' : i % 2 === 0 ? '#fff' : '#f8fafc',
                      outline: isSelected ? '2px solid #1a6cf0' : 'none'
                    }}
                  >
                    <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 700, color: '#94a3b8', fontSize: 11 }}>
                      {rankOriginal < 3 ? MEDALLAS[rankOriginal] : rankOriginal + 1}
                    </td>
                    <td style={{ ...tdStyle, fontWeight: 700, color: isSelected ? '#1a6cf0' : '#0f1f3d', maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {r.prov}
                    </td>
                    <td style={{ ...tdStyle, fontWeight: 700 }}>{fmt.moneda(r.ventas)}</td>
                    <td style={{ ...tdStyle, minWidth: 140 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                        <div style={{ flex: 1, background: '#e2e8f0', borderRadius: 4, height: 6, overflow: 'hidden' }}>
                          <div style={{ width: `${pct}%`, background: isSelected ? '#1a6cf0' : '#60a5fa', height: '100%', borderRadius: 4 }} />
                        </div>
                        <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600, width: 36, textAlign: 'right', flexShrink: 0 }}>
                          {pct.toFixed(1)}%
                        </span>
                      </div>
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'center' }}>{r.tickets.toLocaleString('es-MX')}</td>
                    <td style={tdStyle}>{fmt.moneda(r.ticket_prom)}</td>
                    <td style={{ ...tdStyle, color: '#15803d' }}>{fmt.moneda(r.margen)}</td>
                    <td style={tdStyle}>
                      <span style={{ background: semBg(r.margen_pct), color: semC(r.margen_pct), padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 700 }}>
                        {r.margen_pct.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {rows.length > limite && (
            <div style={{ padding: '10px 18px', borderTop: '1px solid #f1f5f9', textAlign: 'center' }}>
              <button
                onClick={() => setLimite(l => l + 10)}
                style={{ fontSize: 12, fontWeight: 600, color: '#1a6cf0', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 12px' }}
              >
                Ver más ({rows.length - limite} restantes)
              </button>
            </div>
          )}
        </div>
      )}

      {provSeleccionado && (
        <div style={{ padding: '8px 16px', background: '#eff6ff', fontSize: 11, color: '#1d4ed8', borderTop: '1px solid #bfdbfe' }}>
          Filtrando por proveedor: <strong>{provSeleccionado}</strong>
        </div>
      )}
    </div>
  )
}
