import React, { useState, useRef, useEffect } from 'react'

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

function MultiSelect({ options, selected, onChange, placeholder = 'Todos' }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const label = selected.length === 0
    ? placeholder
    : selected.length === options.length
      ? 'Todos'
      : options.filter(o => selected.includes(o.value)).map(o => o.label.slice(0, 3)).join(', ')

  const toggle = (val) => {
    const next = selected.includes(val) ? selected.filter(v => v !== val) : [...selected, val]
    onChange(next)
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <div
        onClick={() => setOpen(o => !o)}
        style={{ ...selectStyle, display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', userSelect: 'none', minWidth: 110 }}
      >
        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
        <span style={{ fontSize: 9, color: '#94a3b8' }}>▼</span>
      </div>
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, zIndex: 999,
          background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: 8,
          boxShadow: '0 8px 24px rgba(0,0,0,.12)', minWidth: 130, overflow: 'hidden'
        }}>
          {options.map(o => (
            <div
              key={o.value}
              onClick={() => toggle(o.value)}
              style={{
                padding: '7px 12px', fontSize: 12, fontWeight: 500, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 8,
                background: selected.includes(o.value) ? '#eff6ff' : '#fff',
                color: selected.includes(o.value) ? '#1a6cf0' : '#334155',
              }}
            >
              <span style={{
                width: 14, height: 14, borderRadius: 4, flexShrink: 0,
                border: `1.5px solid ${selected.includes(o.value) ? '#1a6cf0' : '#cbd5e1'}`,
                background: selected.includes(o.value) ? '#1a6cf0' : '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 9, color: '#fff'
              }}>{selected.includes(o.value) ? '✓' : ''}</span>
              {o.label}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function InfoTip({ text }) {
  const [show, setShow] = useState(false)
  return (
    <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
      <span
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        style={{ cursor: 'help', color: '#94a3b8', fontSize: 11, lineHeight: 1, marginLeft: 3 }}
      >ⓘ</span>
      {show && (
        <div style={{
          position: 'absolute', top: 20, left: 0, zIndex: 999,
          background: '#0f1f3d', color: '#fff', fontSize: 11,
          padding: '8px 12px', borderRadius: 8, width: 230, lineHeight: 1.5,
          boxShadow: '0 8px 24px rgba(0,0,0,.25)', pointerEvents: 'none', whiteSpace: 'normal'
        }}>{text}</div>
      )}
    </span>
  )
}

export default function FilterBar({ data, filtros, onChange, onLimpiar }) {
  const agentes = data?.kpi_agentes?.map(a => a.agente).sort() || []
  const mesesDisp = data?.resumen?.meses_disponibles || []
  const proveedores = data?.proveedores_disponibles || []

  const toggleMes = (num) => {
    const curr = filtros.meses
    const next = curr.includes(num) ? curr.filter(m => m !== num) : [...curr, num]
    onChange({ ...filtros, meses: next })
  }

  const hayFiltros = filtros.agente !== 'todos' || filtros.meses.length > 0 || filtros.año !== 'todos' || filtros.proveedor !== 'todos'

  return (
    <div style={{
      background: '#fff', borderRadius: 10, padding: '12px 16px',
      marginBottom: 16, border: '1.5px solid #e2e8f0',
      boxShadow: '0 1px 4px rgba(0,0,0,.05)',
      display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center'
    }}>
      <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.5px' }}>Filtros</span>

      {/* Agente */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <label style={{ fontSize: 11, color: '#64748b', fontWeight: 600, display: 'flex', alignItems: 'center' }}>
          Agente
          <InfoTip text="Filtra todos los indicadores para mostrar únicamente los datos del agente seleccionado: sus ventas, clientes, metas y cartera." />
          :
        </label>
        <select
          value={filtros.agente}
          onChange={e => onChange({ ...filtros, agente: e.target.value })}
          style={selectStyle}
        >
          <option value="todos">Todos</option>
          {agentes.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
      </div>

      {/* Año */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <label style={{ fontSize: 11, color: '#64748b', fontWeight: 600, display: 'flex', alignItems: 'center' }}>
          Año
          <InfoTip text="Cambia las tarjetas de clientes nuevos, recuperados, perdidos, tickets y margen para mostrar los datos del año seleccionado. Sin selección se muestra 2026 como año en curso." />
          :
        </label>
        <select
          value={filtros.año}
          onChange={e => onChange({ ...filtros, año: e.target.value })}
          style={selectStyle}
        >
          <option value="todos">Todos</option>
          <option value="2025">2025</option>
          <option value="2026">2026</option>
        </select>
      </div>

      {/* Meses */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <label style={{ fontSize: 11, color: '#64748b', fontWeight: 600, display: 'flex', alignItems: 'center', whiteSpace: 'nowrap' }}>
          Mes
          <InfoTip text="Filtra las gráficas y KPIs al mes o meses seleccionados. Se pueden seleccionar varios meses a la vez para ver un acumulado parcial del año." />
          :
        </label>
        <MultiSelect
          options={mesesDisp.map(num => ({ value: num, label: MESES[num - 1] }))}
          selected={filtros.meses}
          onChange={meses => onChange({ ...filtros, meses })}
        />
      </div>

      {/* Proveedor */}
      {proveedores.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <label style={{ fontSize: 11, color: '#64748b', fontWeight: 600, display: 'flex', alignItems: 'center', whiteSpace: 'nowrap' }}>
            Proveedor
            <InfoTip text="Filtra todas las gráficas y KPIs de venta para mostrar únicamente los productos del proveedor seleccionado." />
            :
          </label>
          <select
            value={filtros.proveedor || 'todos'}
            onChange={e => onChange({ ...filtros, proveedor: e.target.value })}
            style={{ ...selectStyle, maxWidth: 180 }}
          >
            <option value="todos">Todos</option>
            {proveedores.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
      )}

      {hayFiltros && (
        <button onClick={onLimpiar} style={{
          marginLeft: 'auto', padding: '5px 14px', borderRadius: 6, fontSize: 11,
          fontWeight: 700, border: '1.5px solid #ef4444', background: '#fff5f5',
          color: '#ef4444', cursor: 'pointer', transition: 'all .15s'
        }}>✕ Limpiar filtros</button>
      )}
    </div>
  )
}

const selectStyle = {
  padding: '4px 10px', borderRadius: 6, fontSize: 12, fontWeight: 500,
  border: '1.5px solid #e2e8f0', background: '#f8fafc', color: '#334155',
  outline: 'none', cursor: 'pointer'
}
