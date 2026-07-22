import React, { useMemo, useState } from 'react'
import { fmt } from '../utils/format.js'

function computeRows(data, filtros) {
  const es2025 = filtros.año === '2025'
  const mesProv    = es2025 ? (data.kpi_mensual_por_proveedor_2025    || {}) : (data.kpi_mensual_por_proveedor    || {})
  const agProv     = es2025 ? (data.kpi_agentes_por_proveedor_2025    || {}) : (data.kpi_agentes_por_proveedor    || {})
  const allProvs   = Object.keys(mesProv)

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

function exportCSV(rows, totalVenta, año) {
  const headers = ['#','Proveedor','Ventas','% del Total','Tickets','Ticket Promedio','Margen $','Margen %']
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

export default function TablaTopProveedores({ data, filtros }) {
  const [limite, setLimite] = useState(10)

  const { rows, totalVenta } = useMemo(() => {
    const rows = computeRows(data, filtros)
    const totalVenta = rows.reduce((s, r) => s + r.ventas, 0)
    return { rows, totalVenta }
  }, [data, filtros])

  const visibles = rows.slice(0, limite)
  const provSeleccionado = filtros.proveedor !== 'todos' ? filtros.proveedor : null

  if (!data.proveedores_disponibles?.length) return null

  const año = filtros.año === '2025' ? '2025' : '2026'

  return (
    <div style={{ background: '#fff', borderRadius: 10, border: '1.5px solid #e2e8f0', boxShadow: '0 1px 4px rgba(0,0,0,.05)', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '14px 18px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#0f1f3d', textTransform: 'uppercase', letterSpacing: '.4px' }}>
          🏭 Top Proveedores por Venta — {año}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 500 }}>{rows.length} proveedores activos</span>
          {rows.length > 0 && (
            <button
              onClick={() => exportCSV(rows, totalVenta, año)}
              style={{ fontSize: 11, fontWeight: 600, color: '#1a6cf0', background: '#eff6ff', border: '1.5px solid #bfdbfe', borderRadius: 6, padding: '4px 12px', cursor: 'pointer' }}
            >
              ⬇️ CSV
            </button>
          )}
        </div>
      </div>

      {rows.length === 0 ? (
        <div style={{ padding: '32px 18px', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
          Sin datos para los filtros seleccionados
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                <Th w={32} center>#</Th>
                <Th>Proveedor</Th>
                <Th right>Ventas</Th>
                <Th w={140}>% del total</Th>
                <Th right>Tickets</Th>
                <Th right>Ticket Prom.</Th>
                <Th right>Margen %</Th>
              </tr>
            </thead>
            <tbody>
              {visibles.map((r, i) => {
                const pct = totalVenta > 0 ? r.ventas / totalVenta * 100 : 0
                const isSelected = provSeleccionado === r.prov
                const rowBg = isSelected ? '#eff6ff' : i % 2 === 0 ? '#fff' : '#fafafa'
                return (
                  <tr key={r.prov} style={{ background: rowBg, borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '9px 10px', textAlign: 'center', color: '#94a3b8', fontWeight: 700, fontSize: 11 }}>
                      {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                    </td>
                    <td style={{ padding: '9px 12px', maxWidth: 220 }}>
                      <div style={{ fontWeight: 600, color: isSelected ? '#1a6cf0' : '#0f1f3d', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {r.prov}
                      </div>
                    </td>
                    <td style={{ padding: '9px 14px', textAlign: 'right', fontWeight: 700, color: '#0f1f3d', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                      {fmt.moneda(r.ventas)}
                    </td>
                    <td style={{ padding: '9px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                        <div style={{ flex: 1, background: '#e2e8f0', borderRadius: 4, height: 6, overflow: 'hidden' }}>
                          <div style={{ width: `${pct}%`, background: isSelected ? '#1a6cf0' : '#60a5fa', height: '100%', borderRadius: 4 }} />
                        </div>
                        <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600, width: 36, textAlign: 'right', flexShrink: 0 }}>
                          {pct.toFixed(1)}%
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: '9px 14px', textAlign: 'right', color: '#334155', fontVariantNumeric: 'tabular-nums' }}>
                      {r.tickets.toLocaleString('es-MX')}
                    </td>
                    <td style={{ padding: '9px 14px', textAlign: 'right', color: '#334155', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                      {fmt.moneda(r.ticket_prom)}
                    </td>
                    <td style={{ padding: '9px 14px', textAlign: 'right' }}>
                      <span style={{
                        fontWeight: 700, fontSize: 11,
                        color: r.margen_pct >= 22 ? '#15803d' : r.margen_pct >= 18 ? '#a16207' : '#b91c1c'
                      }}>
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
    </div>
  )
}

function Th({ children, right, center, w }) {
  return (
    <th style={{
      padding: '9px 14px', textAlign: right ? 'right' : center ? 'center' : 'left',
      fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase',
      letterSpacing: '.04em', whiteSpace: 'nowrap', width: w || undefined,
      borderBottom: '1.5px solid #e2e8f0',
    }}>
      {children}
    </th>
  )
}
