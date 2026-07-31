import React from 'react'

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

const selectStyle = {
  padding: '4px 10px', borderRadius: 6, fontSize: 12, fontWeight: 500,
  border: '1.5px solid #e2e8f0', background: '#f8fafc', color: '#334155',
  outline: 'none', cursor: 'pointer'
}

function Campo({ label, children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <label style={{ fontSize: 11, color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap' }}>{label}:</label>
      {children}
    </div>
  )
}

const Sep = () => <div style={{ width: 1, alignSelf: 'stretch', minHeight: 22, background: '#e2e8f0', margin: '0 4px' }} />

export default function FiltroVentasGeneral({ filtros, onChange, sucursales = [], proveedores = [], lineas = [] }) {
  const mesSel = filtros.meses.length === 1 ? String(filtros.meses[0]) : 'todos'
  const equipo = filtros.equipo || 'todos'
  const sucursal = filtros.sucursal || 'todas'
  const vgProveedor = filtros.vgProveedor || 'todos'
  const vgLinea = filtros.vgLinea || 'todas'
  const provOrden = [...proveedores].sort((a, b) => a.localeCompare(b))
  const lineaOrden = [...lineas].sort((a, b) => a.localeCompare(b))
  const hayFiltros = filtros.año !== 'todos' || filtros.meses.length > 0 || equipo !== 'todos' || sucursal !== 'todas' || vgProveedor !== 'todos' || vgLinea !== 'todas'

  return (
    <div style={{
      background: '#fff', borderRadius: 10, padding: '12px 16px',
      marginBottom: 16, border: '1.5px solid #e2e8f0',
      boxShadow: '0 1px 4px rgba(0,0,0,.05)',
      display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center'
    }}>
      <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.5px' }}>Filtros</span>

      {/* ── Periodo ── */}
      <Campo label="Año">
        <select value={filtros.año} onChange={e => onChange({ ...filtros, año: e.target.value })} style={selectStyle}>
          <option value="todos">Todos</option>
          <option value="2025">2025</option>
          <option value="2026">2026</option>
        </select>
      </Campo>
      <Campo label="Mes">
        <select value={mesSel} onChange={e => onChange({ ...filtros, meses: e.target.value === 'todos' ? [] : [Number(e.target.value)] })} style={selectStyle}>
          <option value="todos">Todos</option>
          {MESES.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
        </select>
      </Campo>

      <Sep />

      {/* ── Segmento ── */}
      <Campo label="Equipo">
        <select value={equipo} onChange={e => onChange({ ...filtros, equipo: e.target.value })} style={selectStyle}>
          <option value="todos">Todos</option>
          <option value="comercial">Equipo comercial</option>
          <option value="resto">El resto</option>
        </select>
      </Campo>
      {sucursales.length > 0 && (
        <Campo label="Sucursal">
          <select value={sucursal} onChange={e => onChange({ ...filtros, sucursal: e.target.value })} style={selectStyle}>
            <option value="todas">Todas</option>
            {sucursales.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </Campo>
      )}

      <Sep />

      {/* ── Producto ── */}
      {lineaOrden.length > 0 && (
        <Campo label="Línea">
          <select value={vgLinea} onChange={e => onChange({ ...filtros, vgLinea: e.target.value })} style={selectStyle}>
            <option value="todas">Todas</option>
            {lineaOrden.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
        </Campo>
      )}
      {provOrden.length > 0 && (
        <Campo label="Proveedor">
          <select value={vgProveedor} onChange={e => onChange({ ...filtros, vgProveedor: e.target.value })} style={{ ...selectStyle, maxWidth: 200 }}>
            <option value="todos">Todos</option>
            {provOrden.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </Campo>
      )}

      {hayFiltros && (
        <button onClick={() => onChange({ ...filtros, año: 'todos', meses: [], equipo: 'todos', sucursal: 'todas', vgProveedor: 'todos', vgLinea: 'todas' })} style={{
          marginLeft: 'auto', padding: '5px 14px', borderRadius: 6, fontSize: 11,
          fontWeight: 700, border: '1.5px solid #ef4444', background: '#fff5f5',
          color: '#ef4444', cursor: 'pointer'
        }}>✕ Limpiar filtros</button>
      )}
    </div>
  )
}
