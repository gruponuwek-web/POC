import React, { useState } from 'react'
import { fmt } from '../utils/format.js'
import { scopeLabel } from '../utils/ventasGeneral.js'

function titulo(s) {
  return String(s || '').toLowerCase().replace(/\b\w/g, c => c.toUpperCase())
}
const semC = (p) => p >= 22 ? '#15803d' : p >= 18 ? '#a16207' : '#b91c1c'
const semBg = (p) => p >= 22 ? '#dcfce7' : p >= 18 ? '#fef9c3' : '#fee2e2'

const tdStyle = { padding: '7px 10px', fontSize: 11.5, color: '#334155', whiteSpace: 'nowrap', borderBottom: '1px solid #f1f5f9' }
const thStyle = { padding: '8px 10px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.4px', color: '#93c5fd', whiteSpace: 'nowrap', background: 'transparent' }

function exportCSV(nombreArchivo, headers, rows) {
  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url; a.download = nombreArchivo; a.click()
  URL.revokeObjectURL(url)
}

function Marco({ titulo: t, extra, children, footer }) {
  return (
    <div style={{ background: '#fff', borderRadius: 10, border: '1.5px solid #e2e8f0', boxShadow: '0 1px 4px rgba(0,0,0,.05)', overflow: 'hidden', marginBottom: 16 }}>
      <div style={{ background: '#0f1f3d', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#fff', textTransform: 'uppercase', letterSpacing: '.5px' }}>{t}</span>
        {extra}
      </div>
      <div style={{ overflowX: 'auto' }}>{children}</div>
      {footer}
    </div>
  )
}

function BotonCSV({ onClick }) {
  return (
    <button onClick={onClick} style={{ marginLeft: 'auto', padding: '5px 12px', borderRadius: 6, border: '1px solid rgba(255,255,255,.2)', background: 'rgba(255,255,255,.1)', color: '#fff', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
      ⬇️ Exportar CSV
    </button>
  )
}

function VerMas({ total, limite, onMas }) {
  if (total <= limite) return null
  return (
    <div style={{ padding: '10px 18px', borderTop: '1px solid #f1f5f9', textAlign: 'center' }}>
      <button onClick={onMas} style={{ fontSize: 12, fontWeight: 600, color: '#1a6cf0', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 12px' }}>
        Ver más ({total - limite} restantes)
      </button>
    </div>
  )
}

// ── Ordenamiento por columna ────────────────────────────────────────────────
// Estado { key, dir } por tabla. Al hacer clic en un encabezado nuevo, arranca
// en el orden "natural" de esa columna (texto → A-Z, número → mayor primero);
// al hacer clic de nuevo en la misma columna, invierte la dirección.
function useSort(initialKey) {
  const [sort, setSort] = useState({ key: initialKey, dir: 'desc' })
  const onSort = (key, kind) => setSort(s => s.key === key
    ? { key, dir: s.dir === 'desc' ? 'asc' : 'desc' }
    : { key, dir: kind === 'str' ? 'asc' : 'desc' })
  return [sort, onSort]
}

function sortRows(rows, sort, getters) {
  const get = getters[sort.key]
  if (!get) return rows
  const arr = [...rows]
  arr.sort((a, b) => {
    const va = get(a), vb = get(b)
    const cmp = (typeof va === 'string' || typeof vb === 'string')
      ? String(va || '').localeCompare(String(vb || ''), 'es')
      : (va || 0) - (vb || 0)
    return sort.dir === 'asc' ? cmp : -cmp
  })
  return arr
}

// Encabezado clickeable con flecha discreta (▲/▼) que solo se resalta en la
// columna activa; el resto queda muy tenue, solo insinuando que se puede ordenar.
function ThSort({ label, sortKey, kind = 'num', sort, onSort, align = 'left' }) {
  const active = sort.key === sortKey
  return (
    <th onClick={() => onSort(sortKey, kind)} title="Ordenar"
      style={{ ...thStyle, textAlign: align, cursor: 'pointer', userSelect: 'none' }}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
        {label}
        <span style={{ fontSize: 8, color: active ? '#fff' : '#93c5fd', opacity: active ? 0.9 : 0.35 }}>
          {active && sort.dir === 'asc' ? '▲' : '▼'}
        </span>
      </span>
    </th>
  )
}

export default function TablasVentasGeneral({ g, filtros }) {
  const [limV, setLimV] = useState(10)
  const [limP, setLimP] = useState(10)
  const [limC, setLimC] = useState(10)
  const [sortV, onSortV] = useSort('venta')
  const [sortP, onSortP] = useSort('venta')
  const [sortC, onSortC] = useSort('venta')

  if (!g) return null
  const suf = scopeLabel(filtros || {})
  const vendedoresBase = g.vendedores || []
  const proveedoresBase = g.proveedores || []
  const clientesBase = g.clientes || []
  if (!vendedoresBase.length && !proveedoresBase.length && !clientesBase.length) return null

  const totalVentaProv = proveedoresBase.reduce((s, r) => s + r.venta, 0)
  const totalVentaCli = clientesBase.reduce((s, r) => s + r.venta, 0)
  const maxCli = clientesBase.length ? Math.max(...clientesBase.map(r => r.venta)) : 1
  const mgPct = (r) => r.venta > 0 ? (r.venta - r.costo) / r.venta * 100 : 0

  const vendGetters = {
    nombre: r => r.nombre, equipo: r => r.equipo, venta: r => r.venta, n: r => r.n,
    promxop: r => r.n > 0 ? r.venta / r.n : 0, margen: r => r.venta - r.costo, margenpct: r => mgPct(r),
  }
  const provGetters = {
    nombre: r => r.nombre, venta: r => r.venta, pct: r => r.venta, n: r => r.n, cant: r => r.cant,
    margen: r => r.venta - r.costo, margenpct: r => mgPct(r),
  }
  const cliGetters = {
    nombre: r => r.nombre, agente: r => r.agente || '', venta: r => r.venta, pct: r => r.venta, n: r => r.n,
    margen: r => r.venta - r.costo, margenpct: r => mgPct(r),
  }

  const vendedores = sortRows(vendedoresBase, sortV, vendGetters)
  const proveedores = sortRows(proveedoresBase, sortP, provGetters)
  const clientes = sortRows(clientesBase, sortC, cliGetters)

  return (
    <>
      {/* Desempeño por vendedor — TODOS */}
      <Marco titulo={`🧑‍💼 Desempeño por Vendedor — ${suf}`}
        extra={<>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,.45)', fontWeight: 500 }}>{vendedores.length} vendedores</span>
          <BotonCSV onClick={() => exportCSV('vendedores_general.csv',
            ['#', 'Vendedor', 'Equipo', 'Venta', 'Operaciones', 'Prom x op', 'Margen', 'Margen %'],
            vendedores.map((r, i) => [i + 1, `"${titulo(r.nombre)}"`, r.equipo, r.venta, r.n, r.n > 0 ? Math.round(r.venta / r.n) : 0, r.venta - r.costo, mgPct(r).toFixed(1) + '%']))} />
        </>}
        footer={<VerMas total={vendedores.length} limite={limV} onMas={() => setLimV(l => l + 15)} />}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr style={{ background: '#0f1f3d' }}>
            <th style={{ ...thStyle, textAlign: 'center' }}>#</th>
            <ThSort label="Vendedor" sortKey="nombre" kind="str" sort={sortV} onSort={onSortV} />
            <ThSort label="Equipo" sortKey="equipo" kind="str" sort={sortV} onSort={onSortV} />
            <ThSort label="Venta" sortKey="venta" sort={sortV} onSort={onSortV} />
            <ThSort label="Operaciones" sortKey="n" sort={sortV} onSort={onSortV} />
            <ThSort label="Prom. x op." sortKey="promxop" sort={sortV} onSort={onSortV} />
            <ThSort label="Margen $" sortKey="margen" sort={sortV} onSort={onSortV} />
            <ThSort label="Margen %" sortKey="margenpct" sort={sortV} onSort={onSortV} />
          </tr></thead>
          <tbody>
            {vendedores.slice(0, limV).map((r, i) => (
              <tr key={r.nombre} style={{ background: i % 2 === 0 ? '#fff' : '#f8fafc' }}>
                <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 700, color: '#94a3b8', fontSize: 11 }}>{i + 1}</td>
                <td style={{ ...tdStyle, fontWeight: 700, color: '#0f1f3d', maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis' }}>{titulo(r.nombre)}</td>
                <td style={tdStyle}>
                  <span style={{ background: r.equipo === 'comercial' ? '#dbeafe' : '#fef3c7', color: r.equipo === 'comercial' ? '#1d4ed8' : '#b45309', padding: '2px 8px', borderRadius: 10, fontSize: 10.5, fontWeight: 700 }}>
                    {r.equipo === 'comercial' ? 'Comercial' : 'Resto'}
                  </span>
                </td>
                <td style={{ ...tdStyle, fontWeight: 700 }}>{fmt.moneda(r.venta)}</td>
                <td style={{ ...tdStyle, textAlign: 'center' }}>{fmt.num(r.n)}</td>
                <td style={tdStyle}>{fmt.moneda(r.n > 0 ? r.venta / r.n : 0)}</td>
                <td style={{ ...tdStyle, color: '#15803d' }}>{fmt.moneda(r.venta - r.costo)}</td>
                <td style={tdStyle}><span style={{ background: semBg(mgPct(r)), color: semC(mgPct(r)), padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 700 }}>{mgPct(r).toFixed(1)}%</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Marco>

      {/* Top Proveedores */}
      <Marco titulo={`🏭 Top Proveedores — ${suf}`}
        extra={<>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,.45)', fontWeight: 500 }}>{proveedores.length} proveedores</span>
          <BotonCSV onClick={() => exportCSV('proveedores_general.csv',
            ['#', 'Proveedor', 'Venta', '% del Total', 'Operaciones', 'Cantidad', 'Margen', 'Margen %'],
            proveedores.map((r, i) => [i + 1, `"${titulo(r.nombre)}"`, r.venta, (totalVentaProv > 0 ? r.venta / totalVentaProv * 100 : 0).toFixed(1) + '%', r.n, r.cant, r.venta - r.costo, mgPct(r).toFixed(1) + '%']))} />
        </>}
        footer={<VerMas total={proveedores.length} limite={limP} onMas={() => setLimP(l => l + 15)} />}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr style={{ background: '#0f1f3d' }}>
            <th style={{ ...thStyle, textAlign: 'center' }}>#</th>
            <ThSort label="Proveedor" sortKey="nombre" kind="str" sort={sortP} onSort={onSortP} />
            <ThSort label="Venta" sortKey="venta" sort={sortP} onSort={onSortP} />
            <ThSort label="% del total" sortKey="pct" sort={sortP} onSort={onSortP} />
            <ThSort label="Operaciones" sortKey="n" sort={sortP} onSort={onSortP} />
            <ThSort label="Cantidad" sortKey="cant" sort={sortP} onSort={onSortP} />
            <ThSort label="Margen $" sortKey="margen" sort={sortP} onSort={onSortP} />
            <ThSort label="Margen %" sortKey="margenpct" sort={sortP} onSort={onSortP} />
          </tr></thead>
          <tbody>
            {proveedores.slice(0, limP).map((r, i) => {
              const pct = totalVentaProv > 0 ? r.venta / totalVentaProv * 100 : 0
              return (
                <tr key={r.nombre} style={{ background: i % 2 === 0 ? '#fff' : '#f8fafc' }}>
                  <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 700, color: '#94a3b8', fontSize: 11 }}>{i + 1}</td>
                  <td style={{ ...tdStyle, fontWeight: 700, color: '#0f1f3d', maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis' }}>{titulo(r.nombre)}</td>
                  <td style={{ ...tdStyle, fontWeight: 700 }}>{fmt.moneda(r.venta)}</td>
                  <td style={{ ...tdStyle, minWidth: 120 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <div style={{ flex: 1, background: '#e2e8f0', borderRadius: 4, height: 6, overflow: 'hidden' }}><div style={{ width: `${pct}%`, background: '#60a5fa', height: '100%', borderRadius: 4 }} /></div>
                      <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600, width: 34, textAlign: 'right', flexShrink: 0 }}>{pct.toFixed(1)}%</span>
                    </div>
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'center' }}>{fmt.num(r.n)}</td>
                  <td style={{ ...tdStyle, textAlign: 'center' }}>{fmt.num(r.cant)}</td>
                  <td style={{ ...tdStyle, color: '#15803d' }}>{fmt.moneda(r.venta - r.costo)}</td>
                  <td style={tdStyle}><span style={{ background: semBg(mgPct(r)), color: semC(mgPct(r)), padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 700 }}>{mgPct(r).toFixed(1)}%</span></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </Marco>

      {/* Top Clientes */}
      <Marco titulo={`🛒 Top Clientes — ${suf}`}
        extra={<>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,.45)', fontWeight: 500 }}>{clientes.length} clientes</span>
          <BotonCSV onClick={() => exportCSV('clientes_general.csv',
            ['#', 'Cliente', 'Núm', 'Agente', 'Venta', '% del Total', 'Operaciones', 'Margen', 'Margen %'],
            clientes.map((r, i) => [i + 1, `"${titulo(r.nombre)}"`, r.num, `"${titulo(r.agente)}"`, r.venta, (totalVentaCli > 0 ? r.venta / totalVentaCli * 100 : 0).toFixed(1) + '%', r.n, r.venta - r.costo, mgPct(r).toFixed(1) + '%']))} />
        </>}
        footer={<VerMas total={clientes.length} limite={limC} onMas={() => setLimC(l => l + 15)} />}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr style={{ background: '#0f1f3d' }}>
            <th style={{ ...thStyle, textAlign: 'center' }}>#</th>
            <ThSort label="Cliente" sortKey="nombre" kind="str" sort={sortC} onSort={onSortC} />
            <ThSort label="Agente" sortKey="agente" kind="str" sort={sortC} onSort={onSortC} />
            <ThSort label="Venta" sortKey="venta" sort={sortC} onSort={onSortC} />
            <ThSort label="% del total" sortKey="pct" sort={sortC} onSort={onSortC} />
            <ThSort label="Operaciones" sortKey="n" sort={sortC} onSort={onSortC} />
            <ThSort label="Margen $" sortKey="margen" sort={sortC} onSort={onSortC} />
            <ThSort label="Margen %" sortKey="margenpct" sort={sortC} onSort={onSortC} />
          </tr></thead>
          <tbody>
            {clientes.slice(0, limC).map((r, i) => {
              const pct = totalVentaCli > 0 ? r.venta / totalVentaCli * 100 : 0
              return (
                <tr key={(r.num || '') + r.nombre} style={{ background: i % 2 === 0 ? '#fff' : '#f8fafc' }}>
                  <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 700, color: '#94a3b8', fontSize: 11 }}>{i + 1}</td>
                  <td style={{ ...tdStyle, fontWeight: 700, color: '#0f1f3d', maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis' }}>{titulo(r.nombre)}</td>
                  <td style={{ ...tdStyle, color: '#64748b', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.agente ? titulo(r.agente) : '—'}</td>
                  <td style={{ ...tdStyle, fontWeight: 700 }}>{fmt.moneda(r.venta)}</td>
                  <td style={{ ...tdStyle, minWidth: 120 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <div style={{ flex: 1, background: '#e2e8f0', borderRadius: 4, height: 6, overflow: 'hidden' }}><div style={{ width: `${r.venta / maxCli * 100}%`, height: '100%', background: '#34d399' }} /></div>
                      <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600, width: 34, textAlign: 'right', flexShrink: 0 }}>{pct.toFixed(1)}%</span>
                    </div>
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'center' }}>{fmt.num(r.n)}</td>
                  <td style={{ ...tdStyle, color: '#15803d' }}>{fmt.moneda(r.venta - r.costo)}</td>
                  <td style={tdStyle}><span style={{ background: semBg(mgPct(r)), color: semC(mgPct(r)), padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 700 }}>{mgPct(r).toFixed(1)}%</span></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </Marco>
    </>
  )
}
