import React, { useState, useRef, useEffect } from 'react'
import InfoTip from './InfoTip.jsx'

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

const selectStyle = {
  padding: '4px 10px', borderRadius: 6, fontSize: 12, fontWeight: 500,
  border: '1.5px solid #e2e8f0', background: '#f8fafc', color: '#334155',
  outline: 'none', cursor: 'pointer'
}

// Selector de mes(es) con checkboxes — permite elegir varios meses a la vez, igual que en
// Dashboard Táctico.
function MesMultiSelect({ selected, onChange }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const label = selected.length === 0
    ? 'Todos'
    : selected.length === MESES.length
      ? 'Todos'
      : selected.map(m => MESES[m - 1].slice(0, 3)).join(', ')

  const toggle = (m) => {
    const next = selected.includes(m) ? selected.filter(v => v !== m) : [...selected, m]
    onChange(next)
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <div
        onClick={() => setOpen(o => !o)}
        style={{ ...selectStyle, display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', userSelect: 'none', minWidth: 110, maxWidth: 180 }}
      >
        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
        <span style={{ fontSize: 9, color: '#94a3b8' }}>▼</span>
      </div>
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, zIndex: 999,
          background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: 8,
          boxShadow: '0 8px 24px rgba(0,0,0,.12)', minWidth: 140, overflow: 'hidden'
        }}>
          {MESES.map((m, i) => {
            const num = i + 1
            const activo = selected.includes(num)
            return (
              <div
                key={num}
                onClick={() => toggle(num)}
                style={{
                  padding: '7px 12px', fontSize: 12, fontWeight: 500, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 8,
                  background: activo ? '#eff6ff' : '#fff',
                  color: activo ? '#1a6cf0' : '#334155',
                }}
              >
                <span style={{
                  width: 14, height: 14, borderRadius: 4, flexShrink: 0,
                  border: `1.5px solid ${activo ? '#1a6cf0' : '#cbd5e1'}`,
                  background: activo ? '#1a6cf0' : '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 9, color: '#fff'
                }}>{activo ? '✓' : ''}</span>
                {m}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function Campo({ label, info, children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <label style={{ fontSize: 11, color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center' }}>
        {label}{info && <InfoTip text={info} />}:
      </label>
      {children}
    </div>
  )
}

const Sep = () => <div style={{ width: 1, alignSelf: 'stretch', minHeight: 22, background: '#e2e8f0', margin: '0 4px' }} />

export default function FiltroVentasGeneral({ filtros, onChange, sucursales = [], proveedores = [], lineas = [], agentes = [] }) {
  const vgAño = filtros.vgAño || 'todos'
  const vgMeses = filtros.vgMeses || []
  const equipo = filtros.equipo || 'todos'
  const vgAgente = filtros.vgAgente || 'todos'
  const sucursal = filtros.sucursal || 'todas'
  const vgProveedor = filtros.vgProveedor || 'todos'
  const vgLinea = filtros.vgLinea || 'todas'
  const provOrden = [...proveedores].sort((a, b) => a.localeCompare(b))
  const lineaOrden = [...lineas].sort((a, b) => a.localeCompare(b))
  const agenteOrden = [...agentes].sort((a, b) => a.localeCompare(b))
  const hayFiltros = vgAño !== 'todos' || vgMeses.length > 0 || equipo !== 'todos' || vgAgente !== 'todos' || sucursal !== 'todas' || vgProveedor !== 'todos' || vgLinea !== 'todas'

  return (
    <div style={{
      background: '#fff', borderRadius: 10, padding: '12px 16px',
      marginBottom: 16, border: '1.5px solid #e2e8f0',
      boxShadow: '0 1px 4px rgba(0,0,0,.05)',
      display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center'
    }}>
      <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.5px' }}>Filtros</span>

      {/* ── Periodo ── */}
      <Campo label="Año" info="Filtra el periodo de todas las tarjetas y gráficas. 'Todos' suma 2025 + 2026. Independiente del filtro de Año en Dashboard Táctico.">
        <select value={vgAño} onChange={e => onChange({ ...filtros, vgAño: e.target.value })} style={selectStyle}>
          <option value="todos">Todos</option>
          <option value="2025">2025</option>
          <option value="2026">2026</option>
        </select>
      </Campo>
      <Campo label="Mes" info="Filtra a los meses seleccionados (puedes elegir varios a la vez). En Clientes Perdidos, un solo mes mueve la fecha de corte ('¿quién estaba perdido a esa fecha?'); con más de uno se usa el acumulado del año. Independiente del filtro de Mes en Dashboard Táctico.">
        <MesMultiSelect selected={vgMeses} onChange={meses => onChange({ ...filtros, vgMeses: meses })} />
      </Campo>

      <Sep />

      {/* ── Segmento ── */}
      <Campo label="Equipo" info="Compara el equipo comercial gestionado contra el resto de la operación de la empresa.">
        <select value={equipo} onChange={e => onChange({ ...filtros, equipo: e.target.value })} style={selectStyle}>
          <option value="todos">Todos</option>
          <option value="comercial">Equipo comercial</option>
          <option value="resto">El resto</option>
        </select>
      </Campo>
      {agenteOrden.length > 0 && (
        <Campo label="Agente" info="Filtra por agente individual (columna NOMBRE AGENTE). Afecta a todas las tarjetas y gráficas de la página, incluyendo Ticket Promedio, Densidad de Compra y Correlación de Productos.">
          <select value={vgAgente} onChange={e => onChange({ ...filtros, vgAgente: e.target.value })} style={{ ...selectStyle, maxWidth: 180 }}>
            <option value="todos">Todos</option>
            {agenteOrden.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </Campo>
      )}
      {sucursales.length > 0 && (
        <Campo label="Sucursal" info="Filtra por sucursal. La sección de donas la ignora a propósito para poder comparar todas las sucursales entre sí.">
          <select value={sucursal} onChange={e => onChange({ ...filtros, sucursal: e.target.value })} style={selectStyle}>
            <option value="todas">Todas</option>
            {sucursales.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </Campo>
      )}

      <Sep />

      {/* ── Producto ── */}
      {lineaOrden.length > 0 && (
        <Campo label="Línea" info="Filtra por línea de producto. No afecta a Ticket Promedio, calculado sobre tickets completos.">
          <select value={vgLinea} onChange={e => onChange({ ...filtros, vgLinea: e.target.value })} style={selectStyle}>
            <option value="todas">Todas</option>
            {lineaOrden.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
        </Campo>
      )}
      {provOrden.length > 0 && (
        <Campo label="Proveedor" info="Filtra por proveedor. No afecta a Ticket Promedio, calculado sobre tickets completos.">
          <select value={vgProveedor} onChange={e => onChange({ ...filtros, vgProveedor: e.target.value })} style={{ ...selectStyle, maxWidth: 200 }}>
            <option value="todos">Todos</option>
            {provOrden.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </Campo>
      )}

      {hayFiltros && (
        <button onClick={() => onChange({ ...filtros, vgAño: 'todos', vgMeses: [], equipo: 'todos', vgAgente: 'todos', sucursal: 'todas', vgProveedor: 'todos', vgLinea: 'todas' })} style={{
          marginLeft: 'auto', padding: '5px 14px', borderRadius: 6, fontSize: 11,
          fontWeight: 700, border: '1.5px solid #ef4444', background: '#fff5f5',
          color: '#ef4444', cursor: 'pointer'
        }}>✕ Limpiar filtros</button>
      )}
    </div>
  )
}
